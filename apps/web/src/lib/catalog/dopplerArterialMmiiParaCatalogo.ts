import {
  DOPPLER_ARTERIAL_MMII_REQUIRED,
  DOPPLER_ARTERIAL_MMII_SEGMENTS,
  DOPPLER_ARTERIAL_MMII_SEGMENT_LABELS,
  createInitialDopplerArterialMmiiInput,
  validateDopplerArterialMmii,
  type DopplerArterialMmiiInput,
  type DopplerArterialMmiiSegment,
} from '@laudousg/shared'
import { arterialSectionId, type VascularWebSide } from '../deterministic/organs/dopplerArterialMmii'
import type { ExamState } from '../deterministic/compose'
import type { OrganState } from '../deterministic/types'
import type { Entrada } from './useLaudoCanonico'

export type VascularPending = Entrada['pendencias'][number]
export const vascularText = (state: OrganState, key: string) => typeof state[key] === 'string' ? (state[key] as string).trim() : ''

export function vascularNumeric(state: OrganState, key: string, label: string, pending: VascularPending[]): number | undefined {
  const raw = vascularText(state, key)
  if (!raw) return undefined
  const value = Number(raw.replace(',', '.'))
  if (!/^\d+(?:[.,]\d+)?$/.test(raw) || !Number.isFinite(value) || value <= 0) {
    pending.push({ onde: label, valor: raw, motivo: 'informe um número maior que zero', bloqueia: true })
    return undefined
  }
  return value
}

/** 'model' herda do modelo de partida; o modelo normal nunca inventa medidas. */
function segmentInput(state: OrganState, id: DopplerArterialMmiiSegment['id'], side: VascularWebSide, normal: boolean, pending: VascularPending[]): DopplerArterialMmiiSegment {
  const label = `${DOPPLER_ARTERIAL_MMII_SEGMENT_LABELS[id]} (${side === 'right' ? 'direita' : 'esquerda'})`
  const required = DOPPLER_ARTERIAL_MMII_REQUIRED.includes(id)
  const alteration = vascularText(state, 'alteration') || 'none'
  const rawAssessment = vascularText(state, 'assessment') || 'model'
  const assessment = (rawAssessment === 'model' ? (normal && required ? 'evaluated' : 'not_assessed') : rawAssessment) as DopplerArterialMmiiSegment['assessment']
  const fromModel = (key: string, normalValue: string) => {
    const raw = vascularText(state, key) || 'model'
    if (raw !== 'model') return raw
    return normal && required && assessment !== 'not_assessed' && alteration !== 'no_flow' ? normalValue : 'not_assessed'
  }
  const limitation = vascularText(state, 'limitation')
  const psv = vascularNumeric(state, 'psv_cms', `${label} — VPS`, pending)
  const segment: DopplerArterialMmiiSegment = {
    id, assessment,
    ...(limitation ? { limitation } : {}),
    waveform: fromModel('waveform', 'triphasic') as DopplerArterialMmiiSegment['waveform'],
    plaque: fromModel('plaque', 'absent') as DopplerArterialMmiiSegment['plaque'],
    ...(psv !== undefined ? { psvCms: psv } : {}),
  }
  if (alteration === 'stenosis') {
    const lesion = vascularNumeric(state, 'alteration.stenosis.lesion_psv_cms', `${label} — VPS na lesão`, pending)
    const reference = vascularNumeric(state, 'alteration.stenosis.reference_psv_cms', `${label} — VPS de referência`, pending)
    if (lesion === undefined) pending.push({ onde: label, valor: 'estenose', motivo: 'informe a VPS na lesão', bloqueia: true })
    else segment.stenosis = {
      lesionPsvCms: lesion,
      ...(reference !== undefined ? { referencePsvCms: reference } : {}),
      grade: (vascularText(state, 'alteration.stenosis.grade') || 'not_classified') as NonNullable<DopplerArterialMmiiSegment['stenosis']>['grade'],
      physicianConfirmed: vascularText(state, 'alteration.stenosis.confirmed') === 'yes',
    }
  }
  if (alteration === 'no_flow') {
    const reconstitution = vascularText(state, 'alteration.no_flow.reconstitution')
    segment.noFlow = {
      occlusionConfirmed: vascularText(state, 'alteration.no_flow.occlusion_confirmed') === 'yes',
      collaterals: (vascularText(state, 'alteration.no_flow.collaterals') || 'not_assessed') as NonNullable<DopplerArterialMmiiSegment['noFlow']>['collaterals'],
      ...(reconstitution ? { reconstitution } : {}),
    }
  }
  return segment
}

export function adaptarDopplerArterialMmii(exam: ExamState) {
  const pending: VascularPending[] = []
  const opts = exam.__opts ?? {}
  const normal = vascularText(opts, 'model') === 'normal'
  const initial = createInitialDopplerArterialMmiiInput()
  const abiState = exam.abi ?? {}
  const pressure = (key: string, label: string) => vascularNumeric(abiState, key, `ITB — ${label}`, pending)
  const brachialRight = pressure('brachial_right', 'braquial direita')
  const brachialLeft = pressure('brachial_left', 'braquial esquerda')
  const ankle = (side: VascularWebSide) => {
    const pt = pressure(`${side}_posterior_tibial`, `tibial posterior ${side === 'right' ? 'direita' : 'esquerda'}`)
    const dp = pressure(`${side}_dorsalis_pedis`, `dorsal do pé ${side === 'right' ? 'direita' : 'esquerda'}`)
    return { ...(pt !== undefined ? { posteriorTibialMmHg: pt } : {}), ...(dp !== undefined ? { dorsalisPedisMmHg: dp } : {}) }
  }
  const laterality = (vascularText(opts, 'laterality') || 'bilateral') as DopplerArterialMmiiInput['laterality']
  const sideSegments = (side: VascularWebSide) => {
    const included = laterality === 'bilateral' || laterality === side
    return DOPPLER_ARTERIAL_MMII_SEGMENTS.map(id => segmentInput(exam[arterialSectionId(side, id)] ?? {}, id, side, normal && included, pending))
  }
  const dados: DopplerArterialMmiiInput = {
    ...initial,
    laterality,
    sides: { right: { segments: sideSegments('right') }, left: { segments: sideSegments('left') } },
    abi: {
      ...(brachialRight !== undefined ? { brachialRightMmHg: brachialRight } : {}),
      ...(brachialLeft !== undefined ? { brachialLeftMmHg: brachialLeft } : {}),
      right: ankle('right'), left: ankle('left'),
    },
  }
  const validation = validateDopplerArterialMmii(dados)
  for (const issue of validation.issues) {
    const side = issue.path.startsWith('sides.right') ? 'direita' : issue.path.startsWith('sides.left') ? 'esquerda' : ''
    const segment = DOPPLER_ARTERIAL_MMII_SEGMENTS.find(id => issue.path.includes(`.segments.${id}`))
    const where = segment ? `${DOPPLER_ARTERIAL_MMII_SEGMENT_LABELS[segment]} (${side})` : side ? `Membro inferior ${side === 'direita' ? 'direito' : 'esquerdo'}` : issue.path.startsWith('abi') ? 'Índice tornozelo-braquial' : 'Exame'
    pending.push({ onde: where, valor: issue.code, motivo: issue.message, bloqueia: true })
  }
  return { dados, alteracoes: [] as string[], pendencias: pending }
}
