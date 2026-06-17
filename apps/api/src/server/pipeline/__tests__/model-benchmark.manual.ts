/**
 * BENCHMARK PONTUAL (não-determinístico) — tempo + CUSTO + qualidade, sobre
 * casos reais. Reaproveita o system_message_full exato de cada laudo de produção.
 * Compara: atual (gpt-4.1-mini) vs gpt-5.4-nano (xhigh) vs deepseek-v4-flash (max).
 *
 * Gera docs/model-benchmark.html. Rodar:
 *   tsx src/server/pipeline/__tests__/model-benchmark.manual.ts
 */
import { config } from "dotenv";
config({ path: "/Users/luizprazeres/laudousgmobile-def/.env" });

const DEEPSEEK_KEY = "sk-76ad08b644c64647b8a308d5c7f73666";

// USD por 1M tokens. gpt-4.1-mini = público/estável; demais = ESTIMATIVA (confirmar).
const PRICES: Record<string, { in: number; out: number; conf: string }> = {
  "gpt-4.1-mini": { in: 0.4, out: 1.6, conf: "confirmado" },
  "gpt-5.4-nano": { in: 0.05, out: 0.4, conf: "ESTIMATIVA — confirmar" },
  "deepseek-v4-flash": { in: 0.28, out: 0.42, conf: "ESTIMATIVA — confirmar" },
};

const VARIANTS: {
  provider: "openai" | "deepseek";
  model: string;
  effort?: string;
  temperature?: number;
  label: string;
}[] = [
  { provider: "openai", model: "gpt-4.1-mini", temperature: 0.2, label: "atual · 4.1-mini" },
  { provider: "openai", model: "gpt-5.4-nano", effort: "xhigh", label: "5.4-nano · xhigh" },
  { provider: "deepseek", model: "deepseek-v4-flash", effort: "max", label: "deepseek-v4-flash · max" },
];

// Casos pontuais: onde a qualidade caiu (+ 1 DOPPLER que tinha melhorado).
const CATEGORIES = ["ABDOMEN_TOTAL", "OBSTETRICA", "DOPPLER_OBSTETRICO", "TIREOIDE"];

