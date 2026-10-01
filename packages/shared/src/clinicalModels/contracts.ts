import { z } from "zod";

export const ClinicalModelCodeSchema = z.enum([
  "ABDOMEN_TOTAL_DOPPLER",
  "DOPPLER_VENOSO_MMSS",
  "DOPPLER_ARTERIAL_MMSS",
  "TORAX",
  "QUADRIL_INFANTIL",
]);

export type ClinicalModelCode = z.infer<typeof ClinicalModelCodeSchema>;
export const CLINICAL_MODEL_CODES = ClinicalModelCodeSchema.options;

const PositiveNumber = z.number().finite().positive();
const NonNegativeNumber = z.number().finite().nonnegative();
const FlowDirectionSchema = z.enum(["hepatopetal", "hepatofugal", "ausente", "outro"]);

const RequiredVesselSchema = z.object({
  caliberCm: PositiveNumber.optional(),
  velocityCms: PositiveNumber.optional(),
  flow: FlowDirectionSchema.optional(),
}).strict();

const OptionalVesselSchema = z.discriminatedUnion("evaluated", [
  z.object({ evaluated: z.literal(false) }).strict(),
  z.object({
    evaluated: z.literal(true),
    caliberCm: PositiveNumber.optional(),
    velocityCms: PositiveNumber.optional(),
    flow: FlowDirectionSchema.optional(),
  }).strict(),
]);

export const AbdomenTotalDopplerSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.literal("ABDOMEN_TOTAL_DOPPLER"),
  physicianReviewed: z.boolean(),
  documentationPhoto: z.enum(["include", "omit"]),
  /** Texto completo produzido pelo contrato/formulário canônico de ABDOMEN_TOTAL. */
  abdomenReport: z.string().trim().min(80).max(20_000),
  portalVein: RequiredVesselSchema,
  hepaticVeins: OptionalVesselSchema,
  splenicVein: OptionalVesselSchema,
  superiorMesentericVein: OptionalVesselSchema,
  commonHepaticArtery: OptionalVesselSchema,
  portalPathology: z.object({
    status: z.enum(["absent", "suspected", "confirmed"]),
    kind: z.enum(["portal_hypertension", "portal_thrombosis", "other"]).optional(),
    evidence: z.string().trim().min(3).max(1000).optional(),
    physicianConfirmed: z.boolean(),
  }).strict(),
}).strict();

const VenousSideSchema = z.object({
  examined: z.boolean(),
  deepSystem: z.enum(["patent", "thrombosis", "not_assessed"]),
  superficialSystem: z.enum(["patent", "thrombosis", "not_assessed"]),
  competenceTested: z.boolean(),
  reflux: z.enum(["absent", "present", "not_assessed"]),
  internalJugular: z.enum(["not_assessed", "patent", "thrombosis"]),
  catheter: z.object({
    present: z.boolean(),
    relation: z.enum(["none", "adjacent", "around_catheter", "occlusive"]).optional(),
    segment: z.string().trim().max(240).optional(),
  }).strict(),
  thrombosisPhase: z.enum(["not_applicable", "acute", "subacute", "chronic", "indeterminate"]),
  phaseConfirmed: z.boolean(),
}).strict();

export const DopplerVenosoMmssSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.literal("DOPPLER_VENOSO_MMSS"),
  physicianReviewed: z.boolean(),
  indication: z.enum(["elective", "thrombosis_research", "catheter"]),
  laterality: z.enum(["right", "left", "bilateral"]),
  right: VenousSideSchema,
  left: VenousSideSchema,
}).strict();

const ThoracicOutletSchema = z.discriminatedUnion("evaluated", [
  z.object({ evaluated: z.literal(false) }).strict(),
  z.object({
    evaluated: z.literal(true),
    maneuvers: z.string().trim().min(3).max(500),
    positions: z.string().trim().min(3).max(500),
    result: z.enum(["negative", "positive", "indeterminate"]),
    physicianConfirmed: z.boolean(),
  }).strict(),
]);

const ArterialSideSchema = z.object({
  examined: z.boolean(),
  status: z.enum(["normal", "stenosis", "occlusion", "other"]),
  affectedVessel: z.string().trim().max(240).optional(),
  psvCms: z.record(z.string().trim().min(1).max(80), PositiveNumber),
  stenosisPercent: z.number().finite().min(1).max(100).optional(),
  percentageDataSufficient: z.boolean(),
  percentageConfirmed: z.boolean(),
  distalPattern: z.string().trim().max(500).optional(),
  thoracicOutlet: ThoracicOutletSchema,
}).strict();

