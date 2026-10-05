import {
  DOPPLER_RENAL_DORMANT_VERSION,
  recomputeDopplerRenalDerived,
  type DopplerRenalDormant,
} from "../../packages/shared/src/clinicalModels/dormant/dopplerRenal";
import {
  DOPPLER_VENOSO_MMII_DORMANT_VERSION,
  recomputeDopplerVenosoMmiiDerived,
  type DopplerVenosoMmiiDormant,
} from "../../packages/shared/src/clinicalModels/dormant/dopplerVenosoMmii";

const examId = "f62379ef-9536-4b2b-aea4-5ca8621df107";

function identity(id: string) {
  return {
    id,
    origin: "manual_selection" as const,
    source: { sourceId: `synthetic:${id}`, evidence: "Fixture sintética sem dado de paciente" },
    physicianConfirmed: true,
  };
}

function renalSide(side: "right" | "left", psv: number, ri: number, lengthCm: number) {
  return {
    assessment: "normal" as const,
    artery: {
      patency: "patent" as const,
      psv: [{
        ...identity(`${side}-psv`), side,
        segment: "maximum_unspecified" as const,
        original: { value: psv, unit: "cm/s" as const },
        canonical: { value: psv, unit: "cm/s" as const },
      }],
      aliasingOrTurbulence: "absent" as const,
      accessoryArtery: "not_assessed" as const,
    },
    intrarenal: {
      ri: [{
        ...identity(`${side}-ri-upper`), side,
        territory: "upper_pole" as const,
        original: { value: ri, unit: "ratio" as const },
        canonical: { value: ri, unit: "ratio" as const },
      }],
      spectralPattern: "normal" as const,
      accelerationTime: [],
      accelerationIndex: [],
    },
    kidney: {
      bipolarLength: {
        ...identity(`${side}-length`), side, axis: "bipolar" as const,
        original: { value: lengthCm, unit: "cm" as const },
        canonical: { value: lengthCm, unit: "cm" as const },
      },
      anteroposteriorDiameter: {
        ...identity(`${side}-ap`), side, axis: "anteroposterior" as const,
        original: { value: 4.8, unit: "cm" as const },
        canonical: { value: 4.8, unit: "cm" as const },
      },
      transverseDiameter: {
        ...identity(`${side}-transverse`), side, axis: "transverse" as const,
        original: { value: 51, unit: "mm" as const },
        canonical: { value: 5.1, unit: "cm" as const },
      },
      parenchymalThickness: {
        ...identity(`${side}-parenchyma`), side, axis: "parenchymal_thickness" as const,
        original: { value: 1.6, unit: "cm" as const },
        canonical: { value: 1.6, unit: "cm" as const },
      },
      echogenicity: "not_assessed" as const,
      corticomedullaryDifferentiation: "not_assessed" as const,
    },
  };
}

export function renalFixture(): DopplerRenalDormant {
  const draft: DopplerRenalDormant = {
    contractVersion: DOPPLER_RENAL_DORMANT_VERSION,
    categoryCode: "DOPPLER_RENAL",
    examId,
    revision: 0,
    scope: "native_kidneys",
    laterality: "bilateral",
    quality: { assessment: "normal" },
    aorta: {
      assessment: "normal",
      psv: {
        ...identity("aorta-psv"), level: "renal_artery_origins",
        original: { value: 0.8, unit: "m/s" },
        canonical: { value: 80, unit: "cm/s" },
      },
    },
    sides: {
      right: renalSide("right", 110, 0.63, 10.2),
      left: renalSide("left", 105, 0.61, 9.8),
    },
    derived: { rar: [], meanRi: [], accelerationTimeAdjuncts: [], accelerationIndexAdjuncts: [] },
    clinicalPolicy: {
      stenosisPublication: "numeric_criterion_requires_general_review_only",
      borderlineRange: "body_only_no_stenosis_diagnosis",
      numericBoundaries: "blocked_pending_remaining_boundary_decisions",
      riInterpretation: "blocked_pending_ri_rules",
      accelerationTimeInterpretation: "adjunct_strict_gt_70ms_no_isolated_conclusion",
      rarClinicalEligibility: "requires_traceable_renal_and_aortic_psv",
      renalLengthDifference: "conclusion_candidate_strict_gt_1_8cm",
      transplant: "excluded_redirect_required",
      renalVeins: "excluded_pending_source",
      occlusionDiagnosis: "excluded_pending_source",
      postStent: "excluded_pending_source",
      accelerationIndex: "adjunct_strict_lt_3m_per_s2_no_isolated_conclusion",
      recommendations: "blocked_pending_context_and_confirmation_policy",
    },
  };
  return recomputeDopplerRenalDerived(draft);
}

