/**
 * Showcase HTML didático: épico IG determinística + renderer PROSTATA (S6).
 * Para o Luiz ler e validar clinicamente. Gera docs/showcase-ig-prostata.html.
 * Rodar: tsx src/server/renderer/__tests__/showcase-ig-prostata.manual.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderObstetrica, type ObstetricaFindings } from "../categories/OBSTETRICA";
import {
  renderProstataSuprapubica,
  type ProstataSuprapubicaFindings,
} from "../categories/PROSTATA_SUPRAPUBICA";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── helpers de findings ──
const feto = (p: Partial<ObstetricaFindings["fetos"][number]> = {}): ObstetricaFindings["fetos"][number] => ({
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: 145, dbp_mm: 48, cc_mm: 175, ca_mm: 150, cf_mm: 30,
  ccn_mm: null, peso_g: 280, peso_variacao_g: null, percentil: null, ...p,
});
const O = (p: Partial<ObstetricaFindings> = {}): ObstetricaFindings => ({
  numero_fetos: 1, corionicidade: null, gestacao_inicial: false, fetos: [feto()],
  ig_semanas: 19, ig_dias: 4, dum: null,
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null,
  saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
  placenta_quantidade: null, placenta_localizacao: null, placenta_ecotextura: null,
  placenta_grau: null, liquido_tipo: null, liquido_ila_cm: null,
  liquido_mbv_por_feto_cm: null, liquido_classe: null, achados_adicionais: null, itens_conclusao_livres: [], observacoes_corpo_livres: [], ...p,
});
const P = (p: Partial<ProstataSuprapubicaFindings> = {}): ProstataSuprapubicaFindings => ({
  prostata_d1_cm: null, prostata_d2_cm: null, prostata_d3_cm: null,
  hiperplasia: false, calcificacoes: false, ipp_cm: null,
  bexiga_achado: null, volume_pre_miccional_ml: null,
  residuo_pos_miccional_ml: null, residuo_desprezivel: false,
  achados_adicionais: null, ...p,
});

/** Extrai o bloco de conclusão (CONCLUSÃO:/IMPRESSÃO:) para o destaque. */
function conclusao(laudo: string): string {
  const m = laudo.match(/(?:CONCLUSÃO|IMPRESSÃO):\s*([\s\S]*?)(?:\n\nObserva|$)/);
  return m?.[1]?.trim() ?? "";
}

type Caso = { nome: string; ditado: string; laudo: string; nota?: string };

function card(c: Caso): string {
  return `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="dit"><b>O que o médico ditou:</b> ${esc(c.ditado)}</p>
    ${c.nota ? `<p class="nota">${esc(c.nota)}</p>` : ""}
    <pre>${esc(c.laudo)}</pre>
    <div class="concl"><span>Conclusão →</span><pre>${esc(conclusao(c.laudo))}</pre></div>
  </section>`;
}

// ===========================================================================
// SEÇÃO 1 — IG determinística (regra Dr. Domingos)
// ===========================================================================
const REF_DIV = { primeira_us_data: "12/01/2026", primeira_us_ig_semanas: 8, primeira_us_ig_dias: 2, data_exame: "15/03/2026" };

const igCasos: Caso[] = [
  {
    nome: "A. Exame normal — sem 1ª US/DUM",
    ditado: "Biometria de hoje: 19 semanas e 4 dias. Nenhuma referência anterior.",
    laudo: renderObstetrica(O({ ig_semanas: 19, ig_dias: 4 }), null, { igCorrection: true }),
    nota: "Sem referência → só a biometria atual. (Idêntico ao comportamento de hoje.)",
  },
  {
    nome: "B. 1ª US CONCORDANTE com a biometria",
    ditado: "Biometria de hoje 17s1d. 1ª US em 12/01/2026 com 8s2d; hoje pela 1ª US dá 17s1d (igual).",
    laudo: renderObstetrica(O({ ig_semanas: 17, ig_dias: 1, ...REF_DIV }), null, { igCorrection: true }),
    nota: "Biometria = referência → conclusão só com a biometria. A prosa da 1ª US fica no corpo.",
  },
  {
    nome: "C. Divergência LEVE (≤ 5 dias) — NÃO corrige",
    ditado: "Biometria de hoje 17s4d. 1ª US dá 17s1d hoje (diferença de 3 dias).",
    laudo: renderObstetrica(O({ ig_semanas: 17, ig_dias: 4, ...REF_DIV }), null, { igCorrection: true }),
    nota: "Diferença ≤ 5 dias → âncora na biometria, sem mencionar correção (regra Domingos).",
  },
  {
    nome: "D. Divergência RELEVANTE (> 5 dias) — CORRIGE (clássico)",
    ditado: "Biometria de hoje 19s4d. 1ª US em 12/01 com 8s2d → hoje 17s1d (diferença de 17 dias). Corrija pela 1ª US.",
    laudo: renderObstetrica(O({ ig_semanas: 19, ig_dias: 4, ...REF_DIV, corrigir_ig: true }), null, { igCorrection: true }),
    nota: "Diferença > 5 dias → sinaliza a correção pela referência precoce, mantendo a biometria como âncora.",
  },
  {
    nome: "E. Mesmo caso D, estilo OBJETIVO (2 itens)",
    ditado: "Idem D, mas com o estilo de redação Objetivo (TÉCNICA/ACHADOS/IMPRESSÃO).",
    laudo: renderObstetrica(O({ ig_semanas: 19, ig_dias: 4, ...REF_DIV, corrigir_ig: true }), null, { igCorrection: true, objetivo: true }),
    nota: "No objetivo, a correção vira 2 itens separados na IMPRESSÃO.",
  },
  {
    nome: "F. Referência por DUM (em vez de 1ª US)",
    ditado: "Biometria de hoje 19s4d. DUM 01/01/2026 → hoje 19s5d... (exemplo divergente). Corrija pela DUM.",
    laudo: renderObstetrica(O({ ig_semanas: 22, ig_dias: 0, dum: "01/01/2026", ig_referencia_hoje_semanas: 17, ig_referencia_hoje_dias: 1, referencia_fonte: "dum", data_exame: "15/03/2026", corrigir_ig: true }), null, { igCorrection: true }),
    nota: "A fonte vira 'data da última menstruação' na conclusão.",
  },
];

