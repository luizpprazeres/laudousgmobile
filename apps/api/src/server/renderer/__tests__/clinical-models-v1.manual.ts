import assert from "node:assert/strict";
import { renderClinicalModelReport } from "@laudousg/shared";
import { EXTRACTORS, RENDERER_PROGRAMMATIC_CATEGORIES } from "../extraction";
import { rendererCategoryEnabled } from "../../pipeline/generationPathResolver";

const ABDOMEN_REPORT = `Fígado de dimensões normais, contornos regulares e ecotextura homogênea. Veias hepáticas de aspecto habitual. Vesícula biliar normodistendida, de paredes finas e conteúdo anecoico. Vias biliares intra e extra-hepáticas sem dilatação. Pâncreas e baço sem alterações ecográficas. Rins tópicos, de dimensões normais, sem litíase ou dilatação pielocalicial. Aorta de calibre preservado. Bexiga com paredes finas e conteúdo anecoico.`;

const offVessel = {
  evaluated: false,
  caliberCm: null,
  velocityCms: null,
  flow: null,
};

const noCatheter = { present: false, relation: null, segment: null };
const noOutlet = {
  evaluated: false,
  maneuvers: null,
  positions: null,
  result: null,
  physicianConfirmed: false,
};
const noEffusion = {
  present: false,
  separationMm: null,
  context: {
    adult: false,
    mechanicallyVentilated: false,
    supineTorso15Deg: false,
    endExpirationPosteriorAxillary: false,
    physicianConfirmed: false,
  },
};

function parse(code: string, raw: unknown) {
  const extractor = EXTRACTORS[code];
  assert.ok(extractor, `${code}: extractor registrado`);
  assert.ok(RENDERER_PROGRAMMATIC_CATEGORIES.has(code), `${code}: renderer programático registrado`);
  assert.match(extractor.prompt, /Nunca invente|nunca invente/i, `${code}: prompt anti-invenção`);
  return extractor.parse(raw);
}

for (const code of [
  "ABDOMEN_TOTAL_DOPPLER",
  "DOPPLER_VENOSO_MMSS",
  "DOPPLER_ARTERIAL_MMSS",
  "TORAX",
  "QUADRIL_INFANTIL",
]) {
  assert.equal(
    rendererCategoryEnabled(code, { RENDERER_CATEGORIES: "", DOPPLER_STANDALONE_V2: "true" }),
    true,
    `${code}: modelo aprovado deve ficar ativo por padrão`,
  );
  assert.equal(
    rendererCategoryEnabled(code, {
      RENDERER_CATEGORIES: code,
      DOPPLER_STANDALONE_V2: "true",
      CLINICAL_MODELS_V1_ENABLED: "false",
    }),
    false,
    `${code}: rollback deve vencer a allowlist histórica`,
  );
}

function mustBlock(code: string, raw: unknown, expected: RegExp) {
  const findings = parse(code, raw);
  assert.throws(() => renderClinicalModelReport(findings), expected, `${code}: pendência deve bloquear`);
}

// ABDOME TOTAL COM DOPPLER — normal, alterado e incompleto.
const abdomenNormalRaw = {
  schemaVersion: 1,
  categoryCode: "ABDOMEN_TOTAL_DOPPLER",
  physicianReviewed: false,
  documentationPhoto: "omit",
  abdomenReport: ABDOMEN_REPORT,
  portalVein: { caliberCm: 1.1, velocityCms: 24, flow: "hepatopetal" },
  hepaticVeins: offVessel,
  splenicVein: offVessel,
  superiorMesentericVein: offVessel,
  commonHepaticArtery: offVessel,
  portalPathology: {
    status: "absent",
    kind: null,
    evidence: null,
    physicianConfirmed: false,
  },
};
const abdomenNormal = renderClinicalModelReport(parse("ABDOMEN_TOTAL_DOPPLER", abdomenNormalRaw));
assert.equal(
  (parse("ABDOMEN_TOTAL_DOPPLER", { ...abdomenNormalRaw, physicianReviewed: true }) as { physicianReviewed: boolean }).physicianReviewed,
  false,
);
assert.match(abdomenNormal, /Fígado de dimensões normais/);
assert.match(abdomenNormal, /calibre de 1,1 cm/);
assert.doesNotMatch(abdomenNormal, /Artéria hepática comum/);