export const DopplerArterialMmssSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.literal("DOPPLER_ARTERIAL_MMSS"),
  physicianReviewed: z.boolean(),
  laterality: z.enum(["right", "left", "bilateral"]),
  right: ArterialSideSchema,
  left: ArterialSideSchema,
}).strict();

const ThoraxSideSchema = z.object({
  pleuralLine: z.enum(["regular", "irregular", "not_assessed"]),
  sliding: z.enum(["present", "absent", "not_assessed"]),
  linesB: z.object({
    count: z.number().int().min(0).max(99),
    distribution: z.enum(["none", "focal", "multifocal", "diffuse"]),
  }).strict(),
  effusion: z.discriminatedUnion("present", [
    z.object({ present: z.literal(false) }).strict(),
    z.object({
      present: z.literal(true),
      separationMm: PositiveNumber,
      context: z.object({
        adult: z.boolean(),
        mechanicallyVentilated: z.boolean(),
        supineTorso15Deg: z.boolean(),
        endExpirationPosteriorAxillary: z.boolean(),
        physicianConfirmed: z.boolean(),
      }).strict(),
    }).strict(),
  ]),
  consolidation: z.enum(["not_seen", "suspected", "confirmed"]),
  atelectasis: z.enum(["not_seen", "suspected", "confirmed"]),
  pneumothorax: z.enum(["not_seen", "suspected", "confirmed"]),
}).strict();

export const ThoraxSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.literal("TORAX"),
  physicianReviewed: z.boolean(),
  right: ThoraxSideSchema,
  left: ThoraxSideSchema,
  limitation: z.string().trim().max(1000).optional(),
  correlationSuggested: z.boolean(),
}).strict();

const HipSideSchema = z.object({
  adequateStandardPlane: z.boolean(),
  alphaDeg: z.number().finite().min(0).max(90).optional(),
  betaDeg: z.number().finite().min(0).max(120).optional(),
  bonyRoof: z.enum(["normal", "rounded", "deficient", "not_assessed"]),
  cartilaginousRoof: z.enum(["normal", "displaced", "not_assessed"]),
  femoralHead: z.enum(["centered", "decentered", "dislocated", "not_assessed"]),
  labrumPosition: z.enum(["normal", "everted", "interposed", "not_assessed"]),
  coveragePercent: z.number().finite().min(0).max(100).optional(),
  grafClassification: z.enum(["I", "IIA", "IIB", "IIC", "D", "III", "IV"]).optional(),
  classificationConfirmed: z.boolean(),
}).strict();

export const QuadrilInfantilSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.literal("QUADRIL_INFANTIL"),
  physicianReviewed: z.boolean(),
  ageDays: z.number().int().min(0).max(730).optional(),
  right: HipSideSchema,
  left: HipSideSchema,
  recommendation: z.string().trim().max(1000).optional(),
  recommendationConfirmed: z.boolean(),
}).strict();

export const ClinicalModelInputSchema = z.discriminatedUnion("categoryCode", [
  AbdomenTotalDopplerSchema,
  DopplerVenosoMmssSchema,
  DopplerArterialMmssSchema,
  ThoraxSchema,
  QuadrilInfantilSchema,
]);

export type AbdomenTotalDopplerInput = z.infer<typeof AbdomenTotalDopplerSchema>;
export type DopplerVenosoMmssInput = z.infer<typeof DopplerVenosoMmssSchema>;
export type DopplerArterialMmssInput = z.infer<typeof DopplerArterialMmssSchema>;
export type ThoraxInput = z.infer<typeof ThoraxSchema>;
export type QuadrilInfantilInput = z.infer<typeof QuadrilInfantilSchema>;
export type ClinicalModelInput = z.infer<typeof ClinicalModelInputSchema>;

export type ClinicalModelIssue = {
  code: string;
  severity: "error" | "warning";
  path: string;
  message: string;
};

export type ClinicalModelValidation =
  | { success: true; data: ClinicalModelInput; issues: ClinicalModelIssue[] }
  | { success: false; issues: ClinicalModelIssue[] };

export const BALIK_PLEURAL_EFFUSION_METHOD = {
  id: "balik-2006-adult-ventilated-supine-15deg" as const,
  formula: "V (mL) = 20 × Sep (mm)" as const,
  population: "Adulto sob ventilação mecânica, em decúbito supino com tronco a 15°" as const,
  measurement: "Separação máxima no fim da expiração, na linha axilar posterior" as const,
  doi: "10.1007/s00134-005-0024-2" as const,
  meanAbsoluteErrorMl: 158,
};

