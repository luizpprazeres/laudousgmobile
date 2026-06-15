/**
 * Boletim de avaliação clínica da MAMARIA estilo OBJETIVO (Sprint 3) — render
 * DETERMINÍSTICO (sem LLM). Gera HTML com casos representativos para o Luiz
 * validar fidelidade das frases, BI-RADS calculável (maior-vence/ditado-vence),
 * margens nunca "regulares", 1 casa decimal e a seção de conduta.
 *
 * Rodar: tsx src/server/renderer/__tests__/mamaria-objetivo-boletim.manual.ts
 * Saída: docs/mamaria-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderMamaria, type MamariaPreferences } from "../categories/MAMARIA";
import { A, F } from "./mamaria-fixtures";

const render = (
  f: Parameters<typeof renderMamaria>[0],
  prefs?: Partial<MamariaPreferences>,
) => renderMamaria(f, prefs ?? null, { objetivo: true });

type Caso = { nome: string; descricao: string; laudo: string };

const CASES: Caso[] = [
  {
    nome: "1. Mamas normais (rastreamento)",
    descricao: "Sem lesões, com axilas → BI-RADS 1.",
    laudo: render(F({ titulo_com_axilas: true, achados: [] })),
  },
  {
    nome: "2. Cisto simples",
    descricao: "Cisto simples em mama esquerda → BI-RADS 2.",
    laudo: render(
      F({
        titulo_com_axilas: false,
        achados: [
          A({
            tipo: "cisto_simples",
            lado: "esquerda",
            medidas_cm: [1.2, 0.9, 0.8],
            localizacao: "quadrante superolateral",
            horario: "10 horas",
          }),
        ],
      }),
    ),
  },
  {
    nome: "3. Nódulo sólido suspeito → BI-RADS 4B (ditado vence)",
    descricao: "Nódulo hipoecoico microlobulado + cisto: maior vence (só o nódulo leva rótulo).",
    laudo: render(
      F({
        titulo_com_axilas: true,
        achados: [
          A({ tipo: "cisto_simples", lado: "direita", medidas_cm: [0.9, 0.7, 0.6] }),
          A({
            tipo: "nodulo_solido",
            lado: "esquerda",
            ecogenicidade: "hipoecoico",
            margem: "microlobulada",
            orientacao: "nao_paralela",
            medidas_cm: [1.4, 1.1, 1.0],
            localizacao: "quadrante superolateral",
            birads_ditado: "4B",
          }),
        ],
      }),
    ),
  },
  {
    nome: "4. Calcificações suspeitas em nódulo → BI-RADS 4",
    descricao: "Calcificações no interior de imagem nodular.",
    laudo: render(
      F({
        titulo_com_axilas: false,
        achados: [
          A({
            tipo: "calcificacoes",
            lado: "direita",
            calcificacoes: "em_nodulo",
            medidas_cm: [0.3],
            localizacao: "quadrante inferomedial",
          }),
        ],
      }),
    ),
  },
  {
    nome: "5. Nódulo altamente suspeito + conduta ON",
    descricao: "Espiculada + irregular → BI-RADS 5, com seção de conduta sugerida.",
    laudo: render(
      F({
        titulo_com_axilas: true,
        achados: [
          A({
            tipo: "nodulo_solido",
            lado: "direita",
            ecogenicidade: "hipoecoico",
            margem: "espiculada",
            forma: "irregular",
            orientacao: "nao_paralela",
            posterior: "sombra",
            medidas_cm: [2.2, 1.8, 1.5],
            localizacao: "quadrante superolateral",
          }),
        ],
      }),
      { show_conduct_recommendation: true },
    ),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map(
  (c) => `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="meta">${esc(c.descricao)}</p>
    <pre>${esc(c.laudo)}</pre>
  </section>`,
).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>MAMARIA OBJETIVO — Boletim de avaliação (Sprint 3)</title>
<style>
  body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:880px;margin:0 auto;padding:32px;color:#1c1917;background:#fafaf9}
  h1{font-size:24px}
  .intro{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px}
  .card{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:18px 20px;margin:18px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .card header{border-bottom:1px solid #f5f5f4;padding-bottom:8px}
  .card h2{font-size:16px;margin:0}
  .meta{font-size:13px;color:#57534e;margin:10px 0}
  pre{white-space:pre-wrap;background:#fafaf9;border:1px solid #f0efee;border-radius:8px;padding:14px;font:13px/1.55 ui-monospace,Menlo,monospace;margin:0}
</style></head><body>
<h1>MAMARIA OBJETIVO — Boletim de avaliação (Sprint 3, render determinístico)</h1>
<div class="intro"><p>Cada caso: <b>achados montados à mão</b> → <b>laudo objetivo</b>
(TÉCNICA / ACHADOS / IMPRESSÃO). Valide: (1) <b>BI-RADS calculável</b> (maior-vence, ditado-vence,
rótulo só no item de maior categoria); (2) <b>margens nunca "regulares"</b>; (3) "de mama direita/esquerda";
(4) <b>1 casa decimal</b>; (5) <b>conduta</b> em seção própria quando o toggle estiver ON.</p></div>
${cards}
</body></html>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/mamaria-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
