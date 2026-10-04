import assert from "node:assert/strict";
import { test } from "node:test";
import * as publicShared from "../../packages/shared/src/index";
import {
  DopplerRenalDormantSchema,
  recomputeDopplerRenalDerived,
  removeDopplerRenalMeasurement,
  validateDopplerRenalDormant,
} from "../../packages/shared/src/clinicalModels/dormant/dopplerRenal";
import {
  DopplerVenosoMmiiDormantSchema,
  recomputeDopplerVenosoMmiiDerived,
  removeDopplerVenosoMmiiFinding,
  validateDopplerVenosoMmiiDormant,
} from "../../packages/shared/src/clinicalModels/dormant/dopplerVenosoMmii";
import { deepThrombosisFinding, renalFixture, venousFixture } from "./fixtures";

function codes(result: { issues: Array<{ code: string }> }): string[] {
  return result.issues.map((issue) => issue.code);
}

test("contracts stay outside the public shared registry", () => {
  assert.equal("DopplerRenalDormantSchema" in publicShared, false);
  assert.equal("DopplerVenosoMmiiDormantSchema" in publicShared, false);
});

test("renal fixture preserves native units and derives arithmetic without clinical classification", () => {
  const fixture = renalFixture();
  const result = validateDopplerRenalDormant(fixture);
  assert.equal(result.success, true);
  assert.equal(result.canGenerateFinalText, false);
  assert.equal(fixture.aorta.psv?.original.unit, "m/s");
  assert.equal(fixture.aorta.psv?.canonical.value, 80);
  assert.deepEqual(fixture.derived.rar.map((entry) => [entry.side, entry.value]), [
    ["right", 1.375],
    ["left", 1.3125],
  ]);
  assert.equal(fixture.derived.rar[0]?.clinicalUse, "blocked_pending_aortic_eligibility_and_tolerance");
});

test("renal contract rejects an independent stenosis flag", () => {
  const fixture = { ...renalFixture(), stenosis: true };
  assert.equal(DopplerRenalDormantSchema.safeParse(fixture).success, false);
});

test("renal laterality never promotes an unrequested side", () => {
  const fixture = renalFixture();
  fixture.laterality = "right";
  const result = validateDopplerRenalDormant(fixture);
  assert.ok(codes(result).includes("UNREQUESTED_SIDE_HAS_RESULTS"));
});

test("renal side and parameter remain bound to the source", () => {
  const fixture = renalFixture();
  const rightPsv = fixture.sides.right.artery.psv[0];
  assert.ok(rightPsv);
  rightPsv.side = "left";
  const result = validateDopplerRenalDormant(fixture);
  assert.ok(codes(result).includes("SIDE_MISMATCH"));
});

test("renal canonical conversion is checked instead of silently replacing the source", () => {
  const fixture = renalFixture();
  assert.ok(fixture.aorta.psv);
  fixture.aorta.psv.canonical.value = 8;
  const result = validateDopplerRenalDormant(fixture);
  assert.ok(codes(result).includes("CANONICAL_UNIT_MISMATCH"));
});

test("renal seconds to milliseconds conversion stays reversible and clinically pending", () => {
  const fixture = renalFixture();
  fixture.sides.right.intrarenal.accelerationTime.push({
    id: "right-ta",
    origin: "dictation",
    source: { sourceId: "synthetic:right-ta", evidence: "Fixture sintética" },
    physicianConfirmed: true,
    side: "right",
    territory: "upper_pole",
    original: { value: 0.09, unit: "s" },
    canonical: { value: 90, unit: "ms" },
  });
  const result = validateDopplerRenalDormant(fixture);
  assert.equal(result.success, true);
  assert.ok(codes(result).includes("ACCELERATION_TIME_RULE_PENDING"));
});

test("renal limited state requires a reason and territory", () => {
  const fixture = renalFixture();
  fixture.sides.left.assessment = "limited";
  delete fixture.sides.left.limitation;
  const result = validateDopplerRenalDormant(fixture);
  assert.ok(codes(result).includes("LIMITATION_REASON_REQUIRED"));
});

test("renal not-assessed state cannot carry normal or abnormal results", () => {
  const fixture = renalFixture();
  fixture.sides.left.assessment = "not_assessed";
  const result = validateDopplerRenalDormant(fixture);
  assert.ok(codes(result).includes("NOT_ASSESSED_HAS_RESULTS"));
});

test("renal normal state conflicts with explicit absence of flow", () => {
  const fixture = renalFixture();
  fixture.sides.right.artery.patency = "no_flow_detected";
  const result = validateDopplerRenalDormant(fixture);
  assert.ok(codes(result).includes("NORMAL_STATE_CONFLICT"));
});

test("reported and calculated RAR divergence remains pending without invented tolerance", () => {
  const fixture = renalFixture();
  fixture.sides.right.documentedRar = {
    id: "right-rar-dictated",
    origin: "dictation",
    source: { sourceId: "synthetic:right-rar", evidence: "Fixture sintética" },
    physicianConfirmed: true,
    side: "right",
    original: { value: 2.4, unit: "ratio" },
    canonical: { value: 2.4, unit: "ratio" },
  };
  const result = validateDopplerRenalDormant(fixture);
  assert.equal(result.success, true);
  assert.ok(codes(result).includes("RAR_TOLERANCE_RULE_PENDING"));
});

