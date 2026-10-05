import { z } from "zod";
import {
  AssessmentStateSchema,
  LateralitySchema,
  LimitationSchema,
  MeasurementIdentitySchema,
  SideSchema,
  contractIssue,
  duplicateValues,
  isRequestedSide,
  nearlyEqual,
  type ContractIssue,
} from "./common";

/** Candidato dormente. Não exportar em registries antes de aprovação médica. */
export const DOPPLER_RENAL_DORMANT_VERSION = "doppler-renal/v1-candidate" as const;

const Positive = z.number().finite().positive();
const NonNegative = z.number().finite().nonnegative();

const PsvMeasurementSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  segment: z.enum(["ostial_or_proximal", "middle", "distal", "maximum_unspecified"]),
  original: z.object({ value: Positive, unit: z.enum(["cm/s", "m/s"]) }).strict(),
  canonical: z.object({ value: Positive, unit: z.literal("cm/s") }).strict(),
}).strict();

const AorticPsvMeasurementSchema = MeasurementIdentitySchema.extend({
  level: z.literal("renal_artery_origins"),
  original: z.object({ value: Positive, unit: z.enum(["cm/s", "m/s"]) }).strict(),
  canonical: z.object({ value: Positive, unit: z.literal("cm/s") }).strict(),
}).strict();

const RatioMeasurementSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  original: z.object({ value: NonNegative, unit: z.literal("ratio") }).strict(),
  canonical: z.object({ value: NonNegative, unit: z.literal("ratio") }).strict(),
  /** Ordem fixa: VPS renal usada no numerador, depois VPS aórtica usada no denominador. */
  inputIds: z.tuple([z.string(), z.string()]),
}).strict();

const RiMeasurementSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  territory: z.enum(["upper_pole", "middle_pole", "lower_pole", "summary_unspecified"]),
  original: z.object({ value: NonNegative, unit: z.literal("ratio") }).strict(),
  canonical: z.object({ value: NonNegative, unit: z.literal("ratio") }).strict(),
}).strict();

const AccelerationTimeMeasurementSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  territory: z.enum(["upper_pole", "middle_pole", "lower_pole", "unspecified"]),
  original: z.object({ value: NonNegative, unit: z.enum(["ms", "s"]) }).strict(),
  canonical: z.object({ value: NonNegative, unit: z.literal("ms") }).strict(),
}).strict();

const AccelerationIndexMeasurementSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  territory: z.enum(["upper_pole", "middle_pole", "lower_pole", "unspecified"]),
  original: z.object({ value: NonNegative, unit: z.enum(["cm/s²", "m/s²"]) }).strict(),
  canonical: z.object({ value: NonNegative, unit: z.literal("cm/s²") }).strict(),
}).strict();

const RenalLinearMeasurementBaseSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  original: z.object({ value: Positive, unit: z.enum(["cm", "mm"]) }).strict(),
  canonical: z.object({ value: Positive, unit: z.literal("cm") }).strict(),
}).strict();

const BipolarLengthMeasurementSchema = RenalLinearMeasurementBaseSchema.extend({
  axis: z.literal("bipolar"),
}).strict();

const AnteroposteriorDiameterMeasurementSchema = RenalLinearMeasurementBaseSchema.extend({
  axis: z.literal("anteroposterior"),
}).strict();

const TransverseDiameterMeasurementSchema = RenalLinearMeasurementBaseSchema.extend({
  axis: z.literal("transverse"),
}).strict();

const ParenchymalThicknessMeasurementSchema = RenalLinearMeasurementBaseSchema.extend({
  axis: z.literal("parenchymal_thickness"),
}).strict();

