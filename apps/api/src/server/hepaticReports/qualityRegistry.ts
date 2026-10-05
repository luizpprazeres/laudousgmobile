import { HEPATIC_COMMON_QUALITY_PROFILES } from "@laudousg/shared";
import type { HepaticAssessment, HepaticIssue, HepaticModuleKey } from "@laudousg/shared";

type ActiveModule = HepaticAssessment["modules"][HepaticModuleKey];
type Method = NonNullable<ActiveModule["method"]>;
type Unit = ActiveModule["measurements"][number]["unit"];

export type ApprovedHepaticQualityCriterion = Readonly<{
  scope?: "method" | "manufacturer";
  minimumFastingHours?: number;
  module: HepaticModuleKey;
  method: Method;
  manufacturer: string;
  equipmentModel: string;
  unit: Unit;
  minimumAcquisitions: number;
  reference: Readonly<{ id: string; version: string; citation: string }>;
  metrics: ReadonlyArray<Readonly<{
    code: string;
    unit: string;
    required: boolean;
    /** Métricas de dispersão podem ser vinculadas ao cálculo do contrato. */
    source?: "reported" | "derived_iqr_median_percent";
    appliesWhenMedianAbove?: number;
    rule:
      | Readonly<{ version: string; kind: "allowed_values"; values: ReadonlyArray<number> }>
      | Readonly<{ version: string; kind: "range"; min: number; max: number }>;
  }>>;
}>;

export type HepaticQualityRegistry = ReadonlyArray<ApprovedHepaticQualityCriterion>;

/**
 * Perfis comuns versionados de aquisição. Não certificam um equipamento nem
 * inferem diagnóstico; o protocolo completo exige confirmação médica explícita.
 */
export const APPROVED_HEPATIC_QUALITY_CRITERIA: HepaticQualityRegistry = HEPATIC_COMMON_QUALITY_PROFILES;

function sameReference(
  actual: { id: string; version: string; citation: string },
  approved: ApprovedHepaticQualityCriterion["reference"],
): boolean {
  return actual.id === approved.id
    && actual.version === approved.version
    && actual.citation === approved.citation;
}

function metricValueApproved(
  value: number,
  rule: ApprovedHepaticQualityCriterion["metrics"][number]["rule"],
): boolean {
  if (!rule.version.trim() || !Number.isFinite(value)) return false;
  if (rule.kind === "allowed_values") {
    return rule.values.length > 0
      && rule.values.every(Number.isFinite)
      && rule.values.includes(value);
  }
  return Number.isFinite(rule.min)
    && Number.isFinite(rule.max)
    && rule.min <= rule.max
    && value >= rule.min
    && value <= rule.max;
}

