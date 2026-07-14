import { and, eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import type {
  StructuredFindings,
  SanityResult,
  ReportStatus,
} from "@laudousg/shared";
import { StructuredFindingsSchema } from "@laudousg/shared";

/**
 * Insert inicial do report no `open` do pipeline. Garante auditoria mesmo
 * quando o pipeline aborta/erra antes de produzir output (recomendação codex).
 */
export async function insertDraftReport(args: {
  id: string;
  userId: string;
  categoryCode: string;
  writingStyleId: string;
  rawInput: string;
  consolidatedTranscript?: string | null;
}): Promise<void> {
  const db = getDbClient();
  await db.insert(schema.reports).values({
    id: args.id,
    userId: args.userId,
    categoryCode: args.categoryCode,
    writingStyleId: args.writingStyleId,
    status: "draft",
    rawInput: args.rawInput,
    consolidatedTranscript: args.consolidatedTranscript ?? null,
  });
}

export async function updateReportStructured(args: {
  reportId: string;
  structured: StructuredFindings;
  // Pode acontecer da categoria detectada divergir do hint enviado
  categoryCode: string;
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.reports)
    .set({
      structuredFindings: args.structured as never,
      categoryCode: args.categoryCode,
      updatedAt: new Date(),
    })
    .where(eq(schema.reports.id, args.reportId));
}

export async function updateReportRagBlocks(args: {
  reportId: string;
  blockIds: string[];
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.reports)
    .set({
      ragBlocksUsed: args.blockIds,
      updatedAt: new Date(),
    })
    .where(eq(schema.reports.id, args.reportId));
}

export async function finalizeReport(args: {
  reportId: string;
  status: ReportStatus;
  generatedOutput: string;
  sanityResult: SanityResult | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.reports)
    .set({
      status: args.status,
      generatedOutput: args.generatedOutput,
      sanityResult: (args.sanityResult ?? null) as never,
      generationMetadata: (args.metadata ?? null) as never,
      updatedAt: new Date(),
    })
    .where(eq(schema.reports.id, args.reportId));
}

export async function markReportStatus(args: {
  reportId: string;
  status: ReportStatus;
}): Promise<void> {
  const db = getDbClient();
  await db
    .update(schema.reports)
    .set({ status: args.status, updatedAt: new Date() })
    .where(eq(schema.reports.id, args.reportId));
}

/**
 * Carrega report pra resume após clarify. Valida ownership via user_id.
 * Retorna null se não existir ou pertencer a outro usuário.
 */
export async function loadReportForResume(args: {
  reportId: string;
  userId: string;
}): Promise<{
  id: string;
  categoryCode: string;
  writingStyleId: string;
  rawInput: string;
  consolidatedTranscript: string | null;
  structuredFindings: StructuredFindings | null;
  status: ReportStatus;
} | null> {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(schema.reports)
    .where(
      and(
        eq(schema.reports.id, args.reportId),
        eq(schema.reports.userId, args.userId),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Re-validar findings persistido (jsonb pode estar corrompido em prod antigo)
  let findings: StructuredFindings | null = null;
  if (row.structuredFindings) {
    const parsed = StructuredFindingsSchema.safeParse(row.structuredFindings);
    findings = parsed.success ? parsed.data : null;
  }

  return {
    id: row.id,
    categoryCode: row.categoryCode,
    writingStyleId: row.writingStyleId,
    rawInput: row.rawInput,
    consolidatedTranscript: row.consolidatedTranscript,
    structuredFindings: findings,
    status: row.status,
  };
}

/**
 * Carrega report para edição incremental. Valida ownership via user_id.
 */
export async function loadReportForEdit(args: {
  reportId: string;
  userId: string;
}): Promise<{
  id: string;
  categoryCode: string;
  generatedOutput: string | null;
  finalOutput: string | null;
  generationMetadata: Record<string, unknown> | null;
} | null> {
  const db = getDbClient();
  const [row] = await db
    .select({
      id: schema.reports.id,
      categoryCode: schema.reports.categoryCode,
      generatedOutput: schema.reports.generatedOutput,
      finalOutput: schema.reports.finalOutput,
      generationMetadata: schema.reports.generationMetadata,
    })
    .from(schema.reports)
    .where(
      and(
        eq(schema.reports.id, args.reportId),
        eq(schema.reports.userId, args.userId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    categoryCode: row.categoryCode,
    generatedOutput: row.generatedOutput,
    finalOutput: row.finalOutput,
    generationMetadata: isPlainRecord(row.generationMetadata)
      ? row.generationMetadata
      : null,
  };
}

export async function updateReportAfterEdit(args: {
  reportId: string;
  userId: string;
  finalOutput: string;
  metadata: Record<string, unknown>;
}): Promise<boolean> {
  const db = getDbClient();
  const rows = await db
    .update(schema.reports)
    .set({
      finalOutput: args.finalOutput,
      generationMetadata: args.metadata as never,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.reports.id, args.reportId),
        eq(schema.reports.userId, args.userId),
      ),
    )
    .returning({ id: schema.reports.id });

  return rows.length > 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
