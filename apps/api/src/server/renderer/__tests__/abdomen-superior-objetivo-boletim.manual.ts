/**
 * Boletim de avaliação clínica de ABDOME SUPERIOR estilo OBJETIVO — render
 * DETERMINÍSTICO. Gera um HTML com casos representativos: achados montados à mão
 * → laudo objetivo completo (TÍTULO / TÉCNICA / ACHADOS / IMPRESSÃO). Serve para o
 * Luiz validar a clínica por órgão (reusada do ABDOMEN_TOTAL) e a montagem
 * objetiva. É o abdome total objetivo SEM rins/bexiga. NÃO usa LLM.
 *
 * Rodar: tsx src/server/renderer/__tests__/abdomen-superior-objetivo-boletim.manual.ts
 * Saída: docs/abdomen-superior-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderAbdomenSuperior,
  type AbdomenSuperiorFindings,
} from "../categories/ABDOMEN_SUPERIOR";

type OrganState = AbdomenSuperiorFindings["orgaos"]["figado"];
type Finding = OrganState["achados"][number];

const Fnd = (p: Partial<Finding> & { tipo: Finding["tipo"] }): Finding => ({
  grau: null,
  quantidade: null,
  lateralidade: null,
  mobilidade: null,
  localizacao: null,
  medidas_cm: null,
  valor_ml: null,
  termo_do_medico: null,
  descricao_livre: null,
  ...p,
});

const normal: OrganState = { status: "normal", achados: [] };

const F = (over: Partial<AbdomenSuperiorFindings["orgaos"]>): AbdomenSuperiorFindings => ({
  orgaos: {
    figado: normal,
    veia_porta: normal,
    vesicula: normal,
    vias_biliares: normal,
    baco: normal,
    pancreas: normal,
    aorta: normal,
    veia_cava: normal,
    ...over,
  },
  observacoes_do_medico: null,
});

type Caso = {
  nome: string;
  feicoes: string;
  esperado: string;
  findings: AbdomenSuperiorFindings;
};

const CASES: Caso[] = [
  {
    nome: "1. Normal (sem achados)",
    feicoes: "Todos os órgãos do andar superior normais.",
    esperado: "IMPRESSÃO 'Estudo ultrassonográfico do abdome superior sem alterações significativas.'",
    findings: F({}),
  },
  {
    nome: "2. Esteatose hepática leve",
    feicoes: "Fígado com discreto aumento difuso da ecogenicidade.",
    esperado: "Esteatose hepática, grau leve.",
    findings: F({ figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "leve" })] } }),
  },
  {
    nome: "3. Esteatose hepática moderada",
    feicoes: "Aumento difuso da ecogenicidade com atenuação sonora.",
    esperado: "Esteatose hepática, grau moderado.",
    findings: F({ figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "moderado" })] } }),
  },
  {
    nome: "4. Cisto hepático",
    feicoes: "Imagem anecoica homogênea no segmento VII, 1,2 x 1,0 cm.",
    esperado: "Cisto hepático sem septações no segmento VII.",
    findings: F({
      figado: {
        status: "alterado",
        achados: [Fnd({ tipo: "cisto_simples", medidas_cm: [1.2, 1.0], localizacao: "segmento VII" })],
      },
    }),
  },
  {
    nome: "5. Litíase vesicular (cálculo único)",
    feicoes: "Imagem hiperecoica móvel com sombra acústica, 0,8 cm.",
    esperado: "Litíase da vesícula biliar.",
    findings: F({
      vesicula: {
        status: "alterado",
        achados: [Fnd({ tipo: "litiase", quantidade: "unica", medidas_cm: [0.8] })],
      },
    }),
  },
  {
    nome: "6. Litíase vesicular (múltiplos cálculos)",
    feicoes: "Múltiplas imagens hiperecoicas móveis, a menor ~0,4 cm.",
    esperado: "Litíase da vesícula biliar (sombras acústicas).",
    findings: F({
      vesicula: {
        status: "alterado",
        achados: [Fnd({ tipo: "litiase", quantidade: "multiplas", medidas_cm: [0.4] })],
      },
    }),
  },
  {
    nome: "7. Colecistectomia",
    feicoes: "Paciente colecistectomizada (ausência da vesícula).",
    esperado: "Ausência da imagem da vesícula — NÃO entra na impressão.",
    findings: F({ vesicula: { status: "ausente_cirurgico", achados: [] } }),
  },
  {
    nome: "8. Ateromatose da aorta",
    feicoes: "Aorta com imagens hiperecoicas aderidas às paredes.",
    esperado: "Placas de ateromas na aorta abdominal.",
    findings: F({ aorta: { status: "alterado", achados: [Fnd({ tipo: "ateromatose" })] } }),
  },
  {
    nome: "9. Múltiplos achados (esteatose + litíase + ateromatose)",
    feicoes: "Esteatose leve + cálculo único vesicular + ateromas na aorta.",
    esperado: "IMPRESSÃO numerada (1,2,3).",
    findings: F({
      figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "leve" })] },
      vesicula: { status: "alterado", achados: [Fnd({ tipo: "litiase", quantidade: "unica", medidas_cm: [0.9] })] },
      aorta: { status: "alterado", achados: [Fnd({ tipo: "ateromatose" })] },
    }),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map((c) => {
  const laudo = renderAbdomenSuperior(c.findings, { objetivo: true });
  return `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="meta"><b>Feições:</b> ${esc(c.feicoes)}<br/><b>Esperado (clínico):</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>ABDOME SUPERIOR OBJETIVO — Boletim de avaliação (DET-5)</title>
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
<h1>ABDOME SUPERIOR OBJETIVO — Boletim de avaliação (DET-5, render determinístico)</h1>
<div class="intro">
  <p>Cada caso: <b>achados montados à mão</b> → <b>laudo objetivo completo</b> gerado por construção
  (TÍTULO / TÉCNICA / ACHADOS / IMPRESSÃO). É o abdome total objetivo <b>sem</b> rins/bexiga; a clínica
  por órgão (fígado, vesícula com lógica de litíase, aorta…) é reusada do ABDOMEN_TOTAL (mesmas frases
  do clássico). Valide: (1) frases normais por órgão; (2) a lógica de esteatose/litíase/ateromatose;
  (3) a IMPRESSÃO numerada. Silêncio → normalidade; nada é inventado; <code>____</code> quando a medida
  não foi ditada.</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/abdomen-superior-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