// ===========================================================================
// SEÇÃO 2 — PRÓSTATA (transabdominal, renderer determinístico, curadoria A10)
// ===========================================================================
const prostCasos: Caso[] = [
  {
    nome: "1. Próstata normal",
    ditado: "Próstata 4,0 x 3,2 x 2,8 cm. Bexiga normal, volume pré-miccional 280 ml, resíduo desprezível.",
    laudo: renderProstataSuprapubica(P({ prostata_d1_cm: 4.0, prostata_d2_cm: 3.2, prostata_d3_cm: 2.8, volume_pre_miccional_ml: 280, residuo_desprezivel: true })),
    nota: "Peso calculado pela fórmula do elipsoide; conclusão traz só o peso (sem volume redundante).",
  },
  {
    nome: "2. Hiperplasia (HPB) + IPP Grau 3 + resíduo elevado",
    ditado: "Próstata aumentada, 5,5 x 4,8 x 4,5 cm. IPP 1,2 cm. Vol pré-miccional 320 ml, resíduo 150 ml.",
    laudo: renderProstataSuprapubica(P({ prostata_d1_cm: 5.5, prostata_d2_cm: 4.8, prostata_d3_cm: 4.5, hiperplasia: true, ipp_cm: 1.2, volume_pre_miccional_ml: 320, residuo_pos_miccional_ml: 150 })),
    nota: "HPB não é graduada (leve/mod/acent) — só o IPP é graduado. Resíduo > 100 ml vira alerta.",
  },
  {
    nome: "3. Calcificações + bexiga alterada",
    ditado: "Próstata 4,0 x 3,2 x 2,8 cm com calcificações. Bexiga com paredes espessadas e trabeculadas.",
    laudo: renderProstataSuprapubica(P({ prostata_d1_cm: 4.0, prostata_d2_cm: 3.2, prostata_d3_cm: 2.8, calcificacoes: true, bexiga_achado: "paredes espessadas e trabeculadas" })),
    nota: "Alteração vesical → correlação com obstrução infravesical na conclusão.",
  },
];

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Exemplos — IG determinística + Próstata</title>
<style>
  body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#1c1917;background:#fafaf9}
  h1{font-size:25px} h2{font-size:16px;margin:0}
  .sec{font-size:20px;margin:34px 0 6px;border-bottom:2px solid #e7e5e4;padding-bottom:6px}
  .intro{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px}
  .intro ul{margin:8px 0 0;padding-left:20px} .intro li{margin:4px 0}
  .card{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:18px 20px;margin:16px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .card header{border-bottom:1px solid #f5f5f4;padding-bottom:8px;margin-bottom:10px}
  .dit{font-size:13.5px;color:#374151;background:#f0f9ff;border-left:3px solid #38bdf8;padding:8px 12px;border-radius:4px;margin:0 0 8px}
  .nota{font-size:13px;color:#57534e;margin:6px 0 10px;font-style:italic}
  pre{white-space:pre-wrap;background:#fafaf9;border:1px solid #f0efee;border-radius:8px;padding:14px;font:13px/1.6 ui-monospace,Menlo,monospace;margin:0}
  .concl{margin-top:10px} .concl span{font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.04em}
  .concl pre{background:#f0fdf4;border-color:#bbf7d0;margin-top:4px}
</style></head><body>
<h1>Exemplos para validação — IG determinística + Próstata</h1>

<h2 class="sec">Parte 1 — Idade Gestacional determinística (regra Dr. Domingos)</h2>
<div class="intro"><p><b>A regra:</b> a âncora é <b>sempre a biometria atual</b>. A referência precoce
(1ª US ou DUM) só aparece na conclusão quando a diferença passa de <b>5 dias</b>.</p>
<ul>
<li><b>Igual</b> ou diferença <b>≤ 5 dias</b> → conclusão só com a biometria.</li>
<li>Diferença <b>&gt; 5 dias</b> → "...pela biometria atual, devendo ser corrigida pela {fonte}, compatível com {referência}".</li>
<li>A frase da 1ª US/DUM aparece no <b>corpo</b> do laudo como dado, não inventada pela IA.</li>
</ul>
<p style="margin:8px 0 0;font-size:13px;color:#92400e">⚠️ Tudo isto está atrás de uma chave (flag) <b>desligada</b> em produção — liga quando você validar.</p></div>
${igCasos.map(card).join("\n")}

<h2 class="sec">Parte 2 — Próstata (via transabdominal) — curadoria A10</h2>
<div class="intro"><p>Renderer determinístico: o código calcula o <b>peso</b> (fórmula do elipsoide) e
gradua o <b>IPP</b>; a estrutura sai garantida. Aplica seu feedback A10: título TRANSABDOMINAL,
conclusão só com o peso, IPP por grau (cm), sem graduar a HPB.</p></div>
${prostCasos.map(card).join("\n")}

</body></html>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/showcase-ig-prostata.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ showcase gerado: ${out}`);
console.log(`  ${igCasos.length} casos de IG + ${prostCasos.length} de próstata`);