const RenalSideSchema = z.object({
  assessment: AssessmentStateSchema,
  limitation: LimitationSchema.optional(),
  artery: z.object({
    patency: z.enum(["not_assessed", "patent", "no_flow_detected"]),
    psv: z.array(PsvMeasurementSchema).max(8),
    aliasingOrTurbulence: z.enum(["not_assessed", "absent", "present"]),
    accessoryArtery: z.enum(["not_assessed", "not_identified", "identified"]),
  }).strict(),
  documentedRar: RatioMeasurementSchema.optional(),
  intrarenal: z.object({
    ri: z.array(RiMeasurementSchema).max(8),
    spectralPattern: z.enum(["not_assessed", "normal", "tardus_parvus", "indeterminate"]),
    accelerationTime: z.array(AccelerationTimeMeasurementSchema).max(4),
    accelerationIndex: z.array(AccelerationIndexMeasurementSchema).max(4),
  }).strict(),
  kidney: z.object({
    bipolarLength: BipolarLengthMeasurementSchema.optional(),
    anteroposteriorDiameter: AnteroposteriorDiameterMeasurementSchema.optional(),
    transverseDiameter: TransverseDiameterMeasurementSchema.optional(),
    parenchymalThickness: ParenchymalThicknessMeasurementSchema.optional(),
    echogenicity: z.enum(["not_assessed", "preserved", "increased", "other"]),
    corticomedullaryDifferentiation: z.enum(["not_assessed", "preserved", "reduced"]),
  }).strict(),
}).strict();

const DerivedRarSchema = z.object({
  side: SideSchema,
  value: NonNegative,
  unit: z.literal("ratio"),
  algorithm: z.literal("max-renal-psv/aortic-psv/v1"),
  inputIds: z.tuple([z.string(), z.string()]),
  clinicalUse: z.literal("eligible_only_with_traceable_renal_and_aortic_psv"),
}).strict();

const DerivedMeanRiSchema = z.object({
  side: SideSchema,
  value: NonNegative,
  unit: z.literal("ratio"),
  algorithm: z.literal("arithmetic-mean-of-poles/v1"),
  inputIds: z.array(z.string()).min(1).max(3),
  clinicalUse: z.literal("blocked_pending_ri_aggregation_rule"),
}).strict();

const DerivedLengthDifferenceSchema = z.object({
  value: NonNegative,
  unit: z.literal("cm"),
  algorithm: z.literal("absolute-bipolar-length-difference/v1"),
  inputIds: z.tuple([z.string(), z.string()]),
  thresholdCm: z.literal(1.8),
  criterion: z.literal("strictly_greater_than"),
  conclusionCandidate: z.boolean(),
  clinicalUse: z.literal("candidate_only_no_final_text"),
}).strict();

const DerivedAccelerationTimeAdjunctSchema = z.object({
  side: SideSchema,
  measurementId: z.string(),
  valueMs: NonNegative,
  thresholdMs: z.literal(70),
  criterion: z.literal("strictly_greater_than"),
  adjunctCandidate: z.boolean(),
  clinicalUse: z.literal("adjunct_only_no_isolated_conclusion"),
}).strict();

const DerivedAccelerationIndexAdjunctSchema = z.object({
  side: SideSchema,
  measurementId: z.string(),
  valueCmPerS2: NonNegative,
  thresholdCmPerS2: z.literal(300),
  criterion: z.literal("strictly_less_than"),
  adjunctCandidate: z.boolean(),
  clinicalUse: z.literal("adjunct_only_no_isolated_conclusion"),
}).strict();

const RenalDerivedSchema = z.object({
  rar: z.array(DerivedRarSchema).max(2),
  meanRi: z.array(DerivedMeanRiSchema).max(2),
  accelerationTimeAdjuncts: z.array(DerivedAccelerationTimeAdjunctSchema).max(8),
  accelerationIndexAdjuncts: z.array(DerivedAccelerationIndexAdjunctSchema).max(8),
  bipolarLengthDifference: DerivedLengthDifferenceSchema.optional(),
}).strict();

export const DopplerRenalDormantSchema = z.object({
  contractVersion: z.literal(DOPPLER_RENAL_DORMANT_VERSION),
  categoryCode: z.literal("DOPPLER_RENAL"),
  examId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  scope: z.literal("native_kidneys"),
  laterality: LateralitySchema,
  quality: z.object({
    assessment: AssessmentStateSchema,
    limitation: LimitationSchema.optional(),
  }).strict(),
  aorta: z.object({
    assessment: AssessmentStateSchema,
    limitation: LimitationSchema.optional(),
    psv: AorticPsvMeasurementSchema.optional(),
  }).strict(),
  sides: z.object({ right: RenalSideSchema, left: RenalSideSchema }).strict(),
  derived: RenalDerivedSchema,
  clinicalPolicy: z.object({
    stenosisPublication: z.literal("numeric_criterion_requires_general_review_only"),
    borderlineRange: z.literal("body_only_no_stenosis_diagnosis"),
    numericBoundaries: z.literal("blocked_pending_remaining_boundary_decisions"),
    riInterpretation: z.literal("blocked_pending_ri_rules"),
    accelerationTimeInterpretation: z.literal("adjunct_strict_gt_70ms_no_isolated_conclusion"),
    rarClinicalEligibility: z.literal("requires_traceable_renal_and_aortic_psv"),
    renalLengthDifference: z.literal("conclusion_candidate_strict_gt_1_8cm"),
    transplant: z.literal("excluded_redirect_required"),
    renalVeins: z.literal("excluded_pending_source"),
    occlusionDiagnosis: z.literal("excluded_pending_source"),
    postStent: z.literal("excluded_pending_source"),
    accelerationIndex: z.literal("adjunct_strict_lt_3m_per_s2_no_isolated_conclusion"),
    recommendations: z.literal("blocked_pending_context_and_confirmation_policy"),
  }).strict(),
}).strict();

