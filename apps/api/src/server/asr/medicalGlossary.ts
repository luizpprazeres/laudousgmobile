const TRANSVERSAL_KEYTERMS = [
  "anecoico",
  "hipoecoico",
  "hiperecoico",
  "isoecoico",
  "ecotextura",
  "ecogenicidade",
  "ecográfico",
  "sombra acústica",
  "Doppler colorido",
  "transdutor",
  "córtico-medular",
  "parênquima",
] as const;

/// Termos obstétricos. ATENÇÃO: são um GRUPO de especialidade, não base —
/// mandar "Hadlock"/"Grannum"/"oligoâmnio" num exame de tireoide só dilui o
/// boost dos termos que importam ali (medido em 03/08, ver
/// docs/brainstorm-transcricao-ao-vivo-2026-08-02.md §1.1).
const OBSTETRIC_KEYTERMS = [
  "Hadlock",
  "Intergrowth",
  "Gratacós",
  "oligoâmnio",
  "polidrâmnio",
  // MBV — é a MEDIDA que decide oligo/polidrâmnio, e estava fora da lista.
  "maior bolsão vertical",
  "incisura",
  "ducto venoso",
  "artéria cerebral média",
  "translucência nucal",
  "pré-centralização",
  "cisterna magna",
  "osso nasal",
  "amniótico",
  "biometria",
  "cefálico",
  "placenta",
  "Grannum",
] as const;

/// Termos ginecológicos — antes viviam misturados no bloco obstétrico.
const GINECO_KEYTERMS = [
  "leiomioma",
  "adenomiose",
  "endometrioma",
  "miométrio",
  "endométrio",
  "anexial",
  "menopausa",
] as const;

const SPECIALTY_KEYTERMS = {
  obstetrico: OBSTETRIC_KEYTERMS,
  gineco: GINECO_KEYTERMS,
  msk: [
    "bursa",
    "subacromial",
    "subdeltóidea",
    "tendinopatia",
    "tendíneo",
    "supraespinal",
    "supraespinhoso",
    "infraespinal",
    "subescapular",
    "cabo longo do bíceps",
    "calcária",
    "entesófito",
    "bursite",
    "derrame articular",
    "cisto de Baker",
    "rotura",
    "fibrilar",
    "fáscia plantar",
    "epicondilite",
    "líquido sinovial",
  ],
  vascular: [
    "pampiniforme",
    "safena magna",
    "safena parva",
    "perfurante",
    "refluxo",
    "recanalização",
    "incompetência",
    "trombose",
    "poplítea",
    "femoral",
    "tibial",
    "fibular",
    "panturrilha",
    "carótida",
    "vertebral",
    "bulbo carotídeo",
    "médio-intimal",
    "anterógrado",
    "retrógrado",
    "fístula arteriovenosa",
    "anastomose",
  ],
  abdomen: [
    "colédoco",
    "hepatopatia",
    "esteatose",
    "colelitíase",
    "nefrolitíase",
    "pielocalicial",
    "seio renal",
    "ateromatose",
    "cálculo",
    "microlitíase",
    "cortical",
    "hilar",
    "esplênico",
    "pancreático",
  ],
  escrotal: [
    "epidídimo",
    "varicocele",
    "hidrocele",
    "microlitíase",
    "Valsalva",
    "testicular",
  ],
  tireoideMama: [
    "TI-RADS",
    "BI-RADS",
    "O-RADS",
    "istmo",
    "tireoidite",
    "Hashimoto",
    "fibroadenoma",
    "linfonodo",
    "retroareolar",
    "Robbins",
    "parótida",
    "submandibular",
  ],
  classificacoes: [
    "BI-RADS",
    "TI-RADS",
    "O-RADS",
    "PI-RADS",
    "FIGO",
    "Bosniak",
    "NASCET",
    "Sarteschi",
    "Papile",
  ],
} as const;

