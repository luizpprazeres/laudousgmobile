import { count, eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import type {
  StructuredFindings,
  SanityResult,
} from "@laudousg/shared";
import { env } from "../env";

/**
 * generation_runs — auditoria completa por chamada do pipeline.
 *
 * Recomendação codex (já incorporada no schema): persistir TUDO desde o dia 1.
 * Insert no `open` + UPDATEs por etapa permite auditoria mesmo em
 * abort/error/blocked. Custo: alguns round-trips a mais — vale em domínio
 * médico.
 */

export async function insertOpenRun(args: {
  reportId: string;
  rawInputForRagQuery: string;
}): Promise<string> {
  const db = getDbClient();
  const e = env();

  const [row] = await db
    .insert(schema.generationRuns)
    .values({
      reportId: args.reportId,
      promptVersion: e.PROMPT_VERSION,
      contractVersion: e.CONTRACT_VERSION,
      findingsSchemaVersion: e.FINDINGS_SCHEMA_VERSION,
      modelStructurer: e.OPENAI_MODEL_STRUCTURER,
      modelWriter: e.OPENAI_MODEL_WRITER,
      modelSanity: e.OPENAI_MODEL_SANITY,
      embeddingModel: e.OPENAI_EMBEDDING_MODEL,
      ragQueryText: args.rawInputForRagQuery,
      ragBlocksUsed: [],
      latencyMsTotal: 0,
      outcome: "error", // será atualizado no finalize
    })
    .returning({ id: schema.generationRuns.id });
  if (!row) throw new Error("insertOpenRun: no row returned");
  return row.id;
}

export async function updateRunAfterStructurer(args: {
  runId: string;
  structured: StructuredFindings;
  latencyMs: number;
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.generationRuns)
    .set({
      structuredInput: args.structured as never,
      latencyMsStructurer: args.latencyMs,
    })
    .where(eq(schema.generationRuns.id, args.runId));
}

export async function updateRunAfterRetriever(args: {
  runId: string;
  ragBlockIds: string[];
  ragQueryText: string;
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.generationRuns)
    .set({
      ragBlocksUsed: args.ragBlockIds,
      ragQueryText: args.ragQueryText,
    })
    .where(eq(schema.generationRuns.id, args.runId));
}

export async function updateRunAfterWriter(args: {
  runId: string;
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  /** DET-5: "renderer/v1" quando o laudo foi montado pelo renderer. */
  modelWriter?: string;
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.generationRuns)
    .set({
      latencyMsWriter: args.latencyMs,
      tokensInput: args.tokensInput,
      tokensOutput: args.tokensOutput,
      ...(args.modelWriter !== undefined && { modelWriter: args.modelWriter }),
    })
    .where(eq(schema.generationRuns.id, args.runId));
}

export async function updateRunAfterSanity(args: {
  runId: string;
  sanity: SanityResult;
  latencyMs: number;
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.generationRuns)
    .set({
      sanityOutput: args.sanity as never,
      latencyMsSanity: args.latencyMs,
    })
    .where(eq(schema.generationRuns.id, args.runId));
}

/**
 * Conta quantas runs existem pra um report. Usado pra limitar resumes
 * (anti-loop de clarify).
 */
export async function countRunsByReport(reportId: string): Promise<number> {
  const db = getDbClient();
  const [row] = await db
    .select({ value: count() })
    .from(schema.generationRuns)
    .where(eq(schema.generationRuns.reportId, reportId));
  return row?.value ?? 0;
}

export async function finalizeRun(args: {
  runId: string;
  outcome: "success" | "clarify" | "blocked" | "error" | "aborted";
  latencyMsTotal: number;
  errorMessage?: string;
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.generationRuns)
    .set({
      outcome: args.outcome,
      latencyMsTotal: args.latencyMsTotal,
      errorMessage: args.errorMessage ?? null,
    })
    .where(eq(schema.generationRuns.id, args.runId));
}
