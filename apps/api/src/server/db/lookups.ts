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
 * DET-5 ONDA 2 — resolve, numa ÚNICA query (review dex1), a preferência de
 * laudo da conta para uma categoria: a `variant_key` (DET-3) E os toggles do
 * renderer (`renderer_preferences`). LEFT JOIN em report_template_variants para
 * NÃO perder os toggles quando `default_variant_id` é null (toggle-only).
 *
 * `variantKey` só vale se a variante existir e estiver `validated` (mesma regra
 * do antigo resolveAccountVariantKey, agora avaliada em código por causa do
 * leftJoin). NÃO cacheado: query por PK (user, categoria), barata.
 */
export async function resolveAccountReportPreference(
  userId: string,
  categoryCode: string,
): Promise<{
  variantKey: string | null;
  rendererPreferences: Record<string, unknown> | null;
}> {
  const db = getDbClient();
  const [row] = await db
    .select({
      variantKey: schema.reportTemplateVariants.variantKey,
      variantStatus: schema.reportTemplateVariants.status,
      rendererPreferences: schema.accountReportPreferences.rendererPreferences,
    })
    .from(schema.accountReportPreferences)
    .leftJoin(
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
      ),
    )
    .limit(1);
  const prefs = row?.rendererPreferences;
  return {
    variantKey:
      row && row.variantStatus === "validated" ? (row.variantKey ?? null) : null,
    rendererPreferences:
      prefs && typeof prefs === "object" ? (prefs as Record<string, unknown>) : null,
  };
}

/**
 * Limpa o cache. Chamar quando admin atualizar categorias/estilos
 * (futuro endpoint admin).
 */
export function invalidateLookupsCache() {
  categoriesCache = null;
  stylesCache = null;
}
