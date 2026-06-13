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
  // Opcional: undefined = não mexe na variante; null limpa (volta ao default);
  // uuid fixa a variante. (PATCH parcial — permite atualizar SÓ os toggles.)
  default_variant_id: z.string().uuid().nullable().optional(),
  // DET-5 ONDA 2 — toggles do renderer (opcional; só as chaves enviadas mudam).
  renderer_preferences: z
    .object({
      show_domingos_score: z.boolean().optional(),
      show_conduct_recommendation: z.boolean().optional(),
    })
    .nullable()
    .optional(),
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
      renderer_preferences: schema.accountReportPreferences.rendererPreferences,
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

  // Catálogo p/ o picker: só variantes validadas E elegíveis como preferência.
  // Variantes contextuais (1t/2t/3t, ta/tv, doppler…) ficam de fora — o
  // contexto do ditado é soberano (decisão Luiz, follow-up do DET-4).
  const availableVariants = await db
    .select({
      id: schema.reportTemplateVariants.id,
      category_code: schema.reportTemplateVariants.categoryCode,
      writing_style_id: schema.reportTemplateVariants.writingStyleId,
      variant_key: schema.reportTemplateVariants.variantKey,
      name: schema.reportTemplateVariants.name,
    })
    .from(schema.reportTemplateVariants)
    .where(
      and(
        eq(schema.reportTemplateVariants.status, "validated"),
        eq(schema.reportTemplateVariants.preferenceEligible, true),
      ),
    );

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
  const { category_code, default_variant_id, renderer_preferences } = parsed.data;

  const db = getDbClient();

  // Categoria precisa existir.
  const [cat] = await db
    .select({ code: schema.categories.code })
    .from(schema.categories)
    .where(eq(schema.categories.code, category_code))
    .limit(1);
  if (!cat) return json({ error: "invalid_category" }, 400);

  // Se vier uma variante, precisa existir, ser validada, ser DA categoria e
  // ser elegível como preferência (contextuais não podem ser fixadas).
  if (default_variant_id) {
    const [variant] = await db
      .select({
        id: schema.reportTemplateVariants.id,
        preferenceEligible: schema.reportTemplateVariants.preferenceEligible,
      })
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
    if (!variant.preferenceEligible)
      return json({ error: "variant_not_preference_eligible" }, 400);
  }

  // Merge dos toggles do renderer com o que já existe (PATCH parcial: só as
  // chaves enviadas mudam; default_variant_id continua governado acima).
  // `undefined` = não tocar; `null` = limpar (grava SQL null, não {}).
  let mergedRendererPrefs: Record<string, unknown> | null | undefined;
  if (renderer_preferences === null) {
    mergedRendererPrefs = null;
  } else if (renderer_preferences !== undefined) {
    const [existing] = await db
      .select({ prefs: schema.accountReportPreferences.rendererPreferences })
      .from(schema.accountReportPreferences)
      .where(
        and(
          eq(schema.accountReportPreferences.userId, user.id),
          eq(schema.accountReportPreferences.categoryCode, category_code),
        ),
      )
      .limit(1);
    const base =
      existing?.prefs && typeof existing.prefs === "object"
        ? (existing.prefs as Record<string, unknown>)
        : {};
    mergedRendererPrefs = { ...base, ...renderer_preferences };
  }

  await db
    .insert(schema.accountReportPreferences)
    .values({
      userId: user.id,
      categoryCode: category_code,
      defaultVariantId: default_variant_id ?? null,
      rendererPreferences: mergedRendererPrefs ?? null,
    })
    .onConflictDoUpdate({
      target: [
        schema.accountReportPreferences.userId,
        schema.accountReportPreferences.categoryCode,
      ],
      // PATCH parcial: só atualiza o que o body enviou (undefined = não mexe no
      // que já estava gravado).
      set: {
        updatedAt: new Date(),
        ...(default_variant_id !== undefined
          ? { defaultVariantId: default_variant_id }
          : {}),
        ...(mergedRendererPrefs !== undefined
          ? { rendererPreferences: mergedRendererPrefs }
          : {}),
      },
    });

  return json({
    ok: true,
    category_code,
    ...(default_variant_id !== undefined ? { default_variant_id } : {}),
    ...(mergedRendererPrefs !== undefined
      ? { renderer_preferences: mergedRendererPrefs }
      : {}),
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
