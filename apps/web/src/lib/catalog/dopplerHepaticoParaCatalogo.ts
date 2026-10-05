import {
  createInitialClinicalModelInput,
  validateClinicalModelInput,
  type DopplerHepaticoInput,
} from '@laudousg/shared'

type Section = Record<string, unknown>
type ExamState = Record<string, unknown>
type Pending = { onde: string; valor: string; motivo: string; bloqueia?: boolean }
type OptionalVessel = DopplerHepaticoInput['hepaticVeins']
type EvaluatedVessel = Extract<OptionalVessel, { evaluated: true }>

const section = (exam: ExamState, key: string): Section => {
  const value = exam[key]
  return value && typeof value === 'object' ? value as Section : {}
}

const text = (state: Section, key: string): string =>
  typeof state[key] === 'string' ? (state[key] as string).trim() : ''

function numeric(
  state: Section,
  key: string,
  label: string,
  pending: Pending[],
  allowZero = false,
): number | undefined {
  const raw = text(state, key)
  if (!raw) return undefined
  if (!/^\d+(?:[.,]\d+)?$/.test(raw)) {
    pending.push({ onde: label, valor: raw, motivo: 'use apenas um valor numérico', bloqueia: true })
    return undefined
  }
  const value = Number(raw.replace(',', '.'))
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    pending.push({ onde: label, valor: raw, motivo: allowZero ? 'o valor não pode ser negativo' : 'o valor precisa ser maior que zero', bloqueia: true })
    return undefined
  }
  return value
}

function hasFilledVesselField(state: Section): boolean {
  return ['patency', 'caliber_cm', 'velocity_cms', 'flow', 'spectral_pattern', 'psv_cms', 'edv_cms', 'resistance_index']
    .some((key) => {
      const value = text(state, key)
      return value !== '' && value !== 'not_assessed'
    })
}

function commonVesselFields(state: Section, label: string, pending: Pending[]): EvaluatedVessel {
  const patency = text(state, 'patency')
  const flow = text(state, 'flow')
  const spectralPattern = text(state, 'spectral_pattern')
  const caliberCm = numeric(state, 'caliber_cm', `${label} — calibre`, pending)
  const velocityCms = numeric(state, 'velocity_cms', `${label} — velocidade`, pending, true)
  return {
    evaluated: true,
    ...(patency && patency !== 'not_assessed' ? { patency: patency as EvaluatedVessel['patency'] } : {}),
    ...(caliberCm !== undefined ? { caliberCm } : {}),
    ...(velocityCms !== undefined ? { velocityCms } : {}),
    ...(flow && flow !== 'not_assessed' ? { flow: flow as EvaluatedVessel['flow'] } : {}),
    ...(spectralPattern && spectralPattern !== 'not_assessed'
      ? { spectralPattern: spectralPattern as EvaluatedVessel['spectralPattern'] }
      : {}),
  }
}

function optionalVessel(exam: ExamState, id: string, label: string, pending: Pending[]): OptionalVessel {
  const state = section(exam, id)
  const assessment = text(state, 'assessment') || 'not_assessed'
  if (assessment !== 'evaluated') {
    if (hasFilledVesselField(state)) {
      pending.push({ onde: label, valor: 'campos preenchidos sem avaliação', motivo: 'marque o vaso como avaliado ou limpe os campos antes de continuar', bloqueia: true })
    }
    return { evaluated: false }
  }
  return commonVesselFields(state, label, pending)
}

