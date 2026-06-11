import type { RagBlockForPrompt } from "@laudousg/shared";
import { getDbClient, schema } from "@laudousg/db";
import { and, eq } from "drizzle-orm";
import { env } from "../env";

/**
 * DET-1 — Bundle determinístico (substitui o retriever vetorial para as
 * categorias listadas em DETERMINISTIC_BUNDLE_CATEGORIES).
 *
 * Carrega TODOS os blocos validados da (categoria, estilo) por chave fixa:
 * SEM embedding, SEM quota por kind, SEM RPC vetorial. Conhecimento de
 * categoria é pequeno e curado — cabe inteiro no contexto, sempre
 * (ADR-0004). Mesmo input → mesmo bundle → mesmo prompt (prefixo estável
 * pro prompt caching da OpenAI).
 *
 * Variantes de modelo conflitantes (ex: ABDOMEN_TOTAL padrão × Doppler
 * esplâncnico) NUNCA entram juntas: seleção condicional EXPLÍCITA por
 * gatilho textual no ditado (ver MODELO_VARIANT_SELECTORS). No DET-3 isso
 * vira entidade de 1ª classe (report_template_variants + preferência da
 * conta).
 */

/** Ordem semântica fixa dos kinds na montagem (espelha buildSystemMessage). */
const KIND_ORDER = [
  "modelo",
  "regra",
  "frase",
  "conclusao",
  "excecao",
  "comentario_tecnico",
  "exemplo",
] as const;

const kindRank = (kind: string): number => {
  const i = (KIND_ORDER as readonly string[]).indexOf(kind);
  return i === -1 ? KIND_ORDER.length : i;
};

/**
 * Seleção condicional de variante de modelo (DET-2). Categorias com >1
 * `kind=modelo` validado por estilo (máscaras mutuamente exclusivas) precisam
 * escolher EXATAMENTE UMA por ditado — senão o writer recebe máscaras
 * conflitantes (ex: 1º + 2º + 3º trimestre juntos). Determinístico por chave,
 * NUNCA por similaridade.
 *
 * Cada modelo carrega a tag `variant:<chave>`. O seletor:
 *   1. avalia `rules` em ordem; a 1ª com `trigger` casando (e `negation` NÃO
 *      casando) escolhe a variante;
 *   2. se nenhuma casa → `defaultVariant`;
 *   3. mantém só os modelos com `variant:<escolhida>`;
 *   4. variante escolhida sem modelo no DB → BUNDLE_VARIANT_EMPTY (erro alto e
 *      claro, NUNCA fallback silencioso pra máscara errada).
 *
 * NEGAÇÃO tem precedência sobre o gatilho (reviews dex1/dex2): "sem Doppler",
 * "não é exame de TVP", "não é primeiro trimestre".
 */
type VariantRule = { variant: string; trigger: RegExp; negation?: RegExp };
type ModelVariantSelector = { rules: VariantRule[]; defaultVariant: string };

const VARIANT_TAG_PREFIX = "variant:";

// Gatilho Doppler reaproveitado (abdome + tireoide): captura "doppler"/
// "esplâncnico" como pedido positivo.
const DOPPLER_TRIGGER = /doppler|espl[âa]ncnic\w*/i;
// Negação de Doppler nas duas direções (pré e pós-posta) — ver DET-1.
const DOPPLER_NEGATION = new RegExp(
  [
    String.raw`\b(?:sem|n[ãa]o)\s+(?:(?:foi|foram|fiz|fizemos|faremos|vou|vamos|quero|queremos)\s+)?(?:(?:incluir|inclu[íi]\w*|fazer|feit\w+|realizar|realiz\w+|colocar|usar|solicit\w+|ped(?:ir|id\w*)|estud(?:o|ar)|avalia(?:r|[çc][ãa]o)|precis\w+(?:\s+de)?|exame\s+(?:de\s+)?)\s*)?(?:[oa]s?\s+)?(?:tabela\s+(?:d[oe]\s+)?)?(?:estudo\s+)?(?:doppler|espl[âa]ncnic\w*)`,
    String.raw`(?:doppler|espl[âa]ncnic\w*)(?:\s+\S+){0,2}?\s+n[ãa]o\s+(?:foi\s+|ser[áa]\s+)?(?:realizad|feit|inclu[íi]d|solicitad|avaliad|pedid|estudad)`,
  ].join("|"),
  "i",
);

