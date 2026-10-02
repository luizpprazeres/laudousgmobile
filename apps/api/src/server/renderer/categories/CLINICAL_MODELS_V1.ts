import {
  AbdomenTotalDopplerSchema,
  DopplerArterialMmssSchema,
  DopplerVenosoMmssSchema,
  QuadrilInfantilSchema,
  ThoraxSchema,
  type ClinicalModelInput,
} from "@laudousg/shared";
import { CATEGORY_CONTRACTS } from "../../prompts/contracts";

type ClinicalExtractor = {
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  prompt: string;
  parse: (raw: unknown) => ClinicalModelInput;
};

const nullableNumber = { type: ["number", "null"] } as const;
const nullableString = { type: ["string", "null"] } as const;
const nullableBoolean = { type: ["boolean", "null"] } as const;
const nullableEnum = (values: readonly string[]) => ({
  type: ["string", "null"],
  enum: [...values, null],
});

const requiredObject = (
  properties: Record<string, unknown>,
): Record<string, unknown> => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const optionalVesselJson = requiredObject({
  evaluated: { type: "boolean" },
  caliberCm: nullableNumber,
  velocityCms: nullableNumber,
  flow: nullableEnum(["hepatopetal", "hepatofugal", "ausente", "outro"]),
});

const ABDOMEN_TOTAL_DOPPLER_JSON_SCHEMA = requiredObject({
  schemaVersion: { type: "number", enum: [1] },
  categoryCode: { type: "string", enum: ["ABDOMEN_TOTAL_DOPPLER"] },
  physicianReviewed: { type: "boolean", enum: [false] },
  documentationPhoto: nullableEnum(["include", "omit"]),
  abdomenReport: { type: "string" },
  portalVein: requiredObject({
    caliberCm: nullableNumber,
    velocityCms: nullableNumber,
    flow: nullableEnum(["hepatopetal", "hepatofugal", "ausente", "outro"]),
  }),
  hepaticVeins: optionalVesselJson,
  splenicVein: optionalVesselJson,
  superiorMesentericVein: optionalVesselJson,
  commonHepaticArtery: optionalVesselJson,
  portalPathology: requiredObject({
    status: nullableEnum(["absent", "suspected", "confirmed"]),
    kind: nullableEnum(["portal_hypertension", "portal_thrombosis", "other"]),
    evidence: nullableString,
    physicianConfirmed: { type: "boolean" },
  }),
});

const catheterJson = requiredObject({
  present: { type: "boolean" },
  relation: nullableEnum(["none", "adjacent", "around_catheter", "occlusive"]),
  segment: nullableString,
});

const venousSideJson = requiredObject({
  examined: { type: "boolean" },
  deepSystem: { type: "string", enum: ["patent", "thrombosis", "not_assessed"] },
  superficialSystem: { type: "string", enum: ["patent", "thrombosis", "not_assessed"] },
  competenceTested: { type: "boolean" },
  reflux: { type: "string", enum: ["absent", "present", "not_assessed"] },
  internalJugular: { type: "string", enum: ["not_assessed", "patent", "thrombosis"] },
  catheter: catheterJson,
  thrombosisPhase: {
    type: "string",
    enum: ["not_applicable", "acute", "subacute", "chronic", "indeterminate"],
  },
  phaseConfirmed: { type: "boolean" },
});

const DOPPLER_VENOSO_MMSS_JSON_SCHEMA = requiredObject({
  schemaVersion: { type: "number", enum: [1] },
  categoryCode: { type: "string", enum: ["DOPPLER_VENOSO_MMSS"] },
  physicianReviewed: { type: "boolean", enum: [false] },
  indication: nullableEnum(["elective", "thrombosis_research", "catheter"]),
  laterality: nullableEnum(["right", "left", "bilateral"]),
  right: venousSideJson,
  left: venousSideJson,
});

const thoracicOutletJson = requiredObject({
  evaluated: { type: "boolean" },
  maneuvers: nullableString,
  positions: nullableString,
  result: nullableEnum(["negative", "positive", "indeterminate"]),
  physicianConfirmed: { type: "boolean" },
});

