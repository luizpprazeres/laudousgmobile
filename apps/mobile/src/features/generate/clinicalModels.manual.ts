import assert from "node:assert/strict";
import { test } from "node:test";
import { APPROVED_CLINICAL_CATS, CATS } from "../../ui/tokens";
import { ANDROID_MODEL_POLICIES, APPROVED_ANDROID_MODEL_CODES, canCommitGrafClassification, grafReadiness } from "./clinicalModels";

test("cinco modelos aprovados ficam disponíveis juntos no seletor Android", () => {
  assert.deepEqual(APPROVED_CLINICAL_CATS.map((category) => category.id), APPROVED_ANDROID_MODEL_CODES);
  for (const code of APPROVED_ANDROID_MODEL_CODES) {
    assert.equal(CATS.filter((category) => category.id === code).length, 1, `${code} deve aparecer uma vez`);
    assert.ok(ANDROID_MODEL_POLICIES[code]);
  }
});

const completeGraf = {
  schemaVersion: 1 as const,
  categoryCode: "QUADRIL_INFANTIL" as const,
  physicianReviewed: false,
  ageDays: 90,
  right: { adequateStandardPlane: true, alphaDeg: 64, betaDeg: 48, bonyRoof: "normal" as const, cartilaginousRoof: "normal" as const, femoralHead: "centered" as const, labrumPosition: "normal" as const, coveragePercent: 55, grafClassification: "I" as const, classificationConfirmed: true },
  left: { adequateStandardPlane: true, alphaDeg: 65, betaDeg: 47, bonyRoof: "normal" as const, cartilaginousRoof: "normal" as const, femoralHead: "centered" as const, labrumPosition: "normal" as const, grafClassification: "I" as const, classificationConfirmed: true },
  recommendationConfirmed: false,
};

test("Graf falha fechado com campo ausente ou corte inadequado", () => {
  const ready = grafReadiness(completeGraf);
  assert.equal(ready.ready, true);
  if (ready.ready) assert.deepEqual(ready.suggestions, { right: "I", left: "I" });
  assert.equal(grafReadiness({ ...completeGraf, right: { ...completeGraf.right, betaDeg: undefined } }).ready, false);
  assert.equal(grafReadiness({ ...completeGraf, left: { ...completeGraf.left, adequateStandardPlane: false } }).ready, false);
  assert.equal(canCommitGrafClassification({ ...completeGraf, right: { ...completeGraf.right, classificationConfirmed: false } }), false);
  assert.equal(canCommitGrafClassification(completeGraf), true);
  assert.equal(completeGraf.physicianReviewed, false);
  assert.equal(grafReadiness({
    ...completeGraf,
    right: { ...completeGraf.right, alphaDeg: 40, labrumPosition: "not_assessed" },
  }).ready, false);
});

test("idade acima de seis meses alerta sem bloquear", () => {
  const result = grafReadiness({ ...completeGraf, ageDays: 240 });
  assert.equal(result.ready, true);
  assert.equal(result.warnings.length, 1);
});