const MODEL_VARIANT_SELECTORS: Record<string, ModelVariantSelector> = {
  // ABDOMEN_TOTAL: padrão × Doppler esplâncnico.
  ABDOMEN_TOTAL: {
    rules: [{ variant: "doppler", trigger: DOPPLER_TRIGGER, negation: DOPPLER_NEGATION }],
    defaultVariant: "padrao",
  },

  // DOPPLER_VENOSO_MMII: protocolo COMPLETO (padrão) × TVP-only (restrito).
  // Gatilho = pedido EXPLÍCITO de exame p/ TVP (não basta a palavra trombose
  // num achado negativo).
  DOPPLER_VENOSO_MMII: {
    rules: [
      {
        variant: "tvp-only",
        trigger:
          /(?:investigar|pesquisa(?:r)?\s+de|suspeita\s+de|afastar|descartar|protocolo\s+(?:de\s+)?|exame\s+(?:para|restrito\s+a?)\s*(?:de\s+)?)\s*(?:tvp|trombose)|d[-\s]?d[íi]mero|\bwells\b|urg[êe]ncia\s+venosa|\bpara\s+tvp\b/i,
        negation:
          /n[ãa]o\s+(?:é|sendo)?\s*(?:exame\s+)?(?:para|de)\s+tvp|sem\s+protocolo\s+(?:de\s+)?tvp/i,
      },
    ],
    defaultVariant: "completo",
  },

  // TIREOIDE: padrão × com Doppler.
  TIREOIDE: {
    rules: [{ variant: "doppler", trigger: DOPPLER_TRIGGER, negation: DOPPLER_NEGATION }],
    defaultVariant: "padrao",
  },

  // OBSTETRICA: gestação inicial (1T) × padrão (2T/3T). Default = padrão
  // (decisão Luiz: 2T quando ambíguo).
  OBSTETRICA: {
    rules: [
      {
        variant: "inicial",
        trigger:
          /obst[ée]trica\s+inicial|gesta[çc][ãa]o\s+inicial|primeiro\s+trimestre|\b1[ºo]?\s*trimestre\b|\b1t\b|saco\s+gestacional|ves[íi]cula\s+vitelina|\bccn\b|comprimento\s+cabe[çc]a[-\s]?n[áa]dega|embri[ãa]o|\b(?:[4-9]|1[0-3])\s*semanas\b/i,
        negation: /n[ãa]o\s+(?:é|e)\s+(?:gesta[çc][ãa]o\s+)?inicial|n[ãa]o\s+(?:é|e)\s+primeiro\s+trimestre/i,
      },
    ],
    defaultVariant: "padrao",
  },

  // MORFOLOGICO: 1T × 2T × 3T. Default = 2T (decisão Luiz). 1T e 3T têm
  // gatilhos fortes; 2T é o caminho seguro quando nada aponta os extremos.
  MORFOLOGICO: {
    rules: [
      {
        variant: "1t",
        trigger:
          /primeiro\s+trimestre|\b1[ºo]?\s*trimestre\b|\b1t\b|transluc[êe]ncia\s+nucal|\btn\b|\bccn\b|osso\s+nasal|ducto\s+venoso|\b(?:1[0-3]|[5-9])\s*semanas\b/i,
        negation: /n[ãa]o\s+(?:é|e)\s+(?:o\s+)?primeiro\s+trimestre|n[ãa]o\s+(?:é|e)\s+1[ºo]?\s*trimestre/i,
      },
      {
        variant: "3t",
        trigger:
          /terceiro\s+trimestre|\b3[ºo]?\s*trimestre\b|\b3t\b|\b(?:29|3[0-9]|4[0-2])\s*semanas\b/i,
        negation: /n[ãa]o\s+(?:é|e)\s+(?:o\s+)?terceiro\s+trimestre|n[ãa]o\s+(?:é|e)\s+3[ºo]?\s*trimestre/i,
      },
      {
        variant: "2t",
        trigger:
          /segundo\s+trimestre|\b2[ºo]?\s*trimestre\b|\b2t\b|\b(?:1[5-9]|2[0-8])\s*semanas\b/i,
      },
    ],
    defaultVariant: "2t",
  },

  // PELVE_FEMININA: pós-abortamento (precedência) × TA+TV × TV × TA.
  // Via não ditada → TA+TV (mais completo). Pós-abortamento NÃO casa negação/
  // história ("nega aborto") — só achados ativos.
  PELVE_FEMININA: {
    rules: [
      {
        variant: "pos-abortamento",
        trigger:
          /produtos?\s+retid|restos\s+ovulares|restos\s+placent|p[óo]s[-\s]?abort|controle\s+.{0,15}abort|esvaziamento\s+uterino|abort(?:o|amento)\s+(?:retido|incompleto|em\s+curso)/i,
      },
      {
        variant: "ta-tv",
        trigger:
          /(?:transvaginal|endovaginal|via\s+vaginal)[\s\S]{0,40}(?:transabdominal|suprap[úu]bic)|(?:transabdominal|suprap[úu]bic)[\s\S]{0,40}(?:transvaginal|endovaginal)/i,
      },
      { variant: "tv", trigger: /transvaginal|endovaginal|via\s+vaginal/i },
      { variant: "ta", trigger: /transabdominal|suprap[úu]bic|via\s+abdominal/i },
    ],
    defaultVariant: "ta-tv",
  },
};

