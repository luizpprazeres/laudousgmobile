import {
  calculateGrafSuggestion,
  AbdomenTotalDopplerSchema,
  CLINICAL_MODEL_CODES,
  DopplerArterialMmssSchema,
  DopplerHepaticoSchema,
  DopplerVenosoMmssSchema,
  QuadrilInfantilSchema,
  ThoraxSchema,
  validateClinicalModelInput,
  type ClinicalModelCode,
  type QuadrilInfantilInput,
} from "@laudousg/shared";

export const APPROVED_ANDROID_MODEL_CODES: readonly ClinicalModelCode[] = CLINICAL_MODEL_CODES;

export type ApprovedAndroidModelCode = ClinicalModelCode;

/** Contrato canônico usado pelo cliente para cada workspace estruturado. */
export const CLINICAL_CONTRACTS = {
  ABDOMEN_TOTAL_DOPPLER: AbdomenTotalDopplerSchema,
  DOPPLER_HEPATICO: DopplerHepaticoSchema,
  DOPPLER_VENOSO_MMSS: DopplerVenosoMmssSchema,
  DOPPLER_ARTERIAL_MMSS: DopplerArterialMmssSchema,
  TORAX: ThoraxSchema,
  QUADRIL_INFANTIL: QuadrilInfantilSchema,
} as const satisfies Record<ApprovedAndroidModelCode, unknown>;

/**
 * Contrato de apresentação Android. O texto clínico continua vindo do renderer
 * compartilhado; estes metadados impedem o cliente de reinterpretar as decisões.
 */
export const ANDROID_MODEL_POLICIES = {
  ABDOMEN_TOTAL_DOPPLER: {
    requiresPhysicianReview: true,
    ownCategory: true,
    requiredVessels: ["veia_porta"],
    optionalVessels: ["veia_porta_direita", "veia_porta_esquerda", "veia_esplenica", "veia_mesenterica_superior", "arteria_hepatica_comum"],
    dimensionTerm: "calibre",
  },
  DOPPLER_HEPATICO: {
    requiresPhysicianReview: true,
    ownCategory: true,
    requiredVessels: ["veia_porta"],
    optionalVessels: ["veias_hepaticas", "veia_esplenica", "veia_mesenterica_superior", "arteria_hepatica_comum"],
    normalConclusionRequiresExplicitConfirmation: true,
    optionalVesselsAppearOnlyWhenEvaluated: true,
    automaticThresholdClassification: false,
    excludedModules: ["tips", "transplante_hepatico"],
  },
  DOPPLER_VENOSO_MMSS: {
    requiresPhysicianReview: true,
    oneReportForBilateralExam: true,
    selectableIndication: true,
    optionalSegments: ["veia_jugular_interna"],
    requiresTestBeforeCompetenceStatement: true,
    catheterThrombosisBlock: true,
    physicianConfirmsThrombusAge: true,
  },
  DOPPLER_ARTERIAL_MMSS: {
    requiresPhysicianReview: true,
    oneReportForBilateralExam: true,
    velocitiesRequiredWhenAbnormal: true,
    physicianConfirmsStenosisPercentage: true,
    thoracicOutletModule: true,
    distalPatternFields: true,
  },
  TORAX: {
    requiresPhysicianReview: true,
    pulmonaryAndPleural: true,
    automaticEffusionEstimate: true,
    bLinesAreDescriptiveOnly: true,
    independentBlocks: ["pneumotorax", "consolidacao", "atelectasia"],
  },
  QUADRIL_INFANTIL: {
    requiresPhysicianReview: true,
    selectorLabel: "Quadril infantil",
    ageGuidanceMonths: [0, 6],
    ageOutsideRangeIsWarning: true,
    classificationRequiresCompleteGrafData: true,
    coverageIsOptional: true,
    recommendationRequiresConfirmation: true,
  },
} as const satisfies Record<ApprovedAndroidModelCode, object>;

export type GrafReadiness =
  | { ready: true; warnings: string[]; suggestions: { right: string; left: string } }
  | { ready: false; warnings: string[]; missingOrInvalid: string[] };

/**
 * Fail-closed: o Android nunca calcula nem aceita uma classificação de Graf
 * a partir de campos parciais. Estar fora de 0–6 meses alerta, mas não bloqueia,
 * conforme a decisão clínica aprovada.
 */
export function grafReadiness(input: unknown): GrafReadiness {
  const parsed = QuadrilInfantilSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ready: false,
      warnings: [],
      missingOrInvalid: parsed.error.issues.map((issue) => issue.path.join(".") || "dados_de_graf"),
    };
  }
  const missingOrInvalid: string[] = [];
  const suggestions: Partial<Record<"right" | "left", string>> = {};
  if (parsed.data.ageDays == null) missingOrInvalid.push("ageDays");
  for (const side of ["right", "left"] as const) {
    const value = parsed.data[side];
    if (!value.adequateStandardPlane) missingOrInvalid.push(`${side}.adequateStandardPlane`);
    if (value.alphaDeg == null) missingOrInvalid.push(`${side}.alphaDeg`);
    if (value.betaDeg == null) missingOrInvalid.push(`${side}.betaDeg`);
    if (value.bonyRoof === "not_assessed") missingOrInvalid.push(`${side}.bonyRoof`);
    if (value.cartilaginousRoof === "not_assessed") missingOrInvalid.push(`${side}.cartilaginousRoof`);
    if (value.femoralHead === "not_assessed") missingOrInvalid.push(`${side}.femoralHead`);
    const suggestion = calculateGrafSuggestion({ ageDays: parsed.data.ageDays, ...value });
    if (suggestion.success) suggestions[side] = suggestion.classification;
    else if (!missingOrInvalid.includes(side)) missingOrInvalid.push(side);
  }
  const warnings = parsed.data.ageDays != null && parsed.data.ageDays > 183
    ? ["Idade fora da faixa usual de 0 a 6 meses; confirmar aplicabilidade da técnica de Graf."]
    : [];
  if (missingOrInvalid.length) return { ready: false, warnings, missingOrInvalid };
  return {
    ready: true,
    warnings,
    suggestions: { right: suggestions.right!, left: suggestions.left! },
  };
}

export function canCommitGrafClassification(input: unknown): input is QuadrilInfantilInput {
  const readiness = grafReadiness(input);
  if (!readiness.ready) return false;
  const parsed = QuadrilInfantilSchema.safeParse(input);
  if (!parsed.success || !parsed.data.right.grafClassification || !parsed.data.left.grafClassification ||
      !parsed.data.right.classificationConfirmed || !parsed.data.left.classificationConfirmed) return false;
  return validateClinicalModelInput(parsed.data, { requirePhysicianReview: false }).success;
}