export type DopplerRenalDormant = z.infer<typeof DopplerRenalDormantSchema>;
export type DopplerRenalValidation = {
  success: boolean;
  data: DopplerRenalDormant | null;
  issues: ContractIssue[];
  canGenerateFinalText: false;
};

function canonicalPsv(value: z.infer<typeof PsvMeasurementSchema> | z.infer<typeof AorticPsvMeasurementSchema>): number {
  return value.original.unit === "m/s" ? value.original.value * 100 : value.original.value;
}

function canonicalAccelerationTime(value: z.infer<typeof AccelerationTimeMeasurementSchema>): number {
  return value.original.unit === "s" ? value.original.value * 1000 : value.original.value;
}

function canonicalAccelerationIndex(value: z.infer<typeof AccelerationIndexMeasurementSchema>): number {
  return value.original.unit === "m/s²" ? value.original.value * 100 : value.original.value;
}

function canonicalLength(value: z.infer<typeof RenalLinearMeasurementBaseSchema>): number {
  return value.original.unit === "mm" ? value.original.value / 10 : value.original.value;
}

function strictlyGreaterThan(value: number, threshold: number): boolean {
  return value > threshold && !nearlyEqual(value, threshold);
}

function strictlyLessThan(value: number, threshold: number): boolean {
  return value < threshold && !nearlyEqual(value, threshold);
}

function emptyDerived(): DopplerRenalDormant["derived"] {
  return { rar: [], meanRi: [], accelerationTimeAdjuncts: [], accelerationIndexAdjuncts: [] };
}

/** Recomputes arithmetic and approved candidate flags; it never produces a diagnosis or prose. */
export function recomputeDopplerRenalDerived(value: DopplerRenalDormant): DopplerRenalDormant {
  const parsed = DopplerRenalDormantSchema.parse(value);
  const derived = emptyDerived();
  const aortic = parsed.aorta.psv;

  for (const side of ["right", "left"] as const) {
    const sideData = parsed.sides[side];
    if (aortic && sideData.artery.psv.length > 0 && aortic.canonical.value > 0) {
      const maximum = sideData.artery.psv.reduce((current, candidate) =>
        candidate.canonical.value > current.canonical.value ? candidate : current,
      );
      derived.rar.push({
        side,
        value: maximum.canonical.value / aortic.canonical.value,
        unit: "ratio",
        algorithm: "max-renal-psv/aortic-psv/v1",
        inputIds: [maximum.id, aortic.id],
        clinicalUse: "eligible_only_with_traceable_renal_and_aortic_psv",
      });
    }

    const poleRi = sideData.intrarenal.ri.filter((measurement) =>
      measurement.territory !== "summary_unspecified",
    );
    if (poleRi.length > 0) {
      derived.meanRi.push({
        side,
        value: poleRi.reduce((total, measurement) => total + measurement.canonical.value, 0) / poleRi.length,
        unit: "ratio",
        algorithm: "arithmetic-mean-of-poles/v1",
        inputIds: poleRi.map((measurement) => measurement.id),
        clinicalUse: "blocked_pending_ri_aggregation_rule",
      });
    }

    for (const measurement of sideData.intrarenal.accelerationTime) {
      derived.accelerationTimeAdjuncts.push({
        side,
        measurementId: measurement.id,
        valueMs: measurement.canonical.value,
        thresholdMs: 70,
        criterion: "strictly_greater_than",
        adjunctCandidate: strictlyGreaterThan(measurement.canonical.value, 70),
        clinicalUse: "adjunct_only_no_isolated_conclusion",
      });
    }
    for (const measurement of sideData.intrarenal.accelerationIndex) {
      derived.accelerationIndexAdjuncts.push({
        side,
        measurementId: measurement.id,
        valueCmPerS2: measurement.canonical.value,
        thresholdCmPerS2: 300,
        criterion: "strictly_less_than",
        adjunctCandidate: strictlyLessThan(measurement.canonical.value, 300),
        clinicalUse: "adjunct_only_no_isolated_conclusion",
      });
    }
  }

  const rightLength = parsed.sides.right.kidney.bipolarLength;
  const leftLength = parsed.sides.left.kidney.bipolarLength;
  if (rightLength && leftLength) {
    const difference = Math.abs(rightLength.canonical.value - leftLength.canonical.value);
    derived.bipolarLengthDifference = {
      value: difference,
      unit: "cm",
      algorithm: "absolute-bipolar-length-difference/v1",
      inputIds: [rightLength.id, leftLength.id],
      thresholdCm: 1.8,
      criterion: "strictly_greater_than",
      conclusionCandidate: strictlyGreaterThan(difference, 1.8),
      clinicalUse: "candidate_only_no_final_text",
    };
  }

  return { ...parsed, derived };
}

