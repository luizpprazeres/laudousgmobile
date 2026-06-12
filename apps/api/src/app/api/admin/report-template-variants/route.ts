import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
export { OPTIONS } from "@/server/cors";
import {
  CreateVariantBodySchema,
  hasMatchingModel,
  toVariant,
} from "@/server/admin/reportTemplateVariants";
import { getDbClient, schema } from "@laudousg/db";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/report-template-variants — CRUD de variantes de máscara (admin only).
 * Espelha /api/admin/blocks. DET-3.
 */
export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const url = new URL(req.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const limit = Math.min(parsePositiveInt(url.searchParams.get("limit"), 50), 100);
  const offset = (page - 1) * limit;

  const filters: SQL[] = [];
  const categoryCode = url.searchParams.get("category_code");
  const writingStyleId = url.searchParams.get("writing_style_id");
  const status = url.searchParams.get("status");
  if (categoryCode)
    filters.push(eq(schema.reportTemplateVariants.categoryCode, categoryCode));
  if (writingStyleId)
    filters.push(eq(schema.reportTemplateVariants.writingStyleId, writingStyleId));
  if (status === "draft" || status === "validated" || status === "archived")
    filters.push(eq(schema.reportTemplateVariants.status, status));

  const where = filters.length > 0 ? and(...filters) : undefined;
  const db = getDbClient();
  const [totalRow] = await db
    .select({ value: count() })
    .from(schema.reportTemplateVariants)
    .where(where);
  const rows = await db
    .select()
    .from(schema.reportTemplateVariants)
    .where(where)
    .orderBy(desc(schema.reportTemplateVariants.updatedAt))
    .limit(limit)
    .offset(offset);

  return json({
    items: rows.map(toVariant),
    page,
    limit,
    total: totalRow?.value ?? 0,
  });
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = CreateVariantBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }
  const input = parsed.data;
  // Catálogo não pode "mentir": uma variante validated DEVE ter modelo
  // correspondente no bundle (knowledge_blocks variant:<key>) enquanto
  // template_body não é fonte primária (DET-5). (review dex1)
  if ((input.status ?? "draft") === "validated") {
    const ok = await hasMatchingModel({
      categoryCode: input.category_code,
      writingStyleId: input.writing_style_id,
      variantKey: input.variant_key,
    });
    if (!ok) {
      return json(
        { error: "no_matching_model", variant_key: input.variant_key },
        409,
      );
    }
  }
  const db = getDbClient();
  const [row] = await db
    .insert(schema.reportTemplateVariants)
    .values({
      categoryCode: input.category_code,
      writingStyleId: input.writing_style_id,
      variantKey: input.variant_key,
      name: input.name,
      version: input.version ?? 1,
      status: input.status ?? "draft",
      preferenceEligible: input.preference_eligible ?? false,
      templateBody: input.template_body ?? null,
      rendererSchema: input.renderer_schema ?? null,
      rules: input.rules ?? null,
      createdBy: user.id,
      approvedAt: (input.status ?? "draft") === "validated" ? new Date() : null,
    })
    .returning();

  if (!row) return json({ error: "insert_failed" }, 500);
  return json({ item: toVariant(row) }, 201);
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