const abdomenAltered = renderClinicalModelReport(parse("ABDOMEN_TOTAL_DOPPLER", {
  ...abdomenNormalRaw,
  commonHepaticArtery: {
    evaluated: true,
    caliberCm: 0.4,
    velocityCms: 78,
    flow: "hepatopetal",
  },
  portalPathology: {
    status: "confirmed",
    kind: "portal_hypertension",
    evidence: "Fluxo portal hepatofugal e circulação colateral periportal",
    physicianConfirmed: true,
  },
}));
assert.match(abdomenAltered, /Artéria hepática comum/);
assert.match(abdomenAltered, /hipertensão portal/i);

mustBlock("ABDOMEN_TOTAL_DOPPLER", {
  ...abdomenNormalRaw,
  portalVein: { caliberCm: null, velocityCms: null, flow: null },
}, /Veia porta exige/);
assert.throws(
  () => parse("ABDOMEN_TOTAL_DOPPLER", { ...abdomenNormalRaw, abdomenReport: "" }),
  /String must contain at least 80 character|too_small/i,
  "abdome incompleto deve falhar fechado em vez de gerar descrição genérica",
);

// DOPPLER VENOSO DE MMSS — normal, trombose associada a cateter e fase não confirmada.
const venousNormalSide = {
  examined: true,
  deepSystem: "patent",
  superficialSystem: "patent",
  competenceTested: false,
  reflux: "not_assessed",
  internalJugular: "not_assessed",
  catheter: noCatheter,
  thrombosisPhase: "not_applicable",
  phaseConfirmed: false,
};
const venousNotExamined = {
  ...venousNormalSide,
  examined: false,
  deepSystem: "not_assessed",
  superficialSystem: "not_assessed",
};
const venousNormalRaw = {
  schemaVersion: 1,
  categoryCode: "DOPPLER_VENOSO_MMSS",
  physicianReviewed: false,
  indication: "elective",
  laterality: "right",
  right: venousNormalSide,
  left: venousNotExamined,
};
const venousNormal = renderClinicalModelReport(parse("DOPPLER_VENOSO_MMSS", venousNormalRaw));
assert.match(venousNormal, /Sistema venoso profundo pérvio/);
assert.doesNotMatch(venousNormal, /Pesquisa de refluxo/);
assert.doesNotMatch(venousNormal, /jugular interna/i);

const venousAlteredRaw = {
  ...venousNormalRaw,
  indication: "catheter",
  right: {
    ...venousNormalSide,
    deepSystem: "thrombosis",
    catheter: {
      present: true,
      relation: "around_catheter",
      segment: "veia axilar direita",
    },
    thrombosisPhase: "acute",
    phaseConfirmed: true,
  },
};
const venousAltered = renderClinicalModelReport(parse("DOPPLER_VENOSO_MMSS", venousAlteredRaw));
assert.match(venousAltered, /veia axilar direita/);
assert.match(venousAltered, /aguda/);
mustBlock("DOPPLER_VENOSO_MMSS", {
  ...venousAlteredRaw,
  right: { ...venousAlteredRaw.right, phaseConfirmed: false },
}, /fase da trombose/i);

// DOPPLER ARTERIAL DE MMSS — normal, estenose completa e alteração sem VPS.
const arterialNormalSide = {
  examined: true,
  status: "normal",
  affectedVessel: null,
  psvMeasurements: [],
  stenosisPercent: null,
  percentageDataSufficient: false,
  percentageConfirmed: false,
  distalPattern: null,
  thoracicOutlet: noOutlet,
};
const arterialNotExamined = { ...arterialNormalSide, examined: false };
const arterialNormalRaw = {
  schemaVersion: 1,
  categoryCode: "DOPPLER_ARTERIAL_MMSS",
  physicianReviewed: false,
  laterality: "left",
  right: arterialNotExamined,
  left: arterialNormalSide,
};
const arterialNormal = renderClinicalModelReport(parse("DOPPLER_ARTERIAL_MMSS", arterialNormalRaw));
assert.match(arterialNormal, /padrão espectral preservado/);

const arterialAlteredRaw = {
  ...arterialNormalRaw,
  left: {
    ...arterialNormalSide,
    status: "stenosis",
    affectedVessel: "artéria subclávia esquerda",
    psvMeasurements: [{ vessel: "artéria subclávia esquerda", valueCms: 286 }],
    stenosisPercent: 70,
    percentageDataSufficient: true,
    percentageConfirmed: true,
    distalPattern: "padrão amortecido nas artérias radial e ulnar, com reenchimento distal",
  },
};
const arterialAltered = renderClinicalModelReport(parse("DOPPLER_ARTERIAL_MMSS", arterialAlteredRaw));
assert.match(arterialAltered, /286 cm\/s/);
assert.match(arterialAltered, /70%/);
mustBlock("DOPPLER_ARTERIAL_MMSS", {
  ...arterialAlteredRaw,
  left: { ...arterialAlteredRaw.left, psvMeasurements: [] },
}, /velocidade de pico sistólico/i);

