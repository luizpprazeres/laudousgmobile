/**
 * Boletim de avaliação clínica da TIREOIDE estilo OBJETIVO (Sprint 1) — render
 * DETERMINÍSTICO. Gera um HTML com N casos representativos: feições → ACR TI-RADS
 * calculado pelo código → laudo objetivo completo (TÉCNICA/ACHADOS/IMPRESSÃO).
 * Serve para o Luiz validar a categorização ACR (composição/ecogenicidade/forma/
 * margem/focos), a conduta por diâmetro e a fidelidade das frases. NÃO usa LLM.
 *
 * Rodar: tsx src/server/renderer/__tests__/tireoide-objetivo-boletim.manual.ts
 * Saída: docs/tireoide-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderTireoide,
  calcAcrTirads,
  type TireoideFindings,
  type TireoidePreferences,
} from "../categories/TIREOIDE";
import { F, L, N } from "./tireoide-objetivo-fixtures";

type Caso = {
  nome: string;
  feicoes: string;
  esperado: string;
  findings: TireoideFindings;
  prefs?: Partial<TireoidePreferences>;
};

const render = (f: TireoideFindings, prefs?: Partial<TireoidePreferences>) =>
  renderTireoide(f, prefs, { objetivo: true });

const CASES: Caso[] = [
  {
    nome: "1. Normal (sem achados)",
    feicoes: "Glândula tópica, ecotextura homogênea, sem nódulos.",
    esperado: "IMPRESSÃO normal (sem ACR)",
    findings: F({}),
  },
  {
    nome: "2. Nódulo benigno (TR2)",
    feicoes: "Sólido com áreas anecoicas (misto), margem regular, 0,8 cm.",
    esperado: "ACR TI-RADS 2 (provavelmente benigno)",
    findings: F({
      lobo_direito: L({
        medidas_cm: [5.0, 1.8, 1.6],
        volume_ml: 7.0,
        nodulos: [
          N({
            ecogenicidade: "solida_areas_anecoicas",
            margem: "regular",
            forma: "mais_larga_que_alta",
            medidas_cm: [0.8, 0.6, 0.5],
            localizacao: "no terço médio",
          }),
        ],
      }),
    }),
  },
  {
    nome: "3. Nódulo TR3 (características intermediárias)",
    feicoes: "Sólido isoecoico, margem regular, sem calcificações, 1,8 cm.",
    esperado: "ACR TI-RADS 3 — controle (≥1,5 cm)",
    findings: F({
      lobo_esquerdo: L({
        medidas_cm: [4.8, 1.7, 1.5],
        volume_ml: 6.0,
        nodulos: [
          N({
            ecogenicidade: "isoecoica",
            margem: "regular",
            forma: "mais_larga_que_alta",
            calcificacoes: "sem",
            medidas_cm: [1.8, 1.4, 1.2],
            localizacao: "no terço superior",
          }),
        ],
      }),
    }),
  },
  {
    nome: "4. Nódulo TR4 (características suspeitas)",
    feicoes: "Sólido hipoecoico, margem irregular, 1,6 cm.",
    esperado: "ACR TI-RADS 4 — PAAF (≥1,5 cm)",
    findings: F({
      lobo_direito: L({
        medidas_cm: [5.0, 1.8, 1.6],
        volume_ml: 7.0,
        nodulos: [
          N({
            ecogenicidade: "hipoecoica",
            margem: "irregular",
            forma: "mais_larga_que_alta",
            medidas_cm: [1.6, 1.2, 1.0],
            localizacao: "no terço inferior",
          }),
        ],
      }),
    }),
  },
  {
    nome: "5. Nódulo TR5 (altamente suspeitas)",
    feicoes: "Sólido hipoecoico, mais alto que largo, margem espiculada, microcalcificações, 1,2 cm.",
    esperado: "ACR TI-RADS 5 — PAAF (≥1,0 cm)",
    findings: F({
      lobo_esquerdo: L({
        medidas_cm: [4.8, 1.7, 1.5],
        volume_ml: 6.0,
        nodulos: [
          N({
            ecogenicidade: "hipoecoica",
            margem: "espiculada",
            forma: "mais_alta_que_larga",
            calcificacoes: "micro",
            medidas_cm: [1.2, 1.0, 0.9],
            localizacao: "no terço médio",
          }),
        ],
      }),
    }),
  },
  {
    nome: "6. Cisto simples",
    feicoes: "Anecoico homogêneo, 0,9 cm.",
    esperado: "ACR TI-RADS 1 (cisto simples)",
    findings: F({
      lobo_direito: L({
        medidas_cm: [5.0, 1.8, 1.6],
        volume_ml: 7.0,
        nodulos: [
          N({
            ecogenicidade: "anecoica_homogenea",
            medidas_cm: [0.9, 0.7, 0.6],
            localizacao: "no terço superior",
          }),
        ],
      }),
    }),
  },
  {
    nome: "7. Bócio (volume aumentado)",
    feicoes: "Glândula de dimensões aumentadas, sem nódulos.",
    esperado: "IMPRESSÃO 'Bócio'",
    findings: F({ volume_glandular: "aumentado" }),
  },
  {
    nome: "8. Tireoidopatia difusa",
    feicoes: "Ecotextura difusamente heterogênea (tireoidite).",
    esperado: "IMPRESSÃO 'Tireoidopatia difusa'",
    findings: F({
      lobo_direito: L({
        medidas_cm: [5.0, 1.8, 1.6],
        volume_ml: 7.0,
        ecotextura_alterada:
          "com ecotextura difusamente heterogênea, compatível com tireoidite crônica",
      }),
    }),
  },
  {
    nome: "9. Nódulo com ti_rads_ditado (override)",
    feicoes: "Sólido com características benignas (calcularia TR3), mas médico ditou TI-RADS 5.",
    esperado: "ACR TI-RADS 5 (ditado vence)",
    findings: F({
      lobo_direito: L({
        medidas_cm: [5.0, 1.8, 1.6],
        volume_ml: 7.0,
        nodulos: [
          N({
            ecogenicidade: "isoecoica",
            margem: "regular",
            forma: "mais_larga_que_alta",
            medidas_cm: [1.0, 0.8, 0.7],
            ti_rads_ditado: "5",
            localizacao: "no terço médio",
          }),
        ],
      }),
    }),
  },
  {
    nome: "10. Dois nódulos (maior categoria na impressão)",
    feicoes: "TR2 (misto, regular) + TR4 (hipoecoico, irregular) na mesma paciente.",
    esperado: "Ambos descritos; conduta pega TR4",
    findings: F({
      lobo_direito: L({
        medidas_cm: [5.0, 1.8, 1.6],
        volume_ml: 7.0,
        nodulos: [
          N({
            ecogenicidade: "solida_areas_anecoicas",
            margem: "regular",
            forma: "mais_larga_que_alta",
            medidas_cm: [0.7, 0.5, 0.4],
            localizacao: "no terço superior",
          }),
        ],
      }),
      lobo_esquerdo: L({
        medidas_cm: [4.8, 1.7, 1.5],
        volume_ml: 6.0,
        nodulos: [
          N({
            ecogenicidade: "hipoecoica",
            margem: "irregular",
            forma: "mais_larga_que_alta",
            medidas_cm: [1.7, 1.3, 1.1],
            localizacao: "no terço inferior",
          }),
        ],
      }),
    }),
    prefs: { show_conduct_recommendation: true },
  },
  {
    nome: "11. Conduta ligada (toggle) — TR4 PAAF",
    feicoes: "Mesmo caso 4, com show_conduct_recommendation = true.",
    esperado: "Seção 'Conduta sugerida:' ao final",
    findings: F({
      lobo_direito: L({
        medidas_cm: [5.0, 1.8, 1.6],
        volume_ml: 7.0,
        nodulos: [
          N({
            ecogenicidade: "hipoecoica",
            margem: "irregular",
            forma: "mais_larga_que_alta",
            medidas_cm: [1.6, 1.2, 1.0],
            localizacao: "no terço inferior",
          }),
        ],
      }),
    }),
    prefs: { show_conduct_recommendation: true },
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const acrDoLaudo = (laudo: string): string => {
  const matches = [...laudo.matchAll(/ACR TI-RADS (\d)/g)].map((m) => m[1]);
  return matches.length ? [...new Set(matches)].join(", ") : "—";
};

const cards = CASES.map((c) => {
  const laudo = render(c.findings, c.prefs);
  const acr = acrDoLaudo(laudo);
  return `
  <section class="card">
    <header>
      <h2>${esc(c.nome)}</h2>
      <span class="badge">ACR TI-RADS no laudo: <b>${esc(acr)}</b></span>
    </header>
    <p class="meta"><b>Feições:</b> ${esc(c.feicoes)}<br/><b>Esperado (clínico):</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>TIREOIDE OBJETIVO — Boletim de avaliação (Sprint 1)</title>
<style>
  body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:880px;margin:0 auto;padding:32px;color:#1c1917;background:#fafaf9}
  h1{font-size:24px}
  .intro{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px}
  .card{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:18px 20px;margin:18px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .card header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #f5f5f4;padding-bottom:8px}
  .card h2{font-size:16px;margin:0}
  .badge{font-size:12px;background:#eef2ff;color:#3730a3;border:1px solid #e0e7ff;border-radius:999px;padding:3px 10px;white-space:nowrap}
  .meta{font-size:13px;color:#57534e;margin:10px 0}
  pre{white-space:pre-wrap;background:#fafaf9;border:1px solid #f0efee;border-radius:8px;padding:14px;font:13px/1.55 ui-monospace,Menlo,monospace;margin:0}
</style></head><body>
<h1>TIREOIDE OBJETIVO — Boletim de avaliação (Sprint 1, render determinístico)</h1>
<div class="intro">
  <p>Cada caso: <b>feições montadas à mão</b> → <b>ACR TI-RADS que o código calculou</b> → <b>laudo objetivo</b>
  (TÉCNICA / ACHADOS / IMPRESSÃO). Valide: (1) a <b>categorização ACR</b> (composição, ecogenicidade, forma,
  margem, focos ecogênicos); (2) a <b>conduta por diâmetro</b> (PAAF/controle); (3) a <b>fidelidade das frases</b>
  do estilo objetivo. O escore de Domingos NÃO é usado no objetivo.</p>
  <p style="font-size:13px;color:#57534e">Pontos ACR: COMPOSIÇÃO (cístico 0 · misto 1 · sólido 2) · ECOGENICIDADE
  (anecoica 0 · hiper/iso 1 · hipo 2) · FORMA (mais alta que larga 3) · MARGEM (irregular/espiculada 2) ·
  FOCOS (macro 1 · casca de ovo 2 · micro 3). Categoria: &lt;2→TR1 · 2→TR2 · 3→TR3 · 4-6→TR4 · ≥7→TR5.</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/tireoide-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);

// Sanity log dos pontos calculados (auditoria rápida no terminal).
for (const c of CASES) {
  const nods = [
    ...c.findings.lobo_direito.nodulos,
    ...c.findings.lobo_esquerdo.nodulos,
    ...c.findings.istmo.nodulos,
  ];
  for (const n of nods) {
    const acr = calcAcrTirads(n);
    console.log(`  ${c.nome} → ${acr ? `pontos=${acr.pontos} TR${acr.categoria}` : "null"}`);
  }
}
