/**
 * Teste da camada flexível: guard de dedup + itens livres no renderer OBSTETRICA.
 * Garante: extra genuíno (comparação) entra; conteúdo determinístico ditado
 * verbatim (IG/líquido/peso) é DEDUPLICADO; lista vazia = byte-idêntico.
 * Rodar: tsx src/server/renderer/__tests__/camada-flexivel.manual.ts
 */
import {
  renderObstetrica,
  filterFreeConclusionItems,
  type ObstetricaFindings,
} from "../categories/OBSTETRICA";

let pass = 0, fail = 0;
const ck = (n: boolean, t: string, d?: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}${!n && d ? `\n   ${d}` : ""}`); };

const feto = (p = {}): ObstetricaFindings["fetos"][number] => ({
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: 145, dbp_mm: 48, cc_mm: 175, ca_mm: 150, cf_mm: 30,
  ccn_mm: null, peso_g: 280, peso_variacao_g: null, percentil: null, ...p,
});
const O = (p: Partial<ObstetricaFindings> = {}): ObstetricaFindings => ({
  numero_fetos: 1, corionicidade: null, gestacao_inicial: false, fetos: [feto()],
  ig_semanas: 22, ig_dias: 0, dum: null,
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
  referencia_fonte: null, corrigir_ig: null,
  saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
  placenta_quantidade: null, placenta_localizacao: null, placenta_ecotextura: null,
  placenta_grau: null, liquido_tipo: null, liquido_ila_cm: null,
  liquido_mbv_por_feto_cm: null, liquido_classe: null, achados_adicionais: null,
  itens_conclusao_livres: [], ...p,
});

// ── guard de dedup ──
ck(
  filterFreeConclusionItems(["O exame atual, comparado ao anterior de 19/05/2026, mostra evolução normal."]).length === 1,
  "guard MANTÉM extra genuíno (comparação)",
);
ck(filterFreeConclusionItems(["Gestação em torno de 26 semanas pela biometria atual, devendo ser corrigida pela ultrassonografia precoce compatível com 27 semanas."]).length === 0, "guard DROPA correção de IG ditada");
ck(filterFreeConclusionItems(["Gestação em torno de 22 semanas."]).length === 0, "guard DROPA IG");
ck(filterFreeConclusionItems(["Líquido amniótico em quantidade normal."]).length === 0, "guard DROPA líquido");
ck(filterFreeConclusionItems(["Peso fetal estimado adequado."]).length === 0, "guard DROPA peso");
ck(filterFreeConclusionItems(["Primeira ultrassonografia realizada em 12/01."]).length === 0, "guard DROPA 1ª US");
ck(filterFreeConclusionItems(["  ", ""]).length === 0, "guard DROPA vazios");

// ── renderer: extra genuíno entra ──
{
  const out = renderObstetrica(O({ itens_conclusao_livres: ["O exame atual, comparado ao anterior realizado em 19/05/2026, mostra evolução normal da gestação."] }), null, { flexivel: true });
  ck(out.includes("comparado ao anterior realizado em 19/05/2026, mostra evolução normal"), "renderer INSERE o extra genuíno na conclusão", out);
}

// ── renderer: conteúdo determinístico ditado verbatim NÃO duplica (mesmo flexivel ON) ──
{
  const out = renderObstetrica(
    O({ itens_conclusao_livres: ["Gestação em torno de 22 semanas pela biometria atual, devendo ser corrigida pela ultrassonografia precoce compatível com 24 semanas."] }),
    null,
    { flexivel: true },
  );
  ck((out.match(/devendo ser corrigida/g) ?? []).length === 0, "renderer NÃO duplica correção de IG ditada verbatim (guard dropou)");
}

// ── byte-stability: lista vazia = idêntico ao sem o campo ──
{
  const a = renderObstetrica(O({ itens_conclusao_livres: [] }));
  const b = renderObstetrica(O({ ig_semanas: 22, ig_dias: 0 }));
  ck(a === b, "byte-stability: itens vazios = idêntico ao legado");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
