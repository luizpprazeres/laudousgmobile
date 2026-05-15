import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
export { OPTIONS } from "@/server/cors";
import {
  UpdateBlockBodySchema,
  toRagBlock,
  triggerEmbedding,
} from "@/server/admin/knowledgeBlocks";
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

  const parsed = UpdateBlockBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }

  const input = parsed.data;
  const db = getDbClient();
  const [row] = await db
    .update(schema.knowledgeBlocks)
    .set({
      ...(input.category_code !== undefined && { categoryCode: input.category_code }),
      ...(input.writing_style_id !== undefined && {
        writingStyleId: input.writing_style_id,
      }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.tags !== undefined && { tags: input.tags }),
      embedding: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.knowledgeBlocks.id, id))
    .returning();

  if (!row) return json({ error: "not_found" }, 404);

  const embedding = await triggerEmbedding(row.id);
  return json({ item: toRagBlock(row), embedding });
}

export async function DELETE(_req: Request, context: Context) {
  const user = await verifyJwt(_req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { id } = await context.params;
  const db = getDbClient();
  const [row] = await db
    .delete(schema.knowledgeBlocks)
    .where(eq(schema.knowledgeBlocks.id, id))
    .returning({ id: schema.knowledgeBlocks.id });

  if (!row) return json({ error: "not_found" }, 404);
  return json({ ok: true, id: row.id });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