function sideHasPayload(side: DopplerRenalDormant["sides"]["right"]): boolean {
  return side.artery.patency !== "not_assessed" || side.artery.psv.length > 0 ||
    side.artery.aliasingOrTurbulence !== "not_assessed" ||
    side.artery.accessoryArtery !== "not_assessed" || !!side.documentedRar ||
    side.intrarenal.ri.length > 0 || side.intrarenal.spectralPattern !== "not_assessed" ||
    side.intrarenal.accelerationTime.length > 0 || side.intrarenal.accelerationIndex.length > 0 ||
    !!side.kidney.bipolarLength || !!side.kidney.anteroposteriorDiameter ||
    !!side.kidney.transverseDiameter || !!side.kidney.parenchymalThickness ||
    side.kidney.echogenicity !== "not_assessed" ||
    side.kidney.corticomedullaryDifferentiation !== "not_assessed";
}

function allMeasurementIds(data: DopplerRenalDormant): string[] {
  const ids: string[] = [];
  if (data.aorta.psv) ids.push(data.aorta.psv.id);
  for (const side of ["right", "left"] as const) {
    const value = data.sides[side];
    ids.push(...value.artery.psv.map((measurement) => measurement.id));
    if (value.documentedRar) ids.push(value.documentedRar.id);
    ids.push(...value.intrarenal.ri.map((measurement) => measurement.id));
    ids.push(...value.intrarenal.accelerationTime.map((measurement) => measurement.id));
    ids.push(...value.intrarenal.accelerationIndex.map((measurement) => measurement.id));
    for (const measurement of [
      value.kidney.bipolarLength,
      value.kidney.anteroposteriorDiameter,
      value.kidney.transverseDiameter,
      value.kidney.parenchymalThickness,
    ]) {
      if (measurement) ids.push(measurement.id);
    }
  }
  return ids;
}

