import {
  classifyFetalGrowth,
  type FetalGrowthInput,
} from "@laudousg/shared";
import { z } from "zod";

const repeatedCriterionSchema = z.object({
  present: z.boolean(),
  confirmed: z.boolean(),
});

const ductusVenosusSchema = z.object({
  piAboveP95: z.boolean(),
  diastolicFlow: z.enum(["present", "absent", "reversed"]),
  persistentDicroticVenousPulsations: z.boolean(),
  confirmedAfter6To12Hours: z.boolean(),
});

export const FetalGrowthModuleSchema = z.object({
  efwPercentile: z.number(),
  efwPercentileSource: z.string(),
  dopplerAssessmentCompleteAndNormal: z.boolean(),
  cprBelowP5: repeatedCriterionSchema,
  mcaPiBelowP5: repeatedCriterionSchema,
  meanUterinePiAboveP95: z.boolean(),
  umbilicalArteryEndDiastolicFlow: z.enum(["present", "absent", "reversed"]),
  umbilicalFlowConfirmedInRequiredInterval: z.boolean(),
  ductusVenosus: ductusVenosusSchema,
  pathologicalCtg: z.boolean(),
});

export type FetalGrowthModule = z.infer<typeof FetalGrowthModuleSchema>;

const repeatedJson = {
  type: "object",
  additionalProperties: false,
  required: ["present", "confirmed"],
  properties: {
    present: { type: "boolean" },
    confirmed: { type: "boolean" },
  },
} as const;

export const FETAL_GROWTH_MODULE_JSON_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: false,
  required: [
    "efwPercentile",
    "efwPercentileSource",
    "dopplerAssessmentCompleteAndNormal",
    "cprBelowP5",
    "mcaPiBelowP5",
    "meanUterinePiAboveP95",
    "umbilicalArteryEndDiastolicFlow",
    "umbilicalFlowConfirmedInRequiredInterval",
    "ductusVenosus",
    "pathologicalCtg",
  ],
  properties: {
    efwPercentile: { type: "number" },
    efwPercentileSource: { type: "string" },
    dopplerAssessmentCompleteAndNormal: { type: "boolean" },
    cprBelowP5: repeatedJson,
    mcaPiBelowP5: repeatedJson,
    meanUterinePiAboveP95: { type: "boolean" },
    umbilicalArteryEndDiastolicFlow: {
      type: "string",
      enum: ["present", "absent", "reversed"],
    },
    umbilicalFlowConfirmedInRequiredInterval: { type: "boolean" },
    ductusVenosus: {
      type: "object",
      additionalProperties: false,
      required: [
        "piAboveP95",
        "diastolicFlow",
        "persistentDicroticVenousPulsations",
        "confirmedAfter6To12Hours",
      ],
      properties: {
        piAboveP95: { type: "boolean" },
        diastolicFlow: {
          type: "string",
          enum: ["present", "absent", "reversed"],
        },
        persistentDicroticVenousPulsations: { type: "boolean" },
        confirmedAfter6To12Hours: { type: "boolean" },
      },
    },
    pathologicalCtg: { type: "boolean" },
  },
} as const;

export function renderFetalGrowthModule(
  module: FetalGrowthModule,
  gestationalWeeks: number | null,
  gestationalDays: number | null,
): { achados: string[]; conclusao: string[] } {
  const input: FetalGrowthInput = {
    ...module,
    ...(gestationalWeeks !== null ? { gestationalWeeks } : {}),
    ...(gestationalDays !== null ? { gestationalDays } : {}),
  };
  const result = classifyFetalGrowth(input);
  const achados = [
    result.conclusion,
    ...result.pendingCriteria.map((item) =>
      `${item.label}: achado no exame atual; ${item.confirmationRequirement ?? "confirmação pendente"}`,
    ),
    ...result.warnings,
    result.reportReference,
    `Curva informada para o percentil do peso: ${result.efwPercentileSource}.`,
  ];
  const conclusao = result.classification === "adequate_for_gestational_age"
    ? []
    : [result.conclusion];
  return { achados, conclusao };
}
