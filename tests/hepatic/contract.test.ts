import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HEPATIC_CONTRACT_VERSION, HepaticAssessmentSchema, deriveHepaticIqrRatio,
  evaluateHepaticConclusion, hepaticModuleSnapshot, hepaticAssessmentSnapshot,
  removeHepaticMeasurement, replaceHepaticModule,
  type HepaticAssessment, type HepaticModule,
} from "../../packages/shared/src/hepatic";

const reference = { id: "synthetic-protocol", version: "test-only-v1", citation: "Synthetic fixture, not a clinical threshold" };
const timestamp = "2026-10-02T15:00:00Z";
function confirm(module: HepaticModule): HepaticModule {
  return { ...module, interpretation: { text: "Interpretação sintética revisada", status: "physician_confirmed", physicianId: "synthetic-doctor", confirmedAt: timestamp, reference, contextSnapshot: hepaticModuleSnapshot(module) } };
}
function module(method: NonNullable<HepaticModule["method"]> = "2D-SWE", unit: "kPa" | "m/s" | "dB/m" | "dB/cm/MHz" | "%" = "kPa"): HepaticModule {
  return confirm({
    status: "performed", method,
    equipment: { manufacturer: "Synthetic", model: "Test" },
    acquisition: { count: 5, lobe: "right", depthCm: 3, roi: "Synthetic ROI", position: "supine", protocol: reference },
    fasting: { status: "fasting", hours: 4 },
    confounders: { reviewed: true, items: [], etiologicContext: "Synthetic context" },
    quality: { assessment: "adequate", physicianId: "synthetic-doctor", assessedAt: timestamp,
      criterion: { reference, method, manufacturer: "Synthetic", equipmentModel: "Test", unit, minimumAcquisitions: 5, requiredMetrics: ["test-quality"] },
      metrics: [{ code: "test-quality", value: 1, unit: "test-only" }] },
    measurements: [
      { id: "median", role: "median", value: 14, unit, origin: "manual", source: reference },
      { id: "iqr", role: "iqr", value: 2.8, unit, origin: "manual", source: reference },
    ], derived: [],
  });
}
function exam(): HepaticAssessment {
  return { contractVersion: HEPATIC_CONTRACT_VERSION, examId: "c2c4c302-2f31-424c-92df-08265908a158", revision: 0,
    purpose: "elastography", indication: "Synthetic indication", modules: {
      fat: { status: "not_performed", measurements: [], derived: [] }, stiffness: module(),
    } };
}
function has(value: unknown, code: string) { return evaluateHepaticConclusion(value).issues.some(i => i.code === code); }

