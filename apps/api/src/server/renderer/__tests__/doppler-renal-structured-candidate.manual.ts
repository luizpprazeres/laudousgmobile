import assert from "node:assert/strict";
import test from "node:test";
import { recomputeDopplerRenalDerived } from "../../../../../../packages/shared/src/clinicalModels/dormant/dopplerRenal";
import { renalFixture } from "../../../../../../tests/vascular-contracts/fixtures";
import { projectDopplerRenalStructuredCandidate } from "../categories/dopplerRenalStructuredCandidate";

test("candidate stays unregistered and cannot generate final text", () => {
  const result = projectDopplerRenalStructuredCandidate(renalFixture());
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.registered, false);
  assert.equal(result.canGenerateFinalText, false);
  assert.equal(result.finalText, null);
  assert.ok(result.pendingClinicalDecisions.length > 0);
  assert.deepEqual(result.examLimitations, []);
});

test("kidney morphology reuses the shared urinary renderer with L x AP x T and parenchymal thickness", () => {
  const result = projectDopplerRenalStructuredCandidate(renalFixture());
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const right = result.sections[0];
  const left = result.sections[1];
  assert.equal(right.side, "right");
  assert.equal(left.side, "left");
  assert.match(right.kidneyBody.join("\n"), /Rim direito em topografia habitual/i);
  assert.match(right.kidneyBody.join("\n"), /10,2 x 4,8 x 5,1 cm/);
  assert.match(right.kidneyBody.join("\n"), /Espessura do parênquima do rim direito: 1,6 cm/);
  assert.match(left.kidneyBody.join("\n"), /Rim esquerdo em topografia habitual/i);
});

test("vascular review is separated by side and exposes only traceable measurements", () => {
  const fixture = renalFixture();
  fixture.sides.right.intrarenal.accelerationTime.push({
    id: "right-ta-preview",
    origin: "manual_selection",
    source: { sourceId: "synthetic:right-ta-preview", evidence: "Fixture sintética" },
    physicianConfirmed: true,
    side: "right",
    territory: "upper_pole",
    original: { value: 90, unit: "ms" },
    canonical: { value: 90, unit: "ms" },
  });
  fixture.sides.right.intrarenal.accelerationIndex.push({
    id: "right-ai-preview",
    origin: "manual_selection",
    source: { sourceId: "synthetic:right-ai-preview", evidence: "Fixture sintética" },
    physicianConfirmed: true,
    side: "right",
    territory: "upper_pole",
    original: { value: 2.8, unit: "m/s²" },
    canonical: { value: 280, unit: "cm/s²" },
  });
  const result = projectDopplerRenalStructuredCandidate(recomputeDopplerRenalDerived(fixture));
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.aortaBody, [
    "Aorta abdominal com VPS de 80 cm/s ao nível da emergência das artérias renais.",
  ]);
  const right = result.sections[0].vascularBody.join("\n");
  const left = result.sections[1].vascularBody.join("\n");
  assert.match(right, /Artéria renal direita: VPS máxima de 110 cm\/s/);
  assert.match(right, /RAR\) à direita de 1,375/);
  assert.match(right, /IR\).*rim direito: 0,63/);
  assert.match(right, /Tempo de aceleração.*90 ms/);
  assert.match(right, /Índice de aceleração.*280 cm\/s²/);
  assert.doesNotMatch(right, /esquerda/);
  assert.match(left, /Artéria renal esquerda: VPS máxima de 105 cm\/s/);
  assert.doesNotMatch(left, /direita/);
  assert.doesNotMatch(result.reviewOnlyConclusionCandidates.join("\n"), /estenose/i);
});

test("partial kidney measurements remain visible with an explicit placeholder in review only", () => {
  const fixture = renalFixture();
  delete fixture.sides.right.kidney.anteroposteriorDiameter;
  const result = projectDopplerRenalStructuredCandidate(recomputeDopplerRenalDerived(fixture));
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.sections[0].kidneyBody.join("\n"), /10,2 x \[AP não informado\] x 5,1 cm/);
  assert.deepEqual(result.sections[0].missingFields, ["Medidas AP do rim direito"]);
  assert.equal(result.finalText, null);
});

test("vascular abnormality does not invent normal kidney morphology when it was not assessed", () => {
  const fixture = renalFixture();
  fixture.sides.right.assessment = "abnormal";
  fixture.sides.right.artery.aliasingOrTurbulence = "present";
  const result = projectDopplerRenalStructuredCandidate(fixture);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const body = result.sections[0].kidneyBody.join("\n");
  assert.match(body, /Medidas do rim direito/);
  assert.doesNotMatch(body, /topografia habitual|diferenciação corticomedular preservada/i);
  assert.deepEqual(result.sections[0].reviewOnlyConclusionCandidates, []);
});

test("limitations and pending contract issues remain visible to the reviewing client", () => {
  const fixture = renalFixture();
  fixture.sides.left.assessment = "limited";
  fixture.sides.left.limitation = {
    reason: "Interposição gasosa sintética",
    territory: "hilo renal esquerdo",
  };
  const result = projectDopplerRenalStructuredCandidate(fixture);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.sections[1].limitations.join("\n"), /Interposição gasosa sintética/);
  assert.ok(Array.isArray(result.contractPendingIssues));
  assert.equal(result.canGenerateFinalText, false);
});

test("length asymmetry becomes a review-only conclusion candidate only above 1.8 cm", () => {
  const fixture = renalFixture();
  const leftLength = fixture.sides.left.kidney.bipolarLength;
  assert.ok(leftLength);
  leftLength.original.value = 8.3;
  leftLength.canonical.value = 8.3;
  const result = projectDopplerRenalStructuredCandidate(recomputeDopplerRenalDerived(fixture));
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.reviewOnlyConclusionCandidates.join("\n"), /superior a 1,8 cm \(1,9 cm\)/);
  assert.equal(result.canGenerateFinalText, false);
});

test("invalid or stale traceability blocks even the structured projection", () => {
  const fixture = renalFixture();
  const rightRar = fixture.derived.rar[0];
  assert.ok(rightRar);
  rightRar.inputIds = ["missing-renal-psv", "aorta-psv"];
  const result = projectDopplerRenalStructuredCandidate(fixture);
  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.canGenerateFinalText, false);
  assert.ok(result.issues.some((issue) => issue.code === "STALE_OR_INVALID_DERIVED_VALUES"));
});
