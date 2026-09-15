import type { MorfologicoFindings } from "../categories/MORFOLOGICO";

export const OSSOS = [
  ["femur", "do f\u00eamur", "direito", "esquerdo"],
  ["tibia", "da t\u00edbia", "direita", "esquerda"],
  ["fibula", "da f\u00edbula", "direita", "esquerda"],
  ["umero", "do \u00famero", "direito", "esquerdo"],
  ["radio", "do r\u00e1dio", "direito", "esquerdo"],
  ["ulna", "da ulna", "direita", "esquerda"],
] as const;

// Fixture legada deliberadamente sem os novos campos opcionais.
export const BASE: MorfologicoFindings = {
  trimestre: "2t", apresentacao: null, dorso: null, polo_cefalico: null, bcf_bpm: 145,
  vitalidade: "normal", movimentos_fetais: "normais", cordao_vasos: "tres",
  liquido_avaliacao: "normal", anatomia_avaliada: true, anatomia_alterada: [],
  ccn_mm: 61.5, tn_mm: 1.4, osso_nasal: "presente",
  regurgitacao_tricuspide: "ausente", ducto_venoso: "normal",
  uterina_ip_direita: 1.2, uterina_ip_esquerda: 1.4,
  dbp_mm: 52.3, cc_mm: 195.4, cerebelo_mm: 23.1, cisterna_magna_mm: 5.4,
  binocular_mm: 41.2, ca_mm: 175.6,
  femur_mm: 41, tibia_mm: 36.2, fibula_mm: 35.3,
  umero_mm: 39.4, radio_mm: 32.5, ulna_mm: 34.6,
  peso_g: 480, peso_variacao_g: null, percentil: 45, genitalia: null,
  placenta_localizacao: "posterior", placenta_grau: "1", ila_cm: 14.2,
  ig_semanas: 22, ig_dias: 1, dum: null,
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null,
  achados_adicionais: null, itens_conclusao_livres: [],
  cervicometria: null, doppler: null, crescimento_fetal: null,
};

export function legado(trimestre: MorfologicoFindings["trimestre"]): MorfologicoFindings {
  return { ...BASE, trimestre, ig_semanas: trimestre === "1t" ? 12 : trimestre === "2t" ? 22 : 32 };
}