function reqBody(v: typeof VARIANTS[number], system: string, user: string, maxOut: number) {
  const body: Record<string, unknown> = {
    model: v.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (v.provider === "deepseek") {
    body.max_tokens = maxOut;
    if (v.effort) body.reasoning_effort = v.effort;
  } else {
    body.max_completion_tokens = maxOut;
    if (v.effort) body.reasoning_effort = v.effort;
    else if (v.temperature !== undefined && !/gpt-5/.test(v.model)) body.temperature = v.temperature;
  }
  return body;
}

function custoUsd(model: string, inTok: number, outTok: number): number | null {
  const p = PRICES[model];
  if (!p) return null;
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
}

async function main() {
  const OpenAI = (await import("openai")).default;
  const oa = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ds = new OpenAI({ apiKey: DEEPSEEK_KEY, baseURL: "https://api.deepseek.com" });
  const { getDbClient } = await import("@laudousg/db");
  const { sql } = await import("drizzle-orm");
  const fs = await import("node:fs");
  const db = getDbClient();

  const rows: any = await db.execute(sql`
    SELECT DISTINCT ON (category)
      category, raw_input, output_text, system_message_full,
      coalesce(model_writer,'gpt-4.1-mini') AS real_model,
      (total_duration_ms - coalesce(sanity_duration_ms,0)) AS real_ms
    FROM generation_audit
    WHERE error_code IS NULL
      AND length(coalesce(output_text,'')) > 40
      AND length(coalesce(raw_input,'')) > 15
      AND system_message_full IS NOT NULL
      AND (model_writer IS NULL OR model_writer <> 'renderer/v1')
    ORDER BY category, created_at DESC`);
  const all = (rows.rows ?? rows) as {
    category: string; raw_input: string; output_text: string;
    system_message_full: string; real_model: string; real_ms: number;
  }[];
  const casos = CATEGORIES.map((c) => all.find((r) => r.category === c)).filter(
    (x): x is NonNullable<typeof x> => !!x,
  );
  console.log(`Casos: ${casos.length}`);

  type Run = { label: string; model: string; totalMs: number; inTok: number; outTok: number; reasoningTok: number; usd: number | null; text: string; err?: string };
  const resultados: { caso: typeof casos[number]; runs: Run[] }[] = [];

  for (const caso of casos) {
    const userMsg = `Ditado do médico (achados + instruções):\n${caso.raw_input}\n\nRetorne apenas o laudo técnico completo, seguindo o modelo e as regras.`;
    const runs: Run[] = [];
    for (const v of VARIANTS) {
      const client = v.provider === "deepseek" ? ds : oa;
      const t0 = Date.now();
      let text = "", inTok = 0, outTok = 0, reasoningTok = 0, err: string | undefined;
      try {
        const r: any = await client.chat.completions.create(reqBody(v, caso.system_message_full, userMsg, 8000) as never);
        text = r.choices[0]?.message?.content ?? "";
        inTok = r.usage?.prompt_tokens ?? 0;
        outTok = r.usage?.completion_tokens ?? 0;
        reasoningTok = r.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
      } catch (e) { err = (e as Error).message?.slice(0, 220); }
      const totalMs = Date.now() - t0;
      runs.push({ label: v.label, model: v.model, totalMs, inTok, outTok, reasoningTok, usd: err ? null : custoUsd(v.model, inTok, outTok), text, err });
      console.log(`✓ ${caso.category} | ${v.label} | total=${totalMs}ms in=${inTok} out=${outTok} (reason ${reasoningTok}) ${err ? "ERR:" + err : ""}`);
    }
    resultados.push({ caso, runs });
  }

  // ----- Resumo -----
  const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
  const avgF = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const resumo: string[] = [`ATUAL em prod (auditoria): total médio ${avg(resultados.map((r) => r.caso.real_ms).filter((x) => x > 0))}ms`];
  for (const v of VARIANTS) {
    const rs = resultados.flatMap((r) => r.runs).filter((r) => r.label === v.label && !r.err);
    if (!rs.length) { resumo.push(`${v.label} | TODAS falharam`); continue; }
    const usdMed = avgF(rs.map((r) => r.usd ?? 0));
    resumo.push(`${v.label} | total=${avg(rs.map((r) => r.totalMs))}ms | in=${avg(rs.map((r) => r.inTok))} out=${avg(rs.map((r) => r.outTok))} (reason ${avg(rs.map((r) => r.reasoningTok))}) | ~$${usdMed.toFixed(5)}/laudo · ~$${(usdMed * 1000).toFixed(2)}/1000 laudos`);
  }
  console.log("\n=== RESUMO ===\n" + resumo.join("\n"));

  // ----- HTML -----
  const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const precoNota = Object.entries(PRICES).map(([m, p]) => `${m}: $${p.in}/$${p.out} por 1M in/out (${p.conf})`).join(" · ");
  const secoes = resultados.map(({ caso, runs }) => {
    const real = `<div class="col real"><h4>LAUDO REAL — ${esc(caso.real_model)}</h4><div class="lat">total ${caso.real_ms}ms (prod)</div><pre>${esc(caso.output_text)}</pre></div>`;
    const cols = runs.map((r) => {
      const lat = r.err
        ? `<span class="erro">ERRO: ${esc(r.err)}</span>`
        : `total ${(r.totalMs / 1000).toFixed(1)}s · in ${r.inTok} / out ${r.outTok}${r.reasoningTok ? " (reason " + r.reasoningTok + ")" : ""} · ${r.usd !== null ? "≈$" + r.usd.toFixed(5) : "$?"}`;
      return `<div class="col"><h4>${esc(r.label)}</h4><div class="lat">${lat}</div><pre>${esc(r.text || "(sem texto)")}</pre></div>`;
    }).join("");
    return `<div class="caso"><div class="ditado"><b>${esc(caso.category)}</b><br>${esc(caso.raw_input)}</div><div class="cols">${real}${cols}</div></div>`;
  }).join("");

  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Benchmark pontual — tempo + custo</title>
<style>
body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:24px;background:#f5f5f7;color:#1d1d1f}
h1{font-size:22px} h2{margin-top:28px;color:#0071e3}
pre.resumo{background:#1d1d1f;color:#0f0;padding:14px;border-radius:8px;overflow:auto;font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap}
.nota{font-size:12px;color:#888}
.caso{background:#fff;border-radius:12px;padding:16px;margin:14px 0;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ditado{background:#f0f4ff;border-radius:8px;padding:10px;font-size:13px;color:#444;margin-bottom:12px}
.cols{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.col h4{margin:0 0 2px;font-size:12px;color:#0071e3} .col.real h4{color:#1d7a35}
.col.real pre{background:#f0fff4;border-color:#bfe9cc}
.col .lat{font-size:11px;color:#666;margin-bottom:6px}
pre{white-space:pre-wrap;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:10px;font:12px/1.45 ui-monospace,Menlo,monospace;margin:0;max-height:440px;overflow:auto}
.erro{color:#c00} @media(max-width:1200px){.cols{grid-template-columns:1fr 1fr}}
</style>
<h1>Benchmark pontual — tempo + custo + qualidade (casos reais)</h1>
<p class="nota">Preços usados: ${esc(precoNota)}. Custo/laudo = in×preço_in + out×preço_out (reasoning tokens contam como output).</p>
<h2>Resumo</h2>
<pre class="resumo">${esc(resumo.join("\n"))}</pre>
<h2>Caso a caso (verde = laudo real de produção)</h2>
${secoes}
</html>`;
  const out = "/Users/luizprazeres/laudousgmobile-def/docs/model-benchmark.html";
  fs.writeFileSync(out, html, "utf8");
  console.log(`\nBoletim: ${out}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
