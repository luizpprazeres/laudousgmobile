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

  const [current] = await db
    .select({
      categoryCode: schema.reportTemplateVariants.categoryCode,
      writingStyleId: schema.reportTemplateVariants.writingStyleId,
      variantKey: schema.reportTemplateVariants.variantKey,
      status: schema.reportTemplateVariants.status,
    })
    .from(schema.reportTemplateVariants)
    .where(eq(schema.reportTemplateVariants.id, id))
    .limit(1);
  if (!current) return json({ error: "not_found" }, 404);

  // Variante validated DEVE ter modelo correspondente no bundle (review dex1).
  // Vale tanto ao promover quanto ao trocar variant_key de uma já validada —
  // sem isso o PATCH só do key publicava no picker variante sem modelo
  // (achado dex2, follow-up DET-4).
  const effectiveStatus = input.status ?? current.status;
  const keyChanged =
    input.variant_key !== undefined && input.variant_key !== current.variantKey;
  if (effectiveStatus === "validated" && (input.status === "validated" || keyChanged)) {
    const ok = await hasMatchingModel({
      categoryCode: current.categoryCode,
      writingStyleId: current.writingStyleId,
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
      ...(input.preference_eligible !== undefined && {
        preferenceEligible: input.preference_eligible,
      }),
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

  // Despromover do picker limpa preferências salvas que apontam pra variante —
  // senão a geração seguiria aplicando uma preferência que a UI mostra como
  // "Automático" (achado dex1+dex2, follow-up DET-4). NULL = volta ao padrão,
  // mesmo comportamento do ON DELETE SET NULL da FK.
  if (input.preference_eligible === false) {
    await db
      .update(schema.accountReportPreferences)
      .set({ defaultVariantId: null, updatedAt: new Date() })
      .where(eq(schema.accountReportPreferences.defaultVariantId, id));
  }

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
