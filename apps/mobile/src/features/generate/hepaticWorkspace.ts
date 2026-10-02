import {
  HepaticAssessmentSchema,
  confirmHepaticIntegratedInterpretation,
  confirmHepaticModuleInterpretation,
  deriveHepaticIqrRatio,
  evaluateHepaticConclusion,
  removeHepaticMeasurement,
  replaceHepaticModule,
  type HepaticAssessment,
  type HepaticInterpretationConfirmation,
  type HepaticMeasurement,
  type HepaticModule,
  type HepaticModuleKey,
} from "@laudousg/shared";

/**
 * Operações do workspace hepático Android. Mesmo comportamento do adaptador
 * Web (`apps/web/src/lib/hepaticAssessmentWorkspace.ts`): toda edição passa
 * pelas operações imutáveis do contrato compartilhado, que incrementam a
 * revisão e apagam derivações e confirmações médicas dependentes.
 */
export type HepaticMethod = NonNullable<HepaticModule["method"]>;
export type HepaticUnit = HepaticMeasurement["unit"];
type Reference = HepaticInterpretationConfirmation["reference"];

export type HepaticQualityConfiguration = {
  reference: Reference;
  minimumAcquisitions: number;
  metrics: Array<{ code: string; label: string; unit: string }>;
};

export type HepaticTechniqueDraft = {
  manufacturer: string;
  model: string;
  probe: string;
  count: string;
  lobe: "right" | "left";
  depthCm: string;
  roi: string;
  position: string;
};

export type HepaticCorrelationDraft = {
  modeB: string;
  doppler: string;
  concordance: "concordant" | "discordant" | "not_assessed";
  physicianResolution: string;
};

export const HEPATIC_METHODS: Record<HepaticModuleKey, HepaticMethod[]> = {
  stiffness: ["2D-SWE", "pSWE/ARFI", "TE"],
  fat: ["CAP", "ATI", "UGAP", "UDFF", "USFF"],
};

/** Unidades nativas aceitas pelo contrato; nunca há conversão entre elas. */
export const HEPATIC_UNITS: Record<HepaticMethod, HepaticUnit[]> = {
  "2D-SWE": ["kPa", "m/s"],
  "pSWE/ARFI": ["kPa", "m/s"],
  TE: ["kPa"],
  CAP: ["dB/m"],
  ATI: ["dB/cm/MHz"],
  UGAP: ["dB/cm/MHz"],
  UDFF: ["%"],
  USFF: ["%"],
};

/** Número digitado (vírgula ou ponto); vazio, inválido ou negativo = null. */
export function parseHepaticNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Texto livre opcional do contrato: o schema compartilhado faz `trim()` e exige
 * `min(1)`. Digitação vai para um rascunho local; o contrato recebe só o texto
 * normalizado (ou `undefined` quando vazio), senão um espaço digitado lança
 * exceção ou some do campo controlado.
 */
