import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getDbClient, schema } from "@laudousg/db";
import { ProfileSchema } from "@laudousg/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
  default_writing_style_id: z.string().uuid().nullable().optional(),
  plan: z.enum(["free", "pro", "clinic"]).optional(),
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
      const [style] = await db
        .select({ id: schema.writingStyles.id })
        .from(schema.writingStyles)
        .where(eq(schema.writingStyles.id, styleId))
        .limit(1);
      if (!style) return json({ error: "invalid_writing_style" }, 400);
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
  return ProfileSchema.parse({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: row.plan,
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
