import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ClinicalReportError,
  clinicalModelsV1Enabled,
  prepareClinicalReport,
} from "../service";
import { ReviewReportInputSchema } from "../review";
import { clinicalRendererFallbackBlocked } from "../fallbackPolicy";

const five = [
  "ABDOMEN_TOTAL_DOPPLER",
  "DOPPLER_VENOSO_MMSS",
  "DOPPLER_ARTERIAL_MMSS",
  "TORAX",
  "QUADRIL_INFANTIL",
].join(",");
assert.equal(clinicalModelsV1Enabled(""), false, "default deve manter o endpoint OFF");
assert.equal(clinicalModelsV1Enabled("TORAX"), false, "rollout parcial não pode abrir o endpoint");
assert.equal(clinicalModelsV1Enabled(five), true, "os cinco juntos abrem o endpoint");
assert.equal(clinicalRendererFallbackBlocked("QUADRIL_INFANTIL"), true, "Graf incompleto não pode cair no writer");
assert.equal(clinicalRendererFallbackBlocked("TORAX"), true, "tórax incompleto não pode inventar achado no writer");
assert.equal(
  clinicalRendererFallbackBlocked("ABDOMEN_TOTAL_DOPPLER"),
  true,
  "abdome com Doppler incompleto não pode cair no writer livre",
);
for (const category of ["ABDOMEN_TOTAL", "LIVRE", "TESTE", "MUSCULOESQUELETICO_V2"]) {
  assert.equal(clinicalRendererFallbackBlocked(category), false, `${category}: writer legítimo preservado`);
}

const thorax = prepareClinicalReport({
  schemaVersion: 1,
  categoryCode: "TORAX",
  physicianReviewed: true,
  right: {
    pleuralLine: "regular",
    sliding: "present",
    linesB: { count: 0, distribution: "none" },
    effusion: {
      present: true,
      separationMm: 12,
      context: {
        adult: true,
        mechanicallyVentilated: false,
        supineTorso15Deg: false,
        endExpirationPosteriorAxillary: false,
        physicianConfirmed: false,
      },
    },
    consolidation: "suspected",
    atelectasis: "not_seen",
    pneumothorax: "not_seen",
  },
  left: {
    pleuralLine: "regular",
    sliding: "present",
    linesB: { count: 0, distribution: "none" },
    effusion: { present: false },
    consolidation: "not_seen",
    atelectasis: "not_seen",
    pneumothorax: "not_seen",
  },
  correlationSuggested: true,
});
assert.equal(thorax.contract.physicianReviewed, false, "cliente não pode autorrevisar na geração");
assert.equal(thorax.structuredFindings.achados.physicianReviewed, false);
assert.match(thorax.generatedOutput, /separação máxima de 12 mm/);
assert.match(thorax.generatedOutput, /consolidação suspeita/i);
assert.doesNotMatch(thorax.generatedOutput, /240 mL|V \(mL\) = 20|volume estimado/i);
assert.ok(thorax.warnings.some((warning) => warning.code === "EFFUSION_BALIK_CONTEXT_UNSUPPORTED"));

assert.throws(
  () => prepareClinicalReport({
    schemaVersion: 1,
    categoryCode: "QUADRIL_INFANTIL",
    physicianReviewed: false,
    right: {
      adequateStandardPlane: false,
      bonyRoof: "not_assessed",
      cartilaginousRoof: "not_assessed",
      femoralHead: "not_assessed",
      labrumPosition: "not_assessed",
      classificationConfirmed: false,
    },
    left: {
      adequateStandardPlane: false,
      bonyRoof: "not_assessed",
      cartilaginousRoof: "not_assessed",
      femoralHead: "not_assessed",
      labrumPosition: "not_assessed",
      classificationConfirmed: false,
    },
    recommendationConfirmed: false,
  }),
  (error) => error instanceof ClinicalReportError
    && error.code === "clinical_contract_incomplete"
    && error.issues?.some((issue) => issue.code === "GRAF_INPUT_INCOMPLETE") === true,
  "Graf incompleto deve falhar fechado antes da persistência",
);

assert.equal(ReviewReportInputSchema.safeParse({ expectedRevision: 1, expectedText: "Laudo sintético" }).success, true);
assert.equal(
  ReviewReportInputSchema.safeParse({ expectedRevision: 1, expectedText: "Laudo sintético", actorId: crypto.randomUUID() }).success,
  false,
  "ator da revisão nunca pode vir no JSON do cliente",
);

for (const route of [
  "apps/api/src/app/api/v1/clinical-reports/route.ts",
  "apps/api/src/app/api/v1/clinical-reports/[id]/review/route.ts",
]) {
  const source = readFileSync(resolve(process.cwd(), route), "utf8");
  assert.match(source, /verifyJwt\(req\)/, `${route}: autenticação ausente`);
}

async function assertRoutesRequireAuth() {
  const createRoute = await import("../../../app/api/v1/clinical-reports/route");
  const unauthenticatedCreate = await createRoute.POST(new Request(
    "http://localhost/api/v1/clinical-reports",
    { method: "POST", body: "{}", headers: { "content-type": "application/json" } },
  ));
  assert.equal(unauthenticatedCreate.status, 401, "geração deve exigir JWT antes de ler contrato ou gate");

  const reviewRoute = await import("../../../app/api/v1/clinical-reports/[id]/review/route");
  const unauthenticatedReview = await reviewRoute.POST(
    new Request("http://localhost/api/v1/clinical-reports/00000000-0000-4000-8000-000000000000/review", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) },
  );
  assert.equal(unauthenticatedReview.status, 401, "revisão deve exigir JWT antes de consultar o laudo");
}

assertRoutesRequireAuth()
  .then(() => console.log("✓ API clínica v1: gate conjunto, rascunho não revisado, Balik conservador e Graf fail-closed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