function variantOf(tags: string[]): string | null {
  const t = tags.find((x) => x.startsWith(VARIANT_TAG_PREFIX));
  return t ? t.slice(VARIANT_TAG_PREFIX.length) : null;
}

function resolveVariant(selector: ModelVariantSelector, rawInput: string): string {
  for (const rule of selector.rules) {
    if (rule.trigger.test(rawInput) && !(rule.negation?.test(rawInput) ?? false)) {
      return rule.variant;
    }
  }
  return selector.defaultVariant;
}

export function categoriesWithDeterministicBundle(): Set<string> {
  return new Set(
    env()
      .DETERMINISTIC_BUNDLE_CATEGORIES.split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  );
}

export function isDeterministicBundleCategory(categoryCode: string): boolean {
  return categoriesWithDeterministicBundle().has(categoryCode);
}

export type BundleLoadError =
  /** Nenhum bloco validado para (categoria × estilo). */
  | { code: "BUNDLE_EMPTY" }
  /** Há blocos, mas nenhum kind=modelo após a seleção — laudo sem template é proibido. */
  | { code: "BUNDLE_NO_TEMPLATE" }
  /** Variante escolhida não tem modelo validado no DB. */
  | { code: "BUNDLE_VARIANT_EMPTY"; variantTag: string }
  /**
   * >1 modelo sobrou após a seleção (variantes conflitantes sem tag `variant:`
   * ou seletor ausente p/ categoria multi-modelo). Bloqueia ANTES do writer —
   * máscaras conflitantes no prompt = laudo não-determinístico.
   */
  | { code: "BUNDLE_MODEL_AMBIGUOUS"; titles: string[] };

