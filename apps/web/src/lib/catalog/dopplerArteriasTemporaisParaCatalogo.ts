import {
  DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES,
  DOPPLER_ARTERIAS_TEMPORAIS_BRANCH_LABELS,
  createInitialDopplerArteriasTemporaisInput,
  validateDopplerArteriasTemporais,
  type DopplerArteriasTemporaisBranch,
  type DopplerArteriasTemporaisInput,
} from '@laudousg/shared'
import { temporalSectionId } from '../deterministic/organs/dopplerArteriasTemporais'
import type { VascularWebSide } from '../deterministic/organs/dopplerArterialMmii'
import type { ExamState } from '../deterministic/compose'
import type { OrganState } from '../deterministic/types'
import { vascularNumeric, vascularText, type VascularPending } from './dopplerArterialMmiiParaCatalogo'

const sideName = (side: VascularWebSide) => side === 'right' ? 'direita' : 'esquerda'

/** 'model' herda do modelo de partida; o normal não testa compressão nem inventa medidas. */
function branchInput(state: OrganState, id: DopplerArteriasTemporaisBranch['id'], side: VascularWebSide, normal: boolean, pending: VascularPending[]): DopplerArteriasTemporaisBranch {
  const label = `${DOPPLER_ARTERIAS_TEMPORAIS_BRANCH_LABELS[id]} (${sideName(side)})`
  const rawAssessment = vascularText(state, 'assessment') || 'model'
  const assessment = (rawAssessment === 'model' ? (normal ? 'evaluated' : 'not_assessed') : rawAssessment) as DopplerArteriasTemporaisBranch['assessment']
  const fromModel = (key: string, normalValue: string) => {
    const raw = vascularText(state, key) || 'model'
    if (raw !== 'model') return raw
    return normal && assessment !== 'not_assessed' ? normalValue : 'not_assessed'
  }
  const limitation = vascularText(state, 'limitation')
  const wall = vascularNumeric(state, 'wall_mm', `${label} — espessura parietal`, pending)
  const psv = vascularNumeric(state, 'psv_cms', `${label} — VPS`, pending)
  return {
    id, assessment,
    ...(limitation ? { limitation } : {}),
    flow: fromModel('flow', 'detected') as DopplerArteriasTemporaisBranch['flow'],
    halo: fromModel('halo', 'absent') as DopplerArteriasTemporaisBranch['halo'],
    compression: (vascularText(state, 'compression') || 'not_tested') as DopplerArteriasTemporaisBranch['compression'],
    ...(wall !== undefined ? { wallThicknessMm: wall } : {}),
    ...(psv !== undefined ? { psvCms: psv } : {}),
  }
}

export function adaptarDopplerArteriasTemporais(exam: ExamState) {
  const pending: VascularPending[] = []
  const opts = exam.__opts ?? {}
  const context = exam.context ?? {}
  const normal = vascularText(opts, 'model') === 'normal'
  const initial = createInitialDopplerArteriasTemporaisInput()
  const laterality = (vascularText(opts, 'laterality') || 'bilateral') as DopplerArteriasTemporaisInput['laterality']
  const branches = (side: VascularWebSide) => {
    const included = laterality === 'bilateral' || laterality === side
    return DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES.map(id => branchInput(exam[temporalSectionId(side, id)] ?? {}, id, side, normal && included, pending))
  }
  const days = vascularNumeric(context, 'corticosteroid_days', 'Tempo de uso de corticoide', pending)
  if (days !== undefined && !Number.isInteger(days)) pending.push({ onde: 'Tempo de uso de corticoide', valor: String(days), motivo: 'informe um número inteiro de dias', bloqueia: true })
  const dados: DopplerArteriasTemporaisInput = {
    ...initial,
    laterality,
    sides: { right: { branches: branches('right') }, left: { branches: branches('left') } },
    corticosteroid: {
      status: (vascularText(context, 'corticosteroid') || 'not_informed') as DopplerArteriasTemporaisInput['corticosteroid']['status'],
      ...(days !== undefined && Number.isInteger(days) ? { durationDays: days } : {}),
    },
    arteritisHypothesis: {
      include: vascularText(context, 'hypothesis') === 'include',
      physicianConfirmed: vascularText(context, 'hypothesis_confirmed') === 'yes',
    },
  }
  const validation = validateDopplerArteriasTemporais(dados)
  for (const issue of validation.issues) {
    const side = issue.path.startsWith('sides.right') ? 'right' : issue.path.startsWith('sides.left') ? 'left' : null
    const branch = DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES.find(id => issue.path.includes(`.branches.${id}`))
    const where = side && branch
      ? `${DOPPLER_ARTERIAS_TEMPORAIS_BRANCH_LABELS[branch]} (${sideName(side)})`
      : side ? `Artéria temporal ${sideName(side)}` : issue.path.startsWith('arteritis') ? 'Hipótese de arterite' : issue.path.startsWith('corticosteroid') ? 'Uso de corticoide' : 'Exame'
    pending.push({ onde: where, valor: issue.code, motivo: issue.message, bloqueia: true })
  }
  return { dados, alteracoes: [] as string[], pendencias: pending }
}