test("renal stale derived values are blocked", () => {
  const fixture = renalFixture();
  const first = fixture.derived.rar[0];
  assert.ok(first);
  first.value = 99;
  const result = validateDopplerRenalDormant(fixture);
  assert.ok(codes(result).includes("STALE_OR_INVALID_DERIVED_VALUES"));
});

test("removing the aortic source clears both RAR derivations in the same revision", () => {
  const fixture = renalFixture();
  const next = removeDopplerRenalMeasurement(fixture, "aorta-psv");
  assert.equal(next.revision, 1);
  assert.deepEqual(next.derived.rar, []);
  assert.equal(next.aorta.psv, undefined);
  assert.equal(validateDopplerRenalDormant(next).canGenerateFinalText, false);
});

test("removing one kidney length clears the bilateral difference", () => {
  const fixture = renalFixture();
  assert.ok(fixture.derived.bipolarLengthDifference);
  const next = removeDopplerRenalMeasurement(fixture, "left-length");
  assert.equal(next.derived.bipolarLengthDifference, undefined);
  assert.equal(next.sides.right.kidney.bipolarLength?.canonical.value, 10.2);
});

test("renal excluded and pending decisions are part of the strict contract", () => {
  const fixture = renalFixture();
  assert.equal(fixture.clinicalPolicy.transplant, "excluded_redirect_required");
  const changed = structuredClone(fixture) as unknown as Record<string, unknown>;
  (changed.clinicalPolicy as Record<string, unknown>).transplant = "included";
  assert.equal(DopplerRenalDormantSchema.safeParse(changed).success, false);
});

test("both contracts survive a JSON round trip without losing units, sides or pending policy", () => {
  const renal = JSON.parse(JSON.stringify(renalFixture())) as unknown;
  const venous = JSON.parse(JSON.stringify(venousFixture())) as unknown;
  const parsedRenal = DopplerRenalDormantSchema.parse(renal);
  const parsedVenous = DopplerVenosoMmiiDormantSchema.parse(venous);
  assert.equal(parsedRenal.aorta.psv?.original.unit, "m/s");
  assert.equal(parsedRenal.sides.left.artery.psv[0]?.side, "left");
  assert.equal(parsedVenous.sides.right.segments[3]?.findings[0]?.side, "right");
  assert.equal(parsedVenous.clinicalPolicy.tvpPositiveMinimum, "blocked_pending_minimum_criteria");
});

test("venous fixture carries normal, abnormal, limited and not-assessed states explicitly", () => {
  const fixture = venousFixture();
  const states = fixture.sides.right.segments.map((segment) => segment.assessment);
  assert.deepEqual(states, ["normal", "not_assessed", "limited", "abnormal"]);
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.equal(result.success, true);
  assert.equal(result.canGenerateFinalText, false);
  assert.ok(codes(result).includes("REFLUX_CLASSIFICATION_RULE_PENDING"));
});

test("MMII measures is a presentation of the same canonical category", () => {
  const fixture = venousFixture();
  assert.equal(fixture.requestedPresentation, "DOPPLER_VENOSO_MMII_MEDIDAS");
  assert.equal(fixture.categoryCode, "DOPPLER_VENOSO_MMII");
  fixture.requestedPresentation = "DOPPLER_VENOSO_MMII";
  assert.equal(DopplerVenosoMmiiDormantSchema.safeParse(fixture).success, true);
});

test("venous contract rejects an independent global TVP boolean", () => {
  const fixture = { ...venousFixture(), tvp_present: true };
  assert.equal(DopplerVenosoMmiiDormantSchema.safeParse(fixture).success, false);
});

test("venous millisecond conversion preserves the source and validates the canonical value", () => {
  const fixture = venousFixture();
  const reflux = fixture.sides.right.segments[3]?.findings[0];
  assert.equal(reflux?.kind, "reflux_observation");
  if (!reflux || reflux.kind !== "reflux_observation" || !reflux.time) return;
  assert.equal(reflux.time.original.value, 1200);
  assert.equal(reflux.time.canonical.value, 1.2);
  reflux.time.canonical.value = 12;
  assert.ok(codes(validateDopplerVenosoMmiiDormant(fixture)).includes("CANONICAL_UNIT_MISMATCH"));
});

test("exact reflux boundary remains unclassified and pending", () => {
  const fixture = venousFixture();
  const reflux = fixture.sides.right.segments[3]?.findings[0];
  assert.equal(reflux?.kind, "reflux_observation");
  if (!reflux || reflux.kind !== "reflux_observation" || !reflux.time) return;
  reflux.time.original = { value: 500, unit: "ms" };
  reflux.time.canonical = { value: 0.5, unit: "s" };
  assert.equal(reflux.classification, "unclassified_pending_threshold_and_maneuver_rule");
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.equal(result.success, true);
  assert.ok(codes(result).includes("REFLUX_CLASSIFICATION_RULE_PENDING"));
});

