import { z } from "zod";

/** Candidate contract: no category registration, renderer or runtime activation. */
export const HEPATIC_CONTRACT_VERSION = "hepatic-assessment/v1" as const;
const Text = z.string().trim().min(1).max(2000);
const NonNegative = z.number().finite().nonnegative();
const Reference = z.object({ id: Text, version: Text, citation: Text }).strict();
const Unit = z.enum(["kPa", "m/s", "dB/m", "dB/cm/MHz", "%"]);
const Method = z.enum(["2D-SWE", "pSWE/ARFI", "TE", "CAP", "ATI", "UGAP", "UDFF", "USFF"]);
export const HepaticMeasurementSchema = z.object({
  id: Text,
  role: z.enum(["individual", "median", "iqr"]),
  value: NonNegative,
  unit: Unit,
  origin: z.enum(["manual", "device_import", "dictation_confirmed"]),
  source: Reference,
}).strict();

const Derived = z.object({
  id: z.literal("iqr-median-percent"),
  value: NonNegative,
  unit: z.literal("%"),
  algorithm: z.literal("iqr/median*100/v1"),
  inputs: z.tuple([HepaticMeasurementSchema, HepaticMeasurementSchema]),
}).strict();

const ConfirmationAttestation = z.object({
  version: z.literal("hepatic-confirmation/v1"),
  examId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  scope: z.enum(["fat", "stiffness", "integrated"]),
  /** Immutable deterministic binding, not a cryptographic signature. */
  payloadSnapshot: z.string().min(1).max(1_000_000),
}).strict().readonly();

const Interpretation = z.object({
  text: Text,
  status: z.enum(["suggested", "physician_confirmed"]),
  physicianId: Text.optional(),
  confirmedAt: z.string().datetime().optional(),
  reference: Reference,
  /** Canonical snapshot, not a signature or authorization token. */
  contextSnapshot: z.string().min(1).max(1_000_000),
  attestation: ConfirmationAttestation.optional(),
}).strict();

const InterpretationConfirmation = Interpretation.pick({
  text: true, physicianId: true, confirmedAt: true, reference: true,
}).required();
export type HepaticInterpretationConfirmation = z.infer<typeof InterpretationConfirmation>;

/** Numerical comparison of percent ratios; tolerances are percentage points. */
export const HEPATIC_RATIO_TOLERANCE = Object.freeze({ absolute: 0.0000005, relative: 0.000000000001 });

function equivalentRatio(actual: number, expected: number): boolean {
  return Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <= HEPATIC_RATIO_TOLERANCE.absolute +
      HEPATIC_RATIO_TOLERANCE.relative * Math.max(Math.abs(actual), Math.abs(expected));
}

export const HepaticModuleSchema = z.object({
  status: z.enum(["not_performed", "performed", "partially_limited", "not_feasible"]),
  reason: Text.optional(),
  method: Method.optional(),
  equipment: z.object({ manufacturer: Text, model: Text, softwareVersion: Text.optional(), probe: Text.optional() }).strict().optional(),
  acquisition: z.object({
    count: z.number().int().positive(),
    lobe: z.enum(["right", "left"]),
    depthCm: z.number().finite().positive(),
    capsuleDistanceCm: NonNegative.optional(),
    roi: Text,
    position: Text,
    protocol: Reference,
  }).strict().optional(),
  fasting: z.object({ status: z.enum(["fasting", "non_fasting", "unknown"]), hours: NonNegative.optional() }).strict().optional(),
  confounders: z.object({ reviewed: z.boolean(), items: z.array(Text).max(50), etiologicContext: Text }).strict().optional(),
  quality: z.object({
    assessment: z.enum(["adequate", "inadequate", "unknown"]),
    physicianId: Text,
    assessedAt: z.string().datetime(),
    criterion: z.object({
      reference: Reference,
      method: Method,
      manufacturer: Text,
      equipmentModel: Text,
      unit: Unit,
      minimumAcquisitions: z.number().int().positive(),
      requiredMetrics: z.array(Text).max(30),
    }).strict(),
    metrics: z.array(z.object({ code: Text, value: NonNegative, unit: Text }).strict()).max(30),
  }).strict().optional(),
  measurements: z.array(HepaticMeasurementSchema).max(200),
  derived: z.array(Derived).max(1),
  interpretation: Interpretation.optional(),
}).strict();

