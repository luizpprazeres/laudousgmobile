/**
 * Chama um modelo Claude pela ASSINATURA (Claude Code CLI `claude -p`), nunca
 * pela API: ANTHROPIC_API_KEY é removida do ambiente do processo filho.
 *
 * Isolamento medido em 09/10: com `--setting-sources "" --strict-mcp-config
 * --disable-slash-commands` e cwd vazio, o modelo recebe só o system prompt
 * passado aqui (~600 tokens de overhead; sem CLAUDE.md, memória, MCP ou skills).
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const EMPTY_CWD = join(tmpdir(), "bench-haiku-empty-cwd");
mkdirSync(EMPTY_CWD, { recursive: true });

export type ClaudeCall = {
  model: string;
  system: string;
  user: string;
  /** JSON Schema → `--json-schema`; a resposta volta como JSON serializado. */
  schema?: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  /**
   * W16: com o campo, a chamada passa pelo thinkingProxy.mjs (ANTHROPIC_BASE_URL
   * local), que mede o 1º turno na API. "disabled" = sem raciocínio e ferramenta
   * forçada, como a extração de produção (o `claude -p` sozinho não desliga o
   * thinking no Haiku 5.5); falha se vier raciocínio. "adaptive" = só mede.
   */
  thinking?: "disabled" | "disabled-auto" | "adaptive";
  timeoutMs?: number;
};

export type ClaudeResult = {
  text: string;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  /** Medido no proxy (W16): o 1º turno, equivalente à chamada de produção. */
  api?: ApiTurn;
  /** Requests do `claude -p` nesta chamada (o 2º, depois do tool_result, é do laço do CLI). */
  apiTurns?: number;
};

export type ApiTurn = {
  ms: number;
  firstByteMs?: number;
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
  thinkingTokens: number;
  thinking: string;
  toolChoice: string;
  blocks: string[];
  stop?: string;
};

/**
 * Cache opcional em disco (BENCH_CACHE_DIR): mesma chamada (modelo, system, user, schema, effort) → mesma
 * resposta. Serve para comparar duas versões do código com a MESMA saída do modelo onde o prompt não mudou
 * (W15: base × branch nos renderers); prompt alterado = chave nova = chamada real.
 */
export async function callClaude(c: ClaudeCall): Promise<ClaudeResult> {
  const dir = process.env.BENCH_CACHE_DIR;
  if (!dir) return callClaudeCli(c);
  const key = createHash("sha256")
    .update(JSON.stringify([c.model, c.system, c.user, c.schema ?? null, c.effort ?? null, ...(c.thinking ? [c.thinking] : [])]))
    .digest("hex");
  const file = join(dir, `${key}.json`);
  if (existsSync(file)) return { ...(JSON.parse(readFileSync(file, "utf8")) as ClaudeResult), ms: 0 };
  const r = await callClaudeCli(c);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(r));
  return r;
}

let proxyPort: Promise<number> | null = null;
/** fetch original do Node: a bancada substitui o global para interceptar os provedores. */
const fetchLocal: typeof fetch = globalThis.fetch.bind(globalThis);

/** Sobe o thinkingProxy.mjs uma vez por processo (processo à parte: a bancada intercepta o fetch). */
function thinkingProxyPort(): Promise<number> {
  proxyPort ??= new Promise<number>((resolve, reject) => {
    const p = spawn(process.execPath, [join(__dirname, "thinkingProxy.mjs")], { stdio: ["ignore", "pipe", "inherit"] });
    p.on("error", reject);
    p.on("exit", (code) => reject(new Error(`thinkingProxy saiu com ${code}`)));
    createInterface({ input: p.stdout }).once("line", (line) => resolve(Number(line.trim())));
    process.on("exit", () => p.kill());
  });
  return proxyPort;
}

