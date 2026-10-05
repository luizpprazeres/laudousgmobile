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

/** Candidato dormente compartilhado pelas apresentações comum e com medidas. */
export const DOPPLER_VENOSO_MMII_DORMANT_VERSION = "doppler-venoso-mmii/v1-candidate" as const;

export const DEEP_VENOUS_SEGMENTS = [
  "common_femoral",
  "femoral",
  "deep_femoral",
  "popliteal",
  "posterior_tibial",
  "anterior_tibial",
  "fibular",
  "gastrocnemius",
  "soleal",
] as const;

export const SUPERFICIAL_VENOUS_SEGMENTS = [
  "saphenofemoral_junction",
  "great_saphenous_proximal_thigh",
  "great_saphenous_mid_thigh",
  "great_saphenous_distal_thigh",
  "great_saphenous_knee",
  "great_saphenous_proximal_calf",
  "great_saphenous_mid_calf",
  "great_saphenous_distal_calf",
  "saphenopopliteal_junction",
  "small_saphenous_proximal",
  "small_saphenous_distal",
  "anterior_accessory_saphenous",
  "giacomini",
] as const;

export const VENOUS_SEGMENTS = [
  ...DEEP_VENOUS_SEGMENTS,
  ...SUPERFICIAL_VENOUS_SEGMENTS,
] as const;

const VenousSegmentSchema = z.enum(VENOUS_SEGMENTS);
const Positive = z.number().finite().positive();
const NonNegative = z.number().finite().nonnegative();

const TimeMeasurementBaseSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  original: z.object({ value: NonNegative, unit: z.enum(["s", "ms"]) }).strict(),
  canonical: z.object({ value: NonNegative, unit: z.literal("s") }).strict(),
}).strict();

const SegmentTimeMeasurementSchema = TimeMeasurementBaseSchema.extend({
  territory: VenousSegmentSchema,
}).strict();

const PerforatorTimeMeasurementSchema = TimeMeasurementBaseSchema.extend({
  territory: z.string().trim().min(1).max(120),
}).strict();

const DiameterMeasurementSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  territory: z.string().trim().min(1).max(120),
  original: z.object({ value: Positive, unit: z.enum(["mm", "cm"]) }).strict(),
  canonical: z.object({ value: Positive, unit: z.literal("mm") }).strict(),
}).strict();

const DistanceMeasurementSchema = MeasurementIdentitySchema.extend({
  side: SideSchema,
  reference: z.enum(["medial_malleolus", "saphenofemoral_junction", "saphenopopliteal_junction"]),
  original: z.object({ value: NonNegative, unit: z.enum(["cm", "mm"]) }).strict(),
  canonical: z.object({ value: NonNegative, unit: z.literal("cm") }).strict(),
}).strict();

const RefluxFindingSchema = z.object({
  id: z.string().trim().min(1).max(120),
  kind: z.literal("reflux_observation"),
  side: SideSchema,
  segment: VenousSegmentSchema,
  extentTo: VenousSegmentSchema.optional(),
  time: SegmentTimeMeasurementSchema.optional(),
  maneuver: z.enum(["not_documented", "valsalva", "distal_compression", "release"]),
  position: z.enum(["not_documented", "standing", "supine"]),
  physicianConfirmedObservation: z.boolean(),
  classification: z.literal("unclassified_pending_threshold_and_maneuver_rule"),
}).strict();

const ThrombosisFindingSchema = z.object({
  id: z.string().trim().min(1).max(120),
  kind: z.literal("thrombosis_observation"),
  side: SideSchema,
  segment: z.enum(DEEP_VENOUS_SEGMENTS),
  extentTo: z.enum(DEEP_VENOUS_SEGMENTS).optional(),
  compressibility: z.enum(["not_assessed", "complete", "partial", "absent", "not_testable"]),
  intraluminalMaterial: z.enum(["not_assessed", "absent", "present"]),
  echogenicity: z.enum(["not_assessed", "hypoechoic", "mixed", "hyperechoic"]),
  occlusion: z.enum(["not_assessed", "partial", "occlusive", "indeterminate"]),
  spontaneousFlow: z.enum(["not_assessed", "present", "absent"]),
  phasicity: z.enum(["not_assessed", "present", "absent"]),
  distalAugmentation: z.enum(["not_assessed", "present", "absent"]),
  wall: z.enum(["not_assessed", "thin", "thickened"]),
  recanalization: z.enum(["not_assessed", "absent", "present"]),
  collaterals: z.enum(["not_assessed", "absent", "present"]),
  phase: z.enum(["not_assessed", "acute", "chronic_recanalized", "mixed", "indeterminate"]),
  physicianConfirmedObservation: z.boolean(),
  publication: z.literal("incompressibility_anchor_approved_phase_rules_pending"),
}).strict();

