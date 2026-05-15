import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getDbClient, schema } from "@laudousg/db";
export { OPTIONS } from "@/server/cors";
import { GenerationRunSchema, ReportSchema } from "@laudousg/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReportDetailResponseSchema = z.object({
  report: ReportSchema,
  latest_run: GenerationRunSchema.nullable(),
  rag_blocks: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.string(),
      title: z.string(),
      priority: z.number().int(),
    }),
  ),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, context: Context) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const { id } = await context.params;
  const db = getDbClient();

  const [reportRow] = await db
    .select()
    .from(schema.reports)
    .where(and(eq(schema.reports.id, id), eq(schema.reports.userId, user.id)))
    .limit(1);

  if (!reportRow) {
    return json({ error: "not_found" }, 404);
  }

  const [runRow] = await db
    .select()
    .from(schema.generationRuns)
    .where(eq(schema.generationRuns.reportId, reportRow.id))
    .orderBy(desc(schema.generationRuns.createdAt))
    .limit(1);

  const ragRows =
    reportRow.ragBlocksUsed.length > 0
      ? await db
          .select({
            id: schema.knowledgeBlocks.id,
            kind: schema.knowledgeBlocks.kind,
            title: schema.knowledgeBlocks.title,
            priority: schema.knowledgeBlocks.priority,
          })
          .from(schema.knowledgeBlocks)
          .where(inArray(schema.knowledgeBlocks.id, reportRow.ragBlocksUsed))
      : [];

  const response = ReportDetailResponseSchema.parse({
    report: toReport(reportRow),
    latest_run: runRow ? toGenerationRun(runRow) : null,
    rag_blocks: ragRows,
  });

  return json(response);
}

function toReport(row: typeof schema.reports.$inferSelect) {
  return ReportSchema.parse({
    id: row.id,
    user_id: row.userId,
    category_code: row.categoryCode,
    writing_style_id: row.writingStyleId,
    status: row.status,
    raw_input: row.rawInput,
    consolidated_transcript: row.consolidatedTranscript,
    structured_findings: row.structuredFindings,
    generated_output: row.generatedOutput,
    final_output: row.finalOutput,
    rag_blocks_used: row.ragBlocksUsed,
    sanity_result: row.sanityResult,
    generation_metadata: row.generationMetadata,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  });
}

function toGenerationRun(row: typeof schema.generationRuns.$inferSelect) {
  return GenerationRunSchema.parse({
    id: row.id,
    report_id: row.reportId,
    prompt_version: row.promptVersion,
    contract_version: row.contractVersion,
    findings_schema_version: row.findingsSchemaVersion,
    model_structurer: row.modelStructurer,
    model_writer: row.modelWriter,
    model_sanity: row.modelSanity,
    embedding_model: row.embeddingModel,
    rag_query_text: row.ragQueryText,
    rag_blocks_used: row.ragBlocksUsed,
    structured_input: row.structuredInput,
    sanity_output: row.sanityOutput,
    latency_ms_total: row.latencyMsTotal,
    latency_ms_structurer: row.latencyMsStructurer,
    latency_ms_writer: row.latencyMsWriter,
    latency_ms_sanity: row.latencyMsSanity,
    tokens_input: row.tokensInput,
    tokens_output: row.tokensOutput,
    cost_usd: row.costUsd === null ? null : Number(row.costUsd),
    outcome: row.outcome,
    error_message: row.errorMessage,
    created_at: row.createdAt.toISOString(),
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
