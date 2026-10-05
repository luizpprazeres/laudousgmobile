import {
  DOPPLER_FISTULA_AV_REQUIRED,
  DOPPLER_FISTULA_AV_SEGMENTS,
  DOPPLER_FISTULA_AV_SEGMENT_LABELS,
  createInitialDopplerFistulaAvInput,
  validateDopplerFistulaAv,
  type DopplerFistulaAvInput,
  type DopplerFistulaAvSegment,
} from '@laudousg/shared'
import type { ExamState } from '../deterministic/compose'
import type { OrganState } from '../deterministic/types'
import { vascularNumeric, vascularText, type VascularPending } from './dopplerArterialMmiiParaCatalogo'

function segmentInput(state: OrganState, id: DopplerFistulaAvSegment['id'], normal: boolean, pending: VascularPending[]): DopplerFistulaAvSegment {
  const label = DOPPLER_FISTULA_AV_SEGMENT_LABELS[id]
  const rawAssessment = vascularText(state, 'assessment') || 'model'
  const assessment = (rawAssessment === 'model'
    ? (normal && DOPPLER_FISTULA_AV_REQUIRED.includes(id) ? 'evaluated' : 'not_assessed')
    : rawAssessment) as DopplerFistulaAvSegment['assessment']
  const alteration = vascularText(state, 'alteration') || 'none'
  const confirmed = (key: string) => vascularText(state, `alteration.${key}.confirmed`) === 'yes'
  const limitation = vascularText(state, 'limitation')
  const psv = vascularNumeric(state, 'psv_cms', `${label} — VPS`, pending)
  const diameter = vascularNumeric(state, 'diameter_mm', `${label} — calibre`, pending)
  const depth = vascularNumeric(state, 'depth_mm', `${label} — profundidade`, pending)
  const segment: DopplerFistulaAvSegment = {
    id, assessment,
    ...(limitation ? { limitation } : {}),
    ...(psv !== undefined ? { psvCms: psv } : {}),
    ...(diameter !== undefined ? { diameterMm: diameter } : {}),
    ...(depth !== undefined ? { depthMm: depth } : {}),
    flowDirection: (vascularText(state, 'flow_direction') || 'not_assessed') as DopplerFistulaAvSegment['flowDirection'],
    noFlow: alteration === 'no_flow',
  }
  if (alteration === 'stenosis') {
    const lesion = vascularNumeric(state, 'alteration.stenosis.lesion_psv_cms', `${label} — VPS na lesão`, pending)
    const reference = vascularNumeric(state, 'alteration.stenosis.reference_psv_cms', `${label} — VPS de referência`, pending)
    const minDiameter = vascularNumeric(state, 'alteration.stenosis.min_diameter_mm', `${label} — diâmetro mínimo`, pending)
    if (lesion === undefined) pending.push({ onde: label, valor: 'estenose', motivo: 'informe a VPS na lesão', bloqueia: true })
    else segment.stenosis = {
      lesionPsvCms: lesion,
      ...(reference !== undefined ? { referencePsvCms: reference } : {}),
      ...(minDiameter !== undefined ? { minDiameterMm: minDiameter } : {}),
      physicianConfirmed: confirmed('stenosis'),
    }
  }
  if (alteration === 'thrombus') {
    const extent = (vascularText(state, 'alteration.thrombus.extent') || 'partial') as 'partial' | 'occlusive'
    segment.thrombus = { extent, physicianConfirmed: confirmed('thrombus') }
    segment.noFlow = extent === 'occlusive'
  }
  if (alteration === 'aneurysm') {
    const max = vascularNumeric(state, 'alteration.aneurysm.max_diameter_mm', `${label} — calibre máximo`, pending)
    if (max === undefined) pending.push({ onde: label, valor: 'dilatação', motivo: 'informe o calibre máximo', bloqueia: true })
    else segment.aneurysm = { maxDiameterMm: max, physicianConfirmed: confirmed('aneurysm') }
  }
  return segment
}

export function adaptarDopplerFistulaAv(exam: ExamState) {
  const pending: VascularPending[] = []
  const opts = exam.__opts ?? {}
  const access = exam.access ?? {}
  const normal = vascularText(opts, 'model') === 'normal'
  const initial = createInitialDopplerFistulaAvInput()
  const accessOther = vascularText(access, 'access_other')
  const volume = vascularNumeric(access, 'flow_volume_ml_min', 'Volume de fluxo', pending)
  const classification = (vascularText(access, 'flow_classification') || 'not_classified') as NonNullable<DopplerFistulaAvInput['flowVolume']>['classification']
  if (volume === undefined && classification !== 'not_classified') pending.push({ onde: 'Volume de fluxo', valor: classification, motivo: 'informe o volume antes de classificá-lo', bloqueia: true })
  const dados: DopplerFistulaAvInput = {
    ...initial,
    side: (vascularText(opts, 'side') || initial.side) as DopplerFistulaAvInput['side'],
    accessType: (vascularText(opts, 'access_type') || initial.accessType) as DopplerFistulaAvInput['accessType'],
    ...(accessOther ? { accessTypeOther: accessOther } : {}),
    segments: DOPPLER_FISTULA_AV_SEGMENTS.map(id => segmentInput(exam[id] ?? {}, id, normal, pending)),
    ...(volume !== undefined ? { flowVolume: {
      valueMlMin: volume,
      site: (vascularText(access, 'flow_site') || 'feeding_artery') as NonNullable<DopplerFistulaAvInput['flowVolume']>['site'],
      classification,
      physicianConfirmed: vascularText(access, 'flow_confirmed') === 'yes',
    } } : {}),
  }
  const validation = validateDopplerFistulaAv(dados)
  for (const issue of validation.issues) {
    const segment = DOPPLER_FISTULA_AV_SEGMENTS.find(id => issue.path.includes(`segments.${id}`))
    const where = segment ? DOPPLER_FISTULA_AV_SEGMENT_LABELS[segment] : issue.path.startsWith('flowVolume') ? 'Volume de fluxo' : issue.path.startsWith('access') ? 'Tipo de acesso' : 'Exame'
    pending.push({ onde: where, valor: issue.code, motivo: issue.message, bloqueia: true })
  }
  return { dados, alteracoes: [] as string[], pendencias: pending }
}