export function venousFixture(): DopplerVenosoMmiiDormant {
  const rightReflux = {
    id: "right-gsv-reflux",
    kind: "reflux_observation" as const,
    side: "right" as const,
    segment: "great_saphenous_proximal_thigh" as const,
    time: {
      ...identity("right-gsv-reflux-time"),
      side: "right" as const,
      territory: "great_saphenous_proximal_thigh" as const,
      original: { value: 1200, unit: "ms" as const },
      canonical: { value: 1.2, unit: "s" as const },
    },
    maneuver: "distal_compression" as const,
    position: "standing" as const,
    physicianConfirmedObservation: true,
    classification: "unclassified_pending_threshold_and_maneuver_rule" as const,
  };
  const draft: DopplerVenosoMmiiDormant = {
    contractVersion: DOPPLER_VENOSO_MMII_DORMANT_VERSION,
    categoryCode: "DOPPLER_VENOSO_MMII",
    requestedPresentation: "DOPPLER_VENOSO_MMII_MEDIDAS",
    examId,
    revision: 0,
    protocol: "complete",
    laterality: "bilateral",
    sides: {
      right: {
        assessment: "abnormal",
        segments: [
          { side: "right", segment: "common_femoral", assessment: "normal", competenceTested: false, findings: [] },
          { side: "right", segment: "deep_femoral", assessment: "not_assessed", competenceTested: false, findings: [] },
          {
            side: "right", segment: "popliteal", assessment: "limited",
            limitation: { reason: "Edema sintético", territory: "segmento poplíteo" },
            competenceTested: false, findings: [],
          },
          {
            side: "right", segment: "great_saphenous_proximal_thigh", assessment: "abnormal",
            competenceTested: true, findings: [rightReflux],
          },
        ],
        perforators: [{
          id: "right-perforator-unassessed", side: "right", assessment: "not_assessed",
          surface: "medial", level: "mid_calf", superficialDeepConnection: "not_assessed",
          classification: "unclassified_pending_perforator_rule",
        }],
      },
      left: {
        assessment: "normal",
        segments: [
          { side: "left", segment: "common_femoral", assessment: "normal", competenceTested: false, findings: [] },
        ],
        perforators: [],
      },
    },
    derived: {
      refluxFindingIds: [], thrombosisFindingIds: [], caliberFindingIds: [],
      mapProjection: "blocked_until_contract_and_asset_are_approved",
    },
    clinicalPolicy: {
      tvpPositiveMinimum: "incompressibility_anchor_material_is_adjunct",
      tvpNegativeMinimum: "documented_compressibility_by_assessed_segment",
      thrombosisPhase: "no_subacute_category_remaining_phase_rules_pending",
      refluxThresholds: "strictly_greater_than_values_and_maneuvers_pending",
      perforatorCompetence: "requires_reflux_and_diameter_thresholds_pending",
      iliacVeins: "excluded_pending_protocol_decision",
      muscularVeinThrombosis: "blocked_pending_scope_and_source",
      superficialThrombosis: "excluded_pending_source",
      postAblationOrSaphenectomy: "excluded_pending_source",
      ceap: "excluded_pending_clinical_inputs_and_rule",
      recommendations: "separate_physician_confirmation_required",
    },
  };
  return recomputeDopplerVenosoMmiiDerived(draft);
}

export function deepThrombosisFinding() {
  return {
    id: "right-femoral-thrombosis",
    kind: "thrombosis_observation" as const,
    side: "right" as const,
    segment: "femoral" as const,
    compressibility: "absent" as const,
    intraluminalMaterial: "present" as const,
    echogenicity: "hypoechoic" as const,
    occlusion: "occlusive" as const,
    spontaneousFlow: "absent" as const,
    phasicity: "absent" as const,
    distalAugmentation: "absent" as const,
    wall: "thin" as const,
    recanalization: "absent" as const,
    collaterals: "absent" as const,
    phase: "acute" as const,
    physicianConfirmedObservation: true,
    publication: "incompressibility_anchor_approved_phase_rules_pending" as const,
  };
}