// TÓRAX — normal, derrame no domínio de Balik e contexto incompleto.
const thoraxNormalSide = {
  pleuralLine: "regular",
  sliding: "present",
  linesB: { count: 0, distribution: "none" },
  effusion: noEffusion,
  consolidation: "not_seen",
  atelectasis: "not_seen",
  pneumothorax: "not_seen",
};
const thoraxNormalRaw = {
  schemaVersion: 1,
  categoryCode: "TORAX",
  physicianReviewed: false,
  right: thoraxNormalSide,
  left: thoraxNormalSide,
  limitation: null,
  correlationSuggested: false,
};
const thoraxNormal = renderClinicalModelReport(parse("TORAX", thoraxNormalRaw));
assert.match(thoraxNormal, /sem alterações ecográficas significativas/);

const strictBalikContext = {
  adult: true,
  mechanicallyVentilated: true,
  supineTorso15Deg: true,
  endExpirationPosteriorAxillary: true,
  physicianConfirmed: true,
};
const thoraxAlteredRaw = {
  ...thoraxNormalRaw,
  right: {
    ...thoraxNormalSide,
    effusion: { present: true, separationMm: 15, context: strictBalikContext },
    consolidation: "confirmed",
  },
  correlationSuggested: true,
};
const thoraxAltered = renderClinicalModelReport(parse("TORAX", thoraxAlteredRaw));
assert.match(thoraxAltered, /300 mL/);
assert.match(thoraxAltered, /10\.1007\/s00134-005-0024-2/);
const thoraxOutsideBalik = renderClinicalModelReport(parse("TORAX", {
  ...thoraxAlteredRaw,
  right: {
    ...thoraxAlteredRaw.right,
    effusion: {
      present: true,
      separationMm: 15,
      context: { ...strictBalikContext, mechanicallyVentilated: false },
    },
    consolidation: "suspected",
  },
}));
assert.match(thoraxOutsideBalik, /separação máxima de 15 mm/);
assert.match(thoraxOutsideBalik, /consolidação suspeita/i);
assert.doesNotMatch(thoraxOutsideBalik, /300 mL|V \(mL\) = 20|volume estimado/i);
assert.throws(
  () => parse("TORAX", {
    ...thoraxNormalRaw,
    right: {
      ...thoraxNormalSide,
      linesB: { count: null, distribution: "none" },
      consolidation: null,
    },
  }),
  /Expected number|Required|invalid_type/i,
  "silêncio sobre contagem/consolidação não pode virar ausência presumida",
);

// QUADRIL INFANTIL — Graf I, Graf IIB e entrada incompleta.
const hipNormalSide = {
  adequateStandardPlane: true,
  alphaDeg: 63,
  betaDeg: 47,
  bonyRoof: "normal",
  cartilaginousRoof: "normal",
  femoralHead: "centered",
  labrumPosition: "normal",
  coveragePercent: 56,
  grafClassification: "I",
  classificationConfirmed: true,
};
const hipNormalRaw = {
  schemaVersion: 1,
  categoryCode: "QUADRIL_INFANTIL",
  physicianReviewed: false,
  ageDays: 60,
  right: hipNormalSide,
  left: hipNormalSide,
  recommendation: null,
  recommendationConfirmed: false,
};
const hipNormal = renderClinicalModelReport(parse("QUADRIL_INFANTIL", hipNormalRaw));
assert.match(hipNormal, /Graf I/);

const hipIib = {
  ...hipNormalSide,
  alphaDeg: 55,
  betaDeg: 65,
  bonyRoof: "rounded",
  coveragePercent: null,
  grafClassification: "IIB",
};
const hipAltered = renderClinicalModelReport(parse("QUADRIL_INFANTIL", {
  ...hipNormalRaw,
  ageDays: 120,
  right: hipIib,
  left: hipIib,
}));
assert.match(hipAltered, /Graf IIB/);
mustBlock("QUADRIL_INFANTIL", {
  ...hipNormalRaw,
  ageDays: null,
  right: { ...hipNormalSide, grafClassification: null, classificationConfirmed: false },
}, /classificação exige/i);

console.log("✓ 5 modelos: extração tipada + casos normais, alterados e incompletos validados");