const arterialSideJson = requiredObject({
  examined: nullableBoolean,
  status: nullableEnum(["normal", "stenosis", "occlusion", "other"]),
  affectedVessel: nullableString,
  psvMeasurements: {
    type: "array",
    maxItems: 20,
    items: requiredObject({ vessel: { type: "string" }, valueCms: { type: "number" } }),
  },
  stenosisPercent: nullableNumber,
  percentageDataSufficient: { type: "boolean" },
  percentageConfirmed: { type: "boolean" },
  distalPattern: nullableString,
  thoracicOutlet: thoracicOutletJson,
});

const DOPPLER_ARTERIAL_MMSS_JSON_SCHEMA = requiredObject({
  schemaVersion: { type: "number", enum: [1] },
  categoryCode: { type: "string", enum: ["DOPPLER_ARTERIAL_MMSS"] },
  physicianReviewed: { type: "boolean", enum: [false] },
  laterality: nullableEnum(["right", "left", "bilateral"]),
  right: arterialSideJson,
  left: arterialSideJson,
});

const effusionJson = requiredObject({
  present: nullableBoolean,
  separationMm: nullableNumber,
  context: requiredObject({
    adult: { type: "boolean" },
    mechanicallyVentilated: { type: "boolean" },
    supineTorso15Deg: { type: "boolean" },
    endExpirationPosteriorAxillary: { type: "boolean" },
    physicianConfirmed: { type: "boolean" },
  }),
});

const thoraxSideJson = requiredObject({
  pleuralLine: { type: "string", enum: ["regular", "irregular", "not_assessed"] },
  sliding: { type: "string", enum: ["present", "absent", "not_assessed"] },
  linesB: requiredObject({
    count: nullableNumber,
    distribution: { type: "string", enum: ["none", "focal", "multifocal", "diffuse"] },
  }),
  effusion: effusionJson,
  consolidation: nullableEnum(["not_seen", "suspected", "confirmed"]),
  atelectasis: nullableEnum(["not_seen", "suspected", "confirmed"]),
  pneumothorax: nullableEnum(["not_seen", "suspected", "confirmed"]),
});

const TORAX_JSON_SCHEMA = requiredObject({
  schemaVersion: { type: "number", enum: [1] },
  categoryCode: { type: "string", enum: ["TORAX"] },
  physicianReviewed: { type: "boolean", enum: [false] },
  right: thoraxSideJson,
  left: thoraxSideJson,
  limitation: nullableString,
  correlationSuggested: nullableBoolean,
});

const hipSideJson = requiredObject({
  adequateStandardPlane: { type: "boolean" },
  alphaDeg: nullableNumber,
  betaDeg: nullableNumber,
  bonyRoof: { type: "string", enum: ["normal", "rounded", "deficient", "not_assessed"] },
  cartilaginousRoof: { type: "string", enum: ["normal", "displaced", "not_assessed"] },
  femoralHead: { type: "string", enum: ["centered", "decentered", "dislocated", "not_assessed"] },
  labrumPosition: { type: "string", enum: ["normal", "everted", "interposed", "not_assessed"] },
  coveragePercent: nullableNumber,
  grafClassification: nullableEnum(["I", "IIA", "IIB", "IIC", "D", "III", "IV"]),
  classificationConfirmed: { type: "boolean" },
});

const QUADRIL_INFANTIL_JSON_SCHEMA = requiredObject({
  schemaVersion: { type: "number", enum: [1] },
  categoryCode: { type: "string", enum: ["QUADRIL_INFANTIL"] },
  physicianReviewed: { type: "boolean", enum: [false] },
  ageDays: nullableNumber,
  right: hipSideJson,
  left: hipSideJson,
  recommendation: nullableString,
  recommendationConfirmed: { type: "boolean" },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`extração clínica: campo inválido: ${field}`);
  return value;
}

function withoutNulls(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null));
}