export type BalikEligibilityContext = {
  adult: boolean;
  mechanicallyVentilated: boolean;
  supineTorso15Deg: boolean;
  endExpirationPosteriorAxillary: boolean;
  physicianConfirmed: boolean;
};

export function isBalikEligible(context: BalikEligibilityContext): boolean {
  return context.adult && context.mechanicallyVentilated && context.supineTorso15Deg && context.endExpirationPosteriorAxillary && context.physicianConfirmed;
}

export function calculateBalikPleuralEffusionVolume(input: { separationMm: number; context: BalikEligibilityContext }): number {
  if (!Number.isFinite(input.separationMm) || input.separationMm <= 0) throw new Error("A separação pleural deve ser positiva.");
  if (!isBalikEligible(input.context)) throw new Error("O cálculo de Balik não é elegível neste contexto clínico e técnico.");
  return 20 * input.separationMm;
}

export type GrafSuggestionInput = Pick<QuadrilInfantilInput, "ageDays"> & Omit<QuadrilInfantilInput["right"], "grafClassification" | "classificationConfirmed" | "coveragePercent">;
export type GrafSuggestion =
  | { success: true; classification: NonNullable<QuadrilInfantilInput["right"]["grafClassification"]> }
  | { success: false; code: "GRAF_INPUT_INCOMPLETE" | "GRAF_MORPHOLOGY_INSUFFICIENT"; message: string };

export function calculateGrafSuggestion(input: GrafSuggestionInput): GrafSuggestion {
  if (input.ageDays == null || !input.adequateStandardPlane || input.alphaDeg == null || input.betaDeg == null || input.bonyRoof === "not_assessed" || input.cartilaginousRoof === "not_assessed" || input.femoralHead === "not_assessed" || input.labrumPosition === "not_assessed") {
    return { success: false, code: "GRAF_INPUT_INCOMPLETE", message: "A classificação exige corte adequado, idade, ângulos alfa e beta, posição do labrum e morfologia completa." };
  }
  if (input.alphaDeg >= 60) return { success: true, classification: "I" };
  if (input.alphaDeg >= 50) return { success: true, classification: input.ageDays <= 84 ? "IIA" : "IIB" };
  if (input.alphaDeg >= 43) {
    const centeredAndCovered = input.femoralHead === "centered" && input.bonyRoof !== "deficient" && input.cartilaginousRoof === "normal";
    return { success: true, classification: input.betaDeg < 77 && centeredAndCovered ? "IIC" : "D" };
  }
  if (input.labrumPosition === "everted") return { success: true, classification: "III" };
  if (input.labrumPosition === "interposed") return { success: true, classification: "IV" };
  return { success: false, code: "GRAF_MORPHOLOGY_INSUFFICIENT", message: "Alfa abaixo de 43° exige posição do teto cartilaginoso/labrum para diferenciar Graf III de IV." };
}

function sideIsRequired(laterality: "right" | "left" | "bilateral", side: "right" | "left") {
  return laterality === "bilateral" || laterality === side;
}

function issue(code: string, message: string, path: string, severity: "error" | "warning" = "error"): ClinicalModelIssue {
  return { code, message, path, severity };
}

