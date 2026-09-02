/**
 * Boletim de avaliação clínica do MORFOLOGICO estilo OBJETIVO (Sprint 2) — render
 * DETERMINÍSTICO (sem LLM). Gera HTML com casos representativos (1º e 2º trimestre)
 * para o Luiz validar a fidelidade das frases, a 1 casa decimal e o IP médio das
 * uterinas (cálculo reusado).
 *
 * Rodar: tsx src/server/renderer/__tests__/morfologico-objetivo-boletim.manual.ts
 * Saída: docs/morfologico-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderMorfologico,
  type MorfologicoFindings,
} from "../categories/MORFOLOGICO";

const F = (p: Partial<MorfologicoFindings>): MorfologicoFindings => ({
  trimestre: "2t", apresentacao: null, dorso: null, polo_cefalico: null, bcf_bpm: 145,
  ccn_mm: null, tn_mm: null, osso_nasal: null, regurgitacao_tricuspide: null, ducto_venoso: null,
  uterina_ip_direita: null, uterina_ip_esquerda: null,
  dbp_mm: null, cc_mm: null, cerebelo_mm: null, cisterna_magna_mm: null, binocular_mm: null, ca_mm: null,
  femur_mm: null, tibia_mm: null, fibula_mm: null, umero_mm: null, radio_mm: null, ulna_mm: null,
  peso_g: null, peso_variacao_g: null, percentil: null, genitalia: null,
  placenta_localizacao: null, placenta_grau: null, ila_cm: null,
  ig_semanas: null, ig_dias: null, dum: null,
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null, achados_adicionais: null,
  ...p,
});

const render = (f: MorfologicoFindings) => renderMorfologico(f, null, { objetivo: true });

type Caso = { nome: string; descricao: string; findings: MorfologicoFindings };

const CASES: Caso[] = [
  {
    nome: "1. Morfológico 1º trimestre (normal)",
    descricao: "CCN, TN, osso nasal presente, ducto venoso normal, IP uterinas.",
    findings: F({
      trimestre: "1t", ig_semanas: 12, ig_dias: 3, bcf_bpm: 162,
      ccn_mm: 61.5, tn_mm: 1.4, osso_nasal: "presente", regurgitacao_tricuspide: "ausente", ducto_venoso: "normal",
      uterina_ip_direita: 1.2, uterina_ip_esquerda: 1.4,
      placenta_localizacao: "anterior", placenta_grau: "0",
    }),
  },
  {
    nome: "2. Morfológico 1º trimestre (ducto venoso alterado)",
    descricao: "Onda A reversa → impressão de Doppler alterado.",
    findings: F({
      trimestre: "1t", ig_semanas: 13, ig_dias: 0, bcf_bpm: 158,
      ccn_mm: 70.2, tn_mm: 3.1, osso_nasal: "ausente", regurgitacao_tricuspide: "presente", ducto_venoso: "alterado",
    }),
  },
  {
    nome: "3. Morfológico 2º trimestre (normal completo)",
    descricao: "Biometria completa, genitália, placenta, ILA.",
    findings: F({
      trimestre: "2t", ig_semanas: 22, ig_dias: 1, bcf_bpm: 146,
      apresentacao: "cefálico", dorso: "esquerda",
      dbp_mm: 52.3, cc_mm: 195.4, cerebelo_mm: 23.1, cisterna_magna_mm: 5.4, binocular_mm: 41.2,
      ca_mm: 175.6, femur_mm: 37.4, tibia_mm: 32.1, fibula_mm: 31.0,
      umero_mm: 35.2, radio_mm: 28.4, ulna_mm: 30.1,
      peso_g: 480, percentil: 45, genitalia: "feminino",
      placenta_localizacao: "posterior", placenta_grau: "1", ila_cm: 14.2,
    }),
  },
  {
    nome: "4. Morfológico 3º trimestre",
    descricao: "Sem distância binocular nem colo (decisão Luiz); placenta heterogênea.",
    findings: F({
      trimestre: "3t", ig_semanas: 32, ig_dias: 0, bcf_bpm: 140,
      apresentacao: "pélvico",
      dbp_mm: 84.1, cc_mm: 305.2, cerebelo_mm: 42.3, cisterna_magna_mm: 6.1,
      ca_mm: 290.4, femur_mm: 62.1, tibia_mm: 54.0, fibula_mm: 52.3,
      umero_mm: 56.2, radio_mm: 48.1, ulna_mm: 50.0,
      peso_g: 1850, genitalia: "masculino",
      placenta_localizacao: "anterior", placenta_grau: "2", ila_cm: 11.5,
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
<title>MORFOLOGICO OBJETIVO — Boletim de avaliação (Sprint 2)</title>
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
<h1>MORFOLOGICO OBJETIVO — Boletim de avaliação (Sprint 2, render determinístico)</h1>
<div class="intro"><p>Cada caso: <b>achados montados à mão</b> → <b>laudo objetivo</b>
(TÉCNICA / ACHADOS / IMPRESSÃO). Valide: (1) <b>1 casa decimal</b>; (2) <b>IP médio das uterinas</b>
(cálculo reusado no 1t); (3) trimestres 1t/2t/3t; (4) concordância de gênero. Percentil só é reproduzido.</p></div>
${cards}
</body></html>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/morfologico-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