test("complete reviewed native result can conclude, including JSON round trip", () => {
  assert.equal(evaluateHepaticConclusion(JSON.parse(JSON.stringify(exam()))).canConclude, true);
});
test("empty initial state never concludes or creates defaults", () => {
  const value = exam();
  value.modules.stiffness = { status: "not_performed", measurements: [], derived: [] };
  assert.equal(evaluateHepaticConclusion(value).canConclude, false);
  assert.deepEqual(HepaticAssessmentSchema.parse(value).modules.stiffness, value.modules.stiffness);
});
test("unknown version, unknown fields, nonfinite values and string numbers fail closed", () => {
  assert(has({ ...exam(), contractVersion: "hepatic-assessment/v2" }, "SCHEMA_INVALID"));
  assert(has({ ...exam(), physicianReviewed: true }, "SCHEMA_INVALID"));
  for (const number of [Infinity, NaN, "14", -1]) {
    const value = exam(); (value.modules.stiffness.measurements[0] as any).value = number;
    assert(has(value, "SCHEMA_INVALID"));
  }
});
test("every minimum context field gates conclusion independently", () => {
  for (const field of ["method", "equipment", "acquisition", "fasting", "confounders", "quality", "interpretation"] as const) {
    const value = exam(); delete value.modules.stiffness[field];
    assert.equal(evaluateHepaticConclusion(value).canConclude, false, field);
  }
  const value = exam(); delete value.indication;
  assert(has(value, "INDICATION_REQUIRED"));
});
test("quality requires applicable versioned criterion, minimum count and metrics", () => {
  const changes = [
    (m: HepaticModule) => { m.quality!.assessment = "inadequate"; },
    (m: HepaticModule) => { m.quality!.criterion.method = "TE"; },
    (m: HepaticModule) => { m.quality!.criterion.manufacturer = "Other"; },
    (m: HepaticModule) => { m.quality!.criterion.equipmentModel = "Other"; },
    (m: HepaticModule) => { m.quality!.criterion.unit = "m/s"; },
    (m: HepaticModule) => { m.acquisition!.count = 4; },
    (m: HepaticModule) => { m.quality!.metrics = []; },
    (m: HepaticModule) => { m.quality!.metrics.push(m.quality!.metrics[0]!); },
  ];
  for (const change of changes) {
    const value = exam(); change(value.modules.stiffness); value.modules.stiffness = confirm(value.modules.stiffness);
    assert.equal(evaluateHepaticConclusion(value).canConclude, false);
  }
});
test("fasting and confounders cannot be presumed", () => {
  const value = exam(); value.modules.stiffness.fasting = { status: "unknown" };
  assert(has(value, "FASTING_CONTEXT_REQUIRED"));
  value.modules.stiffness.fasting = { status: "fasting" };
  assert(has(value, "FASTING_CONTEXT_REQUIRED"));
  value.modules.stiffness.confounders!.reviewed = false;
  assert(has(value, "CONFOUNDERS_REVIEW_REQUIRED"));
});
test("limited and not feasible require reason; inactive modules cannot hold residual results", () => {
  const value = exam(); value.modules.stiffness.status = "partially_limited";
  assert(has(value, "LIMITATION_REASON_REQUIRED"));
  value.modules.stiffness.reason = "Synthetic limitation";
  value.modules.stiffness = confirm(value.modules.stiffness);
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  for (const status of ["not_performed", "not_feasible"] as const) {
    value.modules.stiffness.status = status;
    assert(has(value, "INACTIVE_MODULE_HAS_RESULTS"));
  }
});
test("preserves kPa and m/s without conversion; TE rejects m/s", () => {
  const value = exam(); value.modules.stiffness = module("2D-SWE", "m/s");
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  assert.deepEqual(HepaticAssessmentSchema.parse(value).modules.stiffness.measurements.map(m => m.unit), ["m/s", "m/s"]);
  assert.equal(value.modules.stiffness.derived.length, 0);
  value.modules.stiffness = module("TE", "m/s");
  assert(has(value, "NATIVE_UNIT_INCOMPATIBLE"));
});
test("CAP, ATI, UGAP, UDFF, USFF stay method specific", () => {
  for (const [method, unit] of [["CAP", "dB/m"], ["ATI", "dB/cm/MHz"], ["UGAP", "dB/cm/MHz"], ["UDFF", "%"], ["USFF", "%"]] as const) {
    const value = exam(); value.purpose = "abdomen_total"; value.modules.fat = module(method, unit);
    assert.equal(evaluateHepaticConclusion(value).canConclude, true, method);
    assert.deepEqual(HepaticAssessmentSchema.parse(value).modules.fat.measurements, value.modules.fat.measurements);
    if (unit !== "%") {
      value.modules.fat.measurements[0]!.unit = "%";
      assert(has(value, "NATIVE_UNIT_INCOMPATIBLE"));
    }
  }
});
test("fraction zero is valid, above 100 is invalid, wrong module method is invalid", () => {
  const value = exam(); value.modules.fat = module("UDFF", "%");
  value.modules.fat.measurements[0]!.value = 0; value.modules.fat = confirm(value.modules.fat);
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  value.modules.fat.measurements[0]!.value = 101;
  assert(has(value, "PERCENT_OUT_OF_RANGE"));
  value.modules.stiffness = module("CAP", "dB/m");
  assert(has(value, "METHOD_REQUIRED_OR_INCOMPATIBLE"));
});
test("duplicate sources and inconsistent individual acquisition count gate conclusion", () => {
  const value = exam(); value.modules.stiffness.measurements.push(value.modules.stiffness.measurements[0]!);
  assert(has(value, "DUPLICATE_SOURCE_ID"));
  const other = exam(); other.modules.stiffness.measurements.push({ ...other.modules.stiffness.measurements[0]!, id: "raw-1", role: "individual" });
  assert(has(other, "ACQUISITION_COUNT_MISMATCH"));
});
test("suggestion is not review and review requires actor and time", () => {
  for (const field of ["physicianId", "confirmedAt"] as const) {
    const value = exam(); delete value.modules.stiffness.interpretation![field];
    assert(has(value, "PHYSICIAN_INTERPRETATION_REQUIRED"));
  }
  const value = exam(); value.modules.stiffness.interpretation!.status = "suggested";
  assert(has(value, "PHYSICIAN_INTERPRETATION_REQUIRED"));
});
test("direct edits to source or equipment invalidate confirmed interpretation", () => {
  const value = exam(); value.modules.stiffness.measurements[0]!.value = 13;
  assert(has(value, "STALE_INTERPRETATION"));
  const other = exam(); other.modules.stiffness.equipment!.softwareVersion = "changed";
  assert(has(other, "STALE_INTERPRETATION"));
});
test("ratio has exact source snapshots and algorithm version; no clinical stage generated", () => {
  const value = deriveHepaticIqrRatio(exam(), "stiffness");
  const derived = value.modules.stiffness.derived[0]!;
  assert.equal(derived.value, 2.8 / 14 * 100);
  assert.equal(derived.algorithm, "iqr/median*100/v1");
  assert.deepEqual(derived.inputs.map(m => m.id), ["iqr", "median"]);
  assert.equal(value.modules.stiffness.interpretation, undefined);
  value.modules.stiffness = confirm(value.modules.stiffness);
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
});
test("mandatory atomic deletion: removes derivatives, module review and integrated review; preserves other module", () => {
  const value = deriveHepaticIqrRatio(exam(), "stiffness");
  value.modules.fat = module("USFF", "%"); value.modules.stiffness = confirm(value.modules.stiffness);
  value.integratedInterpretation = { ...value.modules.stiffness.interpretation!, contextSnapshot: hepaticAssessmentSnapshot(value) };
  const before = JSON.stringify(value);
  for (const id of ["median", "iqr"]) {
    const next = removeHepaticMeasurement(value, "stiffness", id);
    assert.equal(next.revision, value.revision + 1);
    assert.equal(next.modules.stiffness.measurements.some(m => m.id === id), false);
    assert.deepEqual(next.modules.stiffness.derived, []);
    assert.equal(next.modules.stiffness.interpretation, undefined);
    assert.equal(next.integratedInterpretation, undefined);
    assert.deepEqual(next.modules.fat, value.modules.fat);
    assert.equal(evaluateHepaticConclusion(next).canConclude, false);
  }
  assert.equal(JSON.stringify(value), before, "input must remain unchanged");
});
test("source replacement and context edit clear dependent state, reject unknown deletion", () => {
  const value = deriveHepaticIqrRatio(exam(), "stiffness");
  const replacement = structuredClone(value.modules.stiffness);
  replacement.measurements[0]!.value = 10;
  const next = replaceHepaticModule(value, "stiffness", replacement);
  assert.deepEqual(next.modules.stiffness.derived, []);
  assert.equal(next.modules.stiffness.interpretation, undefined);
  assert.throws(() => removeHepaticMeasurement(value, "stiffness", "unknown"));
});
test("stale, dangling and forged derived values fail even after physician reconfirmation", () => {
  for (const mutate of [
    (m: HepaticModule) => { m.measurements[0]!.value = 10; },
    (m: HepaticModule) => { m.measurements = m.measurements.filter(m => m.role !== "median"); },
    (m: HepaticModule) => { m.derived[0]!.value = 99; },
  ]) {
    const value = deriveHepaticIqrRatio(exam(), "stiffness"); mutate(value.modules.stiffness);
    value.modules.stiffness = confirm(value.modules.stiffness);
    assert(has(value, "STALE_OR_INVALID_DERIVATION"));
  }
});
test("ratio rejects different units and overflow; never mutates input on failure", () => {
  const value = exam(); value.modules.stiffness.measurements[1]!.unit = "m/s";
  assert.throws(() => deriveHepaticIqrRatio(value, "stiffness"));
  value.modules.stiffness.measurements[1]!.unit = "kPa";
  value.modules.stiffness.measurements[0]!.value = Number.MIN_VALUE;
  const before = JSON.stringify(value);
  assert.throws(() => deriveHepaticIqrRatio(value, "stiffness"));
  assert.equal(JSON.stringify(value), before);
});
test("invalid fat does not hide valid stiffness readiness; whole conclusion stays blocked", () => {
  const value = exam(); value.modules.fat = module("ATI", "dB/cm/MHz"); delete value.modules.fat.quality;
  const result = evaluateHepaticConclusion(value);
  assert.equal(result.modules.stiffness, true); assert.equal(result.modules.fat, false); assert.equal(result.canConclude, false);
});
test("shared modules are reusable in both abdominal purposes", () => {
  for (const purpose of ["abdomen_total", "abdomen_superior"] as const) {
    const value = exam(); value.purpose = purpose;
    assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  }
});
test("multiparametric discordance needs resolution and integrated current medical review", () => {
  const value = exam(); value.purpose = "multiparametric"; value.modules.fat = module("USFF", "%");
  value.correlation = { modeB: "Synthetic B", doppler: "Synthetic Doppler", concordance: "discordant" };
  assert(has(value, "CORRELATION_REVIEW_REQUIRED"));
  value.correlation.physicianResolution = "Synthetic resolution";
  assert(has(value, "INTEGRATED_REVIEW_REQUIRED"));
  value.integratedInterpretation = { ...value.modules.stiffness.interpretation!, contextSnapshot: hepaticAssessmentSnapshot(value) };
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  value.indication = "Changed context";
  assert(has(value, "INTEGRATED_REVIEW_REQUIRED"));
});
test("canonical review snapshot survives property reordering", () => {
  const value = exam();
  const reordered = Object.fromEntries(Object.entries(value.modules.stiffness).reverse()) as HepaticModule;
  assert.equal(hepaticModuleSnapshot(reordered), hepaticModuleSnapshot(value.modules.stiffness));
});

test("residual converted m/s is never accepted as a derived result after deleting kPa", () => {
  const value = exam(); value.modules.stiffness.measurements = [];
  const forged = { ...value.modules.stiffness, derived: [{ id: "converted-speed", value: 2.2, unit: "m/s", algorithm: "generic-kPa-conversion", inputs: [] }] };
  assert(has({ ...value, modules: { ...value.modules, stiffness: forged } }, "SCHEMA_INVALID"));
});
