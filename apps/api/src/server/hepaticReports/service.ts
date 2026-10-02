import { getDbClient, schema } from "@laudousg/db";
import {
  HEPATIC_CONTRACT_VERSION,
  HepaticAssessmentSchema,
  StructuredFindingsSchema,
  evaluateHepaticConclusion,
  renderHepaticElastographyReport,
  renderHepaticMultiparametricReport,
  type HepaticAssessment,
  type HepaticIssue,
  type StructuredFindings,
} from "@laudousg/shared";
import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  validateHepaticQualityRegistry,
  type HepaticQualityRegistry,
} from "./qualityRegistry";

const CLASSIC_WRITING_STYLE_ID = "11111111-1111-4111-8111-111111111111";

export const HEPATIC_REPORT_CATEGORIES = {
  multiparametric: {
    code: "AVALIACAO_MULTIPARAMETRICA_HEPATICA",
    label: "Avaliação multiparamétrica hepática",
  },
  elastography: {
    code: "ELASTOGRAFIA_HEPATICA",
    label: "Elastografia hepática",
  },
} as const;

export const CreateHepaticReportRequestSchema = z.object({
  assessment: HepaticAssessmentSchema,
  writing_style_id: z.string().uuid().optional(),
  report_id: z.string().uuid().optional(),
  expected_revision: z.number().int().positive().optional(),
}).strict().superRefine((value, context) => {
  if ((value.report_id === undefined) !== (value.expected_revision === undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: value.report_id === undefined ? ["report_id"] : ["expected_revision"],
      message: "report_id e expected_revision devem ser enviados juntos",
    });
  }
  if (value.report_id !== undefined && value.writing_style_id !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["writing_style_id"],
      message: "writing_style_id só pode ser definido na criação",
    });
  }
});

export type CreateHepaticReportRequest = z.infer<typeof CreateHepaticReportRequestSchema>;

type HepaticReportIssue = HepaticIssue | { path: string; code: "CONFIRMATION_ACTOR_MISMATCH" };

export class HepaticReportError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly issues: HepaticReportIssue[] = [],
  ) {
    super(code);
  }
}

export function hepaticReportsV1Enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function assessmentFingerprint(assessment: HepaticAssessment): string {
  return createHash("sha256").update(canonical(assessment)).digest("hex");
}

function assertConfirmationActor(assessment: HepaticAssessment, actorId: string): void {
  const issues: HepaticReportIssue[] = [];
  for (const key of ["fat", "stiffness"] as const) {
    const interpretation = assessment.modules[key].interpretation;
    if (interpretation?.status === "physician_confirmed" && interpretation.physicianId !== actorId) {
      issues.push({ path: `modules.${key}.interpretation.physicianId`, code: "CONFIRMATION_ACTOR_MISMATCH" });
    }
  }
  const integrated = assessment.integratedInterpretation;
  if (integrated?.status === "physician_confirmed" && integrated.physicianId !== actorId) {
    issues.push({ path: "integratedInterpretation.physicianId", code: "CONFIRMATION_ACTOR_MISMATCH" });
  }
  if (issues.length) throw new HepaticReportError("hepatic_confirmation_actor_mismatch", 403, issues);
}

export function prepareHepaticReport(args: {
  assessment: HepaticAssessment;
  actorId: string;
  qualityRegistry?: HepaticQualityRegistry;
}): {
  assessment: HepaticAssessment;
  categoryCode: (typeof HEPATIC_REPORT_CATEGORIES)[keyof typeof HEPATIC_REPORT_CATEGORIES]["code"];
  structuredFindings: StructuredFindings;
  generatedOutput: string;
} {
  const assessment = HepaticAssessmentSchema.parse(args.assessment);
  const category = assessment.purpose === "multiparametric"
    ? HEPATIC_REPORT_CATEGORIES.multiparametric
    : assessment.purpose === "elastography"
      ? HEPATIC_REPORT_CATEGORIES.elastography
      : null;
  if (!category) {
    throw new HepaticReportError("hepatic_purpose_unsupported", 422, [{
      path: "assessment.purpose",
      code: "SCHEMA_INVALID",
    }]);
  }

  assertConfirmationActor(assessment, args.actorId);
  const qualityIssues = validateHepaticQualityRegistry({
    assessment,
    actorId: args.actorId,
    registry: args.qualityRegistry,
  });
  if (qualityIssues.length) {
    throw new HepaticReportError("hepatic_quality_criterion_unapproved", 422, qualityIssues);
  }
  const validation = evaluateHepaticConclusion(assessment);
  if (!validation.canConclude || !validation.data) {
    throw new HepaticReportError("hepatic_contract_incomplete", 422, validation.issues);
  }

  const generatedOutput = assessment.purpose === "multiparametric"
    ? renderHepaticMultiparametricReport(assessment)
    : renderHepaticElastographyReport(assessment);
  const structuredFindings = StructuredFindingsSchema.parse({
    schema_version: HEPATIC_CONTRACT_VERSION,
    categoria_detectada: category.code,
    tipo_exame: category.label,
    achados: assessment,
    comandos_do_medico: [],
    trechos_confusos: [],
    nivel_de_confianca: "alta",
  });

  return { assessment, categoryCode: category.code, structuredFindings, generatedOutput };
}