export const HepaticAssessmentSchema = z.object({
  contractVersion: z.literal(HEPATIC_CONTRACT_VERSION),
  examId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  purpose: z.enum(["multiparametric", "elastography", "abdomen_total", "abdomen_superior"]),
  indication: Text.optional(),
  modules: z.object({ fat: HepaticModuleSchema, stiffness: HepaticModuleSchema }).strict(),
  correlation: z.object({
    modeB: Text,
    doppler: Text,
    concordance: z.enum(["concordant", "discordant", "not_assessed"]),
    physicianResolution: Text.optional(),
  }).strict().optional(),
  integratedInterpretation: Interpretation.optional(),
}).strict();

export type HepaticAssessment = z.infer<typeof HepaticAssessmentSchema>;
export type HepaticModule = z.infer<typeof HepaticModuleSchema>;
export type HepaticMeasurement = z.infer<typeof HepaticMeasurementSchema>;
export type HepaticModuleKey = keyof HepaticAssessment["modules"];
export type HepaticIssue = { path: string; code: string };

// Stable across JSON round trips and property order (Web/API/native clients).
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).filter(key => object[key] !== undefined).sort()
      .map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hepaticModuleSnapshot(module: HepaticModule): string {
  const { interpretation: _review, ...context } = HepaticModuleSchema.parse(module);
  return canonical(context);
}

export function hepaticAssessmentSnapshot(assessment: HepaticAssessment): string {
  const { integratedInterpretation: _review, ...context } = HepaticAssessmentSchema.parse(assessment);
  return canonical(context);
}

type InterpretationValue = z.infer<typeof Interpretation>;
type ConfirmationScope = z.infer<typeof ConfirmationAttestation>["scope"];

function attestationFor(assessment: HepaticAssessment, scope: ConfirmationScope, interpretation: InterpretationValue) {
  const { attestation: _previous, ...payload } = interpretation;
  // Bind every exam-level field, including purpose, indication and correlation.
  // Module data is already in contextSnapshot; reviews must not bind each other recursively.
  const { modules: _modules, integratedInterpretation: _integratedReview, ...globalContext } = assessment;
  const identity = { version: "hepatic-confirmation/v1" as const, examId: assessment.examId, revision: assessment.revision, scope };
  return { ...identity,
    payloadSnapshot: canonical({ globalContext, ...identity, interpretation: payload }),
  };
}

function validAttestation(assessment: HepaticAssessment, scope: ConfirmationScope, interpretation: InterpretationValue): boolean {
  // Rebuild from current context/payload; a stored confirmation cannot be edited or transplanted.
  const expected = attestationFor(assessment, scope, interpretation);
  return !!interpretation.attestation && canonical(interpretation.attestation) === canonical(expected);
}

/** Explicit local confirmation. A future authenticated server must own this operation. */
export function confirmHepaticModuleInterpretation(value: HepaticAssessment, key: HepaticModuleKey, input: HepaticInterpretationConfirmation): HepaticAssessment {
  const current = HepaticAssessmentSchema.parse(value);
  const interpretation: InterpretationValue = { ...InterpretationConfirmation.parse(input), status: "physician_confirmed",
    contextSnapshot: hepaticModuleSnapshot(current.modules[key]) };
  interpretation.attestation = ConfirmationAttestation.parse(attestationFor(current, key, interpretation));
  const { integratedInterpretation: _previousIntegrated, ...assessment } = current;
  return { ...assessment, modules: { ...current.modules, [key]: { ...current.modules[key], interpretation } } };
}

export function confirmHepaticIntegratedInterpretation(value: HepaticAssessment, input: HepaticInterpretationConfirmation): HepaticAssessment {
  const current = HepaticAssessmentSchema.parse(value);
  const interpretation: InterpretationValue = { ...InterpretationConfirmation.parse(input), status: "physician_confirmed",
    contextSnapshot: hepaticAssessmentSnapshot(current) };
  interpretation.attestation = ConfirmationAttestation.parse(attestationFor(current, "integrated", interpretation));
  return { ...current, integratedInterpretation: interpretation };
}

const unitsByMethod: Record<NonNullable<HepaticModule["method"]>, string[]> = {
  "2D-SWE": ["kPa", "m/s"], "pSWE/ARFI": ["kPa", "m/s"], TE: ["kPa"],
  CAP: ["dB/m"], ATI: ["dB/cm/MHz"], UGAP: ["dB/cm/MHz"], UDFF: ["%"], USFF: ["%"],
};

