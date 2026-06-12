import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
export { OPTIONS } from "@/server/cors";
import {
  UpdateVariantBodySchema,
  hasMatchingModel,
  toVariant,
} from "@/server/admin/reportTemplateVariants";
import { getDbClient, schema } from "@laudousg/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: Context) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = UpdateVariantBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }
  const input = parsed.data;
  const db = getDbClient();

  // Promover a validated exige modelo correspondente no bundle (review dex1).
  if (input.status === "validated") {
    const [current] = await db
      .select({
        categoryCode: schema.reportTemplateVariants.categoryCode,
        writingStyleId: schema.reportTemplateVariants.writingStyleId,
        variantKey: schema.reportTemplateVariants.variantKey,
      })
      .from(schema.reportTemplateVariants)
      .where(eq(schema.reportTemplateVariants.id, id))
      .limit(1);
    if (!current) return json({ error: "not_found" }, 404);
    const ok = await hasMatchingModel({
      categoryCode: current.categoryCode,
      writingStyleId: current.writingStyleId,
      // variant_key pode estar sendo alterado no mesmo PATCH.
      variantKey: input.variant_key ?? current.variantKey,
    });
    if (!ok) {
      return json(
        { error: "no_matching_model", variant_key: input.variant_key ?? current.variantKey },
        409,
      );
    }
  }

  const [row] = await db
    .update(schema.reportTemplateVariants)
    .set({
      ...(input.variant_key !== undefined && { variantKey: input.variant_key }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.template_body !== undefined && {
        templateBody: input.template_body,
      }),
      ...(input.renderer_schema !== undefined && {
        rendererSchema: input.renderer_schema,
      }),
      ...(input.rules !== undefined && { rules: input.rules }),
      // Promover a validated carimba approved_at; despromover limpa.
      ...(input.status === "validated" && { approvedAt: new Date() }),
      ...(input.status !== undefined &&
        input.status !== "validated" && { approvedAt: null }),
      updatedAt: new Date(),
    })
    .where(eq(schema.reportTemplateVariants.id, id))
    .returning();

  if (!row) return json({ error: "not_found" }, 404);
  return json({ item: toVariant(row) });
}

export async function DELETE(req: Request, context: Context) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { id } = await context.params;
  const db = getDbClient();
  const [row] = await db
    .delete(schema.reportTemplateVariants)
    .where(eq(schema.reportTemplateVariants.id, id))
    .returning({ id: schema.reportTemplateVariants.id });

  if (!row) return json({ error: "not_found" }, 404);
  return json({ ok: true, id: row.id });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
