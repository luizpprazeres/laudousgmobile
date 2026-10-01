import assert from "node:assert/strict";
import {
  BALIK_PLEURAL_EFFUSION_METHOD,
  calculateBalikPleuralEffusionVolume,
  calculateGrafSuggestion,
  createInitialClinicalModelInput,
  renderClinicalModelReport,
  validateClinicalModelInput,
  type AbdomenTotalDopplerInput,
  type DopplerArterialMmssInput,
  type DopplerVenosoMmssInput,
  type QuadrilInfantilInput,
  type ThoraxInput,
} from "../index";

function errorCodes(value: unknown) {
  const result = validateClinicalModelInput(value);
  return result.success ? [] : result.issues.map((entry) => entry.code);
}

for (const code of ["ABDOMEN_TOTAL_DOPPLER", "DOPPLER_VENOSO_MMSS", "DOPPLER_ARTERIAL_MMSS", "TORAX", "QUADRIL_INFANTIL"] as const) {
  const initial = createInitialClinicalModelInput(code);
  assert.ok(errorCodes(initial).includes("MODEL_NOT_REVIEWED"));
  assert.equal(validateClinicalModelInput(initial).success, false, "default não pode ser liberado antes da revisão");
}

const structurallyCompleteDraft = createInitialClinicalModelInput("DOPPLER_VENOSO_MMSS") as DopplerVenosoMmssInput;
assert.match(
  renderClinicalModelReport(structurallyCompleteDraft),
  /DOPPLER VENOSO DE MEMBRO SUPERIOR/,
  "renderer pode produzir a prévia do rascunho, mas o gate de liberação continua fechado",
);
assert.ok(errorCodes(structurallyCompleteDraft).includes("MODEL_NOT_REVIEWED"));

const abdomen = createInitialClinicalModelInput("ABDOMEN_TOTAL_DOPPLER") as AbdomenTotalDopplerInput;
assert.ok(errorCodes(abdomen).includes("MODEL_NOT_REVIEWED"));
assert.ok(errorCodes(abdomen).includes("PORTAL_VEIN_REQUIRED"), "defaults não inventam medidas");
abdomen.portalVein = { caliberCm: 1.1, velocityCms: 22, flow: "hepatopetal" };
abdomen.physicianReviewed = true;
assert.equal(validateClinicalModelInput(abdomen).success, true);
assert.match(renderClinicalModelReport(abdomen), /Fígado de margens regulares/);
abdomen.portalPathology = { status: "confirmed", kind: "portal_thrombosis", physicianConfirmed: false };
assert.ok(errorCodes(abdomen).includes("PORTAL_CONCLUSION_INCOMPLETE"));
abdomen.portalPathology = { status: "confirmed", kind: "portal_thrombosis", evidence: "Material ecogênico intraluminal e ausência de fluxo ao Doppler", physicianConfirmed: true };
assert.match(renderClinicalModelReport(abdomen), /trombose portal/i);
abdomen.portalVein.flow = "hepatofugal";
abdomen.portalPathology = { status: "absent", physicianConfirmed: false };
assert.ok(errorCodes(abdomen).includes("HEPATOFUGAL_FLOW_WITHOUT_PORTAL_FINDING"));
abdomen.portalPathology = { status: "suspected", kind: "portal_hypertension", evidence: "Inversão da direção do fluxo portal", physicianConfirmed: true };
assert.match(renderClinicalModelReport(abdomen), /Achados suspeitos de hipertensão portal/);

const venous = createInitialClinicalModelInput("DOPPLER_VENOSO_MMSS") as DopplerVenosoMmssInput;
assert.ok(errorCodes(venous).includes("MODEL_NOT_REVIEWED"));
venous.physicianReviewed = true;
assert.equal(validateClinicalModelInput(venous).success, true);
venous.right = { ...venous.right, deepSystem: "thrombosis", thrombosisPhase: "acute", phaseConfirmed: false };
assert.ok(errorCodes(venous).includes("THROMBOSIS_PHASE_UNCONFIRMED"));
venous.right.phaseConfirmed = true;
assert.match(renderClinicalModelReport(venous), /Aspecto temporal da trombose: aguda/);
assert.match(renderClinicalModelReport(venous), /Trombose no sistema venoso profundo/);
const venousWithoutTerritory = createInitialClinicalModelInput("DOPPLER_VENOSO_MMSS") as DopplerVenosoMmssInput;
venousWithoutTerritory.physicianReviewed = true;
venousWithoutTerritory.right = { ...venousWithoutTerritory.right, deepSystem: "not_assessed", superficialSystem: "not_assessed", internalJugular: "not_assessed" };
assert.ok(errorCodes(venousWithoutTerritory).includes("VENOUS_TERRITORY_REQUIRED"));
assert.throws(() => renderClinicalModelReport(venousWithoutTerritory), /território venoso/);

