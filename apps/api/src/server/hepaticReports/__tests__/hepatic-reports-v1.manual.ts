import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HEPATIC_CONTRACT_VERSION,
  confirmHepaticIntegratedInterpretation,
  confirmHepaticModuleInterpretation,
  deriveHepaticIqrRatio,
  type HepaticAssessment,
  type HepaticModule,
} from "@laudousg/shared";
import {
  CreateHepaticReportRequestSchema,
  HEPATIC_REPORT_CATEGORIES,
  HepaticReportError,
  hepaticReportsV1Enabled,
  prepareHepaticReport,
} from "../service";
import { ReviewReportInputSchema } from "../../clinicalReports/review";
import { serializeSalaReport } from "../../sala/reportContract";
import type { HepaticQualityRegistry } from "../qualityRegistry";

const actorId = "8e7dfcf2-a3cc-4f0a-a7a5-b46db3444334";
const timestamp = "2026-10-02T15:00:00Z";
const reference = { id: "synthetic-api-protocol", version: "test-only-v1", citation: "Protocolo sintético para teste" };
const inactive: HepaticModule = { status: "not_performed", measurements: [], derived: [] };
const qualityRegistry: HepaticQualityRegistry = [
  {
    module: "stiffness",
    method: "2D-SWE",
    manufacturer: "Fabricante sintético",
    equipmentModel: "Modelo de teste",
    unit: "kPa",
    minimumAcquisitions: 5,
    reference,
    metrics: [{
      code: "quality-reviewed",
      unit: "boolean",
      required: true,
      rule: { version: "synthetic-rule/v1", kind: "allowed_values", values: [1] },
    }],
  },
  {
    module: "fat",
    method: "CAP",
    manufacturer: "Fabricante sintético",
    equipmentModel: "Modelo de teste",
    unit: "dB/m",
    minimumAcquisitions: 5,
    reference,
    metrics: [{
      code: "quality-reviewed",
      unit: "boolean",
      required: true,
      rule: { version: "synthetic-rule/v1", kind: "allowed_values", values: [1] },
    }],
  },
];

function activeModule(method: "2D-SWE" | "CAP", unit: "kPa" | "dB/m", median: number, iqr: number): HepaticModule {
  return {
    status: "performed",
    method,
    equipment: { manufacturer: "Fabricante sintético", model: "Modelo de teste" },
    acquisition: {
      count: 5,
      lobe: "right",
      depthCm: 3.2,
      capsuleDistanceCm: 1.5,
      roi: "parênquima hepático, sem estruturas vasculares",
      position: "decúbito dorsal",
      protocol: reference,
    },
    fasting: { status: "fasting", hours: 4 },
    confounders: { reviewed: true, items: [], etiologicContext: "contexto sintético" },
    quality: {
      assessment: "adequate",
      physicianId: actorId,
      assessedAt: timestamp,
      criterion: {
        reference,
        method,
        manufacturer: "Fabricante sintético",
        equipmentModel: "Modelo de teste",
        unit,
        minimumAcquisitions: 5,
        requiredMetrics: ["quality-reviewed"],
      },
      metrics: [{ code: "quality-reviewed", value: 1, unit: "boolean" }],
    },
    measurements: [
      { id: `${method}-median`, role: "median", value: median, unit, origin: "manual", source: reference },
      { id: `${method}-iqr`, role: "iqr", value: iqr, unit, origin: "manual", source: reference },
    ],
    derived: [],
  };
}

function confirmModule(value: HepaticAssessment, key: "fat" | "stiffness", text: string): HepaticAssessment {
  return confirmHepaticModuleInterpretation(value, key, { text, physicianId: actorId, confirmedAt: timestamp, reference });
}

function elastography(): HepaticAssessment {
  let value: HepaticAssessment = {
    contractVersion: HEPATIC_CONTRACT_VERSION,
    examId: "d91d9e82-a692-4491-bac8-3f3847d7f809",
    revision: 0,
    purpose: "elastography",
    indication: "Avaliação sintética da rigidez hepática",
    modules: { fat: inactive, stiffness: activeModule("2D-SWE", "kPa", 5.2, 0.6) },
  };
  value = deriveHepaticIqrRatio(value, "stiffness");
  return confirmModule(value, "stiffness", "Rigidez hepática dentro dos parâmetros de referência adotados para o método empregado.");
}

