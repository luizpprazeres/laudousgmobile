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
  // UMA palavra de propósito: "maior bolsão vertical" custa 3 e estoura o teto
  // de tokens do Deepgram no fallback `ALL` (ver KEYTERM_WORD_BUDGET abaixo).
  "bolsão",
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

/**
 * Teto de palavras da lista de keyterms enviada ao Deepgram.
 *
 * O Deepgram rejeita a REQUISIÇÃO INTEIRA quando a lista é grande demais:
 *
 *   HTTP 400 — "Keyterm limit exceeded. The maximum number of tokens across
 *               all keyterms is 500."
 *
 * O limite real é em **tokens de subpalavra**, que não dá para contar aqui.
 * Palavras são o proxy. Medido contra a API em 06/08 com este vocabulário:
 * **137 palavras passam, 138 dão 400.**
 *
 * ⚠️ POR QUE ISSO É PERIGOSO E SILENCIOSO: o cliente iOS tem um fallback que
 * reconecta SEM keyterms quando a conexão com eles falha. Então estourar o teto
 * não quebra o app — só derruba o ditado de ~85% para ~66% de acerto de termo,
 * sem erro visível em lugar nenhum. Foi exatamente o que aconteceu quando
 * "maior bolsão vertical" (3 palavras) entrou na lista.
 *
 * A margem aqui é de 1 palavra. Isso é pouco. A saída estrutural é `ALL` deixar
 * de ser "tudo" — ver a nota em ALL_MEDICAL_ASR_KEYTERMS.
 */
export const KEYTERM_WORD_BUDGET = 137;

/** Conta palavras como o Deepgram cobra: somadas em todos os termos. */
export function keytermWordCount(terms: readonly string[]): number {
  return terms.reduce((n, t) => n + t.trim().split(/\s+/).length, 0);
}

/// Glossário COMPLETO. Continua sendo usado (a) como prompt de estilo do
/// Whisper em /api/transcribe e (b) como fallback quando não veio categoria.
/// `OBSTETRIC_KEYTERMS` entra por `SPECIALTY_KEYTERMS.obstetrico`.
///
/// ⚠️ ESTA LISTA VIVE NA BEIRA DO TETO do Deepgram (ver KEYTERM_WORD_BUDGET).
/// Enquanto o cliente não mandar `?category=` sempre, é ELA que vai para o ar —
/// e ela é, ao mesmo tempo, a maior e a menos relevante das opções. As duas
/// saídas estruturais, em ordem de preferência:
///   1. garantir `?category=` em todos os clientes, tornando este fallback raro;
///   2. este fallback deixar de ser "tudo" e virar um subconjunto curado.
/// Enquanto nenhuma das duas acontecer, o teste de orçamento é o que segura.
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