export function validateHepaticQualityRegistry(args: {
  assessment: HepaticAssessment;
  actorId: string;
  registry?: HepaticQualityRegistry;
}): HepaticIssue[] {
  const registry = args.registry ?? APPROVED_HEPATIC_QUALITY_CRITERIA;
  const issues: HepaticIssue[] = [];
  for (const key of ["fat", "stiffness"] as const) {
    const assessmentModule = args.assessment.modules[key];
    if (assessmentModule.status !== "performed" && assessmentModule.status !== "partially_limited") continue;
    const quality = assessmentModule.quality;
    if (!quality) continue; // O contrato base emitirá ADEQUATE_QUALITY_REQUIRED.
    if (quality.physicianId !== args.actorId) {
      issues.push({ path: `modules.${key}.quality.physicianId`, code: "QUALITY_PHYSICIAN_ACTOR_MISMATCH" });
    }
    const criterion = quality.criterion;
    const approved = registry.find((entry) => entry.module === key
      && entry.method === assessmentModule.method
      && (entry.scope === "method" || entry.manufacturer.toLowerCase() === assessmentModule.equipment?.manufacturer.toLowerCase())
      && (entry.scope === "method" || entry.scope === "manufacturer" || entry.equipmentModel === assessmentModule.equipment?.model)
      && entry.unit === assessmentModule.measurements.find((measurement) => measurement.role === "median")?.unit
      && entry.method === criterion.method
      && criterion.manufacturer === assessmentModule.equipment?.manufacturer
      && criterion.equipmentModel === assessmentModule.equipment?.model
      && entry.unit === criterion.unit
      && entry.minimumAcquisitions === criterion.minimumAcquisitions
      && sameReference(criterion.reference, entry.reference));
    if (!approved) {
      issues.push({ path: `modules.${key}.quality.criterion`, code: "QUALITY_CRITERION_UNAPPROVED" });
      continue;
    }

    if (approved.minimumFastingHours && (assessmentModule.fasting?.status !== "fasting" ||
      (assessmentModule.fasting.hours ?? 0) < approved.minimumFastingHours)) {
      issues.push({ path: `modules.${key}.fasting`, code: "QUALITY_FASTING_REQUIREMENT" });
    }
    if ((assessmentModule.acquisition?.count ?? 0) < approved.minimumAcquisitions) {
      issues.push({ path: `modules.${key}.acquisition.count`, code: "QUALITY_ACQUISITION_COUNT" });
    }
    if (approved.scope && assessmentModule.acquisition?.lobe !== "right") {
      issues.push({ path: `modules.${key}.acquisition.lobe`, code: "QUALITY_RIGHT_LOBE_REQUIRED" });
    }
    const approvedMetrics = new Map(approved.metrics.map((metric) => [metric.code, metric]));
    const declaredRequired = new Set(criterion.requiredMetrics);
    const approvedRequired = approved.metrics.filter((metric) => metric.required).map((metric) => metric.code);
    if (declaredRequired.size !== approvedRequired.length
      || approvedRequired.some((code) => !declaredRequired.has(code))) {
      issues.push({ path: `modules.${key}.quality.criterion.requiredMetrics`, code: "QUALITY_REQUIRED_METRICS_UNAPPROVED" });
    }
    const suppliedCodes = new Set(quality.metrics.map((metric) => metric.code));
    for (const metric of quality.metrics) {
      const approvedMetric = approvedMetrics.get(metric.code);
      if (!approvedMetric) {
        issues.push({ path: `modules.${key}.quality.metrics`, code: "QUALITY_METRIC_UNAPPROVED" });
      } else if (metric.unit !== approvedMetric.unit) {
        issues.push({ path: `modules.${key}.quality.metrics`, code: "QUALITY_METRIC_UNIT_MISMATCH" });
      } else {
        let value = metric.value;
        if (approvedMetric.source === "derived_iqr_median_percent") {
          const derived = assessmentModule.derived.find((item) => item.id === "iqr-median-percent");
          if (!derived || derived.unit !== metric.unit) {
            issues.push({ path: `modules.${key}.derived`, code: "QUALITY_METRIC_REQUIRED" });
            continue;
          }
          if (Math.abs(metric.value - derived.value) > 0.0000005) {
            issues.push({ path: `modules.${key}.quality.metrics`, code: "QUALITY_METRIC_SOURCE_MISMATCH" });
            continue;
          }
          value = derived.value;
        }
        const medianValue = assessmentModule.measurements.find((item) => item.role === "median")?.value;
        const ruleApplies = approvedMetric.appliesWhenMedianAbove === undefined || medianValue === undefined || medianValue > approvedMetric.appliesWhenMedianAbove;
        if (ruleApplies && !metricValueApproved(value, approvedMetric.rule)) {
          issues.push({ path: `modules.${key}.quality.metrics`, code: "QUALITY_METRIC_VALUE_UNAPPROVED" });
        }
      }
    }
    if (approvedRequired.some((code) => !suppliedCodes.has(code))) {
      issues.push({ path: `modules.${key}.quality.metrics`, code: "QUALITY_METRIC_REQUIRED" });
    }
  }
  return issues;
}
