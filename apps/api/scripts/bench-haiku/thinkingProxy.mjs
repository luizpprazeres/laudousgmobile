/**
 * Proxy local da BANCADA (W16). Fica entre o `claude -p` (ANTHROPIC_BASE_URL) e
 * api.anthropic.com e faz duas coisas:
 *
 * 1. Reproduz a EXTRAÇÃO DE PRODUÇÃO SEM RACIOCÍNIO (cabeçalho `x-bench-thinking:
 *    disabled`). O `claude -p` não desliga o thinking no Haiku 5.5 (doc do Claude
 *    Code: MAX_THINKING_TOKENS=0 não vale para Opus 5.5, Sonnet 5.5, Haiku 5.5 e
 *    Fable; medido em 10/10, o bloco de thinking continua vindo). Aqui cada POST
 *    /v1/messages do Haiku sai com `thinking: {type: "disabled"}`, sem a edição
 *    `clear_thinking_*` do context_management (a API a recusa sem thinking), esforço
 *    xhigh/max descendo a high (400 na API) e, no 1º turno, `tool_choice` forçado na
 *    ferramenta StructuredOutput — como o motor faz no caminho por ferramenta.
 *    `x-bench-thinking: disabled-auto` desliga o raciocínio sem forçar a ferramenta
 *    (LLM_EXTRACTION_TOOL_CHOICE=auto). `keep` só mede (o adaptativo segue como está).
 *
 * 2. Mede cada chamada pelo SSE da API: tokens de saída, entrada, cache lido e
 *    gravado, blocos devolvidos e tempo, por `x-bench-call`. `GET /__stats/<id>`
 *    devolve a lista (o 1º turno é o equivalente à chamada de produção; o 2º, depois
 *    do tool_result, é só do laço do `claude -p`).
 *
 * Continua sendo a ASSINATURA: a autenticação é a do próprio Claude Code, repassada
 * como veio. Só escuta em 127.0.0.1 e só encaminha para api.anthropic.com. Imprime a
 * porta na primeira linha do stdout. Uso: node thinkingProxy.mjs [porta]
 */
import http from "node:http";
import https from "node:https";

const UPSTREAM = "api.anthropic.com";
/** id da chamada → medições de cada request. */
const stats = new Map();

function lastUserIsToolResult(messages) {
  const last = messages?.[messages.length - 1];
  return Array.isArray(last?.content) && last.content.some((b) => b?.type === "tool_result");
}

function rewrite(j, forceTool) {
  j.thinking = { type: "disabled" };
  if (j.output_config && ["xhigh", "max"].includes(j.output_config.effort)) j.output_config.effort = "high";
  if (j.context_management?.edits) {
    j.context_management.edits = j.context_management.edits.filter((e) => !/thinking/.test(String(e.type)));
    if (j.context_management.edits.length === 0) delete j.context_management;
  }
  const structured = (j.tools ?? []).find((t) => t?.name === "StructuredOutput");
  if (forceTool && structured && !lastUserIsToolResult(j.messages)) j.tool_choice = { type: "tool", name: "StructuredOutput" };
}

/** Lê o SSE da API sem alterá-lo. */
function meter(rec) {
  let buf = "";
  return (chunk) => {
    buf += chunk.toString("utf8");
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      let ev;
      try {
        ev = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      if (ev.type === "message_start") {
        const u = ev.message?.usage ?? {};
        rec.input = u.input_tokens ?? 0;
        rec.cacheRead = u.cache_read_input_tokens ?? 0;
        rec.cacheWrite = u.cache_creation_input_tokens ?? 0;
        rec.firstByteMs = Date.now() - rec.t0;
      } else if (ev.type === "content_block_start") {
        rec.blocks.push(ev.content_block?.type);
      } else if (ev.type === "message_delta") {
        rec.output = ev.usage?.output_tokens ?? rec.output;
        rec.thinkingTokens = ev.usage?.output_tokens_details?.thinking_tokens ?? rec.thinkingTokens;
        rec.stop = ev.delta?.stop_reason ?? rec.stop;
      }
    }
  };
}

const server = http.createServer((req, res) => {
  const stat = /^\/__stats\/([\w-]+)$/.exec(req.url ?? "");
  if (req.method === "GET" && stat) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(stats.get(stat[1]) ?? []));
    stats.delete(stat[1]);
    return;
  }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    let body = Buffer.concat(chunks);
    const callId = String(req.headers["x-bench-call"] ?? "");
    const mode = String(req.headers["x-bench-thinking"] ?? "keep");
    let rec = null;
    if (req.method === "POST" && /^\/v1\/messages(\?|$)/.test(req.url ?? "")) {
      try {
        const j = JSON.parse(body.toString("utf8"));
        const haiku = /haiku/i.test(j.model ?? "");
        if (haiku && mode.startsWith("disabled")) rewrite(j, mode === "disabled");
        body = Buffer.from(JSON.stringify(j), "utf8");
        rec = {
          t0: Date.now(),
          model: j.model,
          thinking: j.thinking?.type ?? "omitido",
          toolChoice: j.tool_choice?.type ?? "auto",
          afterToolResult: lastUserIsToolResult(j.messages),
          blocks: [],
          output: 0,
          thinkingTokens: 0,
        };
        if (callId) stats.set(callId, [...(stats.get(callId) ?? []), rec]);
      } catch (err) {
        process.stderr.write(`[thinkingProxy] corpo não-JSON em ${req.url}: ${String(err)}\n`);
      }
    }
    const headers = { ...req.headers, host: UPSTREAM };
    delete headers["x-bench-call"];
    delete headers["x-bench-thinking"];
    delete headers["content-length"];
    delete headers["accept-encoding"];
    if (body.length) headers["content-length"] = String(body.length);
    const up = https.request({ host: UPSTREAM, port: 443, method: req.method, path: req.url, headers }, (ur) => {
      res.writeHead(ur.statusCode ?? 502, ur.headers);
      if (rec) {
        rec.status = ur.statusCode;
        const onChunk = meter(rec);
        ur.on("data", onChunk);
        ur.on("end", () => (rec.ms = Date.now() - rec.t0));
      }
      ur.pipe(res);
    });
    up.on("error", (err) => {
      process.stderr.write(`[thinkingProxy] ${req.method} ${req.url}: ${String(err)}\n`);
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    if (body.length && !["GET", "HEAD"].includes(req.method ?? "")) up.write(body);
    up.end();
  });
});
server.listen(Number(process.argv[2] ?? 0), "127.0.0.1", () => {
  process.stdout.write(`${server.address().port}\n`);
});
