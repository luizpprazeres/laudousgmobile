import { and, eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import type { WritingStyleCode } from "@laudousg/shared";

/**
 * Lookups simples no DB — usados pelo /api/generate pra resolver
 * IDs em codes/labels antes de chamar o pipeline.
 *
 * Cache em memória (Map module-level) — vida da função serverless.
 * Aceitável pois categorias/estilos são quase imutáveis.
 */

let categoriesCache: { codes: Set<string>; labels: Map<string, string> } | null =
  null;
let stylesCache: Map<string, { code: WritingStyleCode; name: string }> | null =
  null;

export async function getKnownCategories(): Promise<{
  codes: Set<string>;
  labels: Map<string, string>;
}> {
  if (categoriesCache) return categoriesCache;
  const db = getDbClient();
  const rows = await db
    .select({
      code: schema.categories.code,
      label: schema.categories.label,
      active: schema.categories.active,
    })
    .from(schema.categories);
  const codes = new Set<string>();
  const labels = new Map<string, string>();
  for (const r of rows) {
    if (r.active) codes.add(r.code);
    labels.set(r.code, r.label);
  }
  categoriesCache = { codes, labels };
  return categoriesCache;
}

export async function getWritingStyleById(
  id: string,
): Promise<{ code: WritingStyleCode; name: string } | null> {
  if (!stylesCache) {
    const db = getDbClient();
    const rows = await db
      .select({
        id: schema.writingStyles.id,
        code: schema.writingStyles.code,
        name: schema.writingStyles.name,
      })
      .from(schema.writingStyles);
    const m = new Map<string, { code: WritingStyleCode; name: string }>();
    for (const r of rows) {
      m.set(r.id, { code: r.code as WritingStyleCode, name: r.name });
    }
    stylesCache = m;
  }
  return stylesCache.get(id) ?? null;
}

/**
 * DET-3 — variante de máscara preferida pela conta para uma categoria.
 * JOIN account_report_preferences × report_template_variants (só validated).
 * Retorna a `variant_key` (que o bundleLoader casa com a tag variant:<chave>)
 * ou null se o médico não tem preferência registrada / a variante não é válida.
 *
 * NÃO cacheado — preferência muda por usuário e a query é por (user, categoria)
 * com índice PK; barata.
 */
export async function resolveAccountVariantKey(
  userId: string,
  categoryCode: string,
): Promise<string | null> {
  const db = getDbClient();
  const [row] = await db
    .select({ variantKey: schema.reportTemplateVariants.variantKey })
    .from(schema.accountReportPreferences)
    .innerJoin(
      schema.reportTemplateVariants,
      eq(
        schema.accountReportPreferences.defaultVariantId,
        schema.reportTemplateVariants.id,
      ),
    )
    .where(
      and(
        eq(schema.accountReportPreferences.userId, userId),
        eq(schema.accountReportPreferences.categoryCode, categoryCode),
        eq(schema.reportTemplateVariants.status, "validated"),
      ),
    )
    .limit(1);
  return row?.variantKey ?? null;
}

/**
 * DET-5 — template_body da variante resolvida (caminho RENDERER).
 * Retorna null se a variante não tem template_body — o route cai no writer
 * (fallback automático). NÃO cacheado: chamada única por geração, barata.
 */
export async function getVariantTemplateBody(args: {
  categoryCode: string;
  writingStyleId: string;
  variantKey: string;
}): Promise<string | null> {
  const db = getDbClient();
  const [row] = await db
    .select({ templateBody: schema.reportTemplateVariants.templateBody })
    .from(schema.reportTemplateVariants)
    .where(
      and(
        eq(schema.reportTemplateVariants.categoryCode, args.categoryCode),
        eq(schema.reportTemplateVariants.writingStyleId, args.writingStyleId),
        eq(schema.reportTemplateVariants.variantKey, args.variantKey),
        eq(schema.reportTemplateVariants.status, "validated"),
      ),
    )
    .limit(1);
  const body = row?.templateBody;
  return body && body.trim() !== "" ? body : null;
}

/**
 * Limpa o cache. Chamar quando admin atualizar categorias/estilos
 * (futuro endpoint admin).
 */
export function invalidateLookupsCache() {
  categoriesCache = null;
  stylesCache = null;
}