export function validateDopplerRenalDormant(value: unknown): DopplerRenalValidation {
  const parsed = DopplerRenalDormantSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      data: null,
      issues: parsed.error.issues.map((entry) =>
        contractIssue("SCHEMA_INVALID", entry.path.join("."))),
      canGenerateFinalText: false,
    };
  }

  const data = parsed.data;
  const issues: ContractIssue[] = [];
  for (const duplicate of duplicateValues(allMeasurementIds(data))) {
    issues.push(contractIssue("DUPLICATE_SOURCE_ID", duplicate));
  }

  if (data.quality.assessment === "limited" && !data.quality.limitation) {
    issues.push(contractIssue("LIMITATION_REASON_REQUIRED", "quality.limitation"));
  }
  if (data.quality.assessment !== "limited" && data.quality.limitation) {
    issues.push(contractIssue("LIMITATION_STATE_CONFLICT", "quality.limitation"));
  }
  if (data.aorta.assessment === "limited" && !data.aorta.limitation) {
    issues.push(contractIssue("LIMITATION_REASON_REQUIRED", "aorta.limitation"));
  }
  if (data.aorta.assessment !== "limited" && data.aorta.limitation) {
    issues.push(contractIssue("LIMITATION_STATE_CONFLICT", "aorta.limitation"));
  }
  if (data.aorta.assessment === "not_assessed" && data.aorta.psv) {
    issues.push(contractIssue("NOT_ASSESSED_HAS_RESULTS", "aorta.psv"));
  }
  if (data.aorta.psv && !nearlyEqual(data.aorta.psv.canonical.value, canonicalPsv(data.aorta.psv))) {
    issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", "aorta.psv.canonical"));
  }

  for (const side of ["right", "left"] as const) {
    const sideData = data.sides[side];
    const path = `sides.${side}`;
    if (sideData.assessment === "limited" && !sideData.limitation) {
      issues.push(contractIssue("LIMITATION_REASON_REQUIRED", `${path}.limitation`));
    }
    if (sideData.assessment !== "limited" && sideData.limitation) {
      issues.push(contractIssue("LIMITATION_STATE_CONFLICT", `${path}.limitation`));
    }
    if (sideData.assessment === "not_assessed" && sideHasPayload(sideData)) {
      issues.push(contractIssue("NOT_ASSESSED_HAS_RESULTS", path));
    }
    if (!isRequestedSide(data.laterality, side) &&
      (sideData.assessment !== "not_assessed" || sideHasPayload(sideData))) {
      issues.push(contractIssue("UNREQUESTED_SIDE_HAS_RESULTS", path));
    }
    if (isRequestedSide(data.laterality, side) && sideData.assessment === "not_assessed") {
      issues.push(contractIssue("REQUESTED_SIDE_NOT_ASSESSED", path, "pending"));
    }
    if (sideData.assessment === "normal" && sideData.artery.patency === "no_flow_detected") {
      issues.push(contractIssue("NORMAL_STATE_CONFLICT", `${path}.artery.patency`));
    }
    if (sideData.assessment === "abnormal" && !sideHasPayload(sideData)) {
      issues.push(contractIssue("ABNORMAL_STATE_WITHOUT_EVIDENCE", path));
    }

    for (const measurement of sideData.artery.psv) {
      if (measurement.side !== side) issues.push(contractIssue("SIDE_MISMATCH", `${path}.artery.psv.${measurement.id}`));
      if (!nearlyEqual(measurement.canonical.value, canonicalPsv(measurement))) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `${path}.artery.psv.${measurement.id}`));
      }
    }
    if (sideData.documentedRar) {
      if (sideData.documentedRar.side !== side) issues.push(contractIssue("SIDE_MISMATCH", `${path}.documentedRar`));
      if (!nearlyEqual(sideData.documentedRar.original.value, sideData.documentedRar.canonical.value)) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `${path}.documentedRar`));
      }
      const [renalPsvId, aorticPsvId] = sideData.documentedRar.inputIds;
      if (!data.aorta.psv || aorticPsvId !== data.aorta.psv.id ||
        !sideData.artery.psv.some((measurement) => measurement.id === renalPsvId)) {
        issues.push(contractIssue("RAR_SOURCE_PSV_REQUIRED", `${path}.documentedRar`));
      }
    }
    for (const measurement of sideData.intrarenal.ri) {
      if (measurement.side !== side) issues.push(contractIssue("SIDE_MISMATCH", `${path}.intrarenal.ri.${measurement.id}`));
      if (!nearlyEqual(measurement.original.value, measurement.canonical.value)) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `${path}.intrarenal.ri.${measurement.id}`));
      }
    }
    for (const measurement of sideData.intrarenal.accelerationTime) {
      if (measurement.side !== side) issues.push(contractIssue("SIDE_MISMATCH", `${path}.intrarenal.accelerationTime.${measurement.id}`));
      if (!nearlyEqual(measurement.canonical.value, canonicalAccelerationTime(measurement))) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `${path}.intrarenal.accelerationTime.${measurement.id}`));
      }
    }
    for (const measurement of sideData.intrarenal.accelerationIndex) {
      if (measurement.side !== side) issues.push(contractIssue("SIDE_MISMATCH", `${path}.intrarenal.accelerationIndex.${measurement.id}`));
      if (!nearlyEqual(measurement.canonical.value, canonicalAccelerationIndex(measurement))) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `${path}.intrarenal.accelerationIndex.${measurement.id}`));
      }
    }
    for (const [field, measurement] of [
      ["bipolarLength", sideData.kidney.bipolarLength],
      ["anteroposteriorDiameter", sideData.kidney.anteroposteriorDiameter],
      ["transverseDiameter", sideData.kidney.transverseDiameter],
      ["parenchymalThickness", sideData.kidney.parenchymalThickness],
    ] as const) {
      if (!measurement) continue;
      if (measurement.side !== side) issues.push(contractIssue("SIDE_MISMATCH", `${path}.kidney.${field}`));
      if (!nearlyEqual(measurement.canonical.value, canonicalLength(measurement))) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `${path}.kidney.${field}`));
      }
    }
  }

  const expected = recomputeDopplerRenalDerived({ ...data, derived: emptyDerived() }).derived;
  if (JSON.stringify(data.derived) !== JSON.stringify(expected)) {
    issues.push(contractIssue("STALE_OR_INVALID_DERIVED_VALUES", "derived"));
  }

  for (const side of ["right", "left"] as const) {
    const documented = data.sides[side].documentedRar;
    const calculated = expected.rar.find((entry) => entry.side === side);
    if (documented && calculated && !nearlyEqual(documented.canonical.value, calculated.value)) {
      issues.push(contractIssue("RAR_TOLERANCE_RULE_PENDING", `sides.${side}.documentedRar`, "pending"));
    }
  }

  return {
    success: issues.every((entry) => entry.severity !== "blocker"),
    data,
    issues,
    canGenerateFinalText: false,
  };
}

