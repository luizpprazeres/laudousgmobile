/**
 * Boletim de avaliação clínica de VIAS URINÁRIAS estilo OBJETIVO — render
 * DETERMINÍSTICO. Gera um HTML com N casos representativos: feições → laudo
 * objetivo completo (TÉCNICA/ACHADOS/IMPRESSÃO). Serve para o Luiz validar a
 * incorporação do achado na frase do rim, os mapeamentos achado↔impressão e a
 * fidelidade das frases. NÃO usa LLM.
 *
 * Casos: normal, litíase, hidronefrose, cisto, DRC (+ extras).
 * Rodar: tsx src/server/renderer/__tests__/vias-urinarias-objetivo-boletim.manual.ts
 * Saída: docs/vias-urinarias-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderViasUrinarias,
  type ViasUrinariasFindings,
  type ViasUrinariasRim,
  type ViasUrinariasBexiga,
  type ViasUrinariasAchado,
} from "../categories/VIAS_URINARIAS";

// Fábricas de fixtures.
const Rim = (p: Partial<ViasUrinariasRim> = {}): ViasUrinariasRim => ({
  medidas_cm: null,
  espessura_parenquima_cm: null,
  dimensao: null,
  situacao_baixa: false,
  rotacao: false,
  drc: false,
  alteracao_difusa: null,
  hidronefrose: null,
  achados: [],
  ...p,
});
const Bex = (p: Partial<ViasUrinariasBexiga> = {}): ViasUrinariasBexiga => ({
  avaliada: true,
  parede_alterada: null,
  conteudo_alterado: null,
  espessura_parede_mm: null,
  volume_pre_miccional_ml: null,
  residuo_pos_miccional_ml: null,
  ...p,
});
const Ach = (
  p: Partial<ViasUrinariasAchado> & { tipo: ViasUrinariasAchado["tipo"] },
): ViasUrinariasAchado => ({
  medidas_cm: null,
  localizacao: null,
  caracteristica: null,
  descricao_raw: null,
  ...p,
});
const F = (p: Partial<ViasUrinariasFindings> = {}): ViasUrinariasFindings => ({
  rim_direito: Rim(),
  rim_esquerdo: Rim(),
  bexiga: Bex(),
  dilatacao_ureteral: false,
  dilatacao_ureteral_descricao: null,
  achados_adicionais: null,
  ...p,
});

type Caso = {
  nome: string;
  feicoes: string;
  esperado: string;
  findings: ViasUrinariasFindings;
};

const render = (f: ViasUrinariasFindings) =>
  renderViasUrinarias(f, { objetivo: true });

const CASES: Caso[] = [
  {
    nome: "1. Normal (silêncio → normalidade)",
    feicoes: "Rins de dimensões normais, sem achados focais; bexiga normal.",
    esperado: "IMPRESSÃO: rins/ureteres/bexiga normais",
    findings: F({
      rim_direito: Rim({ medidas_cm: [10.5, 4.8, 5.2], espessura_parenquima_cm: 1.7 }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 5.0, 5.4], espessura_parenquima_cm: 1.8 }),
    }),
  },
  {
    nome: "2. Litíase (cálices; sombra acústica)",
    feicoes: "Cálculo de 0,6 cm nos cálices inferiores do rim direito.",
    esperado: "Achado incorporado; 'Litíase no rim direito, em cálices inferiores'",
    findings: F({
      rim_direito: Rim({
        medidas_cm: [10.2, 4.8, 5.1],
        espessura_parenquima_cm: 1.6,
        achados: [Ach({ tipo: "litiase", medidas_cm: [0.6], localizacao: "cálices inferiores" })],
      }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 5.0, 5.4], espessura_parenquima_cm: 1.8 }),
    }),
  },
  {
    nome: "3. Hidronefrose moderada (grau 2)",
    feicoes: "Dilatação pielocalicial moderada à esquerda.",
    esperado: "Imagens anecóicas no sistema pielocalicial; 'Hidronefrose moderada grau 2 à esquerda'",
    findings: F({
      rim_direito: Rim({ medidas_cm: [10.5, 4.8, 5.2], espessura_parenquima_cm: 1.7 }),
      rim_esquerdo: Rim({ medidas_cm: [11.0, 5.0, 5.5], hidronefrose: "moderada" }),
    }),
  },
  {
    nome: "4. Cisto renal simples (terço; reforço)",
    feicoes: "Cisto simples de 2,0 cm no terço superior do rim esquerdo.",
    esperado: "Achado incorporado; 'Cisto simples no rim esquerdo, no terço superior'",
    findings: F({
      rim_direito: Rim({ medidas_cm: [10.5, 4.8, 5.2], espessura_parenquima_cm: 1.7 }),
      rim_esquerdo: Rim({
        medidas_cm: [10.8, 5.0, 5.4],
        espessura_parenquima_cm: 1.8,
        achados: [Ach({ tipo: "cisto_simples", medidas_cm: [2.0, 1.8, 1.7], localizacao: "terço superior" })],
      }),
    }),
  },
  {
    nome: "5. Cisto complexo (aspecto inespecífico)",
    feicoes: "Cisto com calcificação periférica de 3,0 cm no terço médio do rim direito.",
    esperado: "Corpo incorpora complexidade; impressão 'de aspecto inespecífico'",
    findings: F({
      rim_direito: Rim({
        medidas_cm: [10.5, 4.8, 5.2],
        espessura_parenquima_cm: 1.7,
        achados: [Ach({ tipo: "cisto_complexo", caracteristica: "com calcificação periférica", medidas_cm: [3.0, 2.5, 2.4], localizacao: "terço médio" })],
      }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 5.0, 5.4], espessura_parenquima_cm: 1.8 }),
    }),
  },
  {
    nome: "6. Doença renal crônica (DRC) bilateral",
    feicoes: "Ambos os rins reduzidos, com perda da diferenciação corticomedular.",
    esperado: "Frase do rim reflete redução; impressão item único 'Sinais de doença renal crônica.'",
    findings: F({
      rim_direito: Rim({ drc: true, medidas_cm: [8.0, 3.5, 4.0], espessura_parenquima_cm: 0.9 }),
      rim_esquerdo: Rim({ drc: true, medidas_cm: [8.2, 3.6, 4.1], espessura_parenquima_cm: 1.0 }),
    }),
  },
  {
    nome: "7. Múltiplos achados no mesmo rim",
    feicoes: "Litíase em cálices inferiores + cisto simples no terço inferior (rim direito).",
    esperado: "Dois achados na mesma frase, separados por ';'",
    findings: F({
      rim_direito: Rim({
        medidas_cm: [10.2, 4.8, 5.1],
        espessura_parenquima_cm: 1.6,
        achados: [
          Ach({ tipo: "litiase", medidas_cm: [0.6], localizacao: "cálices inferiores" }),
          Ach({ tipo: "cisto_simples", medidas_cm: [0.8, 0.7, 0.6], localizacao: "terço inferior" }),
        ],
      }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 5.0, 5.4], espessura_parenquima_cm: 1.8 }),
    }),
  },
  {
    nome: "8. Resíduo pós-miccional aumentado",
    feicoes: "Volume pré-miccional 320 mL; resíduo pós-miccional 85 cm³.",
    esperado: "Volume pré no corpo; resíduo pós na impressão",
    findings: F({
      rim_direito: Rim({ medidas_cm: [10.5, 4.8, 5.2], espessura_parenquima_cm: 1.7 }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 5.0, 5.4], espessura_parenquima_cm: 1.8 }),
      bexiga: Bex({ volume_pre_miccional_ml: 320, residuo_pos_miccional_ml: 85 }),
    }),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map((c) => {
  const laudo = render(c.findings);
  return `
  <section class="card">
    <header>
      <h2>${esc(c.nome)}</h2>
    </header>
    <p class="meta"><b>Feições:</b> ${esc(c.feicoes)}<br/><b>Esperado (clínico):</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>VIAS URINÁRIAS OBJETIVO — Boletim de avaliação</title>
<style>
  body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:880px;margin:0 auto;padding:32px;color:#1c1917;background:#fafaf9}
  h1{font-size:24px}
  .intro{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px}
  .card{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:18px 20px;margin:18px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .card header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #f5f5f4;padding-bottom:8px}
  .card h2{font-size:16px;margin:0}
  .meta{font-size:13px;color:#57534e;margin:10px 0}
  pre{white-space:pre-wrap;background:#fafaf9;border:1px solid #f0efee;border-radius:8px;padding:14px;font:13px/1.55 ui-monospace,Menlo,monospace;margin:0}
</style></head><body>
<h1>VIAS URINÁRIAS OBJETIVO — Boletim de avaliação (render determinístico)</h1>
<div class="intro">
  <p>Cada caso: <b>feições montadas à mão</b> → <b>laudo objetivo</b> (TÉCNICA / ACHADOS / IMPRESSÃO).
  Valide: (1) o achado <b>INCORPORADO</b> na frase do rim (após "apresentando"), com a sequência
  imagem → ecogenicidade → tamanho → localização → fenômeno acústico; (2) os mapeamentos
  achado↔impressão (litíase → cálices; cisto → terço; cisto complexo "de aspecto inespecífico");
  (3) DRC bilateral → item único; (4) a fidelidade das frases do estilo objetivo.</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/vias-urinarias-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
