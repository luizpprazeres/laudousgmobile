import assert from "node:assert/strict";
import { HEPATIC_CONTRACT_VERSION, type HepaticAssessment } from "@laudousg/shared";
import { validateHepaticQualityRegistry, type HepaticQualityRegistry } from "../qualityRegistry";

const actorId = "8e7dfcf2-a3cc-4f0a-a7a5-b46db3444334";
const reference = { id: "synthetic-derived", version: "test-v1", citation: "Regra sintética" };
const registry: HepaticQualityRegistry = [{
  module: "stiffness",
  method: "2D-SWE",
  manufacturer: "Synthetic",
  equipmentModel: "Test",
  unit: "kPa",
  minimumAcquisitions: 3,
  reference,
  metrics: [{
    code: "iqr-median-percent",
    unit: "%",
    required: true,
    source: "derived_iqr_median_percent",
    rule: { version: "synthetic/v1", kind: "range", min: 0, max: 30 },
  }],
}];

function assessment(derivedValue: number, reportedValue = derivedValue): HepaticAssessment {
  const median = { id: "median", role: "median" as const, value: 10, unit: "kPa" as const, origin: "manual" as const, source: reference };
  const iqr = { id: "iqr", role: "iqr" as const, value: derivedValue / 10, unit: "kPa" as const, origin: "manual" as const, source: reference };
  return {
    contractVersion: HEPATIC_CONTRACT_VERSION,
    examId: "d91d9e82-a692-4491-bac8-3f3847d7f809",
    revision: 0,
    purpose: "elastography",
    modules: {
      fat: { status: "not_performed", measurements: [], derived: [] },
      stiffness: {
        status: "performed",
        method: "2D-SWE",
        equipment: { manufacturer: "Synthetic", model: "Test" },
        acquisition: { count: 3, lobe: "right", depthCm: 4, roi: "Teste", position: "Supino", protocol: reference },
        fasting: { status: "fasting", hours: 4 },
        confounders: { reviewed: true, items: [], etiologicContext: "Teste" },
        quality: {
          assessment: "adequate",
          physicianId: actorId,
          assessedAt: "2026-10-05T12:00:00Z",
          criterion: {
            reference,
            method: "2D-SWE",
            manufacturer: "Synthetic",
            equipmentModel: "Test",
            unit: "kPa",
            minimumAcquisitions: 3,
            requiredMetrics: ["iqr-median-percent"],
          },
          metrics: [{ code: "iqr-median-percent", value: reportedValue, unit: "%" }],
        },
        measurements: [median, iqr],
        derived: [{ id: "iqr-median-percent", value: derivedValue, unit: "%", algorithm: "iqr/median*100/v1", inputs: [iqr, median] }],
      },
    },
  };
}

assert.deepEqual(validateHepaticQualityRegistry({ assessment: assessment(10), actorId, registry }), []);
assert.ok(validateHepaticQualityRegistry({ assessment: assessment(10, 9), actorId, registry })
  .some((issue) => issue.code === "QUALITY_METRIC_SOURCE_MISMATCH"));
assert.ok(validateHepaticQualityRegistry({ assessment: assessment(31), actorId, registry })
  .some((issue) => issue.code === "QUALITY_METRIC_VALUE_UNAPPROVED"));

console.log("✓ qualidade hepática: IQR/mediana vinculada às medidas do exame");
