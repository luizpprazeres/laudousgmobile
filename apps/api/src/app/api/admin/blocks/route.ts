import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
export { OPTIONS } from "@/server/cors";
import {
  CreateBlockBodySchema,
  toRagBlock,
  triggerEmbedding,
} from "@/server/admin/knowledgeBlocks";
import { getDbClient, schema } from "@laudousg/db";
import { RagBlockKindSchema, RagBlockStatusSchema } from "@laudousg/shared";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/blocks — CRUD de knowledge_blocks (admin only).
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
  const kind = url.searchParams.get("kind");
  const status = url.searchParams.get("status");

  if (categoryCode) filters.push(eq(schema.knowledgeBlocks.categoryCode, categoryCode));
  if (kind) {
    const parsedKind = RagBlockKindSchema.safeParse(kind);
    if (!parsedKind.success) return json({ error: "invalid_kind" }, 400);
    filters.push(eq(schema.knowledgeBlocks.kind, parsedKind.data));
  }
  if (status) {
    const parsedStatus = RagBlockStatusSchema.safeParse(status);
    if (!parsedStatus.success) return json({ error: "invalid_status" }, 400);
    filters.push(eq(schema.knowledgeBlocks.status, parsedStatus.data));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const db = getDbClient();
  const [totalRow] = await db
    .select({ value: count() })
    .from(schema.knowledgeBlocks)
    .where(where);
  const rows = await db
    .select()
    .from(schema.knowledgeBlocks)
    .where(where)
    .orderBy(desc(schema.knowledgeBlocks.updatedAt))
    .limit(limit)
    .offset(offset);

  return json({
    items: rows.map(toRagBlock),
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

  const parsed = CreateBlockBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }

  const input = parsed.data;
  const db = getDbClient();
  const [row] = await db
    .insert(schema.knowledgeBlocks)
    .values({
      categoryCode: input.category_code,
      writingStyleId: input.writing_style_id,
      kind: input.kind,
      title: input.title,
      content: input.content,
      status: input.status ?? "draft",
      priority: input.priority ?? 50,
      tags: input.tags ?? [],
      createdBy: user.id,
    })
    .returning();

  if (!row) return json({ error: "insert_failed" }, 500);

  const embedding = await triggerEmbedding(row.id);

  return json(
    {
      item: toRagBlock(row),
      embedding,
    },
    201,
  );
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