async function resolveWritingStyleId(userId: string, requestedId?: string): Promise<string> {
  const db = getDbClient();
  const [profile] = await db
    .select({ defaultWritingStyleId: schema.profiles.defaultWritingStyleId })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);
  if (!profile) throw new HepaticReportError("profile_not_found", 404);

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
    if (id === requestedId) throw new HepaticReportError("writing_style_unavailable", 409);
  }
  throw new HepaticReportError("writing_style_unavailable", 409);
}

export async function createHepaticReport(args: {
  userId: string;
  input: CreateHepaticReportRequest;
}) {
  if (args.input.report_id && args.input.expected_revision) {
    return updateHepaticReport({
      userId: args.userId,
      reportId: args.input.report_id,
      expectedRevision: args.input.expected_revision,
      assessment: args.input.assessment,
    });
  }
  const prepared = prepareHepaticReport({ assessment: args.input.assessment, actorId: args.userId });
  const db = getDbClient();
  const writingStyleId = await resolveWritingStyleId(args.userId, args.input.writing_style_id);
  const [category] = await db
    .select({ code: schema.categories.code })
    .from(schema.categories)
    .where(and(eq(schema.categories.code, prepared.categoryCode), eq(schema.categories.active, true)))
    .limit(1);
  if (!category) throw new HepaticReportError("hepatic_category_unavailable", 409);

  const sanityResult = {
    verdict: "ok" as const,
    issues: [],
    summary: "Contrato hepático validado e renderizado deterministicamente.",
  };
  // examId é a chave idempotente criada pelo cliente para este exame. Um retry
  // idêntico recupera a mesma row; conteúdo divergente nunca cria órfão novo.
  const reportId = prepared.assessment.examId;
  const fingerprint = assessmentFingerprint(prepared.assessment);
  const startedAt = Date.now();
  const [report] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.reports)
      .values({
        id: reportId,
        userId: args.userId,
        categoryCode: prepared.categoryCode,
        writingStyleId,
        status: "generated",
        rawInput: `[${HEPATIC_CONTRACT_VERSION} structured input]`,
        structuredFindings: prepared.structuredFindings as never,
        generatedOutput: prepared.generatedOutput,
        sanityResult: sanityResult as never,
        generationMetadata: {
          api_contract: "hepatic-reports/v1",
          hepatic_contract_version: HEPATIC_CONTRACT_VERSION,
          hepatic_exam_id: prepared.assessment.examId,
          hepatic_revision: prepared.assessment.revision,
          hepatic_payload_sha256: fingerprint,
          physician_reviewed: false,
        } as never,
      })
      .onConflictDoNothing({ target: schema.reports.id })
      .returning({
        id: schema.reports.id,
        categoryCode: schema.reports.categoryCode,
        status: schema.reports.status,
        contentRevision: schema.reports.contentRevision,
        createdAt: schema.reports.createdAt,
      });

    if (!inserted) return [];
    await tx.insert(schema.generationRuns).values({
      reportId,
      promptVersion: HEPATIC_CONTRACT_VERSION,
      contractVersion: HEPATIC_CONTRACT_VERSION,
      findingsSchemaVersion: HEPATIC_CONTRACT_VERSION,
      modelStructurer: "client-structured-hepatic-contract",
      modelWriter: "deterministic-hepatic-renderer",
      modelSanity: "deterministic-hepatic-validator",
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

  if (!report) {
    const [existing] = await db
      .select({
        id: schema.reports.id,
        userId: schema.reports.userId,
        categoryCode: schema.reports.categoryCode,
        status: schema.reports.status,
        contentRevision: schema.reports.contentRevision,
        generatedOutput: schema.reports.generatedOutput,
        generationMetadata: schema.reports.generationMetadata,
        createdAt: schema.reports.createdAt,
      })
      .from(schema.reports)
      .where(eq(schema.reports.id, reportId))
      .limit(1);
    const metadata = existing?.generationMetadata as Record<string, unknown> | null;
    if (!existing
      || existing.userId !== args.userId
      || existing.categoryCode !== prepared.categoryCode
      || metadata?.api_contract !== "hepatic-reports/v1"
      || metadata?.hepatic_payload_sha256 !== fingerprint
      || existing.generatedOutput !== prepared.generatedOutput) {
      throw new HepaticReportError("hepatic_report_idempotency_conflict", 409);
    }
    return {
      report: {
        id: existing.id,
        category_code: existing.categoryCode,
        status: existing.status,
        content_revision: existing.contentRevision,
        review_status: "pending" as const,
        physician_reviewed: false as const,
        generated_output: existing.generatedOutput,
        assessment: prepared.assessment,
        created_at: existing.createdAt.toISOString(),
        idempotent_replay: true as const,
      },
    };
  }
  return {
    report: {
      id: report.id,
      category_code: report.categoryCode,
      status: report.status,
      content_revision: report.contentRevision,
      review_status: "pending" as const,
      physician_reviewed: false as const,
      generated_output: prepared.generatedOutput,
      assessment: prepared.assessment,
      created_at: report.createdAt.toISOString(),
    },
  };
}

export async function updateHepaticReport(args: {
  userId: string;
  reportId: string;
  expectedRevision: number;
  assessment: HepaticAssessment;
}) {
  if (args.reportId !== args.assessment.examId) {
    throw new HepaticReportError("hepatic_report_identity_mismatch", 409);
  }
  const prepared = prepareHepaticReport({ assessment: args.assessment, actorId: args.userId });
  const db = getDbClient();
  const fingerprint = assessmentFingerprint(prepared.assessment);
  const sanityResult = {
    verdict: "ok" as const,
    issues: [],
    summary: "Contrato hepático validado e renderizado deterministicamente.",
  };
  const startedAt = Date.now();
  const [report] = await db.transaction(async (tx) => {
    // Serializa a edição com um eventual rollback da categoria. Sem esta
    // trava, uma categoria desativada ainda poderia aceitar uma atualização.
    const [activeCategory] = await tx
      .select({ code: schema.categories.code })
      .from(schema.categories)
      .where(and(
        eq(schema.categories.code, prepared.categoryCode),
        eq(schema.categories.active, true),
      ))
      .limit(1)
      .for("update");
    if (!activeCategory) throw new HepaticReportError("hepatic_category_unavailable", 409);

    const updated = await tx
      .update(schema.reports)
      .set({
        categoryCode: prepared.categoryCode,
        status: "generated",
        rawInput: `[${HEPATIC_CONTRACT_VERSION} structured input]`,
        structuredFindings: prepared.structuredFindings as never,
        generatedOutput: prepared.generatedOutput,
        finalOutput: null,
        sanityResult: sanityResult as never,
        generationMetadata: {
          api_contract: "hepatic-reports/v1",
          hepatic_contract_version: HEPATIC_CONTRACT_VERSION,
          hepatic_exam_id: prepared.assessment.examId,
          hepatic_revision: prepared.assessment.revision,
          hepatic_payload_sha256: fingerprint,
          physician_reviewed: false,
        } as never,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.reports.id, args.reportId),
        eq(schema.reports.userId, args.userId),
        eq(schema.reports.contentRevision, args.expectedRevision),
      ))
      .returning({
        id: schema.reports.id,
        categoryCode: schema.reports.categoryCode,
        status: schema.reports.status,
        contentRevision: schema.reports.contentRevision,
        createdAt: schema.reports.createdAt,
      });
    if (!updated) throw new HepaticReportError("hepatic_report_content_changed", 409);

    await tx.insert(schema.generationRuns).values({
      reportId: args.reportId,
      promptVersion: HEPATIC_CONTRACT_VERSION,
      contractVersion: HEPATIC_CONTRACT_VERSION,
      findingsSchemaVersion: HEPATIC_CONTRACT_VERSION,
      modelStructurer: "client-structured-hepatic-contract",
      modelWriter: "deterministic-hepatic-renderer",
      modelSanity: "deterministic-hepatic-validator",
      embeddingModel: "none",
      ragQueryText: "[not-applicable:update]",
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
    return updated;
  });
  if (!report) throw new HepaticReportError("hepatic_report_update_failed", 503);

  return {
    report: {
      id: report.id,
      category_code: report.categoryCode,
      status: report.status,
      content_revision: report.contentRevision,
      review_status: "pending" as const,
      physician_reviewed: false as const,
      generated_output: prepared.generatedOutput,
      assessment: prepared.assessment,
      created_at: report.createdAt.toISOString(),
    },
  };
}
