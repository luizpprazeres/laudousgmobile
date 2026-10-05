import { getDbClient, schema } from "@laudousg/db";
import {
  CLINICAL_MODEL_CODES,
  ClinicalModelInputSchema,
  StructuredFindingsSchema,
  renderClinicalModelReport,
  validateClinicalModelInput,
  type ClinicalModelInput,
  type ClinicalModelIssue,
  type StructuredFindings,
} from "@laudousg/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const CLASSIC_WRITING_STYLE_ID = "11111111-1111-4111-8111-111111111111";

export const CLINICAL_MODEL_LABELS = {
  ABDOMEN_TOTAL_DOPPLER: "Abdome Total c/ Doppler",
  DOPPLER_HEPATICO: "Doppler hepático",
  DOPPLER_VENOSO_MMSS: "Doppler Venoso MMSS",
  DOPPLER_ARTERIAL_MMSS: "Doppler Arterial MMSS",
  TORAX: "Tórax",
  QUADRIL_INFANTIL: "Quadril Infantil",
} as const satisfies Record<(typeof CLINICAL_MODEL_CODES)[number], string>;

export const CreateClinicalReportRequestSchema = z.object({
  contract: ClinicalModelInputSchema,
  writing_style_id: z.string().uuid().optional(),
}).strict();

export type CreateClinicalReportRequest = z.infer<typeof CreateClinicalReportRequestSchema>;

export class ClinicalReportError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly issues?: ClinicalModelIssue[],
  ) {
    super(code);
  }
}

export function clinicalModelsV1Enabled(flag = "true"): boolean {
  return flag !== "false";
}

export function normalizeContractForGeneration(input: ClinicalModelInput): ClinicalModelInput {
  // Nunca aceite um booleano enviado pelo cliente como prova de revisão.
  // A revisão confiável é uma ação autenticada posterior, vinculada à revisão
  // exata do texto persistido por review_report_content.
  return ClinicalModelInputSchema.parse({ ...input, physicianReviewed: false });
}

export function prepareClinicalReport(input: ClinicalModelInput): {
  contract: ClinicalModelInput;
  structuredFindings: StructuredFindings;
  generatedOutput: string;
  warnings: ClinicalModelIssue[];
} {
  const contract = normalizeContractForGeneration(input);
  const validation = validateClinicalModelInput(contract, { requirePhysicianReview: false });
  if (!validation.success) {
    throw new ClinicalReportError("clinical_contract_incomplete", 422, validation.issues);
  }

  const structuredFindings = StructuredFindingsSchema.parse({
    schema_version: "clinical-model/v1",
    categoria_detectada: contract.categoryCode,
    tipo_exame: CLINICAL_MODEL_LABELS[contract.categoryCode],
    achados: contract,
    comandos_do_medico: [],
    trechos_confusos: [],
    nivel_de_confianca: "alta",
  });

  return {
    contract,
    structuredFindings,
    generatedOutput: renderClinicalModelReport(contract),
    warnings: validation.issues.filter((issue) => issue.severity === "warning"),
  };
}

async function resolveWritingStyleId(userId: string, requestedId?: string): Promise<string> {
  const db = getDbClient();
  const [profile] = await db
    .select({ defaultWritingStyleId: schema.profiles.defaultWritingStyleId })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);
  if (!profile) throw new ClinicalReportError("profile_not_found", 404);

  const candidates = [...new Set([
    requestedId,
    profile.defaultWritingStyleId ?? undefined,
    CLASSIC_WRITING_STYLE_ID,
  ].filter((value): value is string => Boolean(value)))];

  for (const id of candidates) {
    const [style] = await db
      .select({ id: schema.writingStyles.id })
      .from(schema.writingStyles)
      .where(and(eq(schema.writingStyles.id, id), eq(schema.writingStyles.active, true)))
      .limit(1);
    if (style) return style.id;
    if (id === requestedId) throw new ClinicalReportError("writing_style_unavailable", 409);
  }
  throw new ClinicalReportError("writing_style_unavailable", 409);
}

export async function createClinicalReport(args: {
  userId: string;
  input: CreateClinicalReportRequest;
}) {
  const prepared = prepareClinicalReport(args.input.contract);
  const db = getDbClient();
  const writingStyleId = await resolveWritingStyleId(args.userId, args.input.writing_style_id);
  const [category] = await db
    .select({ code: schema.categories.code })
    .from(schema.categories)
    .where(and(
      eq(schema.categories.code, prepared.contract.categoryCode),
      eq(schema.categories.active, true),
    ))
    .limit(1);
  if (!category) throw new ClinicalReportError("clinical_category_unavailable", 409);

  const sanityResult = {
    verdict: prepared.warnings.length ? "warning" as const : "ok" as const,
    issues: prepared.warnings.map((warning) => ({
      type: "outro" as const,
      severity: "warning" as const,
      detail: warning.message,
      campo_achado: warning.path,
    })),
    summary: prepared.warnings.length
      ? "Rascunho gerado com avisos clínicos objetivos para revisão médica."
      : "Contrato clínico estruturado validado deterministicamente.",
  };
  const reportId = crypto.randomUUID();
  const startedAt = Date.now();

  const [report] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.reports)
      .values({
        id: reportId,
        userId: args.userId,
        categoryCode: prepared.contract.categoryCode,
        writingStyleId,
        status: "generated",
        rawInput: "[clinical-model/v1 structured input]",
        structuredFindings: prepared.structuredFindings as never,
        generatedOutput: prepared.generatedOutput,
        sanityResult: sanityResult as never,
        generationMetadata: {
          api_contract: "clinical-reports/v1",
          clinical_schema_version: 1,
          physician_reviewed: false,
          warning_codes: prepared.warnings.map((warning) => warning.code),
        } as never,
      })
      .returning({
        id: schema.reports.id,
        categoryCode: schema.reports.categoryCode,
        status: schema.reports.status,
        contentRevision: schema.reports.contentRevision,
        createdAt: schema.reports.createdAt,
      });

    await tx.insert(schema.generationRuns).values({
      reportId,
      promptVersion: "clinical-model/v1",
      contractVersion: "clinical-model/v1",
      findingsSchemaVersion: "clinical-model/v1",
      modelStructurer: "client-structured-contract",
      modelWriter: "deterministic-clinical-renderer",
      modelSanity: "deterministic-clinical-validator",
      embeddingModel: "none",
      ragQueryText: "[not-applicable]",
      structuredInput: prepared.structuredFindings as never,
      sanityOutput: sanityResult as never,
      latencyMsTotal: Math.max(0, Date.now() - startedAt),
      latencyMsStructurer: 0,
      latencyMsWriter: 0,
      latencyMsSanity: 0,
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: "0",
      outcome: "success",
    });
    return inserted;
  });

  if (!report) throw new ClinicalReportError("clinical_report_persistence_failed", 503);
  return {
    report: {
      id: report.id,
      category_code: report.categoryCode,
      status: report.status,
      content_revision: report.contentRevision,
      review_status: "pending" as const,
      physician_reviewed: false as const,
      generated_output: prepared.generatedOutput,
      contract: prepared.contract,
      warnings: prepared.warnings,
      created_at: report.createdAt.toISOString(),
    },
  };
}