export async function loadDeterministicBundle(args: {
  categoryCode: string;
  writingStyleId: string;
  /** Ditado cru/transcript — usado SÓ pra seleção condicional de variante de modelo. */
  rawInput: string;
}): Promise<
  | { blocks: RagBlockForPrompt[]; error: null }
  | { blocks: []; error: BundleLoadError }
> {
  const db = getDbClient();

  const rows = await db
    .select({
      id: schema.knowledgeBlocks.id,
      kind: schema.knowledgeBlocks.kind,
      title: schema.knowledgeBlocks.title,
      content: schema.knowledgeBlocks.content,
      priority: schema.knowledgeBlocks.priority,
      tags: schema.knowledgeBlocks.tags,
    })
    .from(schema.knowledgeBlocks)
    .where(
      and(
        eq(schema.knowledgeBlocks.categoryCode, args.categoryCode),
        eq(schema.knowledgeBlocks.writingStyleId, args.writingStyleId),
        eq(schema.knowledgeBlocks.status, "validated"),
      ),
    );

  if (rows.length === 0) {
    return { blocks: [], error: { code: "BUNDLE_EMPTY" } };
  }

  const selection = applyModeloVariantSelection(
    rows,
    args.categoryCode,
    args.rawInput,
  );
  if (selection.error) return { blocks: [], error: selection.error };
  const selected = selection.rows;

  // Gates de template (reviews dex1/dex2):
  const modelos = selected.filter((r) => r.kind === "modelo");
  //  - 0 modelos → laudo sem máscara. NUNCA seguir.
  if (modelos.length === 0) {
    return { blocks: [], error: { code: "BUNDLE_NO_TEMPLATE" } };
  }
  //  - >1 modelo → variantes conflitantes não desambiguadas. NUNCA seguir
  //    (writer receberia máscaras misturadas — ex: 1T+2T+3T).
  if (modelos.length > 1) {
    return {
      blocks: [],
      error: {
        code: "BUNDLE_MODEL_AMBIGUOUS",
        titles: modelos.map((m) => m.title),
      },
    };
  }

  // Ordenação total e estável: kind (ordem semântica) → priority DESC → id.
  // O id como último critério garante bundle byte-idêntico entre requests.
  selected.sort(
    (a, b) =>
      kindRank(a.kind) - kindRank(b.kind) ||
      b.priority - a.priority ||
      a.id.localeCompare(b.id),
  );

  return {
    blocks: selected.map((r) => ({
      id: r.id,
      kind: r.kind as RagBlockForPrompt["kind"],
      title: r.title,
      content: r.content,
      priority: r.priority,
      similarity: null,
    })),
    error: null,
  };
}

function applyModeloVariantSelection<
  T extends { kind: string; tags: string[] },
>(
  rows: T[],
  categoryCode: string,
  rawInput: string,
): { rows: T[]; error: null } | { rows: []; error: BundleLoadError } {
  const selector = MODEL_VARIANT_SELECTORS[categoryCode];
  const modelos = rows.filter((r) => r.kind === "modelo");
  // Sem seletor: só passa direto se a categoria tem no máximo 1 modelo. Com
  // 2+ modelos e nenhum seletor, o gate BUNDLE_MODEL_AMBIGUOUS bloqueia depois
  // (defesa em profundidade — categoria multi-modelo SEM seletor é erro de
  // config, não pode virar laudo conflitante).
  if (!selector) return { rows, error: null };

  const chosen = resolveVariant(selector, rawInput);
  const hasChosenModelo = modelos.some((r) => variantOf(r.tags) === chosen);
  // Variante escolhida sem modelo correspondente = erro alto e claro, NUNCA
  // fallback silencioso pra outra máscara.
  if (!hasChosenModelo) {
    return {
      rows: [],
      error: { code: "BUNDLE_VARIANT_EMPTY", variantTag: chosen },
    };
  }

  return {
    rows: rows.filter((r) => {
      if (r.kind !== "modelo") return true;
      return variantOf(r.tags) === chosen;
    }),
    error: null,
  };
}