const CaliberFindingSchema = z.object({
  id: z.string().trim().min(1).max(120),
  kind: z.literal("caliber_measurement"),
  side: SideSchema,
  segment: VenousSegmentSchema,
  diameter: DiameterMeasurementSchema,
  interpretation: z.literal("measurement_only_no_insufficiency_inference"),
}).strict();

const VenousFindingSchema = z.discriminatedUnion("kind", [
  RefluxFindingSchema,
  ThrombosisFindingSchema,
  CaliberFindingSchema,
]);

const SegmentAssessmentSchema = z.object({
  side: SideSchema,
  segment: VenousSegmentSchema,
  assessment: AssessmentStateSchema,
  limitation: LimitationSchema.optional(),
  competenceTested: z.boolean(),
  findings: z.array(VenousFindingSchema).max(20),
}).strict();

const PerforatorSchema = z.object({
  id: z.string().trim().min(1).max(120),
  side: SideSchema,
  assessment: AssessmentStateSchema,
  limitation: LimitationSchema.optional(),
  surface: z.enum(["medial", "lateral", "posterior", "anterior"]),
  level: z.enum(["thigh", "knee", "proximal_calf", "mid_calf", "distal_calf"]),
  distance: DistanceMeasurementSchema.optional(),
  diameter: DiameterMeasurementSchema.optional(),
  refluxTime: PerforatorTimeMeasurementSchema.optional(),
  superficialDeepConnection: z.enum(["not_assessed", "documented"]),
  classification: z.literal("unclassified_pending_perforator_rule"),
}).strict();

const VenousSideSchema = z.object({
  assessment: AssessmentStateSchema,
  limitation: LimitationSchema.optional(),
  segments: z.array(SegmentAssessmentSchema).max(80),
  perforators: z.array(PerforatorSchema).max(40),
}).strict();

const VenousDerivedSchema = z.object({
  refluxFindingIds: z.array(z.string()),
  thrombosisFindingIds: z.array(z.string()),
  caliberFindingIds: z.array(z.string()),
  mapProjection: z.literal("blocked_until_contract_and_asset_are_approved"),
}).strict();

export const DopplerVenosoMmiiDormantSchema = z.object({
  contractVersion: z.literal(DOPPLER_VENOSO_MMII_DORMANT_VERSION),
  categoryCode: z.literal("DOPPLER_VENOSO_MMII"),
  requestedPresentation: z.enum(["DOPPLER_VENOSO_MMII", "DOPPLER_VENOSO_MMII_MEDIDAS"]),
  examId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  protocol: z.enum(["complete", "tvp_only", "mapping_measurements"]),
  laterality: LateralitySchema,
  sides: z.object({ right: VenousSideSchema, left: VenousSideSchema }).strict(),
  derived: VenousDerivedSchema,
  clinicalPolicy: z.object({
    tvpPositiveMinimum: z.literal("incompressibility_anchor_material_is_adjunct"),
    tvpNegativeMinimum: z.literal("documented_compressibility_by_assessed_segment"),
    thrombosisPhase: z.literal("no_subacute_category_remaining_phase_rules_pending"),
    refluxThresholds: z.literal("strictly_greater_than_values_and_maneuvers_pending"),
    perforatorCompetence: z.literal("requires_reflux_and_diameter_thresholds_pending"),
    iliacVeins: z.literal("excluded_pending_protocol_decision"),
    muscularVeinThrombosis: z.literal("blocked_pending_scope_and_source"),
    superficialThrombosis: z.literal("excluded_pending_source"),
    postAblationOrSaphenectomy: z.literal("excluded_pending_source"),
    ceap: z.literal("excluded_pending_clinical_inputs_and_rule"),
    recommendations: z.literal("separate_physician_confirmation_required"),
  }).strict(),
}).strict();

export type DopplerVenosoMmiiDormant = z.infer<typeof DopplerVenosoMmiiDormantSchema>;
export type DopplerVenosoMmiiValidation = {
  success: boolean;
  data: DopplerVenosoMmiiDormant | null;
  issues: ContractIssue[];
  canGenerateFinalText: false;
};

const SUPERFICIAL = new Set<string>(SUPERFICIAL_VENOUS_SEGMENTS);
const MUSCULAR = new Set<string>(["gastrocnemius", "soleal"]);

