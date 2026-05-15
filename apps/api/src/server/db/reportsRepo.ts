import { eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
import type {
  StructuredFindings,
  SanityResult,
  ReportStatus,
} from "@laudousg/shared";

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
