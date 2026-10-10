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

/// Termos que só devem disputar o decode dentro de uma categoria específica.
/// Eles ficam fora de `ALL_MEDICAL_ASR_KEYTERMS`: o fallback legado já consome
/// 136 das 137 palavras validadas contra o Deepgram.
const CATEGORY_KEYTERMS: Record<string, readonly string[]> = {
  DOPPLER_RENAL: [
    "artéria renal",
    "aortorrenal",
    "relação aorto-renal",
    "RAR",
    "VPS",
    "índice de resistência",
    "intrarrenal",
    "tardus-parvus",
  ],
};

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
    ...(CATEGORY_KEYTERMS[normalized] ?? []),
  ]);
}

/**
 * W11 (10/10/2026) — AJUSTE DE KEYTERMS PELA GRAFIA QUE O MÉDICO ASSINA. Desligado por padrão;
 * liga por categoria com `DEEPGRAM_KEYTERMS_W11_CATEGORIES` (rollback: tirar a categoria da env).
 *
 * Base (doc oficial do Deepgram, lida em 10/10/2026 — URLs no relatório W11):
 *  - developers.deepgram.com/docs/keyterm: nova-3 aceita keyterm em transcrição monolíngue; limite de
 *    500 tokens por requisição (estourar = erro, sem truncar); foco em 20–50 termos; a transcrição
 *    "may not always exactly match the keyterm's formatting" → grafia final é do normalizador
 *    (pipeline/lexicoDaCasa.ts), não do keyterm;
 *  - changelog 2025/9/2 (nova-3 em pt/pt-BR) e 2026/9/24 (modelos novos de português, sem mudar a
 *    requisição): as medições de 03/08 e 06/08 deste arquivo são anteriores ao modelo atual.
 *
 * Mineração de 869 laudos (180 dias): o médico assina "supraespinhal" (108) e "infraespinhal" (72) —
 * a lista pedia "supraespinal/supraespinhoso/infraespinal"; "subdeltoidea" (87), não "subdeltóidea";
 * "córtico medular"/"corticomedular", não "córtico-medular"; na mama o ASR entrega
 * "superlateral/super lateral" mais que "superolateral".
 *
 * Só a lista POR CATEGORIA muda; o fallback `ALL_MEDICAL_ASR_KEYTERMS` (no teto) não é tocado.
 */
const W11_TROCAS: Readonly<Record<string, string | null>> = {
  supraespinal: "supraespinhal",
  supraespinhoso: null,
  infraespinal: "infraespinhal",
  "subdeltóidea": "subdeltoidea",
  "córtico-medular": null,
};
const W11_ACRESCIMOS: Readonly<Record<string, readonly string[]>> = {
  MAMARIA: ["superolateral", "inferolateral", "superomedial", "inferomedial"],
  MUSCULOESQUELETICO: ["metacarpofalangiana"],
  MUSCULOESQUELETICO_V2: ["metacarpofalangiana"],
};

/** Categorias com o ajuste W11 ligado (`undefined`/"" = nenhuma; "*" = todas). */
export function keytermsW11Ativo(category: string | null, valorEnv: string | undefined): boolean {
  const lista = (valorEnv ?? "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (!lista.length || !category) return false;
  return lista.includes("*") || lista.includes(category.trim().toUpperCase());
}

/** Lista da categoria com o ajuste W11 (trocas de grafia + acréscimos), sem duplicar. */
export function medicalAsrKeytermsW11(category: string): string[] {
  const base = medicalAsrKeytermsForCategory(category);
  const trocada = base.flatMap((t) => (t in W11_TROCAS ? (W11_TROCAS[t] === null ? [] : [W11_TROCAS[t] as string]) : [t]));
  return unique([...trocada, ...(W11_ACRESCIMOS[category.trim().toUpperCase()] ?? [])]);
}
