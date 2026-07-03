/**
 * Boletim de avaliação clínica da OBSTETRICA estilo OBJETIVO (Sprint 2) — render
 * DETERMINÍSTICO (sem LLM). Gera HTML com casos representativos (feto único 2t,
 * gemelar, gestação inicial) para o Luiz validar a fidelidade das frases, os
 * cálculos reusados (peso médio/divergência, DSM, líquido), a 1 casa decimal e a
 * ausência de alucinação gemelar (feto único nunca recebe "(feto A)").
 *
 * Rodar: tsx src/server/renderer/__tests__/obstetrica-objetivo-boletim.manual.ts
 * Saída: docs/obstetrica-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderObstetrica,
  type ObstetricaFindings,
} from "../categories/OBSTETRICA";

type Feto = ObstetricaFindings["fetos"][number];
const feto = (p: Partial<Feto>): Feto => ({
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: 140, dbp_mm: null, cc_mm: null, ca_mm: null,
  cf_mm: null, ccn_mm: null, peso_g: null, peso_variacao_g: null, percentil: null,
  ...p,
});
const F = (p: Partial<ObstetricaFindings>): ObstetricaFindings => ({
  numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
  fetos: [feto({})], ig_semanas: 30, ig_dias: 0, dum: null,
  saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
  placenta_quantidade: null, placenta_localizacao: null,
  placenta_ecotextura: null, placenta_grau: null, liquido_tipo: null,
  liquido_ila_cm: null, liquido_mbv_por_feto_cm: null, liquido_classe: null,
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null,
  achados_adicionais: null,
  itens_conclusao_livres: [], observacoes_corpo_livres: [],
  ...p,
});

const render = (f: ObstetricaFindings) => renderObstetrica(f, null, { objetivo: true });

type Caso = { nome: string; descricao: string; findings: ObstetricaFindings };

const CASES: Caso[] = [
  {
    nome: "1. Feto único — 2º trimestre",
    descricao: "Cefálica, dorso à esquerda, biometria completa, ILA, placenta.",
    findings: F({
      numero_fetos: 1,
      ig_semanas: 24, ig_dias: 3,
      fetos: [feto({ apresentacao: "cefálico", dorso: "à esquerda", bcf_bpm: 148, dbp_mm: 60.4, cc_mm: 220.1, ca_mm: 190.7, cf_mm: 42.3, peso_g: 680, percentil: 50 })],
      placenta_localizacao: "anterior", placenta_grau: "1",
      liquido_tipo: "ila", liquido_ila_cm: 12.4,
    }),
  },
  {
    nome: "2. Feto único — 3º trimestre (MBV, sem alucinação)",
    descricao: "Único com maior bolsão vertical — NUNCA '(feto A)'.",
    findings: F({
      numero_fetos: 1, ig_semanas: 34, ig_dias: 0,
      fetos: [feto({ apresentacao: "cefálico", bcf_bpm: 138, dbp_mm: 85.0, cc_mm: 316.2, ca_mm: 300.5, cf_mm: 67.1, peso_g: 2350, peso_variacao_g: 350 })],
      placenta_localizacao: "posterior", placenta_grau: "2",
      liquido_tipo: "mbv", liquido_mbv_por_feto_cm: [4.1],
    }),
  },
  {
    nome: "3. Gemelar dicoriônica (peso médio + divergência)",
    descricao: "Dois fetos, divergência ponderal calculada.",
    findings: F({
      numero_fetos: 2, corionicidade: "dicoriônica e diamniótica",
      ig_semanas: 28, ig_dias: 0,
      fetos: [
        feto({ rotulo: "A", posicao_relativa: "à direita", apresentacao: "cefálico", bcf_bpm: 145, dbp_mm: 70.2, cc_mm: 260.4, ca_mm: 240.1, cf_mm: 52.3, peso_g: 1200 }),
        feto({ rotulo: "B", posicao_relativa: "à esquerda", apresentacao: "pélvico", bcf_bpm: 150, dbp_mm: 68.1, cc_mm: 255.0, ca_mm: 230.5, cf_mm: 50.0, peso_g: 1050 }),
      ],
      placenta_quantidade: 2, placenta_localizacao: "anterior e posterior", placenta_grau: "1",
      liquido_tipo: "mbv", liquido_mbv_por_feto_cm: [4.2, 3.8],
    }),
  },
  {
    nome: "4. Gemelar com divergência significativa (>=20%)",
    descricao: "Divergência ponderal acima de 20% — impressão alerta.",
    findings: F({
      numero_fetos: 2, corionicidade: "monocoriônica e diamniótica",
      ig_semanas: 30, ig_dias: 0,
      fetos: [
        feto({ rotulo: "A", apresentacao: "cefálico", bcf_bpm: 144, peso_g: 1500 }),
        feto({ rotulo: "B", apresentacao: "cefálico", bcf_bpm: 148, peso_g: 1100 }),
      ],
      liquido_tipo: "normal",
    }),
  },
  {
    nome: "5. Gestação inicial (saco gestacional / CCN)",
    descricao: "DSM calculado das 3 medidas; embrião único.",
    findings: F({
      numero_fetos: 1, gestacao_inicial: true, ig_semanas: 8, ig_dias: 2,
      fetos: [feto({ bcf_bpm: 165, ccn_mm: 16.4 })],
      saco_gestacional_medidas_mm: [20.3, 10.4, 15.4],
      liquido_tipo: "normal",
    }),
  },
  {
    nome: "6. Gestação inicial — DSM ditado direto",
    descricao: "DSM ditado ('15,3') vence as medidas.",
    findings: F({
      numero_fetos: 1, gestacao_inicial: true, ig_semanas: 7, ig_dias: 0,
      fetos: [feto({ bcf_bpm: 158, ccn_mm: 11.2 })],
      saco_gestacional_mm: 15.3,
    }),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map((c) => {
  const laudo = render(c.findings);
  return `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="meta">${esc(c.descricao)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>OBSTETRICA OBJETIVO — Boletim de avaliação (Sprint 2)</title>
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
<h1>OBSTETRICA OBJETIVO — Boletim de avaliação (Sprint 2, render determinístico)</h1>
<div class="intro"><p>Cada caso: <b>achados montados à mão</b> → <b>laudo objetivo</b>
(TÉCNICA / ACHADOS / IMPRESSÃO). Valide: (1) <b>1 casa decimal</b> em todas as medidas;
(2) cálculos reusados (<b>peso médio / divergência ponderal, DSM, líquido</b>);
(3) <b>sem alucinação gemelar</b> (feto único nunca recebe "(feto A)"); (4) concordância de gênero.</p></div>
${cards}
</body></html>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/obstetrica-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