function normalizeOptionalVessel(value: unknown): Record<string, unknown> {
  const vessel = requiredRecord(value, "vaso opcional");
  return vessel.evaluated === true
    ? withoutNulls(vessel)
    : { evaluated: false };
}

function parseAbdomen(raw: unknown): ClinicalModelInput {
  const input = requiredRecord(raw, "ABDOMEN_TOTAL_DOPPLER");
  const portalPathology = requiredRecord(input.portalPathology, "portalPathology");
  return AbdomenTotalDopplerSchema.parse({
    ...withoutNulls(input),
    physicianReviewed: false,
    portalVein: withoutNulls(requiredRecord(input.portalVein, "portalVein")),
    hepaticVeins: normalizeOptionalVessel(input.hepaticVeins),
    splenicVein: normalizeOptionalVessel(input.splenicVein),
    superiorMesentericVein: normalizeOptionalVessel(input.superiorMesentericVein),
    commonHepaticArtery: normalizeOptionalVessel(input.commonHepaticArtery),
    portalPathology: withoutNulls(portalPathology),
  });
}

function normalizeCatheter(value: unknown): Record<string, unknown> {
  const catheter = requiredRecord(value, "catheter");
  return catheter.present === true
    ? withoutNulls(catheter)
    : { present: false };
}

function normalizeVenousSide(value: unknown): Record<string, unknown> {
  const side = requiredRecord(value, "lado venoso");
  return { ...side, catheter: normalizeCatheter(side.catheter) };
}

function parseVenous(raw: unknown): ClinicalModelInput {
  const input = requiredRecord(raw, "DOPPLER_VENOSO_MMSS");
  return DopplerVenosoMmssSchema.parse({
    ...withoutNulls(input),
    physicianReviewed: false,
    right: normalizeVenousSide(input.right),
    left: normalizeVenousSide(input.left),
  });
}

function normalizeThoracicOutlet(value: unknown): Record<string, unknown> {
  const outlet = requiredRecord(value, "thoracicOutlet");
  return outlet.evaluated === true
    ? withoutNulls(outlet)
    : { evaluated: false };
}

function normalizeArterialSide(value: unknown): Record<string, unknown> {
  const side = requiredRecord(value, "lado arterial");
  const measurements = Array.isArray(side.psvMeasurements) ? side.psvMeasurements : [];
  const psvCms = Object.fromEntries(
    measurements.map((entry, index) => {
      const item = requiredRecord(entry, `psvMeasurements.${index}`);
      return [item.vessel, item.valueCms];
    }),
  );
  const { psvMeasurements: _measurements, ...rest } = side;
  return {
    ...withoutNulls(rest),
    psvCms,
    thoracicOutlet: normalizeThoracicOutlet(side.thoracicOutlet),
  };
}

function parseArterial(raw: unknown): ClinicalModelInput {
  const input = requiredRecord(raw, "DOPPLER_ARTERIAL_MMSS");
  return DopplerArterialMmssSchema.parse({
    ...input,
    physicianReviewed: false,
    right: normalizeArterialSide(input.right),
    left: normalizeArterialSide(input.left),
  });
}

function normalizeEffusion(value: unknown): Record<string, unknown> {
  const effusion = requiredRecord(value, "effusion");
  if (effusion.present === false) return { present: false };
  if (effusion.present !== true) return { present: effusion.present };
  return {
    present: true,
    separationMm: effusion.separationMm,
    context: effusion.context,
  };
}

function normalizeThoraxSide(value: unknown): Record<string, unknown> {
  const side = requiredRecord(value, "lado torácico");
  return { ...side, effusion: normalizeEffusion(side.effusion) };
}

function parseThorax(raw: unknown): ClinicalModelInput {
  const input = requiredRecord(raw, "TORAX");
  return ThoraxSchema.parse({
    ...withoutNulls(input),
    physicianReviewed: false,
    right: normalizeThoraxSide(input.right),
    left: normalizeThoraxSide(input.left),
  });
}

