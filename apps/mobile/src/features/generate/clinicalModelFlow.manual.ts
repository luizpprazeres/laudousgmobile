import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAndroidClinicalDraft,
  canReleaseAndroidClinicalDraft,
  deserializeAndroidClinicalDraft,
  generateAndroidClinicalPreview,
  serializeAndroidClinicalDraft,
  updateAndroidClinicalDraft,
  validateAndroidClinicalDraft,
} from "./clinicalModelFlow";
import type {
  AbdomenTotalDopplerInput,
  ClinicalModelInput,
  DopplerArterialMmssInput,
  DopplerVenosoMmssInput,
  QuadrilInfantilInput,
  ThoraxInput,
} from "@laudousg/shared";

function complete(code: ClinicalModelInput["categoryCode"]): ClinicalModelInput {
  const value = createAndroidClinicalDraft(code);
  if (value.categoryCode === "ABDOMEN_TOTAL_DOPPLER") {
    (value as AbdomenTotalDopplerInput).portalVein = { caliberCm: 1.1, velocityCms: 22, flow: "hepatopetal" };
  } else if (value.categoryCode === "QUADRIL_INFANTIL") {
    const hip = value as QuadrilInfantilInput;
    hip.ageDays = 60;
    for (const side of ["right", "left"] as const) hip[side] = { ...hip[side], alphaDeg: 61, betaDeg: 55, grafClassification: "I", classificationConfirmed: true };
  }
  return value;
}

for (const code of ["ABDOMEN_TOTAL_DOPPLER", "DOPPLER_VENOSO_MMSS", "DOPPLER_ARTERIAL_MMSS", "TORAX", "QUADRIL_INFANTIL"] as const) {
  test(`${code}: rascunho válido gera prévia sem forjar revisão médica`, () => {
    const draft = complete(code);
    assert.equal(draft.physicianReviewed, false);
    assert.equal(validateAndroidClinicalDraft(draft).success, true);
    assert.ok(generateAndroidClinicalPreview(draft).length > 80);
    assert.equal(draft.physicianReviewed, false);
    assert.equal(canReleaseAndroidClinicalDraft(draft), true);
    const restored = deserializeAndroidClinicalDraft(serializeAndroidClinicalDraft(draft));
    assert.deepEqual(restored, draft);
    assert.equal(restored.physicianReviewed, false);
    assert.equal(updateAndroidClinicalDraft(restored).physicianReviewed, false);
  });
}

test("achado obrigatório incompleto bloqueia prévia e persistência", () => {
  const abdomen = createAndroidClinicalDraft("ABDOMEN_TOTAL_DOPPLER") as AbdomenTotalDopplerInput;
  assert.equal(validateAndroidClinicalDraft(abdomen).success, false);
  assert.equal(canReleaseAndroidClinicalDraft(abdomen), false);
});

test("alterações vasculares, derrame e Graf continuam serializáveis", () => {
  const venous = complete("DOPPLER_VENOSO_MMSS") as DopplerVenosoMmssInput;
  venous.right = { ...venous.right, deepSystem: "thrombosis", thrombosisPhase: "acute", phaseConfirmed: true };
  const arterial = complete("DOPPLER_ARTERIAL_MMSS") as DopplerArterialMmssInput;
  arterial.right = { ...arterial.right, status: "stenosis", affectedVessel: "artéria subclávia", psvCms: { "artéria subclávia": 280 }, distalPattern: "fluxo amortecido", stenosisPercent: 70, percentageDataSufficient: true, percentageConfirmed: true };
  const thorax = complete("TORAX") as ThoraxInput;
  thorax.right.effusion = { present: true, separationMm: 10, context: { adult: true, mechanicallyVentilated: true, supineTorso15Deg: true, endExpirationPosteriorAxillary: true, physicianConfirmed: true } };
  for (const value of [venous, arterial, thorax]) {
    assert.equal(validateAndroidClinicalDraft(value).success, true);
    assert.deepEqual(deserializeAndroidClinicalDraft(serializeAndroidClinicalDraft(value)), value);
  }
});

test("tórax fora do domínio de Balik mantém derrame sem volume automático", () => {
  const thorax = complete("TORAX") as ThoraxInput;
  thorax.right.effusion = {
    present: true,
    separationMm: 12,
    context: {
      adult: true,
      mechanicallyVentilated: false,
      supineTorso15Deg: false,
      endExpirationPosteriorAxillary: false,
      physicianConfirmed: true,
    },
  };
  const validation = validateAndroidClinicalDraft(thorax);
  assert.equal(validation.success, true);
  assert.ok(validation.issues.some((entry) => entry.code === "EFFUSION_BALIK_CONTEXT_UNSUPPORTED" && entry.severity === "warning"));
  const report = generateAndroidClinicalPreview(thorax);
  assert.match(report, /separação máxima de 12 mm/);
  assert.match(report, /sem estimativa volumétrica/);
  assert.doesNotMatch(report, /volume estimado/);
  assert.equal(thorax.physicianReviewed, false);
});