/** Projeta o formulário Web no contrato canônico; nenhum texto clínico é composto no navegador. */
export function adaptarDopplerHepatico(exam: ExamState) {
  const pending: Pending[] = []
  const initial = createInitialClinicalModelInput('DOPPLER_HEPATICO') as DopplerHepaticoInput
  const portalState = section(exam, 'portal_vein')
  const portalAssessment = text(portalState, 'assessment') || 'not_assessed'
  if (portalAssessment !== 'evaluated') {
    pending.push({ onde: 'Veia porta', valor: 'não avaliada', motivo: 'a veia porta é obrigatória neste exame', bloqueia: true })
  }

  const portalCommon = commonVesselFields(portalState, 'Veia porta', pending)
  const portalVein: DopplerHepaticoInput['portalVein'] = {
    ...(portalCommon.patency ? { patency: portalCommon.patency } : {}),
    ...(portalCommon.caliberCm !== undefined ? { caliberCm: portalCommon.caliberCm } : {}),
    ...(portalCommon.velocityCms !== undefined ? { velocityCms: portalCommon.velocityCms } : {}),
    ...(portalCommon.flow ? { flow: portalCommon.flow } : {}),
  }

  const arteryState = section(exam, 'common_hepatic_artery')
  let commonHepaticArtery = optionalVessel(exam, 'common_hepatic_artery', 'Artéria hepática comum', pending)
  if (commonHepaticArtery.evaluated) {
    const psv = numeric(arteryState, 'psv_cms', 'Artéria hepática comum — VPS', pending)
    const edv = numeric(arteryState, 'edv_cms', 'Artéria hepática comum — VDF', pending, true)
    const resistanceIndex = numeric(arteryState, 'resistance_index', 'Artéria hepática comum — índice de resistência', pending, true)
    if (resistanceIndex !== undefined && resistanceIndex > 1) {
      pending.push({ onde: 'Artéria hepática comum — índice de resistência', valor: String(resistanceIndex), motivo: 'o índice deve estar entre 0 e 1', bloqueia: true })
    }
    commonHepaticArtery = {
      ...commonHepaticArtery,
      ...(psv !== undefined ? { peakSystolicVelocityCms: psv } : {}),
      ...(edv !== undefined ? { endDiastolicVelocityCms: edv } : {}),
      ...(resistanceIndex !== undefined && resistanceIndex <= 1 ? { resistanceIndex } : {}),
    }
    delete commonHepaticArtery.velocityCms
  }

  const findingState = section(exam, 'portal_finding')
  const status = text(findingState, 'status') || 'not_assessed'
  const kind = text(findingState, 'kind')
  const evidence = text(findingState, 'evidence')
  const portalPathology: DopplerHepaticoInput['portalPathology'] = {
    status: status as DopplerHepaticoInput['portalPathology']['status'],
    physicianConfirmed: status === 'suspected' || status === 'confirmed'
      ? text(findingState, 'physician_confirmed') === 'yes'
      : false,
    ...(status === 'suspected' || status === 'confirmed'
      ? {
          ...(kind && kind !== 'not_assessed' ? { kind: kind as NonNullable<DopplerHepaticoInput['portalPathology']['kind']> } : {}),
          ...(evidence ? { evidence } : {}),
        }
      : {}),
  }

  const dados: DopplerHepaticoInput = {
    ...initial,
    // A prévia organiza o laudo; a revisão médica confiável é uma ação
    // autenticada posterior e não um seletor local do formulário.
    physicianReviewed: false,
    normalHemodynamicsConfirmed: text(findingState, 'normal_hemodynamics_confirmed') === 'yes',
    portalVein,
    hepaticVeins: optionalVessel(exam, 'hepatic_veins', 'Veias hepáticas', pending),
    splenicVein: optionalVessel(exam, 'splenic_vein', 'Veia esplênica', pending),
    superiorMesentericVein: optionalVessel(exam, 'superior_mesenteric_vein', 'Veia mesentérica superior', pending),
    commonHepaticArtery,
    portalPathology,
  }

  const validation = validateClinicalModelInput(dados, { requirePhysicianReview: false })
  if (!validation.success) {
    for (const issue of validation.issues) {
      pending.push({ onde: issue.path || 'Exame', valor: issue.code, motivo: issue.message, bloqueia: true })
    }
  }
  return { dados, alteracoes: [] as string[], pendencias: pending }
}
