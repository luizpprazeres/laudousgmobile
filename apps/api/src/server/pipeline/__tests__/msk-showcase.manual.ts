/**
 * SHOWCASE MSK antes/depois (chama OpenAI). Para cada caso REAL de
 * MUSCULOESQUELETICO_V2, mostra o laudo de produção (ANTES) vs re-gerado agora
 * com o GLOBAL_RULES ajustado (uma-linha-por-item) — mesmo modelo (gpt-4.1-mini),
 * mesmo bundle V2. Foco: confirmar que as quebras de linha voltam.
 *
 * Rodar: tsx src/server/pipeline/__tests__/msk-showcase.manual.ts
 */
import { config } from "dotenv";
config({ path: "/Users/luizprazeres/laudousgmobile-def/.env" });

const MSK = "MUSCULOESQUELETICO_V2";
const CLASSICO_ID = "11111111-1111-4111-8111-111111111111";

// Reforço testado no harness (não toca o DB) — vira migration/contract se aprovado.
const REFORCO = `═══════════════════════════════════════════════════
⚠️ REGRA #1 — COBERTURA COMPLETA DO CORPO (a falha mais comum — LEIA PRIMEIRO)
═══════════════════════════════════════════════════
Em "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", SEMPRE descreva TODAS as estruturas do roteiro do segmento (ver REGRAS DE ESTRUTURA), UMA POR LINHA, INCLUSIVE quando normais.

- Segmento NORMAL: é PROIBIDO escrever apenas "{Segmento} ecograficamente normal." no corpo. Descreva cada estrutura do roteiro com sua frase de normalidade no corpo; o "{Segmento} {lat} ecograficamente normal." vai SÓ na CONCLUSÃO.
  Exemplo CORRETO (pé direito normal):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Fáscia plantar com espessura e ecotextura preservadas.
  Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
  Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.
  CONCLUSÃO:
  Pé direito ecograficamente normal.

- Segmento COM ALTERAÇÃO: descreva as estruturas normais do roteiro que NÃO foram alteradas + a(s) alteração(ões). NUNCA descreva só a alteração omitindo o resto.
  Exemplo CORRETO (mão direita com tenossinovite):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Tendões flexores e extensores dos quirodáctilos com continuidade preservada.
  Espessamento sinovial na topografia da polia A2 do terceiro e quarto quirodáctilos, sem sinais de rotura tendínea associada.
  CONCLUSÃO:
  Sinais de tenossinovite da polia A2 do 3º e 4º quirodáctilos direitos.

- O CORPO descreve a morfologia; a CONCLUSÃO traz o diagnóstico. NUNCA escreva o diagnóstico ("Tendinopatia", "Tenossinovite", "Bursite") no corpo, nem copie a frase do corpo na conclusão.

- QUEBRA DE LINHA, NÃO LINHA EM BRANCO: os achados da mesma seção ficam em linhas ADJACENTES (uma quebra simples entre eles), SEM linha em branco no meio. Pule linha (parágrafo) APENAS entre seções/cabeçalhos: após o TÍTULO, e entre o fim de "OS SEGUINTES ASPECTOS..." e "CONCLUSÃO:". NUNCA pule linha entre dois achados.

- NOMENCLATURA: polias dos dedos são A1, A2, A3, A4, A5 — sempre "A"+número colado ("polia A2", JAMAIS "polia a 2"). Use "quirodáctilo", não "dedo".

- MÚLTIPLOS SEGMENTOS: é comum o exame trazer vários (ombro D + ombro E + mão + pé). Gere um laudo COMPLETO e SEPARADO por segmento, cada um com cobertura completa do corpo.
`;

