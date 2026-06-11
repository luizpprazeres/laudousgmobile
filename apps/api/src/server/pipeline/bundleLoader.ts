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
 * Seleção condicional de variante de modelo por categoria. Para a categoria
 * com seletor, blocos kind=modelo são particionados pela tag da variante
 * alternativa: gatilho presente no ditado → entra SÓ a variante alternativa;
 * ausente → entra SÓ o modelo padrão (sem a tag). Determinístico por
 * construção — nunca por similaridade.
 *
 * NEGAÇÃO tem precedência sobre o gatilho (review dex1): "sem Doppler",
 * "não incluir Doppler", "não fazer o Doppler" selecionam o modelo PADRÃO
 * mesmo contendo a palavra-gatilho.
 */
const MODELO_VARIANT_SELECTORS: Record<
  string,
  { variantTag: string; trigger: RegExp; negation: RegExp }
> = {
  // DOPPLER_VENOSO_MMII: protocolo COMPLETO (padrão) × protocolo TVP-only
  // (variante, tag protocolo-restrito). Gatilho = pedido EXPLÍCITO de exame
  // para TVP (investigar/suspeita/afastar/protocolo/urgência/d-dímero/Wells).
  // Achado negativo no ditado ("sem sinais de trombose") NÃO é gatilho — o
  // trigger exige o verbo/contexto de solicitação.
  DOPPLER_VENOSO_MMII: {
    variantTag: "protocolo-restrito",
    trigger:
      /(?:investigar|pesquisa(?:r)?\s+de|suspeita\s+de|afastar|descartar|protocolo\s+(?:de\s+)?|exame\s+(?:para|restrito\s+a?)\s*(?:de\s+)?)\s*(?:tvp|trombose)|d[-\s]?d[íi]mero|\bwells\b|urg[êe]ncia\s+venosa|\bpara\s+tvp\b/i,
    negation:
      /n[ãa]o\s+(?:é|sendo)?\s*(?:exame\s+)?(?:para|de)\s+tvp|sem\s+protocolo\s+(?:de\s+)?tvp/i,
  },
  ABDOMEN_TOTAL: {
    variantTag: "doppler",
    trigger: /doppler|espl[âa]ncnico/i,
    // Duas direções (review dex2):
    //  PRÉ:  "sem [estudo/avaliação] doppler", "não [foi] [fazer/feito/
    //        realizar/incluir/usar/solicitar/pedir/querer/precisar] [o|a]
    //        [tabela do] doppler"
    //  PÓS:  "[estudo] doppler não [foi] realizado/feito/incluído/
    //        solicitado/avaliado/pedido/estudado"
    // NÃO nega: "sem alterações ao doppler" (Doppler FOI feito — laudo
    // normal) — "alterações" não está na lista de substantivos de ato.
    negation: new RegExp(
      [
        String.raw`\b(?:sem|n[ãa]o)\s+(?:(?:foi|foram|fiz|fizemos|faremos|vou|vamos|quero|queremos)\s+)?(?:(?:incluir|inclu[íi]\w*|fazer|feit\w+|realizar|realiz\w+|colocar|usar|solicit\w+|ped(?:ir|id\w*)|estud(?:o|ar)|avalia(?:r|[çc][ãa]o)|precis\w+(?:\s+de)?|exame\s+(?:de\s+)?)\s*)?(?:[oa]s?\s+)?(?:tabela\s+(?:d[oe]\s+)?)?(?:estudo\s+)?(?:doppler|espl[âa]ncnic\w*)`,
        String.raw`(?:doppler|espl[âa]ncnic\w*)(?:\s+\S+){0,2}?\s+n[ãa]o\s+(?:foi\s+|ser[áa]\s+)?(?:realizad|feit|inclu[íi]d|solicitad|avaliad|pedid|estudad)`,
      ].join("|"),
      "i",
    ),
  },
};

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
  /** Ditado pediu a variante (gatilho positivo) mas ela não existe validada no DB. */
  | { code: "BUNDLE_VARIANT_EMPTY"; variantTag: string };

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

  // Gate "exatamente um template" (review dex1): bundle sem bloco kind=modelo
  // após a seleção = laudo sem máscara. NUNCA seguir para o writer.
  if (!selected.some((r) => r.kind === "modelo")) {
    return { blocks: [], error: { code: "BUNDLE_NO_TEMPLATE" } };
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
  const selector = MODELO_VARIANT_SELECTORS[categoryCode];
  if (!selector) return { rows, error: null };

  // Negação tem precedência sobre o gatilho positivo (review dex1):
  // "sem Doppler" / "não incluir Doppler" → modelo padrão.
  const wantsVariant =
    selector.trigger.test(rawInput) && !selector.negation.test(rawInput);

  if (wantsVariant) {
    const hasVariantModelo = rows.some(
      (r) => r.kind === "modelo" && r.tags.includes(selector.variantTag),
    );
    // Gatilho positivo + variante inexistente no DB = erro alto e claro,
    // NUNCA fallback silencioso pro modelo padrão (geraria o laudo errado).
    if (!hasVariantModelo) {
      return {
        rows: [],
        error: {
          code: "BUNDLE_VARIANT_EMPTY",
          variantTag: selector.variantTag,
        },
      };
    }
  }

  return {
    rows: rows.filter((r) => {
      if (r.kind !== "modelo") return true;
      const isVariant = r.tags.includes(selector.variantTag);
      return wantsVariant ? isVariant : !isVariant;
    }),
    error: null,
  };
}
