/**
 * UUIDs ESTÁVEIS para writing_styles. Referenciados em código, prompts,
 * golden cases e seeds. NUNCA mude sem migration que faça update em todas
 * as referências.
 */
export const WRITING_STYLE_IDS = {
  CLASSICO_COMPLETO: "11111111-1111-4111-8111-111111111111",
  DIRETO_OBJETIVO: "22222222-2222-4222-8222-222222222222",
  DETALHADO_PROTOCOLAR: "33333333-3333-4333-8333-333333333333",
  OBJETIVO: "44444444-4444-4444-8444-444444444444",
} as const;

/**
 * Estilos do Mobile vs estilos do LaudoUSG original (ver _extraction/08-styles.md):
 *  - CLASSICO_COMPLETO   ↔ original 'classic'  (cobertura completa, todas estruturas)
 *  - DIRETO_OBJETIVO     ↔ original 'direct'   (frases curtas, foco em achados)
 *  - DETALHADO_PROTOCOLAR ↔ NOVO              (sem equivalente no original)
 */
export const WRITING_STYLES_SEED = [
  {
    id: WRITING_STYLE_IDS.CLASSICO_COMPLETO,
    code: "CLASSICO_COMPLETO" as const,
    name: "Clássico completo",
    description:
      "Estilo padrão tradicional, cobre todas as estruturas com descrições completas.",
  },
  {
    id: WRITING_STYLE_IDS.DIRETO_OBJETIVO,
    code: "DIRETO_OBJETIVO" as const,
    name: "Direto objetivo",
    description:
      "Frases curtas, sem redundância, foco em achados relevantes.",
  },
  {
    id: WRITING_STYLE_IDS.DETALHADO_PROTOCOLAR,
    code: "DETALHADO_PROTOCOLAR" as const,
    name: "Detalhado protocolar",
    description:
      "Segue rigorosamente protocolos institucionais, com seções fixas e terminologia padronizada.",
  },
  {
    id: WRITING_STYLE_IDS.OBJETIVO,
    code: "OBJETIVO" as const,
    name: "Objetivo",
    description:
      "Estrutura técnica concisa, frases curtas e preservação integral dos dados clínicos relevantes.",
  },
];

/**
 * Categorias — codes LITERAIS extraídos do LaudoUSG original
 * (ver _extraction/01-categories.md). Mantemos os codes do original para
 * facilitar o mapeamento direto com a biblioteca RAG e os prompts nativos.
 *
 * Nota: `DOPPLER` existe no enum original mas SEM prompt nativo — usado
 * apenas como bucket de keyterms para Deepgram. Não incluído aqui.
 */
export const CATEGORIES_SEED: { code: string; label: string }[] = [
  // Obstétrico
  { code: "OBSTETRICA", label: "Obstétrica" },
  { code: "DOPPLER_OBSTETRICO", label: "Doppler Obstétrico" },
  { code: "MORFOLOGICO", label: "Morfológico" },
  { code: "CERVICOMETRIA", label: "Cervicometria (colo uterino)" },

  // Abdome
  { code: "ABDOMEN_TOTAL", label: "Abdome Total" },
  { code: "ABDOMEN_TOTAL_DOPPLER", label: "Abdome Total c/ Doppler" },
  { code: "ABDOMEN_SUPERIOR", label: "Abdome Superior" },
  { code: "PAREDE_ABDOMINAL", label: "Parede Abdominal" },

  // Urinário / pelve / reprodutor
  { code: "VIAS_URINARIAS", label: "Vias Urinárias" },
  { code: "PELVE_FEMININA", label: "Pelve" },
  { code: "ESCROTAL", label: "Escrotal" },
  { code: "REGIAO_INGUINAL", label: "Região Inguinal" },
  { code: "PROSTATA_TRANSRETAL", label: "Próstata Transretal" },
  { code: "PROSTATA_SUPRAPUBICA", label: "Próstata Suprapúbica" },

  // Pescoço / superficial
  { code: "TIREOIDE", label: "Tireoide" },
  { code: "PARATIREOIDE", label: "Paratireoide" },
  { code: "GLANDULAS_SALIVARES", label: "Glândulas Salivares" },
  { code: "CERVICAL", label: "Cervical" },
  { code: "MAMARIA", label: "Mamária" },
  { code: "PARTES_MOLES", label: "Partes Moles" },

  // MSK — V1 (legado) está marcado inactive=true no banco; só V2 vale.
  // Decisão do produto (2026-05-15): usar apenas MUSCULOESQUELETICO_V2 como
  // versão oficial; V1 (MUSCULOESQUELETICO) descartado.
  { code: "MUSCULOESQUELETICO_V2", label: "Musculoesquelético" },
  { code: "MUSCULOESQUELETICO_RARAS", label: "Musculoesquelético — Raras" },

  // Doppler vascular
  { code: "DOPPLER_CAROTIDAS", label: "Doppler Carótidas" },
  { code: "DOPPLER_VENOSO_MMII", label: "Doppler Venoso MMII — TVP" },
  { code: "DOPPLER_VENOSO_MMII_MEDIDAS", label: "Doppler Venoso MMII — Completo" },
  { code: "DOPPLER_ARTERIAL_MMII", label: "Doppler Arterial MMII" },
  { code: "DOPPLER_FISTULA_AV", label: "Doppler Fístula AV" },
  { code: "DOPPLER_RENAL", label: "Doppler Renal" },
  { code: "DOPPLER_VENOSO_MMSS", label: "Doppler Venoso MMSS" },
  { code: "DOPPLER_ARTERIAL_MMSS", label: "Doppler Arterial MMSS" },

  // Outros
  { code: "TRANSFONTANELA", label: "Transfontanela" },
  { code: "OCULAR", label: "Ocular" },
  { code: "TORAX", label: "Tórax" },
  { code: "QUADRIL_INFANTIL", label: "Quadril Infantil" },
];

/**
 * Categoria-piloto — primeira a receber RAG completo no Mobile.
 * Decidida por ter (a) maior volume de laudos reais (266 em 30d), (b) few-shots
 * em ambos estilos validados, (c) decisão explícita do produto. Ver
 * _extraction/99-handoff-summary.md.
 */
export const PILOT_CATEGORY_CODE = "ABDOMEN_TOTAL";