export function optionalHepaticText(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

export type HepaticEditResult =
  | { ok: true; value: HepaticAssessment }
  | { ok: false; message: string };

/**
 * As operações do contrato lançam exceção para entrada fora do schema (texto
 * acima do limite, mais de 50 fatores, razão com mediana zero...). Na tela,
 * isso vira mensagem, nunca exceção dentro do handler de toque.
 */
export function tryHepaticEdit(edit: () => HepaticAssessment): HepaticEditResult {
  try {
    return { ok: true, value: edit() };
  } catch {
    return { ok: false, message: "Esta alteração não é aceita pelo contrato hepático. Revise o valor informado." };
  }
}

/** IQR/mediana só com ambas na mesma unidade nativa e mediana positiva (senão o contrato recusa). */
export function canCalculateHepaticIqrRatio(module: HepaticModule): boolean {
  const median = module.measurements.filter((item) => item.role === "median");
  const iqr = module.measurements.filter((item) => item.role === "iqr");
  return median.length === 1 && iqr.length === 1 && median[0]!.value > 0 && median[0]!.unit === iqr[0]!.unit;
}

/** Objetos do contrato são atômicos: digitação incompleta fica fora do payload clínico. */
export function buildHepaticTechniquePatch(
  draft: HepaticTechniqueDraft,
  protocol: Reference,
): Pick<HepaticModule, "equipment" | "acquisition" | "quality"> | null {
  const count = parseHepaticNumber(draft.count);
  const depthCm = parseHepaticNumber(draft.depthCm);
  if (!draft.manufacturer.trim() || !draft.model.trim() || count === null || !Number.isInteger(count) || count <= 0 ||
    depthCm === null || depthCm <= 0 || !draft.roi.trim() || !draft.position.trim()) return null;
  return {
    equipment: { manufacturer: draft.manufacturer.trim(), model: draft.model.trim(), probe: draft.probe.trim() || undefined },
    acquisition: { count, lobe: draft.lobe, depthCm, roi: draft.roi.trim(), position: draft.position.trim(), protocol },
    // Técnica nova invalida a avaliação de qualidade feita sobre a anterior.
    quality: undefined,
  };
}

export function buildHepaticCorrelation(draft: HepaticCorrelationDraft): HepaticAssessment["correlation"] | null {
  if (!draft.modeB.trim() || !draft.doppler.trim() || draft.concordance === "not_assessed" ||
    (draft.concordance === "discordant" && !draft.physicianResolution.trim())) return null;
  return {
    modeB: draft.modeB.trim(),
    doppler: draft.doppler.trim(),
    concordance: draft.concordance,
    physicianResolution: draft.concordance === "discordant" ? draft.physicianResolution.trim() : undefined,
  };
}

function withoutReview(module: HepaticModule): HepaticModule {
  const { interpretation: _interpretation, ...rest } = module;
  return rest;
}

/** Editar o contexto do exame invalida todas as revisões, sem tocar nas medidas. */
export function replaceHepaticAssessmentContext(
  value: HepaticAssessment,
  patch: Partial<Pick<HepaticAssessment, "purpose" | "indication" | "correlation">>,
): HepaticAssessment {
  const current = HepaticAssessmentSchema.parse(value);
  const { integratedInterpretation: _integrated, ...assessment } = current;
  return HepaticAssessmentSchema.parse({
    ...assessment,
    ...patch,
    revision: current.revision + 1,
    modules: {
      fat: withoutReview(current.modules.fat),
      stiffness: withoutReview(current.modules.stiffness),
    },
  });
}

export function editHepaticModule(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  patch: Partial<HepaticModule>,
): HepaticAssessment {
  return replaceHepaticModule(value, key, { ...value.modules[key], ...patch });
}

export function changeHepaticModuleStatus(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  status: HepaticModule["status"],
): HepaticAssessment {
  if (status === "not_performed" || status === "not_feasible") {
    return replaceHepaticModule(value, key, {
      status,
      reason: status === "not_feasible" ? value.modules[key].reason : undefined,
      measurements: [],
      derived: [],
    });
  }
  return editHepaticModule(value, key, { status });
}

export function changeHepaticMethod(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  method: HepaticMethod,
): HepaticAssessment {
  return replaceHepaticModule(value, key, {
    ...value.modules[key],
    method,
    measurements: [],
    quality: undefined,
  });
}

/** Trocar a unidade é uma nova aquisição nativa, nunca conversão numérica. */
export function changeHepaticUnit(value: HepaticAssessment, key: HepaticModuleKey): HepaticAssessment {
  return replaceHepaticModule(value, key, {
    ...value.modules[key],
    measurements: [],
    quality: undefined,
  });
}

export function upsertHepaticMeasurement(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  measurement: HepaticMeasurement,
): HepaticAssessment {
  const moduleValue = value.modules[key];
  const measurements = moduleValue.measurements.filter((item) => item.role !== measurement.role);
  measurements.push(measurement);
  return replaceHepaticModule(value, key, { ...moduleValue, measurements });
}

export function clearHepaticMeasurement(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  role: HepaticMeasurement["role"],
): HepaticAssessment {
  const source = value.modules[key].measurements.find((item) => item.role === role);
  return source ? removeHepaticMeasurement(value, key, source.id) : value;
}

/** Qualidade só com critério versionado configurado; sem critério, null (fail-closed). */
export function buildHepaticQuality(args: {
  module: HepaticModule;
  unit: HepaticUnit | undefined;
  configuration: HepaticQualityConfiguration | undefined;
  metricDrafts: Record<string, string>;
  physicianId: string;
  assessedAt: string;
}): NonNullable<HepaticModule["quality"]> | null {
  const { module, unit, configuration, metricDrafts, physicianId, assessedAt } = args;
  if (!module.method || !module.equipment || !configuration || !unit) return null;
  const metrics = configuration.metrics.map((metric) => ({
    code: metric.code,
    value: parseHepaticNumber(metricDrafts[metric.code] ?? ""),
    unit: metric.unit,
  }));
  if (metrics.some((metric) => metric.value === null)) return null;
  return {
    assessment: "adequate",
    physicianId,
    assessedAt,
    criterion: {
      reference: configuration.reference,
      method: module.method,
      manufacturer: module.equipment.manufacturer,
      equipmentModel: module.equipment.model,
      unit,
      minimumAcquisitions: configuration.minimumAcquisitions,
      requiredMetrics: configuration.metrics.map((metric) => metric.code),
    },
    metrics: metrics.map((metric) => ({ code: metric.code, value: metric.value as number, unit: metric.unit })),
  };
}

export function calculateHepaticIqrRatio(value: HepaticAssessment, key: HepaticModuleKey): HepaticAssessment {
  return deriveHepaticIqrRatio(value, key);
}

export function reviewHepaticModule(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  input: HepaticInterpretationConfirmation,
): HepaticAssessment {
  return confirmHepaticModuleInterpretation(value, key, input);
}

export function reviewHepaticAssessment(value: HepaticAssessment, input: HepaticInterpretationConfirmation): HepaticAssessment {
  return confirmHepaticIntegratedInterpretation(value, input);
}

export function hepaticWorkspaceReadiness(value: HepaticAssessment) {
  return evaluateHepaticConclusion(value);
}

/** Rótulos das pendências do gate compartilhado; código desconhecido aparece cru. */
export const HEPATIC_ISSUE_LABELS: Record<string, string> = {
  INDICATION_REQUIRED: "Informe a indicação.",
  NO_QUANTITATIVE_RESULT: "Registre ao menos um módulo quantitativo.",
  METHOD_REQUIRED_OR_INCOMPATIBLE: "Selecione um método compatível.",
  EQUIPMENT_REQUIRED: "Informe fabricante e equipamento.",
  ACQUISITION_REQUIRED: "Complete a aquisição.",
  FASTING_CONTEXT_REQUIRED: "Registre o contexto de jejum.",
  CONFOUNDERS_REVIEW_REQUIRED: "Revise os fatores de confusão.",
  ONE_NATIVE_MEDIAN_REQUIRED: "Informe uma mediana na unidade nativa.",
  ADEQUATE_QUALITY_REQUIRED: "Registre qualidade técnica adequada.",
  PHYSICIAN_INTERPRETATION_REQUIRED: "Confirme a interpretação médica.",
  INTEGRATED_REVIEW_REQUIRED: "Confirme a conclusão integrada.",
  CORRELATION_REVIEW_REQUIRED: "Revise a correlação entre os métodos.",
  LIMITATION_REASON_REQUIRED: "Descreva a limitação.",
};
