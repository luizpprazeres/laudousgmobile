import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getDbClient, schema } from "@laudousg/db";
export { OPTIONS } from "@/server/cors";
import { ProfileSchema } from "@laudousg/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isBetaTester } from "@/server/iap/betaWhitelist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
  default_writing_style_id: z.string().uuid().nullable().optional(),
  plan: z.enum(["free", "essencial", "pro", "clinic"]).optional(),
});

export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const profile = await loadProfile(user.id);
  if (!profile) return json({ error: "profile_not_found" }, 404);

  return json({ profile });
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

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }
  if (parsed.data.plan !== undefined) {
    return forbidden("plan_read_only");
  }

  const db = getDbClient();
  const patch: Partial<typeof schema.profiles.$inferInsert> = {
    updatedAt: new Date(),
  };
  if ("name" in parsed.data) patch.name = parsed.data.name ?? null;
  if ("default_writing_style_id" in parsed.data) {
    const styleId = parsed.data.default_writing_style_id ?? null;
    if (styleId) {
      // Saneamento writing styles: só aceita fixar estilo ATIVO (Clássico/Objetivo).
      const [style] = await db
        .select({ id: schema.writingStyles.id, active: schema.writingStyles.active })
        .from(schema.writingStyles)
        .where(eq(schema.writingStyles.id, styleId))
        .limit(1);
      if (!style) return json({ error: "invalid_writing_style" }, 400);
      if (!style.active) return json({ error: "writing_style_inactive" }, 400);
    }
    patch.defaultWritingStyleId = styleId;
  }

  await db
    .update(schema.profiles)
    .set(patch)
    .where(eq(schema.profiles.id, user.id));

  const profile = await loadProfile(user.id);
  if (!profile) return json({ error: "profile_not_found" }, 404);

  return json({ profile });
}

async function loadProfile(userId: string) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);

  if (!row) return null;
  // Beta whitelist override: testers e Apple Reviewer veem plan='pro' sem tocar
  // no DB. Lista controlada por env BETA_TESTER_EMAILS (CSV).
  const effectivePlan = isBetaTester(row.email) ? "pro" : row.plan;
  return ProfileSchema.parse({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: effectivePlan,
    default_writing_style_id: row.defaultWritingStyleId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
