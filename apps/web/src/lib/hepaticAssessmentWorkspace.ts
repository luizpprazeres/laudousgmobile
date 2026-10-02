import {
  HepaticAssessmentSchema,
  confirmHepaticIntegratedInterpretation,
  confirmHepaticModuleInterpretation,
  deriveHepaticIqrRatio,
  evaluateHepaticConclusion,
  removeHepaticMeasurement,
  replaceHepaticModule,
  type HepaticAssessment,
  type HepaticInterpretationConfirmation,
  type HepaticMeasurement,
  type HepaticModule,
  type HepaticModuleKey,
} from '@laudousg/shared'

export type HepaticMethod = NonNullable<HepaticModule['method']>
export type HepaticUnit = HepaticMeasurement['unit']

export type HepaticQualityConfiguration = {
  reference: HepaticInterpretationConfirmation['reference']
  minimumAcquisitions: number
  metrics: Array<{ code: string; label: string; unit: string }>
}

export type HepaticTechniqueDraft = {
  manufacturer: string
  model: string
  probe: string
  count: string
  lobe: 'right' | 'left'
  depthCm: string
  roi: string
  position: string
}

export type HepaticCorrelationDraft = {
  modeB: string
  doppler: string
  concordance: 'concordant' | 'discordant' | 'not_assessed'
  physicianResolution: string
}

export const HEPATIC_METHODS: Record<HepaticModuleKey, HepaticMethod[]> = {
  stiffness: ['2D-SWE', 'pSWE/ARFI', 'TE'],
  fat: ['CAP', 'ATI', 'UGAP', 'UDFF', 'USFF'],
}

export const HEPATIC_UNITS: Record<HepaticMethod, HepaticUnit[]> = {
  '2D-SWE': ['kPa', 'm/s'],
  'pSWE/ARFI': ['kPa', 'm/s'],
  TE: ['kPa'],
  CAP: ['dB/m'],
  ATI: ['dB/cm/MHz'],
  UGAP: ['dB/cm/MHz'],
  UDFF: ['%'],
  USFF: ['%'],
}

function draftNumber(raw: string) {
  if (!raw.trim()) return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

/** Contract objects are atomic: incomplete typing remains outside the clinical payload. */
export function buildHepaticTechniquePatch(
  draft: HepaticTechniqueDraft,
  protocol: HepaticInterpretationConfirmation['reference'],
): Pick<HepaticModule, 'equipment' | 'acquisition' | 'quality'> | null {
  const count = draftNumber(draft.count)
  const depthCm = draftNumber(draft.depthCm)
  if (!draft.manufacturer.trim() || !draft.model.trim() || count === null || !Number.isInteger(count) || count <= 0 ||
    depthCm === null || depthCm <= 0 || !draft.roi.trim() || !draft.position.trim()) return null
  return {
    equipment: { manufacturer: draft.manufacturer.trim(), model: draft.model.trim(), probe: draft.probe.trim() || undefined },
    acquisition: { count, lobe: draft.lobe, depthCm, roi: draft.roi.trim(), position: draft.position.trim(), protocol },
    quality: undefined,
  }
}

export function buildHepaticCorrelation(draft: HepaticCorrelationDraft): HepaticAssessment['correlation'] | null {
  if (!draft.modeB.trim() || !draft.doppler.trim() || draft.concordance === 'not_assessed' ||
    (draft.concordance === 'discordant' && !draft.physicianResolution.trim())) return null
  return {
    modeB: draft.modeB.trim(), doppler: draft.doppler.trim(), concordance: draft.concordance,
    physicianResolution: draft.concordance === 'discordant' ? draft.physicianResolution.trim() : undefined,
  }
}

const withoutReview = (module: HepaticModule): HepaticModule => {
  const { interpretation: _interpretation, ...rest } = module
  return rest
}

/** Edits to exam-wide context invalidate every review without changing measurements. */
export function replaceHepaticAssessmentContext(
  value: HepaticAssessment,
  patch: Partial<Pick<HepaticAssessment, 'purpose' | 'indication' | 'correlation'>>,
): HepaticAssessment {
  const current = HepaticAssessmentSchema.parse(value)
  const { integratedInterpretation: _integrated, ...assessment } = current
  return HepaticAssessmentSchema.parse({
    ...assessment,
    ...patch,
    revision: current.revision + 1,
    modules: {
      fat: withoutReview(current.modules.fat),
      stiffness: withoutReview(current.modules.stiffness),
    },
  })
}

export function editHepaticModule(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  patch: Partial<HepaticModule>,
): HepaticAssessment {
  return replaceHepaticModule(value, key, { ...value.modules[key], ...patch })
}

export function changeHepaticModuleStatus(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  status: HepaticModule['status'],
): HepaticAssessment {
  if (status === 'not_performed' || status === 'not_feasible') {
    return replaceHepaticModule(value, key, {
      status,
      reason: status === 'not_feasible' ? value.modules[key].reason : undefined,
      measurements: [],
      derived: [],
    })
  }
  return editHepaticModule(value, key, { status })
}

export function changeHepaticMethod(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  method: HepaticMethod,
): HepaticAssessment {
  return replaceHepaticModule(value, key, {
    ...value.modules[key],
    method,
    measurements: [],
    quality: undefined,
  })
}

/** A unit change is a new native acquisition, never a numerical conversion. */
export function changeHepaticUnit(
  value: HepaticAssessment,
  key: HepaticModuleKey,
): HepaticAssessment {
  return replaceHepaticModule(value, key, {
    ...value.modules[key],
    measurements: [],
    quality: undefined,
  })
}

export function upsertHepaticMeasurement(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  measurement: HepaticMeasurement,
): HepaticAssessment {
  const module = value.modules[key]
  const measurements = module.measurements.filter((item) => item.role !== measurement.role)
  measurements.push(measurement)
  return replaceHepaticModule(value, key, { ...module, measurements })
}

export function clearHepaticMeasurement(value: HepaticAssessment, key: HepaticModuleKey, role: HepaticMeasurement['role']) {
  const source = value.modules[key].measurements.find((item) => item.role === role)
  return source ? removeHepaticMeasurement(value, key, source.id) : value
}

export function calculateHepaticIqrRatio(value: HepaticAssessment, key: HepaticModuleKey) {
  return deriveHepaticIqrRatio(value, key)
}

export function reviewHepaticModule(
  value: HepaticAssessment,
  key: HepaticModuleKey,
  input: HepaticInterpretationConfirmation,
) {
  return confirmHepaticModuleInterpretation(value, key, input)
}

export function reviewHepaticAssessment(value: HepaticAssessment, input: HepaticInterpretationConfirmation) {
  return confirmHepaticIntegratedInterpretation(value, input)
}

export function hepaticWorkspaceReadiness(value: HepaticAssessment) {
  return evaluateHepaticConclusion(value)
}