function moduleIssues(assessment: HepaticAssessment, key: HepaticModuleKey): HepaticIssue[] {
  const module = assessment.modules[key];
  const issues: HepaticIssue[] = [];
  const add = (code: string, field = "") => issues.push({ code, path: `modules.${key}${field ? `.${field}` : ""}` });
  if (module.status === "not_performed" || module.status === "not_feasible") {
    if (module.status === "not_feasible" && !module.reason) add("LIMITATION_REASON_REQUIRED", "reason");
    if (module.measurements.length || module.derived.length || module.interpretation) add("INACTIVE_MODULE_HAS_RESULTS");
    return issues;
  }
  if (module.status === "partially_limited" && !module.reason) add("LIMITATION_REASON_REQUIRED", "reason");
  const allowedMethods = key === "stiffness" ? ["2D-SWE", "pSWE/ARFI", "TE"] : ["CAP", "ATI", "UGAP", "UDFF", "USFF"];
  if (!module.method || !allowedMethods.includes(module.method)) add("METHOD_REQUIRED_OR_INCOMPATIBLE", "method");
  if (!module.equipment) add("EQUIPMENT_REQUIRED", "equipment");
  if (!module.acquisition) add("ACQUISITION_REQUIRED", "acquisition");
  if (!module.fasting || module.fasting.status === "unknown" || (module.fasting.status === "fasting" && module.fasting.hours == null)) add("FASTING_CONTEXT_REQUIRED", "fasting");
  if (!module.confounders?.reviewed) add("CONFOUNDERS_REVIEW_REQUIRED", "confounders");
  const medians = module.measurements.filter(m => m.role === "median");
  if (medians.length !== 1) add("ONE_NATIVE_MEDIAN_REQUIRED", "measurements");
  const median = medians[0];
  const ids = module.measurements.map(m => m.id);
  if (new Set(ids).size !== ids.length) add("DUPLICATE_SOURCE_ID", "measurements");
  if (module.measurements.filter(m => m.role === "iqr").length > 1) add("DUPLICATE_IQR", "measurements");
  for (const measurement of module.measurements) {
    if (!module.method || !unitsByMethod[module.method].includes(measurement.unit) || (median && measurement.unit !== median.unit)) add("NATIVE_UNIT_INCOMPATIBLE", "measurements");
    if (measurement.role !== "iqr" && measurement.unit !== "%" && measurement.value <= 0) add("POSITIVE_SOURCE_REQUIRED", "measurements");
    if (measurement.unit === "%" && measurement.value > 100) add("PERCENT_OUT_OF_RANGE", "measurements");
  }
  const individualCount = module.measurements.filter(m => m.role === "individual").length;
  if (individualCount && individualCount !== module.acquisition?.count) add("ACQUISITION_COUNT_MISMATCH", "acquisition.count");
  const quality = module.quality;
  if (!quality || quality.assessment !== "adequate") add("ADEQUATE_QUALITY_REQUIRED", "quality");
  if (quality) {
    const criterion = quality.criterion;
    if (criterion.method !== module.method || criterion.manufacturer !== module.equipment?.manufacturer || criterion.equipmentModel !== module.equipment?.model || criterion.unit !== median?.unit) add("QUALITY_CRITERION_NOT_APPLICABLE", "quality.criterion");
    if (!module.acquisition || module.acquisition.count < criterion.minimumAcquisitions) add("INSUFFICIENT_ACQUISITIONS", "acquisition.count");
    const codes = quality.metrics.map(m => m.code);
    if (new Set(codes).size !== codes.length) add("DUPLICATE_QUALITY_METRIC", "quality.metrics");
    if (criterion.requiredMetrics.some(code => !codes.includes(code))) add("QUALITY_METRIC_REQUIRED", "quality.metrics");
  }
  for (const derived of module.derived) {
    const [iqr, sourceMedian] = derived.inputs;
    const expected = iqr.value / sourceMedian.value * 100;
    if (iqr.role !== "iqr" || sourceMedian.role !== "median" || iqr.unit !== sourceMedian.unit || sourceMedian.value <= 0 || !equivalentRatio(derived.value, expected) || derived.inputs.some(input => !module.measurements.some(m => canonical(m) === canonical(input)))) add("STALE_OR_INVALID_DERIVATION", "derived");
  }
  const interpretation = module.interpretation;
  if (!interpretation || interpretation.status !== "physician_confirmed" || !interpretation.physicianId || !interpretation.confirmedAt) add("PHYSICIAN_INTERPRETATION_REQUIRED", "interpretation");
  if (interpretation && interpretation.contextSnapshot !== hepaticModuleSnapshot(module)) add("STALE_INTERPRETATION", "interpretation");
  if (interpretation && !validAttestation(assessment, key, interpretation)) add("INVALID_CONFIRMATION_ATTESTATION", "interpretation.attestation");
  return issues;
}