const CATEGORY_GROUPS: Record<string, readonly (keyof typeof SPECIALTY_KEYTERMS)[]> = {
  OBSTETRICA: ["obstetrico"],
  DOPPLER_OBSTETRICO: ["obstetrico", "vascular"],
  MORFOLOGICO: ["obstetrico"],
  PELVE_FEMININA: ["gineco"],
  CERVICOMETRIA: ["gineco", "obstetrico"],
  REGIAO_INGUINAL: ["msk", "vascular"],
  PAREDE_ABDOMINAL: ["msk", "abdomen"],
  PROSTATA_TRANSRETAL: ["escrotal", "abdomen"],
  PROSTATA_SUPRAPUBICA: ["escrotal", "abdomen"],
  TRANSFONTANELA: ["vascular"],
  OCULAR: ["msk"],
  MUSCULOESQUELETICO: ["msk"],
  MUSCULOESQUELETICO_V2: ["msk"],
  MUSCULOESQUELETICO_RARAS: ["msk"],
  PARTES_MOLES: ["msk"],
  DOPPLER_CAROTIDAS: ["vascular"],
  DOPPLER_VENOSO_MMII: ["vascular"],
  DOPPLER_VENOSO_MMII_MEDIDAS: ["vascular"],
  DOPPLER_ARTERIAL_MMII: ["vascular"],
  DOPPLER_FISTULA_AV: ["vascular"],
  DOPPLER_RENAL: ["vascular", "abdomen"],
  DOPPLER_VENOSO_MMSS: ["vascular"],
  DOPPLER_ARTERIAL_MMSS: ["vascular"],
  ABDOMEN_TOTAL: ["abdomen"],
  ABDOMEN_TOTAL_DOPPLER: ["abdomen", "vascular"],
  ABDOMEN_SUPERIOR: ["abdomen"],
  VIAS_URINARIAS: ["abdomen"],
  ESCROTAL: ["escrotal", "vascular"],
  TIREOIDE: ["tireoideMama"],
  PARATIREOIDE: ["tireoideMama"],
  CERVICAL: ["tireoideMama"],
  GLANDULAS_SALIVARES: ["tireoideMama"],
  MAMARIA: ["tireoideMama"],
};

function unique(terms: readonly string[]): string[] {
  return [...new Set(terms)];
}

/// Glossário COMPLETO. Continua sendo usado (a) como prompt de estilo do
/// Whisper em /api/transcribe e (b) como fallback quando não veio categoria.
/// `OBSTETRIC_KEYTERMS` entra por `SPECIALTY_KEYTERMS.obstetrico`.
export const ALL_MEDICAL_ASR_KEYTERMS = unique([
  ...TRANSVERSAL_KEYTERMS,
  ...Object.values(SPECIALTY_KEYTERMS).flat(),
]);

/// Base enviada em TODA categoria: jargão ecográfico universal + as
/// classificações (BI-RADS, TI-RADS…), que podem aparecer em qualquer exame.
const BASE_KEYTERMS = unique([
  ...TRANSVERSAL_KEYTERMS,
  ...SPECIALTY_KEYTERMS.classificacoes,
]);

/// Keyterms para o Deepgram, focados na categoria do exame.
///
/// Por que focar importa: medido em 03/08 com 18 amostras, keyterms elevam o
/// acerto de termo de 68% → 77%. Mas mandar o glossário inteiro (110 termos)
/// carrega, num exame de tireoide, 20+ termos obstétricos que só competem no
/// mesmo decode. Sem categoria, o fallback continua sendo a lista completa —
/// pior que focado, melhor que nada.
export function medicalAsrKeytermsForCategory(category: string | null): string[] {
  const normalized = category?.trim().toUpperCase();
  if (!normalized) return ALL_MEDICAL_ASR_KEYTERMS;

  const groups = CATEGORY_GROUPS[normalized];
  if (!groups) return ALL_MEDICAL_ASR_KEYTERMS;

  return unique([
    ...BASE_KEYTERMS,
    ...groups.flatMap((group) => SPECIALTY_KEYTERMS[group]),
  ]);
}
