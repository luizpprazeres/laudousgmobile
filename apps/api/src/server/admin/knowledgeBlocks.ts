import { env } from "@/server/env";
import { schema } from "@laudousg/db";
import { RagBlockSchema } from "@laudousg/shared";
import { z } from "zod";

export const CreateBlockBodySchema = RagBlockSchema.pick({
  category_code: true,
  writing_style_id: true,
  kind: true,
  title: true,
  content: true,
  status: true,
  priority: true,
  tags: true,
}).partial({
  status: true,
  priority: true,
  tags: true,
});

export const UpdateBlockBodySchema = z
  .object({
    category_code: RagBlockSchema.shape.category_code.optional(),
    writing_style_id: RagBlockSchema.shape.writing_style_id.optional(),
    kind: RagBlockSchema.shape.kind.optional(),
    title: RagBlockSchema.shape.title.optional(),
    content: RagBlockSchema.shape.content.optional(),
    status: RagBlockSchema.shape.status.optional(),
    priority: RagBlockSchema.shape.priority.optional(),
    tags: RagBlockSchema.shape.tags.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "envie pelo menos um campo para atualizar",
  });

export function toRagBlock(row: typeof schema.knowledgeBlocks.$inferSelect) {
  return RagBlockSchema.parse({
    id: row.id,
    category_code: row.categoryCode,
    writing_style_id: row.writingStyleId,
    kind: row.kind,
    title: row.title,
    content: row.content,
    status: row.status,
    priority: row.priority,
    version: row.version,
    tags: row.tags,
    created_by: row.createdBy,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  });
}

export async function triggerEmbedding(blockId: string) {
  const e = env();
  try {
    const res = await fetch(`${e.SUPABASE_URL}/functions/v1/embed-knowledge-blocks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${e.SUPABASE_SERVICE_ROLE_KEY}`,
        "x-openai-key": e.OPENAI_API_KEY,
      },
      body: JSON.stringify({ block_id: blockId }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: detail.slice(0, 500),
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("embed-knowledge-blocks failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