export function validateClinicalModelInput(value: unknown, options: { requirePhysicianReview?: boolean } = {}): ClinicalModelValidation {
  const parsed = ClinicalModelInputSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((entry) => issue(
        "SCHEMA_INVALID",
        entry.message,
        entry.path.join("."),
      )),
    };
  }

  const data = parsed.data;
  const issues: ClinicalModelIssue[] = [];
  if (options.requirePhysicianReview !== false && !data.physicianReviewed) {
    issues.push(issue("MODEL_NOT_REVIEWED", "Revise todos os achados e confirme o modelo antes de liberar o laudo.", "physicianReviewed"));
  }
  if (data.categoryCode === "ABDOMEN_TOTAL_DOPPLER") {
    if (data.portalVein.caliberCm == null || data.portalVein.velocityCms == null || data.portalVein.flow == null) {
      issues.push(issue("PORTAL_VEIN_REQUIRED", "Veia porta exige calibre, velocidade e direção do fluxo informados pelo médico.", "portalVein"));
    }
    for (const [key, vessel] of Object.entries({ hepaticVeins: data.hepaticVeins, splenicVein: data.splenicVein, superiorMesentericVein: data.superiorMesentericVein, commonHepaticArtery: data.commonHepaticArtery })) {
      if (vessel.evaluated && (vessel.caliberCm == null || vessel.velocityCms == null || vessel.flow == null)) issues.push(issue("OPTIONAL_VESSEL_INCOMPLETE", "Vaso marcado como avaliado exige calibre, velocidade e direção do fluxo.", key));
    }
    const p = data.portalPathology;
    if (data.portalVein.flow === "hepatofugal" && p.status === "absent") {
      issues.push(issue("HEPATOFUGAL_FLOW_WITHOUT_PORTAL_FINDING", "Fluxo hepatofugal não pode coexistir com situação portal marcada como ausente. Registre a suspeita ou alteração e os critérios revisados.", "portalPathology.status"));
    }
    if (p.status !== "absent" && (!p.kind || !p.evidence || !p.physicianConfirmed)) {
      issues.push(issue("PORTAL_CONCLUSION_INCOMPLETE", "Hipertensão ou trombose portal exige tipo, critérios descritos e confirmação médica.", "portalPathology"));
    }
  }

  if (data.categoryCode === "DOPPLER_VENOSO_MMSS") {
    for (const side of ["right", "left"] as const) {
      const s = data[side];
      if (sideIsRequired(data.laterality, side) && !s.examined) issues.push(issue("SIDE_NOT_EXAMINED", `O lado ${side === "right" ? "direito" : "esquerdo"} foi solicitado, mas não foi marcado como examinado.`, side));
      if (s.examined && s.deepSystem === "not_assessed" && s.superficialSystem === "not_assessed" && s.internalJugular === "not_assessed") issues.push(issue("VENOUS_TERRITORY_REQUIRED", "Informe pelo menos um território venoso efetivamente avaliado neste lado.", side));
      if (s.examined && s.competenceTested && s.reflux === "not_assessed") issues.push(issue("COMPETENCE_WITHOUT_RESULT", "Competência/refluxo foi marcado como testado, mas o resultado não foi informado.", `${side}.reflux`));
      if (s.examined && !s.competenceTested && s.reflux !== "not_assessed") issues.push(issue("REFLUX_NOT_TESTED", "Não conclua competência ou refluxo sem teste documentado.", `${side}.competenceTested`));
      const thrombosis = s.deepSystem === "thrombosis" || s.superficialSystem === "thrombosis" || s.internalJugular === "thrombosis";
      if (!thrombosis && s.thrombosisPhase !== "not_applicable") issues.push(issue("PHASE_WITHOUT_THROMBOSIS", "Fase de trombose só pode ser usada quando há trombose descrita.", `${side}.thrombosisPhase`));
      if (thrombosis && s.thrombosisPhase !== "indeterminate" && s.thrombosisPhase !== "not_applicable" && !s.phaseConfirmed) issues.push(issue("THROMBOSIS_PHASE_UNCONFIRMED", "A fase da trombose precisa ser sustentada pelos achados e confirmada pelo médico.", `${side}.phaseConfirmed`));
      if (s.catheter.present && (!s.catheter.relation || s.catheter.relation === "none" || !s.catheter.segment)) issues.push(issue("CATHETER_RELATION_INCOMPLETE", "Informe o segmento e a relação do trombo com o cateter.", `${side}.catheter`));
    }
  }

  if (data.categoryCode === "DOPPLER_ARTERIAL_MMSS") {
    for (const side of ["right", "left"] as const) {
      const s = data[side];
      if (sideIsRequired(data.laterality, side) && !s.examined) issues.push(issue("SIDE_NOT_EXAMINED", `O lado ${side === "right" ? "direito" : "esquerdo"} foi solicitado, mas não foi marcado como examinado.`, side));
      if (s.examined && s.status !== "normal" && (!s.affectedVessel || Object.keys(s.psvCms).length === 0)) issues.push(issue("ALTERED_ARTERIAL_MEASUREMENTS_REQUIRED", "Alteração arterial exige vaso afetado e pelo menos uma velocidade de pico sistólico.", side));
      if ((s.status === "stenosis" || s.status === "occlusion") && !s.distalPattern) issues.push(issue("DISTAL_PATTERN_REQUIRED", "Estenose ou oclusão exige descrição do padrão/amortecimento/reenchimento distal.", `${side}.distalPattern`));
      if (s.stenosisPercent != null && (!s.percentageDataSufficient || !s.percentageConfirmed)) issues.push(issue("STENOSIS_PERCENT_UNSUPPORTED", "O percentual de estenose só pode ser inserido com dados suficientes e confirmação médica.", `${side}.stenosisPercent`));
      if (s.stenosisPercent != null && s.status !== "stenosis") issues.push(issue("STENOSIS_PERCENT_STATUS_MISMATCH", "Percentual de estenose só pode ser informado quando o resultado do lado está marcado como estenose.", `${side}.stenosisPercent`));
      if (s.stenosisPercent == null && (s.percentageDataSufficient || s.percentageConfirmed)) issues.push(issue("PERCENTAGE_FLAGS_WITHOUT_VALUE", "Confirmações de percentual exigem um percentual de estenose informado.", `${side}.stenosisPercent`));
      if (s.thoracicOutlet.evaluated && !s.thoracicOutlet.physicianConfirmed) issues.push(issue("THORACIC_OUTLET_UNCONFIRMED", "O módulo de desfiladeiro torácico exige confirmação das manobras, posições e resultado.", `${side}.thoracicOutlet`));
    }
  }

  if (data.categoryCode === "TORAX") {
    for (const side of ["right", "left"] as const) {
      const s = data[side];
      if (s.effusion.present) {
        const c = s.effusion.context;
        if (!isBalikEligible(c)) {
          issues.push(issue("EFFUSION_BALIK_CONTEXT_UNSUPPORTED", "A separação pleural será descrita sem cálculo de volume: o método de Balik só se aplica a adulto ventilado, supino com tronco a 15°, com medida máxima no fim da expiração na linha axilar posterior e contexto confirmado.", `${side}.effusion.context`, "warning"));
        }
      }
      if (s.linesB.count === 0 && s.linesB.distribution !== "none") issues.push(issue("LINES_B_DISTRIBUTION_WITHOUT_COUNT", "Distribuição de linhas B exige uma contagem maior que zero.", `${side}.linesB`));
      if (s.linesB.count > 0 && s.linesB.distribution === "none") issues.push(issue("LINES_B_COUNT_WITHOUT_DISTRIBUTION", "Linhas B registradas exigem distribuição.", `${side}.linesB`));
    }
    const hasFinding = [data.right, data.left].some((s) => s.pleuralLine !== "regular" || s.sliding !== "present" || s.linesB.count > 0 || s.effusion.present || s.consolidation !== "not_seen" || s.atelectasis !== "not_seen" || s.pneumothorax !== "not_seen");
    if (data.correlationSuggested && !hasFinding && !data.limitation) issues.push(issue("CORRELATION_WITHOUT_REASON", "Sugestão de correlação só cabe quando há achado, limitação ou campo incompleto.", "correlationSuggested"));
  }

  if (data.categoryCode === "QUADRIL_INFANTIL") {
    if (data.ageDays != null && data.ageDays > 183) issues.push(issue("AGE_OUTSIDE_TARGET", "Idade fora da faixa preferencial de 0 a 6 meses. O exame pode continuar, mas exige revisão.", "ageDays", "warning"));
    for (const side of ["right", "left"] as const) {
      const s = data[side];
      const suggestion = calculateGrafSuggestion({ ageDays: data.ageDays, ...s });
      if (!suggestion.success) issues.push(issue(suggestion.code, suggestion.message, side));
      if (suggestion.success && s.grafClassification !== suggestion.classification) issues.push(issue("GRAF_CLASSIFICATION_MISMATCH", `A classificação informada diverge do cálculo determinístico: sugestão ${suggestion.classification}.`, `${side}.grafClassification`));
      if (suggestion.success && !s.classificationConfirmed) issues.push(issue("GRAF_UNCONFIRMED", "A classificação calculada deve ser confirmada pelo médico.", `${side}.classificationConfirmed`));
      if (!s.adequateStandardPlane && s.grafClassification) issues.push(issue("GRAF_INADEQUATE_PLANE", "Corte inadequado bloqueia a classificação de Graf.", `${side}.adequateStandardPlane`));
    }
    if (data.recommendation && !data.recommendationConfirmed) issues.push(issue("RECOMMENDATION_UNCONFIRMED", "Controle ou encaminhamento só entra no laudo após confirmação médica.", "recommendationConfirmed"));
  }

  const errors = issues.filter((entry) => entry.severity === "error");
  return errors.length ? { success: false, issues } : { success: true, data, issues };
}

export function isClinicalModelCode(value: string): value is ClinicalModelCode {
  return ClinicalModelCodeSchema.safeParse(value).success;
}