test("TVP-only keeps superficial data as an explicit conflict instead of deleting it", () => {
  const fixture = venousFixture();
  fixture.protocol = "tvp_only";
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.ok(codes(result).includes("PROTOCOL_SCOPE_CONFLICT"));
  assert.equal(fixture.sides.right.segments[3]?.findings[0]?.id, "right-gsv-reflux");
});

test("venous non-assessed segment cannot carry findings", () => {
  const fixture = venousFixture();
  const segment = fixture.sides.right.segments[3];
  assert.ok(segment);
  segment.assessment = "not_assessed";
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.ok(codes(result).includes("NOT_ASSESSED_HAS_RESULTS"));
});

test("venous normal state conflicts with a reflux observation", () => {
  const fixture = venousFixture();
  const segment = fixture.sides.right.segments[3];
  assert.ok(segment);
  segment.assessment = "normal";
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.ok(codes(result).includes("NORMAL_STATE_CONFLICT"));
});

test("venous limitation requires a documented reason and territory", () => {
  const fixture = venousFixture();
  const segment = fixture.sides.right.segments[2];
  assert.ok(segment);
  delete segment.limitation;
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.ok(codes(result).includes("LIMITATION_REASON_REQUIRED"));
});

test("venous finding anatomy cannot drift from its segment or side", () => {
  const fixture = venousFixture();
  const finding = fixture.sides.right.segments[3]?.findings[0];
  assert.ok(finding);
  finding.side = "left";
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.ok(codes(result).includes("FINDING_ANATOMY_MISMATCH"));
});

test("venous measurement anatomy cannot drift from its parent finding", () => {
  const fixture = venousFixture();
  const finding = fixture.sides.right.segments[3]?.findings[0];
  assert.equal(finding?.kind, "reflux_observation");
  if (!finding || finding.kind !== "reflux_observation" || !finding.time) return;
  finding.time.side = "left";
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.ok(codes(result).includes("MEASUREMENT_ANATOMY_MISMATCH"));
});

test("thrombosis observations remain blocked by the undecided positive and phase rules", () => {
  const fixture = venousFixture();
  fixture.sides.right.segments.push({
    side: "right",
    segment: "femoral",
    assessment: "abnormal",
    competenceTested: false,
    findings: [deepThrombosisFinding()],
  });
  const next = recomputeDopplerVenosoMmiiDerived(fixture);
  const result = validateDopplerVenosoMmiiDormant(next);
  assert.equal(result.success, true);
  assert.ok(codes(result).includes("TVP_MINIMUM_CRITERIA_PENDING"));
  assert.ok(codes(result).includes("THROMBOSIS_PHASE_RULE_PENDING"));
  assert.deepEqual(next.derived.thrombosisFindingIds, ["right-femoral-thrombosis"]);
});

test("occlusion stays not assessed when it was not explicitly documented", () => {
  const fixture = venousFixture();
  const observation = { ...deepThrombosisFinding(), id: "right-femoral-unspecified-occlusion", occlusion: "not_assessed" as const };
  fixture.sides.right.segments.push({
    side: "right", segment: "femoral", assessment: "abnormal", competenceTested: false,
    findings: [observation],
  });
  const next = recomputeDopplerVenosoMmiiDerived(fixture);
  const stored = next.sides.right.segments.at(-1)?.findings[0];
  assert.equal(stored?.kind, "thrombosis_observation");
  if (stored?.kind === "thrombosis_observation") assert.equal(stored.occlusion, "not_assessed");
});

test("removing a venous finding clears its derived index and increments revision", () => {
  const fixture = venousFixture();
  assert.deepEqual(fixture.derived.refluxFindingIds, ["right-gsv-reflux"]);
  const next = removeDopplerVenosoMmiiFinding(fixture, "right-gsv-reflux");
  assert.equal(next.revision, 1);
  assert.deepEqual(next.derived.refluxFindingIds, []);
  assert.equal(next.sides.right.segments[3]?.findings.length, 0);
});

test("venous stale derived indexes are blocked", () => {
  const fixture = venousFixture();
  fixture.derived.thrombosisFindingIds.push("ghost-thrombosis");
  const result = validateDopplerVenosoMmiiDormant(fixture);
  assert.ok(codes(result).includes("STALE_OR_INVALID_DERIVED_VALUES"));
});

test("venous map and recommendations remain explicitly blocked", () => {
  const fixture = venousFixture();
  assert.equal(fixture.derived.mapProjection, "blocked_until_contract_and_asset_are_approved");
  assert.equal(fixture.clinicalPolicy.recommendations, "blocked_pending_confirmation_and_conduct_policy");
});

test("strict candidate schemas reject final prose fields", () => {
  assert.equal(DopplerRenalDormantSchema.safeParse({ ...renalFixture(), conclusion: "texto final" }).success, false);
  assert.equal(DopplerVenosoMmiiDormantSchema.safeParse({ ...venousFixture(), finalText: "texto final" }).success, false);
});
