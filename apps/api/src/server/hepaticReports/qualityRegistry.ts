import type { HepaticAssessment, HepaticIssue, HepaticModuleKey } from "@laudousg/shared";

type ActiveModule = HepaticAssessment["modules"][HepaticModuleKey];
type Method = NonNullable<ActiveModule["method"]>;
type Unit = ActiveModule["measurements"][number]["unit"];

export type ApprovedHepaticQualityCriterion = Readonly<{
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
    rule:
      | Readonly<{ version: string; kind: "allowed_values"; values: ReadonlyArray<number> }>
      | Readonly<{ version: string; kind: "range"; min: number; max: number }>;
  }>>;
}>;

export type HepaticQualityRegistry = ReadonlyArray<ApprovedHepaticQualityCriterion>;

/**
 * Nenhum protocolo/equipamento nasce aprovado por inferência. O rollout deve
 * acrescentar entradas revisadas a este registro no servidor.
 */
export const APPROVED_HEPATIC_QUALITY_CRITERIA: HepaticQualityRegistry = Object.freeze([]);

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
    const module = args.assessment.modules[key];
    if (module.status !== "performed" && module.status !== "partially_limited") continue;
    const quality = module.quality;
    if (!quality) continue; // O contrato base emitirá ADEQUATE_QUALITY_REQUIRED.
    if (quality.physicianId !== args.actorId) {
      issues.push({ path: `modules.${key}.quality.physicianId`, code: "QUALITY_PHYSICIAN_ACTOR_MISMATCH" });
    }
    const criterion = quality.criterion;
    const approved = registry.find((entry) => entry.module === key
      && entry.method === module.method
      && entry.manufacturer === module.equipment?.manufacturer
      && entry.equipmentModel === module.equipment?.model
      && entry.unit === module.measurements.find((measurement) => measurement.role === "median")?.unit
      && entry.method === criterion.method
      && entry.manufacturer === criterion.manufacturer
      && entry.equipmentModel === criterion.equipmentModel
      && entry.unit === criterion.unit
      && entry.minimumAcquisitions === criterion.minimumAcquisitions
      && sameReference(criterion.reference, entry.reference));
    if (!approved) {
      issues.push({ path: `modules.${key}.quality.criterion`, code: "QUALITY_CRITERION_UNAPPROVED" });
      continue;
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
      } else if (!metricValueApproved(metric.value, approvedMetric.rule)) {
        issues.push({ path: `modules.${key}.quality.metrics`, code: "QUALITY_METRIC_VALUE_UNAPPROVED" });
      }
    }
    if (approvedRequired.some((code) => !suppliedCodes.has(code))) {
      issues.push({ path: `modules.${key}.quality.metrics`, code: "QUALITY_METRIC_REQUIRED" });
    }
  }
  return issues;
}