async function main() {
  const OpenAI = (await import("openai")).default;
  const oa = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { buildSystemMessage } = await import("../../prompts/buildSystemMessage");
  const { loadDeterministicBundle } = await import("../bundleLoader");
  const { getWritingStyleById, getKnownCategories } = await import("../../db/lookups");
  const { removeEmptyConclusionItems } = await import("../emptyConclusionItemsGuard");
  const { normalizeSectionSpacing } = await import("../sectionSpacingGuard");
  const { getDbClient } = await import("@laudousg/db");
  const { sql } = await import("drizzle-orm");
  const fs = await import("node:fs");
  const db = getDbClient();

  const cats = await getKnownCategories();
  const style = await getWritingStyleById(CLASSICO_ID);
  const bundle = await loadDeterministicBundle({ categoryCode: MSK, writingStyleId: CLASSICO_ID, rawInput: "", accountVariantKey: undefined });
  if (bundle.error) { console.error("bundle MSK:", bundle.error.code); process.exit(1); }
  const system = REFORCO + "\n\n" + buildSystemMessage({ categoryCode: MSK, categoryLabel: cats.labels.get(MSK) ?? MSK, writingStyleCode: style!.code, ragBlocks: bundle.blocks });

  const rows: any = await db.execute(sql`
    SELECT raw_input, output_text FROM generation_audit
    WHERE category=${MSK} AND error_code IS NULL
      AND length(coalesce(output_text,''))>40 AND length(coalesce(raw_input,''))>15
    ORDER BY created_at DESC LIMIT 6`);
  const casos = (rows.rows ?? rows) as { raw_input: string; output_text: string }[];
  console.log(`Casos: ${casos.length}`);

  const out: { ditado: string; antes: string; depois: string }[] = [];
  for (const c of casos) {
    const userMsg = `=== DITADO DO MÉDICO (achados + instruções) ===\n${c.raw_input}\n\nSiga o modelo da categoria na íntegra. Preserve as quebras de linha. Retorne apenas o laudo técnico completo.`;
    let depois = "";
    try {
      const res: any = await oa.chat.completions.create({
        model: "gpt-4.1-mini", temperature: 0.2, max_tokens: 2500,
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
      });
      depois = normalizeSectionSpacing(removeEmptyConclusionItems(res.choices[0]?.message?.content ?? ""));
    } catch (e) { depois = "ERRO: " + (e as Error).message; }
    out.push({ ditado: c.raw_input, antes: c.output_text, depois });
    console.log(`✓ caso (${c.raw_input.slice(0, 40).replace(/\n/g, " ")}…)`);
  }

  const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const secs = out.map((o, i) => `<div class="caso"><h3>Caso ${i + 1}</h3><div class="ditado"><b>DITADO</b><br><pre class="d">${esc(o.ditado)}</pre></div><div class="cols"><div class="col"><h4>ANTES (prod — quebras coladas)</h4><pre>${esc(o.antes)}</pre></div><div class="col new"><h4>DEPOIS (global + reforço de cobertura)</h4><pre>${esc(o.depois)}</pre></div></div></div>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>MSK antes/depois</title>
<style>body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:24px;background:#f5f5f7;color:#1d1d1f}h1{font-size:22px}
.caso{background:#fff;border-radius:12px;padding:16px;margin:14px 0;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ditado{margin-bottom:10px}.ditado pre.d{background:#f0f4ff;border:1px solid #dde}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}.col h4{margin:0 0 6px;font-size:12px;color:#888}.col.new h4{color:#1d7a35}
.col.new pre{background:#f0fff4;border-color:#bfe9cc}
pre{white-space:pre-wrap;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:12px;font:12px/1.5 ui-monospace,Menlo,monospace;margin:0;max-height:480px;overflow:auto}</style>
<h1>Musculoesquelético — ANTES (prod) × DEPOIS (regra global ajustada)</h1>
<p>Mesmo modelo (gpt-4.1-mini) e bundle; só mudou a global + reforço de cobertura de estruturas no corpo.</p>${secs}</html>`;
  fs.writeFileSync("/Users/luizprazeres/laudousgmobile-def/docs/msk-antes-depois.html", html, "utf8");
  console.log("Boletim: docs/msk-antes-depois.html");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
