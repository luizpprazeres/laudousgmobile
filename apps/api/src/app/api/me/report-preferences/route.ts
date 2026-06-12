import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getDbClient, schema } from "@laudousg/db";
export { OPTIONS } from "@/server/cors";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/me/report-preferences (DET-3) — a máscara preferida do médico por
 * categoria. GET devolve as preferências + as variantes disponíveis (p/ o
 * picker do DET-4); PATCH grava a escolha (upsert por user × categoria).
 */

const UpdateSchema = z.object({
  category_code: z.string().min(1),
  // null limpa a preferência (volta ao padrão de contexto/default).
  default_variant_id: z.string().uuid().nullable(),
});

export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const db = getDbClient();

  const preferences = await db
    .select({
      category_code: schema.accountReportPreferences.categoryCode,
      default_variant_id: schema.accountReportPreferences.defaultVariantId,
      variant_key: schema.reportTemplateVariants.variantKey,
    })
    .from(schema.accountReportPreferences)
    .leftJoin(
      schema.reportTemplateVariants,
      eq(
        schema.accountReportPreferences.defaultVariantId,
        schema.reportTemplateVariants.id,
      ),
    )
    .where(eq(schema.accountReportPreferences.userId, user.id));

  // Catálogo de variantes validadas (todas as categorias/estilos).
  const availableVariants = await db
    .select({
      id: schema.reportTemplateVariants.id,
      category_code: schema.reportTemplateVariants.categoryCode,
      writing_style_id: schema.reportTemplateVariants.writingStyleId,
      variant_key: schema.reportTemplateVariants.variantKey,
      name: schema.reportTemplateVariants.name,
    })
    .from(schema.reportTemplateVariants)
    .where(eq(schema.reportTemplateVariants.status, "validated"));

  return json({ preferences, available_variants: availableVariants });
}

export async function PATCH(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }
  const { category_code, default_variant_id } = parsed.data;

  const db = getDbClient();

  // Categoria precisa existir.
  const [cat] = await db
    .select({ code: schema.categories.code })
    .from(schema.categories)
    .where(eq(schema.categories.code, category_code))
    .limit(1);
  if (!cat) return json({ error: "invalid_category" }, 400);

  // Se vier uma variante, precisa existir, ser validada e ser DA categoria.
  if (default_variant_id) {
    const [variant] = await db
      .select({ id: schema.reportTemplateVariants.id })
      .from(schema.reportTemplateVariants)
      .where(
        and(
          eq(schema.reportTemplateVariants.id, default_variant_id),
          eq(schema.reportTemplateVariants.categoryCode, category_code),
          eq(schema.reportTemplateVariants.status, "validated"),
        ),
      )
      .limit(1);
    if (!variant) return json({ error: "invalid_variant" }, 400);
  }

  await db
    .insert(schema.accountReportPreferences)
    .values({
      userId: user.id,
      categoryCode: category_code,
      defaultVariantId: default_variant_id,
    })
    .onConflictDoUpdate({
      target: [
        schema.accountReportPreferences.userId,
        schema.accountReportPreferences.categoryCode,
      ],
      set: { defaultVariantId: default_variant_id, updatedAt: new Date() },
    });

  return json({ ok: true, category_code, default_variant_id });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