/** Remove a fonte e recompõe todos os derivados na mesma revisão. */
export function removeDopplerRenalMeasurement(
  value: DopplerRenalDormant,
  measurementId: string,
): DopplerRenalDormant {
  const parsed = DopplerRenalDormantSchema.parse(value);
  let removed = false;
  const sides = { ...parsed.sides };

  for (const side of ["right", "left"] as const) {
    const current = parsed.sides[side];
    const psv = current.artery.psv.filter((measurement) => measurement.id !== measurementId);
    const ri = current.intrarenal.ri.filter((measurement) => measurement.id !== measurementId);
    const accelerationTime = current.intrarenal.accelerationTime.filter((measurement) => measurement.id !== measurementId);
    const accelerationIndex = current.intrarenal.accelerationIndex.filter((measurement) => measurement.id !== measurementId);
    const documentedRar = current.documentedRar?.id === measurementId ? undefined : current.documentedRar;
    const bipolarLength = current.kidney.bipolarLength?.id === measurementId ? undefined : current.kidney.bipolarLength;
    const anteroposteriorDiameter = current.kidney.anteroposteriorDiameter?.id === measurementId
      ? undefined : current.kidney.anteroposteriorDiameter;
    const transverseDiameter = current.kidney.transverseDiameter?.id === measurementId
      ? undefined : current.kidney.transverseDiameter;
    const parenchymalThickness = current.kidney.parenchymalThickness?.id === measurementId
      ? undefined : current.kidney.parenchymalThickness;
    if (psv.length !== current.artery.psv.length || ri.length !== current.intrarenal.ri.length ||
      accelerationTime.length !== current.intrarenal.accelerationTime.length ||
      accelerationIndex.length !== current.intrarenal.accelerationIndex.length ||
      documentedRar !== current.documentedRar || bipolarLength !== current.kidney.bipolarLength ||
      anteroposteriorDiameter !== current.kidney.anteroposteriorDiameter ||
      transverseDiameter !== current.kidney.transverseDiameter ||
      parenchymalThickness !== current.kidney.parenchymalThickness) removed = true;
    sides[side] = {
      ...current,
      artery: { ...current.artery, psv },
      documentedRar,
      intrarenal: { ...current.intrarenal, ri, accelerationTime, accelerationIndex },
      kidney: {
        ...current.kidney,
        bipolarLength,
        anteroposteriorDiameter,
        transverseDiameter,
        parenchymalThickness,
      },
    };
  }

  const aorta = parsed.aorta.psv?.id === measurementId
    ? (removed = true, { ...parsed.aorta, psv: undefined })
    : parsed.aorta;
  if (!removed) throw new Error("Unknown renal measurement");
  return recomputeDopplerRenalDerived({
    ...parsed,
    revision: parsed.revision + 1,
    aorta,
    sides,
    derived: emptyDerived(),
  });
}