function multiparametric(): HepaticAssessment {
  let value: HepaticAssessment = {
    contractVersion: HEPATIC_CONTRACT_VERSION,
    examId: "117f3a3b-2ed7-4580-b763-ab876065041a",
    revision: 0,
    purpose: "multiparametric",
    indication: "Avaliação hepática sintética",
    modules: { fat: activeModule("CAP", "dB/m", 240, 20), stiffness: activeModule("2D-SWE", "kPa", 5.2, 0.6) },
    correlation: {
      modeB: "Fígado de dimensões normais, contornos regulares e ecotextura homogênea",
      doppler: "Fluxos preservados nos vasos avaliados",
      concordance: "concordant",
    },
  };
  value = deriveHepaticIqrRatio(value, "fat");
  value = deriveHepaticIqrRatio(value, "stiffness");
  value = confirmModule(value, "fat", "Quantificação de gordura revisada pelo médico.");
  value = confirmModule(value, "stiffness", "Rigidez hepática revisada pelo médico.");
  return confirmHepaticIntegratedInterpretation(value, {
    text: "Avaliação multiparamétrica hepática sem alterações significativas nos parâmetros examinados.",
    physicianId: actorId,
    confirmedAt: timestamp,
    reference,
  });
}

assert.equal(hepaticReportsV1Enabled(undefined), false);
assert.equal(hepaticReportsV1Enabled("false"), false);
assert.equal(hepaticReportsV1Enabled(" true "), true);

assert.throws(
  () => prepareHepaticReport({ assessment: elastography(), actorId }),
  (error) => error instanceof HepaticReportError
    && error.code === "hepatic_quality_criterion_unapproved"
    && error.issues.some((issue) => issue.code === "QUALITY_CRITERION_UNAPPROVED"),
  "registro vazio deve rejeitar protocolo sintético enviado pelo cliente",
);

const elastographyPrepared = prepareHepaticReport({ assessment: elastography(), actorId, qualityRegistry });
assert.equal(elastographyPrepared.categoryCode, HEPATIC_REPORT_CATEGORIES.elastography.code);
assert.equal(elastographyPrepared.structuredFindings.achados.examId, elastography().examId);
assert.match(elastographyPrepared.generatedOutput, /^ELASTOGRAFIA HEPÁTICA/);
assert.match(elastographyPrepared.generatedOutput, /5,2 kPa/);
assert.doesNotMatch(elastographyPrepared.generatedOutput, /fibrose|F[0-4]|limiar/i);

const multiparametricPrepared = prepareHepaticReport({ assessment: multiparametric(), actorId, qualityRegistry });
assert.equal(multiparametricPrepared.categoryCode, HEPATIC_REPORT_CATEGORIES.multiparametric.code);
assert.match(multiparametricPrepared.generatedOutput, /^AVALIAÇÃO MULTIPARAMÉTRICA HEPÁTICA/);
assert.match(multiparametricPrepared.generatedOutput, /240 dB\/m/);

const forgedQualityActor = elastography();
forgedQualityActor.modules.stiffness.quality!.physicianId = "outro-medico";
assert.throws(
  () => prepareHepaticReport({ assessment: forgedQualityActor, actorId, qualityRegistry }),
  (error) => error instanceof HepaticReportError
    && error.code === "hepatic_quality_criterion_unapproved"
    && error.issues.some((issue) => issue.code === "QUALITY_PHYSICIAN_ACTOR_MISMATCH"),
  "quality.physicianId deve corresponder ao JWT",
);

const outOfRuleMetric = elastography();
outOfRuleMetric.modules.stiffness.quality!.metrics[0]!.value = 2;
assert.throws(
  () => prepareHepaticReport({ assessment: outOfRuleMetric, actorId, qualityRegistry }),
  (error) => error instanceof HepaticReportError
    && error.code === "hepatic_quality_criterion_unapproved"
    && error.issues.some((issue) => issue.code === "QUALITY_METRIC_VALUE_UNAPPROVED"),
  "valor fora da regra versionada deve ser recusado",
);

assert.throws(
  () => prepareHepaticReport({ assessment: elastography(), actorId: "fd537b60-533d-441f-af19-b97ec02ae3c7", qualityRegistry }),
  (error) => error instanceof HepaticReportError && error.code === "hepatic_confirmation_actor_mismatch" && error.status === 403,
  "confirmação local não pode se passar pelo médico autenticado",
);

const stale = elastography();
stale.modules.stiffness.measurements[0]!.value = 9;
assert.throws(
  () => prepareHepaticReport({ assessment: stale, actorId, qualityRegistry }),
  (error) => error instanceof HepaticReportError && error.code === "hepatic_contract_incomplete" && error.status === 422,
  "edição posterior à confirmação deve falhar fechada",
);

const wrongPurpose = { ...elastography(), purpose: "abdomen_total" as const };
assert.throws(
  () => prepareHepaticReport({ assessment: wrongPurpose, actorId, qualityRegistry }),
  (error) => error instanceof HepaticReportError && error.code === "hepatic_purpose_unsupported",
  "abdome e Doppler não entram no endpoint hepático sem contrato próprio",
);

