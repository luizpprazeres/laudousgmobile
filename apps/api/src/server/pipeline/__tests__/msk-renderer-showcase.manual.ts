/**
 * SHOWCASE end-to-end do renderer MSK 3b (chama OpenAI na extração).
 * Para casos reais: extração tipada (gpt-4.1-mini) → montagem determinística.
 * Compara WRITER atual (output_text de prod) × RENDERER 3b.
 * Rodar: tsx src/server/pipeline/__tests__/msk-renderer-showcase.manual.ts
 */
import { config } from "dotenv";
config({ path: "/Users/luizprazeres/laudousgmobile-def/.env" });

async function main() {
  const { runRendererExtraction } = await import("../../renderer/extraction");
  const { renderMusculoesqueletico } = await import("../../renderer/categories/MUSCULOESQUELETICO");
  const { getDbClient } = await import("@laudousg/db");
  const { sql } = await import("drizzle-orm");
  const fs = await import("node:fs");
  const db = getDbClient();

  const rows: any = await db.execute(sql`
    SELECT raw_input, output_text FROM generation_audit
    WHERE category='MUSCULOESQUELETICO_V2' AND error_code IS NULL
      AND length(coalesce(output_text,''))>40 AND length(coalesce(raw_input,''))>15
    ORDER BY created_at DESC LIMIT 5`);
  const casos = (rows.rows ?? rows) as { raw_input: string; output_text: string }[];
  console.log(`Casos: ${casos.length}`);

  const out: { ditado: string; writer: string; renderer: string }[] = [];
  for (const c of casos) {
    let renderer = "";
    try {
      const ext = await runRendererExtraction({ categoryCode: "MUSCULOESQUELETICO_V2", rawInput: c.raw_input });
      renderer = renderMusculoesqueletico(ext.findings as Parameters<typeof renderMusculoesqueletico>[0]);
    } catch (e) { renderer = "ERRO: " + (e as Error).message; }
    out.push({ ditado: c.raw_input, writer: c.output_text, renderer });
    console.log(`✓ ${c.raw_input.slice(0, 45).replace(/\n/g, " ")}…`);
  }

  const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const secs = out.map((o, i) => `<div class="caso"><h3>Caso ${i + 1}</h3><div class="ditado"><b>DITADO</b><br><pre class="d">${esc(o.ditado)}</pre></div><div class="cols"><div class="col"><h4>WRITER atual (prod)</h4><pre>${esc(o.writer)}</pre></div><div class="col new"><h4>RENDERER 3b (determinístico)</h4><pre>${esc(o.renderer)}</pre></div></div></div>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>MSK renderer 3b</title>
<style>body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:24px;background:#f5f5f7;color:#1d1d1f}h1{font-size:22px}
.caso{background:#fff;border-radius:12px;padding:16px;margin:14px 0;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ditado pre.d{background:#f0f4ff;border:1px solid #dde}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}.col h4{margin:0 0 6px;font-size:12px;color:#888}.col.new h4{color:#1d7a35}
.col.new pre{background:#f0fff4;border-color:#bfe9cc}
pre{white-space:pre-wrap;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:12px;font:12px/1.5 ui-monospace,Menlo,monospace;margin:0;max-height:520px;overflow:auto}</style>
<h1>Musculoesquelético — WRITER (prod) × RENDERER 3b (parte normal por construção)</h1>
<p>Renderer 3b: o código monta técnica + estruturas do roteiro + formato; o LLM extrai só as alterações. Segmentos cobertos: ombro, joelho, pé, mão.</p>${secs}</html>`;
  fs.writeFileSync("/Users/luizprazeres/laudousgmobile-def/docs/msk-renderer-3b.html", html, "utf8");
  console.log("Boletim: docs/msk-renderer-3b.html");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
