import { eq } from "drizzle-orm";
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
 * Limpa o cache. Chamar quando admin atualizar categorias/estilos
 * (futuro endpoint admin).
 */
export function invalidateLookupsCache() {
  categoriesCache = null;
  stylesCache = null;
}
