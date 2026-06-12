import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";

/**
 * Schemas + serialização para o CRUD admin de report_template_variants (DET-3).
 * Espelha o padrão de admin/knowledgeBlocks.ts.
 */

const StatusSchema = z.enum(["draft", "validated", "archived"]);

export const CreateVariantBodySchema = z.object({
  category_code: z.string().min(1),
  writing_style_id: z.string().uuid(),
  variant_key: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  version: z.number().int().positive().optional(),
  status: StatusSchema.optional(),
  template_body: z.string().nullable().optional(),
  renderer_schema: z.unknown().nullable().optional(),
  rules: z.unknown().nullable().optional(),
});

export const UpdateVariantBodySchema = z.object({
  variant_key: z.string().min(1).max(60).optional(),
  name: z.string().min(1).max(120).optional(),
  version: z.number().int().positive().optional(),
  status: StatusSchema.optional(),
  template_body: z.string().nullable().optional(),
  renderer_schema: z.unknown().nullable().optional(),
  rules: z.unknown().nullable().optional(),
});

/**
 * Existe um modelo validado no bundle (knowledge_blocks kind=modelo,
 * status=validated) com a tag `variant:<variantKey>` para esta categoria/estilo?
 * Usado para impedir que o catálogo "minta": uma variante validated DEVE ter
 * um modelo correspondente enquanto template_body não é fonte primária (DET-5).
 * (review dex1)
 */
export async function hasMatchingModel(args: {
  categoryCode: string;
  writingStyleId: string;
  variantKey: string;
}): Promise<boolean> {
  const db = getDbClient();
  const rows = await db
    .select({ tags: schema.knowledgeBlocks.tags })
    .from(schema.knowledgeBlocks)
    .where(
      and(
        eq(schema.knowledgeBlocks.categoryCode, args.categoryCode),
        eq(schema.knowledgeBlocks.writingStyleId, args.writingStyleId),
        eq(schema.knowledgeBlocks.kind, "modelo"),
        eq(schema.knowledgeBlocks.status, "validated"),
      ),
    );
  // A maioria dos modelos tem a tag variant:<key>; modelos sem tag são
  // tratados como "padrao" (espelha variantOf do bundleLoader).
  return rows.some((r) => {
    const key =
      r.tags.find((t) => t.startsWith("variant:"))?.slice("variant:".length) ??
      "padrao";
    return key === args.variantKey;
  });
}

type VariantRow = typeof schema.reportTemplateVariants.$inferSelect;

export function toVariant(row: VariantRow) {
  return {
    id: row.id,
    category_code: row.categoryCode,
    writing_style_id: row.writingStyleId,
    variant_key: row.variantKey,
    name: row.name,
    version: row.version,
    status: row.status,
    template_body: row.templateBody,
    renderer_schema: row.rendererSchema,
    rules: row.rules,
    created_by: row.createdBy,
    approved_at: row.approvedAt ? row.approvedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