const arterial = createInitialClinicalModelInput("DOPPLER_ARTERIAL_MMSS") as DopplerArterialMmssInput;
assert.ok(errorCodes(arterial).includes("MODEL_NOT_REVIEWED"));
arterial.physicianReviewed = true;
assert.equal(validateClinicalModelInput(arterial).success, true);
arterial.right = { ...arterial.right, status: "stenosis" };
assert.ok(errorCodes(arterial).includes("ALTERED_ARTERIAL_MEASUREMENTS_REQUIRED"));
assert.ok(errorCodes(arterial).includes("DISTAL_PATTERN_REQUIRED"));
arterial.right = { ...arterial.right, affectedVessel: "artéria subclávia", psvCms: { "artéria subclávia": 280 }, distalPattern: "fluxo amortecido, com reenchimento distal", stenosisPercent: 70, percentageDataSufficient: true, percentageConfirmed: true };
assert.match(renderClinicalModelReport(arterial), /70%/);
arterial.right = { ...arterial.right, status: "normal", stenosisPercent: 50, percentageDataSufficient: true, percentageConfirmed: true };
assert.ok(errorCodes(arterial).includes("STENOSIS_PERCENT_STATUS_MISMATCH"));
arterial.right = { ...arterial.right, status: "stenosis", stenosisPercent: 70, thoracicOutlet: { evaluated: true, maneuvers: "abdução sustentada", positions: "neutra e abdução", result: "positive", physicianConfirmed: true } };
assert.match(renderClinicalModelReport(arterial), /CONCLUSÃO:[\s\S]*Manobras posicionais positivas/);

const thorax = createInitialClinicalModelInput("TORAX") as ThoraxInput;
assert.ok(errorCodes(thorax).includes("MODEL_NOT_REVIEWED"));
thorax.physicianReviewed = true;
assert.equal(validateClinicalModelInput(thorax).success, true);
const ineligibleEffusion = { present: true as const, separationMm: 10, context: { adult: true, mechanicallyVentilated: false, supineTorso15Deg: true, endExpirationPosteriorAxillary: true, physicianConfirmed: true } };
thorax.right.effusion = ineligibleEffusion;
assert.equal(validateClinicalModelInput(thorax).success, true);
assert.ok(validateClinicalModelInput(thorax).issues.some((entry) => entry.code === "EFFUSION_BALIK_CONTEXT_UNSUPPORTED" && entry.severity === "warning"));
assert.throws(() => calculateBalikPleuralEffusionVolume(ineligibleEffusion), /não é elegível/);
assert.match(renderClinicalModelReport(thorax), /volume não calculado fora do domínio validado/);
assert.doesNotMatch(renderClinicalModelReport(thorax), /V \(mL\) = 20/);
const eligibleEffusion = { ...ineligibleEffusion, context: { ...ineligibleEffusion.context, mechanicallyVentilated: true } };
thorax.right.effusion = eligibleEffusion;
assert.equal(validateClinicalModelInput(thorax).success, true);
assert.equal(calculateBalikPleuralEffusionVolume(eligibleEffusion), 200);
assert.match(renderClinicalModelReport(thorax), /volume estimado de 200 mL/);
assert.match(renderClinicalModelReport(thorax), /CONCLUSÃO:[\s\S]*derrame pleural estimado em 200 mL/);
assert.equal(BALIK_PLEURAL_EFFUSION_METHOD.doi, "10.1007/s00134-005-0024-2");
thorax.left.sliding = "absent";
thorax.left.pleuralLine = "irregular";
thorax.left.consolidation = "suspected";
assert.match(renderClinicalModelReport(thorax), /CONCLUSÃO:[\s\S]*ausência de deslizamento pleural/);
assert.match(renderClinicalModelReport(thorax), /irregularidade da linha pleural/);
assert.match(renderClinicalModelReport(thorax), /consolidação suspeita/);
assert.doesNotMatch(renderClinicalModelReport(thorax), /Hemitórax esquerdo sem alterações/);

