import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HEPATIC_CONTRACT_VERSION, HepaticAssessmentSchema, deriveHepaticIqrRatio,
  evaluateHepaticConclusion, hepaticModuleSnapshot,
  removeHepaticMeasurement, replaceHepaticModule,
  confirmHepaticModuleInterpretation, confirmHepaticIntegratedInterpretation, HEPATIC_RATIO_TOLERANCE,
  type HepaticAssessment, type HepaticModule,
} from "../../packages/shared/src/hepatic";

const reference = { id: "synthetic-protocol", version: "test-only-v1", citation: "Synthetic fixture, not a clinical threshold" };
const timestamp = "2026-10-02T15:00:00Z";
const examId = "c2c4c302-2f31-424c-92df-08265908a158";
const reviewInput = { text: "Interpretação sintética revisada", physicianId: "synthetic-doctor", confirmedAt: timestamp, reference };
function confirm(module: HepaticModule, revision = 0): HepaticModule {
  const key = ["CAP", "ATI", "UGAP", "UDFF", "USFF"].includes(module.method ?? "") ? "fat" : "stiffness";
  const inactive: HepaticModule = { status: "not_performed", measurements: [], derived: [] };
  const value: HepaticAssessment = { contractVersion: HEPATIC_CONTRACT_VERSION, examId, revision,
    purpose: "elastography", indication: "Synthetic indication", modules: { fat: inactive, stiffness: inactive, [key]: module } };
  return confirmHepaticModuleInterpretation(value, key, reviewInput).modules[key];
}
function confirmIntegrated(value: HepaticAssessment) {
  value.integratedInterpretation = confirmHepaticIntegratedInterpretation(value, reviewInput).integratedInterpretation;
}
function confirmModules(value: HepaticAssessment): HepaticAssessment {
  let confirmed = value;
  for (const key of ["fat", "stiffness"] as const) {
    const status = confirmed.modules[key].status;
    if (status === "performed" || status === "partially_limited") {
      confirmed = confirmHepaticModuleInterpretation(confirmed, key, reviewInput);
    }
  }
  return confirmed;
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
    const value = exam(); change(value.modules.stiffness); value.modules.stiffness = confirm(value.modules.stiffness, value.revision);
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
  value.modules.stiffness = confirm(value.modules.stiffness, value.revision);
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
    let value = exam(); value.purpose = "abdomen_total"; value.modules.fat = module(method, unit);
    value = confirmModules(value);
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
  value.modules.fat.measurements[0]!.value = 0; value.modules.fat = confirm(value.modules.fat, value.revision);
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
  value.modules.stiffness = confirm(value.modules.stiffness, value.revision);
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
});
test("mandatory atomic deletion: removes derivatives, module review and integrated review; preserves other module", () => {
  const value = deriveHepaticIqrRatio(exam(), "stiffness");
  value.modules.fat = confirm(module("USFF", "%"), value.revision); value.modules.stiffness = confirm(value.modules.stiffness, value.revision);
  confirmIntegrated(value);
  const before = JSON.stringify(value);
  for (const id of ["median", "iqr"]) {
    const next = removeHepaticMeasurement(value, "stiffness", id);
    assert.equal(next.revision, value.revision + 1);
    assert.equal(next.modules.stiffness.measurements.some(m => m.id === id), false);
    assert.deepEqual(next.modules.stiffness.derived, []);
    assert.equal(next.modules.stiffness.interpretation, undefined);
    assert.equal(next.integratedInterpretation, undefined);
    const { interpretation: _oldReview, ...independentData } = value.modules.fat;
    assert.deepEqual(next.modules.fat, independentData);
    assert.equal(next.modules.fat.interpretation, undefined, "global revision requires reconfirmation");
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
    value.modules.stiffness = confirm(value.modules.stiffness, value.revision);
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
test("shared modules are reusable in both abdominal purposes only after confirmation in the new context", () => {
  for (const purpose of ["abdomen_total", "abdomen_superior"] as const) {
    const value = exam(); value.purpose = purpose;
    assert.equal(evaluateHepaticConclusion(value).canConclude, false);
    assert(has(value, "INVALID_CONFIRMATION_ATTESTATION"));
    assert.equal(evaluateHepaticConclusion(confirmModules(value)).canConclude, true);
  }
});
test("multiparametric discordance needs resolution and integrated current medical review", () => {
  let value = exam(); value.purpose = "multiparametric"; value.modules.fat = module("USFF", "%");
  value.correlation = { modeB: "Synthetic B", doppler: "Synthetic Doppler", concordance: "discordant" };
  assert(has(value, "CORRELATION_REVIEW_REQUIRED"));
  value.correlation.physicianResolution = "Synthetic resolution";
  assert(has(value, "INTEGRATED_REVIEW_REQUIRED"));
  value = confirmModules(value);
  confirmIntegrated(value);
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

test("P1: confirmed module payload cannot change text, actor, time or any reference field", () => {
  const edits = [
    (m: HepaticModule) => { m.interpretation!.text = "Different clinical interpretation"; },
    (m: HepaticModule) => { m.interpretation!.physicianId = "another-doctor"; },
    (m: HepaticModule) => { m.interpretation!.confirmedAt = "2026-10-02T16:00:00Z"; },
    (m: HepaticModule) => { m.interpretation!.reference.id = "different-source"; },
    (m: HepaticModule) => { m.interpretation!.reference.version = "different-version"; },
    (m: HepaticModule) => { m.interpretation!.reference.citation = "different-citation"; },
  ];
  for (const edit of edits) {
    const value = exam(); const originalProof = value.modules.stiffness.interpretation!.attestation;
    edit(value.modules.stiffness);
    assert.equal(value.modules.stiffness.interpretation!.attestation, originalProof);
    assert(has(value, "INVALID_CONFIRMATION_ATTESTATION"));
    assert.equal(evaluateHepaticConclusion(value).canConclude, false);
  }
});

test("P1: integrated interpretation is bound to its own text, actor, time and reference", () => {
  for (const field of ["text", "physicianId", "confirmedAt", "reference"] as const) {
    const value = exam(); confirmIntegrated(value);
    assert.equal(evaluateHepaticConclusion(value).canConclude, true);
    if (field === "reference") value.integratedInterpretation!.reference.version = "changed";
    else value.integratedInterpretation![field] = field === "confirmedAt" ? "2026-10-02T16:00:00Z" : "Changed";
    assert(has(value, "INTEGRATED_REVIEW_REQUIRED"));
    assert.equal(evaluateHepaticConclusion(value).canConclude, false);
  }
});

test("P1: legacy snapshot, missing attestation and mismatched stored payload never confirm", () => {
  const legacy = exam(); delete legacy.modules.stiffness.interpretation!.attestation;
  assert(has(legacy, "INVALID_CONFIRMATION_ATTESTATION"));
  const value = exam(); const review = value.modules.stiffness.interpretation!;
  review.text = "Edited";
  review.contextSnapshot = hepaticModuleSnapshot(value.modules.stiffness);
  assert(has(value, "INVALID_CONFIRMATION_ATTESTATION"), "updating context alone must not renew confirmation");
  const wire = JSON.parse(JSON.stringify(exam()));
  wire.modules.stiffness.interpretation.attestation.payloadSnapshot = "tampered";
  assert(has(wire, "INVALID_CONFIRMATION_ATTESTATION"));
});

test("P1: explicit fresh confirmation renews proof, freezes attestation and leaves input intact", () => {
  const value = exam(); value.modules.stiffness.interpretation!.text = "Changed";
  const before = JSON.stringify(value);
  const renewed = confirmHepaticModuleInterpretation(value, "stiffness", { ...reviewInput, text: "Changed", confirmedAt: "2026-10-02T16:00:00Z" });
  assert.equal(evaluateHepaticConclusion(renewed).canConclude, true);
  assert.notEqual(renewed.modules.stiffness.interpretation!.attestation!.payloadSnapshot, value.modules.stiffness.interpretation!.attestation!.payloadSnapshot);
  assert(Object.isFrozen(renewed.modules.stiffness.interpretation!.attestation));
  const parsed = HepaticAssessmentSchema.parse(JSON.parse(JSON.stringify(renewed)));
  assert(Object.isFrozen(parsed.modules.stiffness.interpretation!.attestation));
  assert.equal(evaluateHepaticConclusion(parsed).canConclude, true);
  assert.equal(JSON.stringify(value), before);
});

test("P1: same module and confirmation cannot be copied to another exam or revision", () => {
  const value = exam();
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  const otherExam = { ...value, examId: "f289d3d1-a9a8-4904-885d-c91229156f25" };
  const otherRevision = { ...value, revision: value.revision + 1 };
  assert(has(otherExam, "INVALID_CONFIRMATION_ATTESTATION"));
  assert(has(otherRevision, "INVALID_CONFIRMATION_ATTESTATION"));
  // Changing only declared identity in the old proof must also fail.
  const wire = JSON.parse(JSON.stringify(otherExam));
  wire.modules.stiffness.interpretation.attestation.examId = otherExam.examId;
  assert(has(wire, "INVALID_CONFIRMATION_ATTESTATION"));
});

test("P1: moduleKey binding rejects a review transplanted between modules", () => {
  const value = exam(); value.modules.fat = module("USFF", "%");
  const confirmation = confirmHepaticModuleInterpretation(value, "fat", reviewInput).modules.fat.interpretation!;
  assert.equal(confirmation.attestation!.scope, "fat");
  // Copy a payload valid for stiffness but an attestation with the wrong module scope.
  const stiffnessReview = value.modules.stiffness.interpretation!;
  const transplant = JSON.parse(JSON.stringify(stiffnessReview));
  transplant.attestation.scope = "fat";
  value.modules.stiffness.interpretation = transplant;
  assert(has(value, "INVALID_CONFIRMATION_ATTESTATION"));
  value.modules.fat.interpretation = stiffnessReview;
  assert.equal(evaluateHepaticConclusion(value).modules.fat, false);
});

test("P1: all revision-incrementing operations clear all confirmations without changing independent data", () => {
  let value = deriveHepaticIqrRatio(exam(), "stiffness");
  value.modules.fat = module("USFF", "%");
  value = deriveHepaticIqrRatio(value, "fat");
  value = confirmHepaticModuleInterpretation(value, "fat", reviewInput);
  value = confirmHepaticModuleInterpretation(value, "stiffness", reviewInput);
  value = confirmHepaticIntegratedInterpretation(value, reviewInput);
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  const original = JSON.stringify(value);
  const operations = [
    () => replaceHepaticModule(value, "stiffness", { ...value.modules.stiffness, reason: "Edited context" }),
    () => removeHepaticMeasurement(value, "stiffness", "iqr"),
    () => deriveHepaticIqrRatio(value, "stiffness"),
  ];
  for (const operation of operations) {
    const next = operation();
    assert.equal(next.revision, value.revision + 1);
    assert.equal(next.modules.stiffness.interpretation, undefined);
    assert.equal(next.modules.fat.interpretation, undefined);
    assert.equal(next.integratedInterpretation, undefined);
    const { interpretation: _review, ...independentData } = value.modules.fat;
    assert.deepEqual(next.modules.fat, independentData, "sources, derived values and quality must survive");
    assert.equal(evaluateHepaticConclusion(next).canConclude, false);
    const replay = structuredClone(next); replay.modules.fat.interpretation = value.modules.fat.interpretation;
    assert(has(replay, "INVALID_CONFIRMATION_ATTESTATION"));
    let renewed = confirmHepaticModuleInterpretation(next, "fat", reviewInput);
    assert.equal(evaluateHepaticConclusion(renewed).modules.fat, true);
    renewed = confirmHepaticModuleInterpretation(renewed, "stiffness", reviewInput);
    assert.equal(evaluateHepaticConclusion(renewed).canConclude, true);
  }
  assert.equal(JSON.stringify(value), original);
});

test("P1: confirming one module preserves current other-module review but clears integrated review", () => {
  const value = exam(); value.modules.fat = module("USFF", "%"); confirmIntegrated(value);
  const next = confirmHepaticModuleInterpretation(value, "stiffness", { ...reviewInput, text: "New interpretation" });
  assert.equal(next.revision, value.revision);
  assert.deepEqual(next.modules.fat, value.modules.fat);
  assert.equal(next.integratedInterpretation, undefined);
  assert.equal(evaluateHepaticConclusion(next).canConclude, true);
});

test("P2: cross-platform ratio vectors accept binary variation and six-decimal rounding", () => {
  const vectors = [
    { iqr: 0.1, median: 0.3, equivalents: [33.33333333333333, 33.333333333333336, 33.333333] },
    { iqr: 2.8, median: 14, equivalents: [20, 19.999999999999996, 20.000000] },
    { iqr: 0, median: 0.3, equivalents: [0] },
    { iqr: 1, median: 7, equivalents: [14.285714285714286, 14.285714] },
  ];
  for (const vector of vectors) {
    const value = exam(); value.modules.stiffness.measurements[0]!.value = vector.median;
    value.modules.stiffness.measurements[1]!.value = vector.iqr;
    const derived = deriveHepaticIqrRatio(value, "stiffness");
    for (const equivalent of vector.equivalents) {
      const imported = structuredClone(derived); imported.modules.stiffness.derived[0]!.value = equivalent;
      const confirmed = confirmHepaticModuleInterpretation(imported, "stiffness", reviewInput);
      assert.equal(evaluateHepaticConclusion(JSON.parse(JSON.stringify(confirmed))).canConclude, true, `${vector.iqr}/${vector.median}: ${equivalent}`);
    }
  }
});

test("P2: tolerance is absolute plus relative; non-equivalent rounded or adulterated ratios fail", () => {
  assert.deepEqual(HEPATIC_RATIO_TOLERANCE, { absolute: 5e-7, relative: 1e-12 });
  for (const [expected, delta, accepted] of [
    [20, 0.49e-6, true], [20, 0.51e-6, false],
    [1e12, 0.5, true], [1e12, 2, false],
    [20, 0.01, false],
  ] as const) {
    const value = exam(); value.modules.stiffness.measurements[0]!.value = 1;
    value.modules.stiffness.measurements[1]!.value = expected / 100;
    const derived = deriveHepaticIqrRatio(value, "stiffness");
    derived.modules.stiffness.derived[0]!.value = expected + delta;
    const confirmed = confirmHepaticModuleInterpretation(derived, "stiffness", reviewInput);
    assert.equal(evaluateHepaticConclusion(confirmed).canConclude, accepted, `expected ${expected}, delta ${delta}`);
  }
  const value = exam(); value.modules.stiffness.measurements[0]!.value = 0.3;
  value.modules.stiffness.measurements[1]!.value = 0.1;
  const derived = deriveHepaticIqrRatio(value, "stiffness"); derived.modules.stiffness.derived[0]!.value = 33.3;
  assert(has(confirmHepaticModuleInterpretation(derived, "stiffness", reviewInput), "STALE_OR_INVALID_DERIVATION"));
});

test("P1: changing purpose invalidates module attestations even without a revision increment", () => {
  for (const purpose of ["abdomen_total", "abdomen_superior", "multiparametric"] as const) {
    let value = exam(); value.modules.fat = module("USFF", "%");
    value = confirmModules(value);
    const before = structuredClone(value);
    assert.equal(evaluateHepaticConclusion(value).canConclude, true);
    value.purpose = purpose;
    const result = evaluateHepaticConclusion(value);
    assert.equal(result.canConclude, false);
    assert.equal(result.modules.fat, false);
    assert.equal(result.modules.stiffness, false);
    for (const key of ["fat", "stiffness"] as const) {
      assert(result.issues.some(i => i.path === `modules.${key}.interpretation.attestation` && i.code === "INVALID_CONFIRMATION_ATTESTATION"));
    }
    assert.equal(value.revision, before.revision);
    assert.deepEqual(value.modules, before.modules, "only clinical context changed; data and stored proofs survive for validation");
    if (purpose !== "multiparametric") assert.equal(evaluateHepaticConclusion(confirmModules(value)).canConclude, true);
  }
});

test("P1: changing or deleting indication invalidates both modules until explicit reconfirmation", () => {
  let value = exam(); value.indication = "Rastreamento"; value.modules.fat = module("USFF", "%");
  value = confirmModules(value);
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  const oldProofs = structuredClone(value.modules);
  value.indication = "Cirrose descompensada";
  const result = evaluateHepaticConclusion(JSON.parse(JSON.stringify(value)));
  assert.equal(result.canConclude, false);
  assert.deepEqual(result.modules, { fat: false, stiffness: false });
  assert.equal(result.issues.filter(i => i.code === "INVALID_CONFIRMATION_ATTESTATION").length, 2);
  assert.equal(value.revision, 0);
  const renewed = confirmModules(value);
  assert.equal(evaluateHepaticConclusion(renewed).canConclude, true);
  for (const key of ["fat", "stiffness"] as const) {
    assert.notEqual(renewed.modules[key].interpretation!.attestation!.payloadSnapshot, oldProofs[key].interpretation!.attestation!.payloadSnapshot);
  }
  const missing = structuredClone(renewed); delete missing.indication;
  assert(has(missing, "INVALID_CONFIRMATION_ATTESTATION"));
  assert(has(missing, "INDICATION_REQUIRED"));
});

test("P1: every global correlation field participates in module confirmation context", () => {
  let value = exam(); value.modules.fat = module("USFF", "%");
  value.correlation = { modeB: "Synthetic B", doppler: "Synthetic Doppler", concordance: "concordant", physicianResolution: "Synthetic resolution" };
  value = confirmModules(value);
  assert.equal(evaluateHepaticConclusion(value).canConclude, true);
  const edits = [
    (v: HepaticAssessment) => { v.correlation!.modeB = "Changed B"; },
    (v: HepaticAssessment) => { v.correlation!.doppler = "Changed Doppler"; },
    (v: HepaticAssessment) => { v.correlation!.concordance = "discordant"; },
    (v: HepaticAssessment) => { v.correlation!.physicianResolution = "Changed resolution"; },
    (v: HepaticAssessment) => { delete v.correlation; },
  ];
  for (const edit of edits) {
    const changed = structuredClone(value); edit(changed);
    const result = evaluateHepaticConclusion(changed);
    assert.equal(result.canConclude, false);
    assert.deepEqual(result.modules, { fat: false, stiffness: false });
    assert.equal(evaluateHepaticConclusion(confirmModules(changed)).canConclude, true);
  }
});
