/**
 * Boletim de avaliação clínica da CERVICAL estilo OBJETIVO (DET-5) — render
 * DETERMINÍSTICO (sem LLM). Gera HTML com casos representativos (normal +
 * alterados) para o Luiz validar fidelidade das frases no estilo TÉCNICA /
 * ACHADOS / IMPRESSÃO (inspirado no nReport), reuso da lógica clínica de níveis
 * de Robbins, suspeição, glândulas/tireoide, Doppler e 1 casa decimal.
 *
 * Rodar: tsx src/server/renderer/__tests__/cervical-objetivo-boletim.manual.ts
 * Saída: docs/cervical-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderCervical,
  type CervicalFindings,
  type CervicalLinfonodoAlterado,
  type CervicalGlandula,
} from "../categories/CERVICAL";

const F = (over: Partial<CervicalFindings> = {}): CervicalFindings => ({
  com_doppler: false,
  niveis_normais: [],
  linfonodos_alterados: [],
  submandibulares: [],
  parotidas: [],
  tireoide_descrita: false,
  tireoide_alterada: false,
  tireoide_descricao: null,
  achados_adicionais: null,
  ...over,
});

const LN = (over: Partial<CervicalLinfonodoAlterado> = {}): CervicalLinfonodoAlterado => ({
  nivel: "IIA",
  medidas_cm: null,
  forma: null,
  hilo: null,
  vascularizacao: null,
  suspeito: false,
  descricao_raw: null,
  ...over,
});

const G = (over: Partial<CervicalGlandula> = {}): CervicalGlandula => ({
  lado: "direita",
  alterada: false,
  descricao: null,
  ...over,
});

const render = (f: CervicalFindings) => renderCervical(f, { objetivo: true });

type Caso = { nome: string; descricao: string; laudo: string };

const CASES: Caso[] = [
  {
    nome: "1. Cervical normal",
    descricao: "Sem achados → cadeias IA a VI normais; impressão de normalidade.",
    laudo: render(F({})),
  },
  {
    nome: "2. Níveis normais ditados + Doppler",
    descricao: "Linfonodos normais nos níveis IIA e III explicitados, com Doppler.",
    laudo: render(F({ com_doppler: true, niveis_normais: ["IIA", "III"] })),
  },
  {
    nome: "3. Linfonodo suspeito (nível IIA)",
    descricao: "Arredondado, sem hilo → item de suspeição na impressão.",
    laudo: render(
      F({
        linfonodos_alterados: [
          LN({
            nivel: "IIA",
            medidas_cm: [1.8, 1.2, 1.0],
            forma: "arredondada",
            hilo: "ausente",
            suspeito: true,
          }),
        ],
      }),
    ),
  },
  {
    nome: "4. Linfonodo suspeito com Doppler (vascularização periférica)",
    descricao: "Vascularização periférica anômala ao Doppler colorido.",
    laudo: render(
      F({
        com_doppler: true,
        linfonodos_alterados: [
          LN({
            nivel: "III",
            medidas_cm: [2.0, 1.4, 1.1],
            forma: "arredondada",
            hilo: "ausente",
            vascularizacao: "periferica",
            suspeito: true,
          }),
        ],
      }),
    ),
  },
  {
    nome: "5. Linfonodo proeminente reacional (não suspeito)",
    descricao: "Oval, com hilo preservado → reacional (sem suspeição).",
    laudo: render(
      F({
        linfonodos_alterados: [
          LN({ nivel: "IB", medidas_cm: [1.2, 0.6, 0.5], forma: "oval", hilo: "presente", suspeito: false }),
        ],
      }),
    ),
  },
  {
    nome: "6. Glândula salivar alterada + tireoide alterada + achado adicional",
    descricao: "Parotidite à direita, tireoidopatia e cisto cervical adicional.",
    laudo: render(
      F({
        submandibulares: [G({ lado: "direita" }), G({ lado: "esquerda" })],
        parotidas: [
          G({
            lado: "direita",
            alterada: true,
            descricao: "aumentada de volume, com ecotextura heterogênea e hipoecogênica",
          }),
        ],
        tireoide_descrita: true,
        tireoide_alterada: true,
        tireoide_descricao: "Glândula tireoide com nódulo hipoecoico no lobo direito",
        achados_adicionais: "Cisto cervical lateral à direita, medindo 2,0 x 1,5 cm",
      }),
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
<title>CERVICAL OBJETIVO — Boletim de avaliação (DET-5)</title>
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
<h1>CERVICAL OBJETIVO — Boletim de avaliação (DET-5, render determinístico)</h1>
<div class="intro"><p>Cada caso: <b>achados montados à mão</b> → <b>laudo objetivo</b>
(TÉCNICA / ACHADOS / IMPRESSÃO, inspirado no nReport). Valide: (1) reuso da <b>lógica
de níveis de Robbins</b> (normais/alterados, suspeição vs. reacional); (2) <b>glândulas
salivares e tireoide</b> só quando descritas; (3) <b>Doppler</b> refletido na técnica e
na vascularização; (4) <b>1 casa decimal</b> e concordância de gênero.</p></div>
${cards}
</body></html>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/cervical-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