function canonicalTime(value: z.infer<typeof TimeMeasurementBaseSchema>): number {
  return value.original.unit === "ms" ? value.original.value / 1000 : value.original.value;
}

function canonicalDiameter(value: z.infer<typeof DiameterMeasurementSchema>): number {
  return value.original.unit === "cm" ? value.original.value * 10 : value.original.value;
}

function canonicalDistance(value: z.infer<typeof DistanceMeasurementSchema>): number {
  return value.original.unit === "mm" ? value.original.value / 10 : value.original.value;
}

function emptyDerived(): DopplerVenosoMmiiDormant["derived"] {
  return {
    refluxFindingIds: [],
    thrombosisFindingIds: [],
    caliberFindingIds: [],
    mapProjection: "blocked_until_contract_and_asset_are_approved",
  };
}

/** Indexes observations only. It does not infer disease, phase, competence or map state. */
export function recomputeDopplerVenosoMmiiDerived(
  value: DopplerVenosoMmiiDormant,
): DopplerVenosoMmiiDormant {
  const parsed = DopplerVenosoMmiiDormantSchema.parse(value);
  const derived = emptyDerived();
  for (const side of ["right", "left"] as const) {
    for (const segment of parsed.sides[side].segments) {
      for (const finding of segment.findings) {
        if (finding.kind === "reflux_observation") derived.refluxFindingIds.push(finding.id);
        if (finding.kind === "thrombosis_observation") derived.thrombosisFindingIds.push(finding.id);
        if (finding.kind === "caliber_measurement") derived.caliberFindingIds.push(finding.id);
      }
    }
  }
  return { ...parsed, derived };
}

function segmentHasResult(segment: z.infer<typeof SegmentAssessmentSchema>): boolean {
  return segment.competenceTested || segment.findings.length > 0;
}

function sideHasResult(side: DopplerVenosoMmiiDormant["sides"]["right"]): boolean {
  return side.segments.some((segment) => segment.assessment !== "not_assessed" || segmentHasResult(segment)) ||
    side.perforators.some((perforator) => perforator.assessment !== "not_assessed" ||
      !!perforator.distance || !!perforator.diameter || !!perforator.refluxTime ||
      perforator.superficialDeepConnection !== "not_assessed");
}

function collectMeasurementIds(data: DopplerVenosoMmiiDormant): string[] {
  const ids: string[] = [];
  for (const side of ["right", "left"] as const) {
    for (const segment of data.sides[side].segments) {
      for (const finding of segment.findings) {
        if (finding.kind === "reflux_observation" && finding.time) ids.push(finding.time.id);
        if (finding.kind === "caliber_measurement") ids.push(finding.diameter.id);
      }
    }
    for (const perforator of data.sides[side].perforators) {
      if (perforator.distance) ids.push(perforator.distance.id);
      if (perforator.diameter) ids.push(perforator.diameter.id);
      if (perforator.refluxTime) ids.push(perforator.refluxTime.id);
    }
  }
  return ids;
}

function validateMeasurementUnits(
  data: DopplerVenosoMmiiDormant,
  issues: ContractIssue[],
): void {
  for (const side of ["right", "left"] as const) {
    const sideData = data.sides[side];
    for (const segment of sideData.segments) {
      for (const finding of segment.findings) {
        if (finding.kind === "reflux_observation" && finding.time &&
          !nearlyEqual(finding.time.canonical.value, canonicalTime(finding.time))) {
          issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `sides.${side}.segments.${segment.segment}.${finding.id}.time`));
        }
        if (finding.kind === "reflux_observation" && finding.time &&
          (finding.time.side !== finding.side || finding.time.territory !== finding.segment)) {
          issues.push(contractIssue("MEASUREMENT_ANATOMY_MISMATCH", `sides.${side}.segments.${segment.segment}.${finding.id}.time`));
        }
        if (finding.kind === "caliber_measurement" &&
          !nearlyEqual(finding.diameter.canonical.value, canonicalDiameter(finding.diameter))) {
          issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `sides.${side}.segments.${segment.segment}.${finding.id}.diameter`));
        }
        if (finding.kind === "caliber_measurement" &&
          (finding.diameter.side !== finding.side || finding.diameter.territory !== finding.segment)) {
          issues.push(contractIssue("MEASUREMENT_ANATOMY_MISMATCH", `sides.${side}.segments.${segment.segment}.${finding.id}.diameter`));
        }
      }
    }
    for (const perforator of sideData.perforators) {
      if (perforator.distance && !nearlyEqual(perforator.distance.canonical.value, canonicalDistance(perforator.distance))) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `sides.${side}.perforators.${perforator.id}.distance`));
      }
      if (perforator.diameter && !nearlyEqual(perforator.diameter.canonical.value, canonicalDiameter(perforator.diameter))) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `sides.${side}.perforators.${perforator.id}.diameter`));
      }
      if (perforator.refluxTime && !nearlyEqual(perforator.refluxTime.canonical.value, canonicalTime(perforator.refluxTime))) {
        issues.push(contractIssue("CANONICAL_UNIT_MISMATCH", `sides.${side}.perforators.${perforator.id}.refluxTime`));
      }
      for (const measurement of [perforator.distance, perforator.diameter, perforator.refluxTime]) {
        if (measurement && measurement.side !== perforator.side) {
          issues.push(contractIssue("MEASUREMENT_ANATOMY_MISMATCH", `sides.${side}.perforators.${perforator.id}.${measurement.id}`));
        }
      }
      if (perforator.diameter && perforator.diameter.territory !== perforator.id) {
        issues.push(contractIssue("MEASUREMENT_ANATOMY_MISMATCH", `sides.${side}.perforators.${perforator.id}.diameter`));
      }
      if (perforator.refluxTime && perforator.refluxTime.territory !== perforator.id) {
        issues.push(contractIssue("MEASUREMENT_ANATOMY_MISMATCH", `sides.${side}.perforators.${perforator.id}.refluxTime`));
      }
    }
  }
}