assert.deepEqual(calculateGrafSuggestion({ ageDays: 60, adequateStandardPlane: true, alphaDeg: 61, betaDeg: 55, bonyRoof: "normal", cartilaginousRoof: "normal", femoralHead: "centered", labrumPosition: "normal" }), { success: true, classification: "I" });
assert.deepEqual(calculateGrafSuggestion({ ageDays: 80, adequateStandardPlane: true, alphaDeg: 55, betaDeg: 65, bonyRoof: "rounded", cartilaginousRoof: "normal", femoralHead: "centered", labrumPosition: "normal" }), { success: true, classification: "IIA" });
assert.deepEqual(calculateGrafSuggestion({ ageDays: 100, adequateStandardPlane: true, alphaDeg: 55, betaDeg: 65, bonyRoof: "rounded", cartilaginousRoof: "normal", femoralHead: "centered", labrumPosition: "normal" }), { success: true, classification: "IIB" });
assert.deepEqual(calculateGrafSuggestion({ ageDays: 60, adequateStandardPlane: true, alphaDeg: 46, betaDeg: 70, bonyRoof: "rounded", cartilaginousRoof: "normal", femoralHead: "centered", labrumPosition: "normal" }), { success: true, classification: "IIC" });
assert.deepEqual(calculateGrafSuggestion({ ageDays: 60, adequateStandardPlane: true, alphaDeg: 46, betaDeg: 80, bonyRoof: "deficient", cartilaginousRoof: "displaced", femoralHead: "decentered", labrumPosition: "everted" }), { success: true, classification: "D" });
assert.deepEqual(calculateGrafSuggestion({ ageDays: 60, adequateStandardPlane: true, alphaDeg: 40, betaDeg: 85, bonyRoof: "deficient", cartilaginousRoof: "displaced", femoralHead: "dislocated", labrumPosition: "everted" }), { success: true, classification: "III" });
assert.deepEqual(calculateGrafSuggestion({ ageDays: 60, adequateStandardPlane: true, alphaDeg: 40, betaDeg: 85, bonyRoof: "deficient", cartilaginousRoof: "displaced", femoralHead: "dislocated", labrumPosition: "interposed" }), { success: true, classification: "IV" });
assert.equal(calculateGrafSuggestion({ ageDays: 60, adequateStandardPlane: true, alphaDeg: 40, betaDeg: 85, bonyRoof: "deficient", cartilaginousRoof: "displaced", femoralHead: "dislocated", labrumPosition: "not_assessed" }).success, false);
assert.equal(calculateGrafSuggestion({ ageDays: 60, adequateStandardPlane: true, alphaDeg: 61, betaDeg: 55, bonyRoof: "normal", cartilaginousRoof: "normal", femoralHead: "centered", labrumPosition: "not_assessed" }).success, false, "Graf I também exige avaliação do labrum");

const hip = createInitialClinicalModelInput("QUADRIL_INFANTIL") as QuadrilInfantilInput;
assert.ok(errorCodes(hip).includes("GRAF_INPUT_INCOMPLETE"));
assert.ok(errorCodes(hip).includes("MODEL_NOT_REVIEWED"));
hip.physicianReviewed = true;
hip.ageDays = 60;
for (const side of ["right", "left"] as const) hip[side] = { ...hip[side], alphaDeg: 61, betaDeg: 55, grafClassification: "I", classificationConfirmed: true };
assert.equal(validateClinicalModelInput(hip).success, true);
const hipReport = renderClinicalModelReport(hip);
assert.match(hipReport, /Classificação de Graf I/);
hip.right.grafClassification = "IIB";
assert.ok(errorCodes(hip).includes("GRAF_CLASSIFICATION_MISMATCH"));

for (const report of [
  renderClinicalModelReport(abdomen),
  renderClinicalModelReport(venous),
  renderClinicalModelReport(arterial),
  renderClinicalModelReport(thorax),
  hipReport,
]) {
  assert.doesNotMatch(report, /\b(acute|subacute|chronic|stenosis|occlusion|present|absent|confirmed|suspected|not_assessed|not_seen|elective|thrombosis_research|around_catheter)\b/i);
  assert.doesNotMatch(report, /achados descritos|só foi afirmada/i);
}

console.log("clinical model contracts: OK");