/** Structural drafts are permitted; conclusion is always fail closed. */
export function evaluateHepaticConclusion(value: unknown) {
  const parsed = HepaticAssessmentSchema.safeParse(value);
  if (!parsed.success) return {
    canConclude: false, data: null,
    issues: parsed.error.issues.map(i => ({ path: i.path.join("."), code: "SCHEMA_INVALID" })),
    modules: { fat: false, stiffness: false },
  };
  const data = parsed.data;
  const fat = moduleIssues(data, "fat");
  const stiffness = moduleIssues(data, "stiffness");
  const issues = [...fat, ...stiffness];
  const active = (module: HepaticModule) => module.status === "performed" || module.status === "partially_limited";
  if (!data.indication) issues.push({ path: "indication", code: "INDICATION_REQUIRED" });
  if (!Object.values(data.modules).some(active)) issues.push({ path: "modules", code: "NO_QUANTITATIVE_RESULT" });
  if (data.purpose === "elastography" && !active(data.modules.stiffness)) issues.push({ path: "modules.stiffness", code: "STIFFNESS_REQUIRED" });
  if (data.purpose === "multiparametric") {
    if (!data.correlation || data.correlation.concordance === "not_assessed" || (data.correlation.concordance === "discordant" && !data.correlation.physicianResolution)) issues.push({ path: "correlation", code: "CORRELATION_REVIEW_REQUIRED" });
  }
  if (data.purpose === "multiparametric" || data.integratedInterpretation) {
    const review = data.integratedInterpretation;
    if (!review || review.status !== "physician_confirmed" || !review.physicianId || !review.confirmedAt || review.contextSnapshot !== hepaticAssessmentSnapshot(data) || !validAttestation(data, "integrated", review)) issues.push({ path: "integratedInterpretation", code: "INTEGRATED_REVIEW_REQUIRED" });
  }
  return { canConclude: issues.length === 0, data, issues, modules: {
    fat: active(data.modules.fat) && fat.length === 0,
    stiffness: active(data.modules.stiffness) && stiffness.length === 0,
  } };
}

/** Any source/context edit invalidates computed values and review in one immutable return. */
export function replaceHepaticModule(value: HepaticAssessment, key: HepaticModuleKey, replacement: HepaticModule): HepaticAssessment {
  const current = HepaticAssessmentSchema.parse(value);
  const next = HepaticModuleSchema.parse(replacement);
  const { interpretation: _interpretation, ...context } = next;
  const { integratedInterpretation: _integrated, ...assessment } = current;
  // Global revision: all module confirmations must be renewed, but independent data/derivations survive.
  const { interpretation: _fatReview, ...fat } = current.modules.fat;
  const { interpretation: _stiffnessReview, ...stiffness } = current.modules.stiffness;
  return { ...assessment, revision: current.revision + 1, modules: { fat, stiffness, [key]: { ...context, derived: [] } } };
}

export function removeHepaticMeasurement(value: HepaticAssessment, key: HepaticModuleKey, sourceId: string): HepaticAssessment {
  const current = HepaticAssessmentSchema.parse(value);
  const module = current.modules[key];
  if (!module.measurements.some(m => m.id === sourceId)) throw new Error("Unknown hepatic source");
  return replaceHepaticModule(current, key, { ...module, measurements: module.measurements.filter(m => m.id !== sourceId) });
}

/** Optional arithmetic only; no conversion or clinical classification. */
export function deriveHepaticIqrRatio(value: HepaticAssessment, key: HepaticModuleKey): HepaticAssessment {
  const current = HepaticAssessmentSchema.parse(value);
  const module = current.modules[key];
  const iqr = module.measurements.filter(m => m.role === "iqr");
  const median = module.measurements.filter(m => m.role === "median");
  if (iqr.length !== 1 || median.length !== 1 || !iqr[0] || !median[0] || median[0].value <= 0 || iqr[0].unit !== median[0].unit) throw new Error("Ratio requires native IQR and median in the same unit");
  const next = replaceHepaticModule(current, key, module);
  const derived = Derived.parse({ id: "iqr-median-percent", value: iqr[0].value / median[0].value * 100, unit: "%", algorithm: "iqr/median*100/v1", inputs: [iqr[0], median[0]] });
  next.modules[key].derived = [derived];
  return next;
}