async function callClaudeCli(c: ClaudeCall): Promise<ClaudeResult> {
  const args = [
    "-p",
    "--model", c.model,
    "--system-prompt", c.system,
    // BENCH_CLI_TRACE_DIR: stream-json com cada bloco (prova de que não veio thinking, W16).
    ...(process.env.BENCH_CLI_TRACE_DIR ? ["--output-format", "stream-json", "--verbose"] : ["--output-format", "json"]),
    "--tools", "",
    "--no-session-persistence",
    "--setting-sources", "",
    "--strict-mcp-config",
    "--disable-slash-commands",
  ];
  if (c.effort) args.push("--effort", c.effort);
  if (c.schema) args.push("--json-schema", JSON.stringify(c.schema));

  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  const callId = c.thinking ? createHash("sha256").update(`${Date.now()}-${Math.random()}-${c.user}`).digest("hex").slice(0, 16) : "";
  const port = c.thinking ? await thinkingProxyPort() : 0;
  if (c.thinking) {
    env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
    env.ANTHROPIC_CUSTOM_HEADERS = `x-bench-call: ${callId}\nx-bench-thinking: ${c.thinking === "adaptive" ? "keep" : c.thinking}`;
  }

  const t0 = Date.now();
  const out = await new Promise<string>((resolve, reject) => {
    const p = spawn("claude", args, { cwd: EMPTY_CWD, env, stdio: ["pipe", "pipe", "pipe"] });
    let so = "";
    let se = "";
    const timer = setTimeout(() => {
      p.kill("SIGKILL");
      reject(new Error(`claude -p timeout (${c.model})`));
    }, c.timeoutMs ?? 300_000);
    p.stdout.on("data", (d) => (so += d));
    p.stderr.on("data", (d) => (se += d));
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !so) reject(new Error(`claude -p saiu com ${code}: ${se.slice(0, 500)}`));
      else resolve(so);
    });
    p.stdin.end(c.user);
  });

  let d: Record<string, any>;
  try {
    if (process.env.BENCH_CLI_TRACE_DIR) {
      const lines = out.split("\n").filter((l) => l.trim());
      mkdirSync(process.env.BENCH_CLI_TRACE_DIR, { recursive: true });
      writeFileSync(join(process.env.BENCH_CLI_TRACE_DIR, `${Date.now()}-${createHash("sha256").update(c.user).digest("hex").slice(0, 8)}.jsonl`), out);
      d = JSON.parse(lines.findLast((l) => l.includes('"type":"result"')) ?? "{}");
    } else {
      d = JSON.parse(out);
    }
  } catch {
    throw new Error(`claude -p: saída não-JSON: ${out.slice(0, 300)}`);
  }
  if (d.is_error) throw new Error(`claude -p erro: ${String(d.result).slice(0, 300)}`);
  const usage = d.usage ?? {};
  const thinkingTokens = usage.output_tokens_details?.thinking_tokens ?? 0;
  if (c.thinking?.startsWith("disabled") && thinkingTokens > 0) {
    throw new Error(`claude -p: pedido sem raciocínio, mas vieram ${thinkingTokens} tokens de thinking`);
  }
  let api: ApiTurn | undefined;
  let apiTurns: number | undefined;
  if (c.thinking) {
    const turns = (await (await fetchLocal(`http://127.0.0.1:${port}/__stats/${callId}`)).json()) as Array<ApiTurn & { afterToolResult: boolean; model: string }>;
    const main = turns.filter((t) => /haiku|sonnet|opus/.test(t.model) && !t.afterToolResult);
    api = main[main.length - 1];
    apiTurns = turns.length;
    if (!api) throw new Error(`claude -p: o proxy não viu a chamada ${callId} (ANTHROPIC_CUSTOM_HEADERS ignorado?)`);
    if (c.thinking?.startsWith("disabled") && (api.thinking !== "disabled" || api.blocks.includes("thinking"))) {
      throw new Error(`claude -p: pedido sem raciocínio, mas o 1º turno saiu com thinking=${api.thinking} blocos=${api.blocks.join(",")}`);
    }
  }
  const text = c.schema
    ? JSON.stringify(d.structured_output ?? JSON.parse(String(d.result)))
    : String(d.result ?? "");
  return {
    text,
    ms: Date.now() - t0,
    inputTokens:
      (usage.input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0),
    outputTokens: usage.output_tokens ?? 0,
    thinkingTokens,
    ...(api ? { api, apiTurns } : {}),
  };
}