function normalizeHipSide(value: unknown): Record<string, unknown> {
  return withoutNulls(requiredRecord(value, "lado do quadril"));
}

function parseHip(raw: unknown): ClinicalModelInput {
  const input = requiredRecord(raw, "QUADRIL_INFANTIL");
  return QuadrilInfantilSchema.parse({
    ...withoutNulls(input),
    physicianReviewed: false,
    right: normalizeHipSide(input.right),
    left: normalizeHipSide(input.left),
  });
}

const EXTRACTION_RULES = `
Você é a etapa de EXTRAÇÃO tipada. Não redija, não complete protocolo e não presuma normalidade.
Use somente o que está explícito no ditado. Preserve medidas e lateralidade.
Campos clínicos ausentes ficam null, false ou not_assessed conforme o schema; nunca invente valores.
physicianReviewed deve permanecer false durante toda geração e extração. A revisão confiável ocorre somente depois da persistência, em uma ação autenticada separada.
Campos de confirmação específicos só podem ser true quando houver confirmação explícita no ditado.
`;

function promptFor(code: string, extra: string): string {
  const contract = CATEGORY_CONTRACTS[code];
  if (!contract) throw new Error(`contrato clínico não registrado: ${code}`);
  return `${contract}\n${EXTRACTION_RULES}\n${extra}`;
}

export const CLINICAL_MODEL_EXTRACTORS: Record<string, ClinicalExtractor> = {
  ABDOMEN_TOTAL_DOPPLER: {
    schemaName: "AbdomenTotalDopplerFindings",
    jsonSchema: ABDOMEN_TOTAL_DOPPLER_JSON_SCHEMA,
    prompt: promptFor(
      "ABDOMEN_TOTAL_DOPPLER",
      "abdomenReport deve copiar integralmente um laudo abdominal completo já presente no input. Não crie esse texto durante a extração; sem laudo completo, use string vazia para bloquear a geração por contrato incompleto. Nunca recorrer ao writer livre.",
    ),
    parse: parseAbdomen,
  },
  DOPPLER_VENOSO_MMSS: {
    schemaName: "DopplerVenosoMmssFindings",
    jsonSchema: DOPPLER_VENOSO_MMSS_JSON_SCHEMA,
    prompt: promptFor(
      "DOPPLER_VENOSO_MMSS",
      "Não marque sistema pérvio, refluxo ausente ou fase de trombose sem declaração explícita. Jugular interna não mencionada = not_assessed.",
    ),
    parse: parseVenous,
  },
  DOPPLER_ARTERIAL_MMSS: {
    schemaName: "DopplerArterialMmssFindings",
    jsonSchema: DOPPLER_ARTERIAL_MMSS_JSON_SCHEMA,
    prompt: promptFor(
      "DOPPLER_ARTERIAL_MMSS",
      "psvMeasurements contém apenas VPS explicitamente ditadas, uma entrada por vaso. Não derive percentual de estenose. Não complete módulo de desfiladeiro sem manobras, posições e resultado.",
    ),
    parse: parseArterial,
  },
  TORAX: {
    schemaName: "ThoraxFindings",
    jsonSchema: TORAX_JSON_SCHEMA,
    prompt: promptFor(
      "TORAX",
      "Se houver derrame, separationMm é somente a medida ditada. Todos os cinco campos de context ficam true apenas quando explicitamente documentados. Fora do domínio validado, descreva a separação sem volume ou fórmula de Balik. Suspeita permanece suspeita; não converta em diagnóstico confirmado.",
    ),
    parse: parseThorax,
  },
  QUADRIL_INFANTIL: {
    schemaName: "QuadrilInfantilFindings",
    jsonSchema: QUADRIL_INFANTIL_JSON_SCHEMA,
    prompt: promptFor(
      "QUADRIL_INFANTIL",
      "Não calcule nem escolha Graf durante a extração. grafClassification só recebe classificação explicitamente confirmada pelo médico; dados ausentes ficam null/not_assessed.",
    ),
    parse: parseHip,
  },
};
