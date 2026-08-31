/**
 * Golden de integração: épico IG determinística PELO RENDERER (flag ON × OFF).
 * Prova que a correção Domingos atravessa renderObstetrica/renderMorfologico e
 * que com a flag OFF o laudo é byte-idêntico ao legado.
 * Rodar: tsx src/server/renderer/__tests__/ig-renderer.manual.ts
 */
import { renderObstetrica, type ObstetricaFindings } from "../categories/OBSTETRICA";
import { renderMorfologico, type MorfologicoFindings } from "../categories/MORFOLOGICO";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

const feto = (p: Partial<ObstetricaFindings["fetos"][number]> = {}): ObstetricaFindings["fetos"][number] => ({
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: 140, dbp_mm: 45, cc_mm: 170, ca_mm: 140, cf_mm: 28,
  ccn_mm: null, peso_g: 240, peso_variacao_g: null, percentil: null, bcf_alteracao: null, movimentos_fetais: null, cranio_achado: null, cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null, ...p,
});
const O = (p: Partial<ObstetricaFindings> = {}): ObstetricaFindings => ({
  numero_fetos: 1, corionicidade: null, gestacao_inicial: false, fetos: [feto()],
  ig_semanas: 19, ig_dias: 4, dum: null,
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null,
  saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
  placenta_quantidade: null, placenta_localizacao: null, placenta_ecotextura: null,
  placenta_grau: null, placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null, placenta_achado: null, placenta_achado_medidas: null, liquido_tipo: null, liquido_ila_cm: null,
  liquido_mbv_por_feto_cm: null, liquido_classe: null, achados_adicionais: null, itens_conclusao_livres: [], observacoes_corpo_livres: [], ...p,
});

// Caso com referência precoce divergente (>5d): biometria 19s4d, 1ªUS 12/01 (8s2d),
// exame 15/03 → R_hoje 17s1d → diff 17 dias → corrige.
const COM_REF: Partial<ObstetricaFindings> = {
  ig_semanas: 19, ig_dias: 4,
  primeira_us_data: "12/01/2026", primeira_us_ig_semanas: 8, primeira_us_ig_dias: 2,
  data_exame: "15/03/2026",
};

// ── OBSTETRICA flag OFF: referência IGNORADA (byte-stability) ──
{
  const off = renderObstetrica(O(COM_REF), null, { igCorrection: false });
  check("OBST OFF: conclusão só biometria", off.includes("Gestação em torno de 19 semanas e 4 dias."));
  check("OBST OFF: SEM frase de correção", !off.includes("devendo ser corrigida"));
  check("OBST OFF: SEM prosa da 1ª US", !off.includes("Primeira ultrassonografia realizada"));
  // byte-stability: igual ao laudo sem nenhum campo de referência
  const semRef = renderObstetrica(O({ ig_semanas: 19, ig_dias: 4 }), null, { igCorrection: false });
  check("OBST OFF: byte-idêntico ao legado", off === semRef, "diff entre OFF e sem-referência");
}

// ── OBSTETRICA flag ON: correção Domingos aplicada ──
{
  const on = renderObstetrica(O(COM_REF), null, { igCorrection: true });
  check(
    "OBST ON: conclusão com correção",
    on.includes("Gestação em torno de 19 semanas e 4 dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com 17 semanas e 1 dias."),
    on,
  );
  check(
    "OBST ON: prosa da 1ª US no corpo",
    on.includes("Primeira ultrassonografia realizada 12/01/2026 com 8 semanas e 2 dias. Hoje com 17 semanas e 1 dias."),
  );
}

// ── OBSTETRICA flag ON, divergência leve (≤5d): NÃO corrige ──
{
  const on = renderObstetrica(
    O({ ig_semanas: 17, ig_dias: 4, primeira_us_data: "12/01/2026", primeira_us_ig_semanas: 8, primeira_us_ig_dias: 2, data_exame: "15/03/2026" }),
    null, { igCorrection: true },
  ); // R_hoje 17s1d vs 17s4d → diff 3 → leve
  check("OBST ON leve: só biometria", on.includes("Gestação em torno de 17 semanas e 4 dias.") && !on.includes("devendo ser corrigida"));
}

// ── OBSTETRICA estilo OBJETIVO ON: 2 itens ──
{
  const objWS = "00000000-0000-0000-0000-000000000000"; // n/a — chamamos direto objetivo
  void objWS;
  const on = renderObstetrica(O(COM_REF), null, { igCorrection: true, objetivo: true });
  check(
    "OBST OBJ ON: item 1 biometria",
    on.includes("Gestação em torno de 19 semanas e 4 dias pela biometria atual."),
  );
  check(
    "OBST OBJ ON: item 2 corrigido",
    on.includes("Gestação em torno de 17 semanas e 1 dias corrigido pela ultrassonografia precoce."),
  );
}

// ── MORFOLOGICO flag OFF byte-stability + ON correção ──
const M = (p: Partial<MorfologicoFindings> = {}): MorfologicoFindings => ({
  trimestre: "2t", apresentacao: null, dorso: null, polo_cefalico: null, bcf_bpm: 145,
  ccn_mm: null, tn_mm: null, osso_nasal: null, ducto_venoso: null,
  uterina_ip_direita: null, uterina_ip_esquerda: null,
  dbp_mm: 50, cc_mm: 180, cerebelo_mm: 20, cisterna_magna_mm: 5, binocular_mm: 40, ca_mm: 160,
  femur_mm: 33, tibia_mm: 28, fibula_mm: 27, umero_mm: 30, radio_mm: 25, ulna_mm: 28,
  peso_g: 300, peso_variacao_g: null, percentil: null, genitalia: null,
  placenta_localizacao: "anterior", placenta_grau: "1", ila_cm: 12,
  ig_semanas: 22, ig_dias: 0, dum: null,
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null,
  achados_adicionais: null, ...p,
});
{
  const refM: Partial<MorfologicoFindings> = {
    ig_semanas: 22, ig_dias: 0,
    primeira_us_data: "12/01/2026", primeira_us_ig_semanas: 8, primeira_us_ig_dias: 2,
    data_exame: "15/03/2026", // R_hoje 17s1d vs 22s0d → diff 34 → corrige
  };
  const off = renderMorfologico(M(refM), null, { igCorrection: false });
  const semRef = renderMorfologico(M({ ig_semanas: 22, ig_dias: 0 }), null, { igCorrection: false });
  check("MORFO OFF: byte-idêntico ao legado", off === semRef);
  const on = renderMorfologico(M(refM), null, { igCorrection: true });
  check(
    "MORFO ON: conclusão com correção",
    on.includes("devendo ser corrigida pela ultrassonografia precoce, compatível com 17 semanas e 1 dias."),
    on,
  );
}

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
