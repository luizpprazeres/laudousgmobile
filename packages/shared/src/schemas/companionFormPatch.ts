import { z } from "zod";

export const COMPANION_FORM_PATCH_CONTRACT_VERSION = "companion-form-patch/v1" as const;

export const CompanionFormPatchCategorySchema = z.literal("DOPPLER_CAROTIDAS");
export const CompanionFormPatchSourceKindSchema = z.enum(["text", "transcript"]);

const NumericTextSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "valor numérico deve usar ponto decimal");
const PositiveNumericTextSchema = NumericTextSchema.refine(
  (value) => Number(value) > 0,
  "valor deve ser maior que zero",
);
const PercentNumericTextSchema = NumericTextSchema.refine(
  (value) => Number(value) >= 0 && Number(value) <= 100,
  "percentual deve ficar entre 0 e 100",
);

const SideSchema = z.enum(["direita", "esquerda"]);
const VesselSchema = z.enum(["comum", "interna", "externa", "vertebral"]);

export const CompanionCarotidMeasurementSchema = z
  .object({
    side: SideSchema,
    vessel: VesselSchema,
    psv: PositiveNumericTextSchema.optional(),
    vdf: NumericTextSchema.optional(),
    emi: PositiveNumericTextSchema.optional(),
    flowDirection: z.enum(["anterogrado", "retrogrado", "ausente"]).optional(),
  })
  .strict()
  .refine(
    (value) => value.psv || value.vdf || value.emi || value.flowDirection,
    "medida carotídea vazia",
  )
  .refine(
    (value) => value.psv === undefined || value.vdf === undefined || Number(value.vdf) <= Number(value.psv),
    "VDF não pode superar a PSV",
  );

export const CompanionCarotidPlaqueSchema = z
  .object({
    side: SideSchema,
    location: z.string().trim().min(1).max(240).optional(),
    composition: z.enum(["calcificada", "lipidica", "mista"]).optional(),
    surface: z.enum(["regular", "irregular", "ulcerada"]).optional(),
    thickness: PositiveNumericTextSchema.optional(),
    stenosisPercent: PercentNumericTextSchema.optional(),
    description: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.location ||
      value.composition ||
      value.surface ||
      value.thickness ||
      value.stenosisPercent ||
      value.description,
    "placa carotídea vazia",
  );

export const CompanionCarotidClassificationSchema = z
  .object({
    side: SideSchema,
    classification: z.enum([
      "normal",
      "ateromatose_sem_estenose_significativa",
      "estenose_menor_50",
      "estenose_50_69",
      "estenose_70_99",
      "oclusao",
    ]),
  })
  .strict();

export const CompanionFormPatchDataSchema = z
  .object({
    carotidMeasurements: z.array(CompanionCarotidMeasurementSchema).max(10).default([]),
    carotidPlaques: z.array(CompanionCarotidPlaqueSchema).max(24).default([]),
    carotidClassifications: z.array(CompanionCarotidClassificationSchema).max(2).default([]),
    carotidConclusion: z.string().trim().min(1).max(2_000).optional(),
    carotidAdditionalFindings: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.carotidMeasurements.length > 0 ||
      value.carotidPlaques.length > 0 ||
      value.carotidClassifications.length > 0 ||
      Boolean(value.carotidConclusion) ||
      Boolean(value.carotidAdditionalFindings),
    "nenhum campo aplicável reconhecido",
  );

export const CompanionFormPatchWarningSchema = z
  .object({
    code: z.string().trim().min(1).max(80),
    message: z.string().trim().min(1).max(500),
    blocking: z.boolean().default(false),
  })
  .strict();

export const CompanionFormPatchRequestSchema = z
  .object({
    contractVersion: z.literal(COMPANION_FORM_PATCH_CONTRACT_VERSION),
    category: CompanionFormPatchCategorySchema,
    sourceKind: CompanionFormPatchSourceKindSchema,
    text: z.string().trim().min(1).max(2_000),
  })
  .strict();

export const CompanionFormPatchResponseSchema = z
  .object({
    contractVersion: z.literal(COMPANION_FORM_PATCH_CONTRACT_VERSION),
    category: CompanionFormPatchCategorySchema,
    sourceKind: CompanionFormPatchSourceKindSchema,
    data: CompanionFormPatchDataSchema,
    warnings: z.array(CompanionFormPatchWarningSchema).max(20).default([]),
  })
  .strict();

export const CompanionFormPatchErrorSchema = z
  .object({
    error: z.enum([
      "unauthorized",
      "feature_unavailable",
      "unsupported_media_type",
      "payload_too_large",
      "invalid_json",
      "invalid_companion_form_patch",
      "rate_limit_exceeded",
      "no_applicable_findings",
      "companion_form_patch_unavailable",
    ]),
    warnings: z.array(CompanionFormPatchWarningSchema).max(20).optional(),
  })
  .strict();

export type CompanionFormPatchRequest = z.infer<typeof CompanionFormPatchRequestSchema>;
export type CompanionFormPatchResponse = z.infer<typeof CompanionFormPatchResponseSchema>;
export type CompanionFormPatchData = z.infer<typeof CompanionFormPatchDataSchema>;
export type CompanionFormPatchWarning = z.infer<typeof CompanionFormPatchWarningSchema>;
