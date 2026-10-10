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

const EMPTY_CWD = join(tmpdir(), "bench-haiku-empty-cwd");
mkdirSync(EMPTY_CWD, { recursive: true });

export type ClaudeCall = {
  model: string;
  system: string;
  user: string;
  /** JSON Schema → `--json-schema`; a resposta volta como JSON serializado. */
  schema?: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
};

export type ClaudeResult = {
  text: string;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
};

/**
 * Cache opcional em disco (BENCH_CACHE_DIR): mesma chamada (modelo, system, user, schema, effort) → mesma
 * resposta. Serve para comparar duas versões do código com a MESMA saída do modelo onde o prompt não mudou
 * (W15: base × branch nos renderers); prompt alterado = chave nova = chamada real.
 */
export async function callClaude(c: ClaudeCall): Promise<ClaudeResult> {
  const dir = process.env.BENCH_CACHE_DIR;
  if (!dir) return callClaudeCli(c);
  const key = createHash("sha256").update(JSON.stringify([c.model, c.system, c.user, c.schema ?? null, c.effort ?? null])).digest("hex");
  const file = join(dir, `${key}.json`);
  if (existsSync(file)) return { ...(JSON.parse(readFileSync(file, "utf8")) as ClaudeResult), ms: 0 };
  const r = await callClaudeCli(c);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(r));
  return r;
}

async function callClaudeCli(c: ClaudeCall): Promise<ClaudeResult> {
  const args = [
    "-p",
    "--model", c.model,
    "--system-prompt", c.system,
    "--output-format", "json",
    "--tools", "",
    "--no-session-persistence",
    "--setting-sources", "",
    "--strict-mcp-config",
    "--disable-slash-commands",
  ];
  if (c.effort) args.push("--effort", c.effort);
  if (c.schema) args.push("--json-schema", JSON.stringify(c.schema));

  const env = { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;

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
    d = JSON.parse(out);
  } catch {
    throw new Error(`claude -p: saída não-JSON: ${out.slice(0, 300)}`);
  }
  if (d.is_error) throw new Error(`claude -p erro: ${String(d.result).slice(0, 300)}`);
  const usage = d.usage ?? {};
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
    thinkingTokens: usage.output_tokens_details?.thinking_tokens ?? 0,
  };
}