export function validateDopplerVenosoMmiiDormant(value: unknown): DopplerVenosoMmiiValidation {
  const parsed = DopplerVenosoMmiiDormantSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      data: null,
      issues: parsed.error.issues.map((entry) => contractIssue("SCHEMA_INVALID", entry.path.join("."))),
      canGenerateFinalText: false,
    };
  }

  const data = parsed.data;
  const issues: ContractIssue[] = [];
  const allIds: string[] = [];

  for (const side of ["right", "left"] as const) {
    const sideData = data.sides[side];
    const sidePath = `sides.${side}`;
    if (sideData.assessment === "limited" && !sideData.limitation) {
      issues.push(contractIssue("LIMITATION_REASON_REQUIRED", `${sidePath}.limitation`));
    }
    if (sideData.assessment !== "limited" && sideData.limitation) {
      issues.push(contractIssue("LIMITATION_STATE_CONFLICT", `${sidePath}.limitation`));
    }
    if (sideData.assessment === "not_assessed" && sideHasResult(sideData)) {
      issues.push(contractIssue("NOT_ASSESSED_HAS_RESULTS", sidePath));
    }
    if (!isRequestedSide(data.laterality, side) &&
      (sideData.assessment !== "not_assessed" || sideHasResult(sideData))) {
      issues.push(contractIssue("UNREQUESTED_SIDE_HAS_RESULTS", sidePath));
    }
    if (isRequestedSide(data.laterality, side) && sideData.assessment === "not_assessed") {
      issues.push(contractIssue("REQUESTED_SIDE_NOT_ASSESSED", sidePath, "pending"));
    }

    const segmentKeys = sideData.segments.map((segment) => `${segment.side}:${segment.segment}`);
    for (const duplicate of duplicateValues(segmentKeys)) {
      issues.push(contractIssue("DUPLICATE_SEGMENT", `${sidePath}.segments.${duplicate}`));
    }

    for (const segment of sideData.segments) {
      const path = `${sidePath}.segments.${segment.segment}`;
      if (segment.side !== side) issues.push(contractIssue("SIDE_MISMATCH", path));
      if (segment.assessment === "limited" && !segment.limitation) {
        issues.push(contractIssue("LIMITATION_REASON_REQUIRED", `${path}.limitation`));
      }
      if (segment.assessment !== "limited" && segment.limitation) {
        issues.push(contractIssue("LIMITATION_STATE_CONFLICT", `${path}.limitation`));
      }
      if (segment.assessment === "not_assessed" && segmentHasResult(segment)) {
        issues.push(contractIssue("NOT_ASSESSED_HAS_RESULTS", path));
      }
      if (segment.assessment === "normal" && segment.findings.some((finding) => finding.kind !== "caliber_measurement")) {
        issues.push(contractIssue("NORMAL_STATE_CONFLICT", path));
      }
      if (segment.assessment === "abnormal" && segment.findings.length === 0) {
        issues.push(contractIssue("ABNORMAL_STATE_WITHOUT_EVIDENCE", path));
      }
      if (data.protocol === "tvp_only" && SUPERFICIAL.has(segment.segment) &&
        (segment.assessment !== "not_assessed" || segmentHasResult(segment))) {
        issues.push(contractIssue("PROTOCOL_SCOPE_CONFLICT", path));
      }

      for (const finding of segment.findings) {
        allIds.push(finding.id);
        if (finding.side !== side || finding.segment !== segment.segment) {
          issues.push(contractIssue("FINDING_ANATOMY_MISMATCH", `${path}.${finding.id}`));
        }
        if (finding.kind === "reflux_observation") {
          if (!segment.competenceTested) issues.push(contractIssue("REFLUX_WITHOUT_DOCUMENTED_TEST", `${path}.${finding.id}`));
          issues.push(contractIssue("REFLUX_CLASSIFICATION_RULE_PENDING", `${path}.${finding.id}`, "pending"));
        }
        if (finding.kind === "thrombosis_observation") {
          if (finding.compressibility !== "partial" && finding.compressibility !== "absent") {
            issues.push(contractIssue("TVP_INCOMPRESSIBILITY_REQUIRED", `${path}.${finding.id}.compressibility`));
          }
          if (finding.phase !== "not_assessed") {
            issues.push(contractIssue("THROMBOSIS_PHASE_RULE_PENDING", `${path}.${finding.id}.phase`, "pending"));
          }
          if (MUSCULAR.has(finding.segment)) {
            issues.push(contractIssue("MUSCULAR_VEIN_SCOPE_PENDING", `${path}.${finding.id}`, "pending"));
          }
        }
      }
    }

    for (const perforator of sideData.perforators) {
      allIds.push(perforator.id);
      const path = `${sidePath}.perforators.${perforator.id}`;
      if (perforator.side !== side) issues.push(contractIssue("SIDE_MISMATCH", path));
      if (perforator.assessment === "limited" && !perforator.limitation) {
        issues.push(contractIssue("LIMITATION_REASON_REQUIRED", `${path}.limitation`));
      }
      if (perforator.assessment !== "limited" && perforator.limitation) {
        issues.push(contractIssue("LIMITATION_STATE_CONFLICT", `${path}.limitation`));
      }
      if (perforator.assessment === "not_assessed" &&
        (perforator.distance || perforator.diameter || perforator.refluxTime ||
          perforator.superficialDeepConnection !== "not_assessed")) {
        issues.push(contractIssue("NOT_ASSESSED_HAS_RESULTS", path));
      }
      if (data.protocol === "tvp_only" && perforator.assessment !== "not_assessed") {
        issues.push(contractIssue("PROTOCOL_SCOPE_CONFLICT", path));
      }
      if (perforator.assessment === "abnormal") {
        if (!perforator.refluxTime || !perforator.diameter) {
          issues.push(contractIssue("PERFORATOR_REFLUX_AND_DIAMETER_REQUIRED", path));
        }
        issues.push(contractIssue("PERFORATOR_RULE_PENDING", path, "pending"));
      }
    }
  }

  for (const duplicate of duplicateValues(allIds)) {
    issues.push(contractIssue("DUPLICATE_FINDING_ID", duplicate));
  }
  for (const duplicate of duplicateValues(collectMeasurementIds(data))) {
    issues.push(contractIssue("DUPLICATE_SOURCE_ID", duplicate));
  }
  validateMeasurementUnits(data, issues);

  const expected = recomputeDopplerVenosoMmiiDerived({ ...data, derived: emptyDerived() }).derived;
  if (JSON.stringify(data.derived) !== JSON.stringify(expected)) {
    issues.push(contractIssue("STALE_OR_INVALID_DERIVED_VALUES", "derived"));
  }

  return {
    success: issues.every((entry) => entry.severity !== "blocker"),
    data,
    issues,
    canGenerateFinalText: false,
  };
}

/** Remove an observation and rebuild indexes; no old map/text conclusion can survive here. */
export function removeDopplerVenosoMmiiFinding(
  value: DopplerVenosoMmiiDormant,
  findingId: string,
): DopplerVenosoMmiiDormant {
  const parsed = DopplerVenosoMmiiDormantSchema.parse(value);
  let removed = false;
  const sides = { ...parsed.sides };
  for (const side of ["right", "left"] as const) {
    const current = parsed.sides[side];
    const segments = current.segments.map((segment) => {
      const findings = segment.findings.filter((finding) => finding.id !== findingId);
      if (findings.length !== segment.findings.length) removed = true;
      return { ...segment, findings };
    });
    sides[side] = { ...current, segments };
  }
  if (!removed) throw new Error("Unknown venous finding");
  return recomputeDopplerVenosoMmiiDerived({
    ...parsed,
    revision: parsed.revision + 1,
    sides,
    derived: emptyDerived(),
  });
}
