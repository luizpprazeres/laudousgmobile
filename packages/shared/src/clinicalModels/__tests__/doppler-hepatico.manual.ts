import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialClinicalModelInput,
  renderClinicalModelReport,
  renderDopplerHepaticoReport,
  validateClinicalModelInput,
  type DopplerHepaticoInput,
} from "../index";

const optionalOff = () => ({ evaluated: false as const });

function normal(): DopplerHepaticoInput {
  return {
    schemaVersion: 1,
    categoryCode: "DOPPLER_HEPATICO",
    physicianReviewed: true,
    normalHemodynamicsConfirmed: true,
    portalVein: { patency: "patent", caliberCm: 1.1, velocityCms: 22, flow: "hepatopetal" },
    hepaticVeins: optionalOff(),
    splenicVein: optionalOff(),
    superiorMesentericVein: optionalOff(),
    commonHepaticArtery: optionalOff(),
    portalPathology: { status: "absent", physicianConfirmed: false },
  };
}

const errorCodes = (value: unknown) => validateClinicalModelInput(value).issues.map((entry) => entry.code);

test("default is unassessed and fails closed", () => {
  const value = createInitialClinicalModelInput("DOPPLER_HEPATICO");
  const codes = errorCodes(value);
  assert.ok(codes.includes("MODEL_NOT_REVIEWED"));
  assert.ok(codes.includes("PORTAL_VEIN_REQUIRED"));
  assert.ok(codes.includes("PORTAL_STATUS_REQUIRED"));
  assert.ok(codes.includes("PORTAL_PATENCY_REQUIRED"));
  assert.throws(() => renderDopplerHepaticoReport(value), /bloqueada/);
});

test("normal report requires explicit hemodynamic confirmation", () => {
  const value = normal();
  value.normalHemodynamicsConfirmed = false;
  assert.ok(errorCodes(value).includes("NORMAL_HEMODYNAMICS_UNCONFIRMED"));
  assert.throws(() => renderDopplerHepaticoReport(value), /NORMAL_HEMODYNAMICS_UNCONFIRMED/);
});

test("minimal normal report uses only effectively evaluated vessels", () => {
  const report = renderDopplerHepaticoReport(normal());
  assert.match(report, /^DOPPLER HEPÁTICO/);
  assert.match(report, /Veia porta pérvia, com calibre de 1,1 cm, velocidade de 22 cm\/s e fluxo hepatopetal\./);
  assert.match(report, /Não foram identificados sinais de trombose nos segmentos avaliados\./);
  assert.match(report, /Estudo Doppler hepático sem alterações hemodinâmicas significativas nos vasos avaliados\./);
  assert.doesNotMatch(report, /Veia esplênica|Veia mesentérica superior|Artéria hepática comum/);
});

test("full approved normal scope renders artery and hepatic veins without thresholds", () => {
  const value = normal();
  value.hepaticVeins = { evaluated: true, patency: "patent", caliberCm: 0.8, velocityCms: 18, flow: "hepatofugal", spectralPattern: "preserved" };
  value.splenicVein = { evaluated: true, patency: "patent", caliberCm: 0.7, velocityCms: 16, flow: "hepatopetal" };
  value.superiorMesentericVein = { evaluated: true, patency: "patent", caliberCm: 0.9, velocityCms: 14, flow: "hepatopetal" };
  value.commonHepaticArtery = { evaluated: true, patency: "patent", caliberCm: 0.5, flow: "hepatopetal", peakSystolicVelocityCms: 82, endDiastolicVelocityCms: 21, resistanceIndex: 0.74, spectralPattern: "preserved" };
  const report = renderDopplerHepaticoReport(value);
  assert.match(report, /Veias hepáticas pérvias/);
  assert.match(report, /Artéria hepática comum pérvia/);
  assert.match(report, /índice de resistência de 0,74/);
  assert.doesNotMatch(report, /normal por limiar|estenose|TIPS|transplante/i);
});

test("confirmed portal thrombosis accepts zero velocity only with absent flow", () => {
  const value = normal();
  value.normalHemodynamicsConfirmed = false;
  value.portalVein = { patency: "thrombosis", caliberCm: 1.3, velocityCms: 0, flow: "ausente" };
  value.portalPathology = { status: "confirmed", kind: "portal_thrombosis", evidence: "Material ecogênico intraluminal com ausência de fluxo ao Doppler", physicianConfirmed: true };
  const report = renderDopplerHepaticoReport(value);
  assert.match(report, /velocidade de 0 cm\/s e fluxo ausente/);
  assert.match(report, /Sinais ultrassonográficos de trombose portal\./);
  value.portalVein.flow = "hepatopetal";
  assert.ok(errorCodes(value).includes("ZERO_VELOCITY_WITH_PRESENT_FLOW"));
});

test("normal state rejects thrombosis, nonphysiological flow and altered spectral pattern", () => {
  const thrombosis = normal();
  thrombosis.portalVein.patency = "thrombosis";
  assert.ok(errorCodes(thrombosis).includes("NONPATENT_VESSEL_WITHOUT_FINDING"));

  const reverse = normal();
  reverse.portalVein.flow = "hepatofugal";
  assert.ok(errorCodes(reverse).includes("ABNORMAL_FLOW_WITHOUT_PORTAL_FINDING"));

  const pattern = normal();
  pattern.hepaticVeins = { evaluated: true, patency: "patent", caliberCm: 0.8, velocityCms: 18, flow: "hepatofugal", spectralPattern: "altered" };
  assert.ok(errorCodes(pattern).includes("ALTERED_PATTERN_WITHOUT_FINDING"));
});

test("evaluated artery is fail-closed when approved hemodynamic fields are incomplete", () => {
  const value = normal();
  value.commonHepaticArtery = { evaluated: true, patency: "patent", caliberCm: 0.5, flow: "hepatopetal" };
  assert.ok(errorCodes(value).includes("HEPATIC_ARTERY_HEMODYNAMICS_REQUIRED"));
});

test("advanced transplant and TIPS fields stay outside strict contract", () => {
  assert.equal(validateClinicalModelInput({ ...normal(), tips: { status: "patent" } }).success, false);
  assert.equal(validateClinicalModelInput({ ...normal(), transplant: { anastomosis: "normal" } }).success, false);
});

test("generic renderer supports the new category while dedicated renderer rejects another category", () => {
  assert.match(renderClinicalModelReport(normal()), /Estudo Doppler hepático sem alterações/);
  assert.throws(() => renderDopplerHepaticoReport(createInitialClinicalModelInput("ABDOMEN_TOTAL_DOPPLER")), /incompatível|bloqueada/);
});