assert.equal(CreateHepaticReportRequestSchema.safeParse({ assessment: elastography() }).success, true);
assert.equal(CreateHepaticReportRequestSchema.safeParse({
  assessment: elastography(),
  report_id: elastography().examId,
  expected_revision: 1,
}).success, true);
assert.equal(CreateHepaticReportRequestSchema.safeParse({
  assessment: elastography(),
  report_id: elastography().examId,
}).success, false, "update incompleto deve falhar no contrato HTTP");
assert.equal(
  CreateHepaticReportRequestSchema.safeParse({ assessment: elastography(), categoryCode: "DOPPLER_HEPATICO" }).success,
  false,
  "cliente não escolhe livremente a categoria persistida",
);
assert.equal(
  ReviewReportInputSchema.safeParse({ expectedRevision: 1, expectedText: elastographyPrepared.generatedOutput }).success,
  true,
);
const salaPending = serializeSalaReport({
  id: "synthetic-hepatic-report",
  final_output: null,
  generated_output: elastographyPrepared.generatedOutput,
  category_code: HEPATIC_REPORT_CATEGORIES.elastography.code,
  created_at: timestamp,
  content_revision: 1,
  sanity_result: { verdict: "ok", issues: [] },
});
assert.equal(salaPending.reviewStatus, "pending");
assert.equal(salaPending.outputText, elastographyPrepared.generatedOutput);
assert.equal(serializeSalaReport({
  id: salaPending.id,
  final_output: null,
  generated_output: elastographyPrepared.generatedOutput,
  category_code: HEPATIC_REPORT_CATEGORIES.elastography.code,
  created_at: timestamp,
  content_revision: 1,
  sanity_result: { verdict: "ok", issues: [] },
}, {
  report_id: salaPending.id,
  reviewed_revision: 1,
  reviewed_at: timestamp,
}).reviewStatus, "reviewed");
assert.equal(serializeSalaReport({
  id: salaPending.id,
  final_output: null,
  generated_output: elastographyPrepared.generatedOutput,
  category_code: HEPATIC_REPORT_CATEGORIES.elastography.code,
  created_at: timestamp,
  content_revision: 2,
  sanity_result: { verdict: "ok", issues: [] },
}, {
  report_id: salaPending.id,
  reviewed_revision: 1,
  reviewed_at: timestamp,
}).reviewStatus, "pending", "edição invalida a revisão médica da revisão anterior");

const serviceSource = readFileSync(resolve(
  process.cwd(),
  "apps/api/src/server/hepaticReports/service.ts",
), "utf8");
assert.match(serviceSource, /const reportId = prepared\.assessment\.examId;/, "create precisa de chave idempotente estável");
assert.match(serviceSource, /\.onConflictDoNothing\(\{ target: schema\.reports\.id \}\)/, "retry não pode criar segundo laudo");
assert.match(serviceSource, /eq\(schema\.reports\.userId, args\.userId\)/, "update precisa filtrar o dono");
assert.match(serviceSource, /eq\(schema\.reports\.contentRevision, args\.expectedRevision\)/, "update precisa de compare-and-swap da revisão");
assert.match(serviceSource, /tx\.insert\(schema\.generationRuns\)/, "cada criação/atualização precisa de trilha de geração");
assert.match(serviceSource, /eq\(schema\.categories\.active, true\)/, "create/update devem respeitar rollback da categoria");
assert.match(serviceSource, /\.for\("update"\)/, "update deve serializar com a desativação da categoria");

for (const route of [
  "apps/api/src/app/api/v1/hepatic-reports/route.ts",
  "apps/api/src/app/api/v1/hepatic-reports/[id]/review/route.ts",
]) {
  const source = readFileSync(resolve(process.cwd(), route), "utf8");
  assert.match(source, /verifyJwt\(req\)/, `${route}: autenticação ausente`);
}

async function assertRoutesRequireAuth() {
  const createRoute = await import("../../../app/api/v1/hepatic-reports/route");
  const unauthenticatedCreate = await createRoute.POST(new Request(
    "http://localhost/api/v1/hepatic-reports",
    { method: "POST", body: "{}", headers: { "content-type": "application/json" } },
  ));
  assert.equal(unauthenticatedCreate.status, 401, "geração deve exigir JWT antes do gate e do contrato");

  const reviewRoute = await import("../../../app/api/v1/hepatic-reports/[id]/review/route");
  const unauthenticatedReview = await reviewRoute.POST(
    new Request("http://localhost/api/v1/hepatic-reports/00000000-0000-4000-8000-000000000000/review", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) },
  );
  assert.equal(unauthenticatedReview.status, 401, "revisão deve exigir JWT antes de consultar o laudo");
}

assertRoutesRequireAuth()
  .then(() => console.log("✓ API hepática v1: gate OFF, ator vinculado, renderer determinístico, persistência/revisão compatíveis"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
