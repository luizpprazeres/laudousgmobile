/**
 * Boletim de avaliação clínica de VIAS URINÁRIAS estilo CLÁSSICO — render
 * DETERMINÍSTICO. Gera um HTML com casos representativos: feições montadas à mão
 * → laudo clássico completo (TÍTULO / COMENTÁRIOS / OS SEGUINTES ASPECTOS FORAM
 * OBSERVADOS / CONCLUSÃO). Serve para o Luiz validar a descrição morfológica e a
 * interpretação diagnóstica por tipo de achado renal/vesical. NÃO usa LLM.
 *
 * Rodar: tsx src/server/renderer/__tests__/vias-urinarias-boletim.manual.ts
 * Saída: docs/vias-urinarias-boletim.html
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

const Rim = (p: Partial<ViasUrinariasRim> = {}): ViasUrinariasRim => ({
  medidas_cm: null,
  espessura_parenquima_cm: null,
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

const CASES: Caso[] = [
  {
    nome: "1. Normal (sem achados)",
    feicoes: "Rins, bexiga e ureteres normais; sem achado focal.",
    esperado: "Rins ecograficamente normais; sem dilatação ureteral; bexiga normal.",
    findings: F({
      rim_direito: Rim({ medidas_cm: [10.5, 4.5, 5.0], espessura_parenquima_cm: 1.6 }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 4.6, 5.2], espessura_parenquima_cm: 1.7 }),
    }),
  },
  {
    nome: "2. Litíase renal",
    feicoes: "Cálculo de 0,6 cm em cálices inferiores do rim direito.",
    esperado: "Litíase no rim direito.",
    findings: F({
      rim_direito: Rim({
        medidas_cm: [10.2, 4.8, 5.1],
        espessura_parenquima_cm: 1.6,
        achados: [Ach({ tipo: "litiase", medidas_cm: [0.6], localizacao: "em cálices inferiores" })],
      }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 4.6, 5.2], espessura_parenquima_cm: 1.7 }),
    }),
  },
  {
    nome: "3. Hidronefrose moderada",
    feicoes: "Dilatação pielocalicial moderada (grau II) à esquerda.",
    esperado: "Hidronefrose moderada (grau II) à esquerda.",
    findings: F({
      rim_direito: Rim({ medidas_cm: [10.5, 4.5, 5.0], espessura_parenquima_cm: 1.6 }),
      rim_esquerdo: Rim({ medidas_cm: [11.5, 5.5, 6.0], espessura_parenquima_cm: 1.3, hidronefrose: "moderada" }),
    }),
  },
  {
    nome: "4. Cisto renal simples",
    feicoes: "Cisto anecoico homogêneo de 2,0 cm no polo superior do rim esquerdo.",
    esperado: "Cisto simples no rim esquerdo.",
    findings: F({
      rim_direito: Rim({ medidas_cm: [10.5, 4.5, 5.0], espessura_parenquima_cm: 1.6 }),
      rim_esquerdo: Rim({
        medidas_cm: [10.8, 4.6, 5.2],
        espessura_parenquima_cm: 1.7,
        achados: [Ach({ tipo: "cisto_simples", medidas_cm: [2.0, 1.8, 1.7], localizacao: "no polo superior" })],
      }),
    }),
  },
  {
    nome: "5. Cisto complexo (calcificação periférica)",
    feicoes: "Imagem cística com calcificação periférica no terço médio do rim direito.",
    esperado: "Imagem cística no rim direito com calcificação periférica (não chamar de simples).",
    findings: F({
      rim_direito: Rim({
        medidas_cm: [10.5, 4.5, 5.0],
        espessura_parenquima_cm: 1.6,
        achados: [Ach({ tipo: "cisto_complexo", caracteristica: "com calcificação periférica", medidas_cm: [3.0, 2.5, 2.4], localizacao: "no terço médio" })],
      }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 4.6, 5.2], espessura_parenquima_cm: 1.7 }),
    }),
  },
  {
    nome: "6. Resíduo pós-miccional",
    feicoes: "Volume pré-miccional 320 mL; resíduo pós-miccional 85 mL.",
    esperado: "Resíduo pós-miccional de 85,0 cm³.",
    findings: F({
      rim_direito: Rim({ medidas_cm: [10.5, 4.5, 5.0], espessura_parenquima_cm: 1.6 }),
      rim_esquerdo: Rim({ medidas_cm: [10.8, 4.6, 5.2], espessura_parenquima_cm: 1.7 }),
      bexiga: Bex({ volume_pre_miccional_ml: 320, espessura_parede_mm: 3, residuo_pos_miccional_ml: 85 }),
    }),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map((c) => {
  const laudo = renderViasUrinarias(c.findings);
  return `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="meta"><b>Feições:</b> ${esc(c.feicoes)}<br/><b>Esperado (clínico):</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>VIAS URINÁRIAS CLÁSSICO — Boletim de avaliação (DET-5)</title>
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
<h1>VIAS URINÁRIAS CLÁSSICO — Boletim de avaliação (DET-5, render determinístico)</h1>
<div class="intro">
  <p>Cada caso: <b>feições montadas à mão</b> → <b>laudo clássico completo</b> gerado por construção
  (TÍTULO / COMENTÁRIOS / OS SEGUINTES ASPECTOS FORAM OBSERVADOS / CONCLUSÃO). Valide:
  (1) a <b>descrição morfológica</b> dos rins/bexiga (sem diagnóstico no corpo); (2) a <b>interpretação
  diagnóstica</b> na CONCLUSÃO por tipo de achado; (3) a <b>fidelidade das frases</b> e o uso de
  <code>____</code> quando uma medida não foi ditada. Silêncio → normalidade; nada é inventado.</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/vias-urinarias-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
