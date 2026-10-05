import {
  createInitialDopplerVenosoMmiiInput,
  validateDopplerVenosoMmii,
  type DopplerVenosoMmiiInput,
  type DopplerVenosoMmiiSegment,
} from '@laudousg/shared'
import { VENOUS_WEB_SEGMENTS, venousSectionId, type VenousWebSide } from '../deterministic/organs/dopplerVenosoMmii'
import type { ExamState } from '../deterministic/compose'
import type { OrganState } from '../deterministic/types'
import type { Entrada } from './useLaudoCanonico'

type Pending = Entrada['pendencias'][number]
const text = (state: OrganState, key: string) => typeof state[key] === 'string' ? (state[key] as string).trim() : ''

function numeric(state: OrganState, key: string, label: string, pending: Pending[], zero = false): number | undefined {
  const raw = text(state, key)
  if (!raw) return undefined
  const value = Number(raw.replace(',', '.'))
  if (!/^\d+(?:[.,]\d+)?$/.test(raw) || !Number.isFinite(value) || (zero ? value < 0 : value <= 0)) {
    pending.push({ onde: label, valor: raw, motivo: zero ? 'informe um número maior ou igual a zero' : 'informe um número maior que zero', bloqueia: true })
    return undefined
  }
  return value
}

function reflux(state: OrganState, prefix: string, tested: boolean, label: string, pending: Pending[], timeKey = 'time_s'): DopplerVenosoMmiiSegment['reflux'] {
  if (!tested) return { tested: false, maneuver: 'not_documented', position: 'not_documented' }
  const time = numeric(state, `${prefix}${timeKey}`, `${label} — tempo de refluxo`, pending, true)
  return {
    tested,
    ...(time !== undefined ? { time: { value: time, unit: 's' as const } } : {}),
    maneuver: (text(state, `${prefix}maneuver`) || 'not_documented') as DopplerVenosoMmiiSegment['reflux']['maneuver'],
    position: (text(state, `${prefix}position`) || 'not_documented') as DopplerVenosoMmiiSegment['reflux']['position'],
  }
}

function sideInput(exam: ExamState, side: VenousWebSide, pending: Pending[]): DopplerVenosoMmiiInput['sides']['right'] {
  const segments: DopplerVenosoMmiiSegment[] = VENOUS_WEB_SEGMENTS.map(([id, label]) => {
    const state = exam[venousSectionId(side, id)] ?? {}
    const fullLabel = `${label} (${side === 'right' ? 'direita' : 'esquerda'})`
    const diameter = numeric(state, 'diameter_mm', `${fullLabel} — calibre`, pending)
    const limit = text(state, 'limitation')
    const thrombosis = text(state, 'thrombosis') === 'present'
    const extent = text(state, 'thrombosis.present.extent_to')
    const phaseEvidence = text(state, 'thrombosis.present.phase_evidence')
    return {
      id,
      assessment: (text(state, 'assessment') || 'not_assessed') as DopplerVenosoMmiiSegment['assessment'],
      ...(limit ? { limitation: limit } : {}),
      compressibility: (text(state, 'compressibility') || 'not_assessed') as DopplerVenosoMmiiSegment['compressibility'],
      ...(diameter !== undefined ? { diameter: { value: diameter, unit: 'mm' as const } } : {}),
      reflux: reflux(state, 'reflux.tested.', text(state, 'reflux') === 'tested', fullLabel, pending),
      ...(thrombosis ? { thrombosis: {
        physicianConfirmed: text(state, 'thrombosis.present.confirmed') === 'yes',
        phase: (text(state, 'thrombosis.present.phase') || 'not_assessed') as NonNullable<DopplerVenosoMmiiSegment['thrombosis']>['phase'],
        phaseConfirmed: text(state, 'thrombosis.present.phase_confirmed') === 'yes',
        ...(phaseEvidence ? { phaseEvidence } : {}),
        intraluminalMaterial: (text(state, 'thrombosis.present.material') || 'not_assessed') as NonNullable<DopplerVenosoMmiiSegment['thrombosis']>['intraluminalMaterial'],
        occlusion: (text(state, 'thrombosis.present.occlusion') || 'not_assessed') as NonNullable<DopplerVenosoMmiiSegment['thrombosis']>['occlusion'],
        ...(extent ? { extent: VENOUS_WEB_SEGMENTS.find(([key]) => key === extent)?.[1] ?? extent } : {}),
      } } : {}),
    }
  })
  const state = exam[`${side}_perforators`] ?? {}
  const surfaces: Record<string, string> = { medial: 'face medial', lateral: 'face lateral', posterior: 'face posterior', anterior: 'face anterior' }
  const levels: Record<string, string> = { thigh: 'coxa', knee: 'joelho', proximal_calf: 'perna proximal', mid_calf: 'perna média', distal_calf: 'perna distal' }
  const perforators: DopplerVenosoMmiiInput['sides']['right']['perforators'] = []
  for (let index = 1; index <= 6; index++) {
    if (text(state, `p${index}`) !== 'assessed') continue
    const prefix = `p${index}.assessed.`
    const label = `Perfurante ${index} (${side === 'right' ? 'direita' : 'esquerda'})`
    const surface = surfaces[text(state, `${prefix}surface`)]
    const level = levels[text(state, `${prefix}level`)]
    const distance = numeric(state, `${prefix}distance_cm`, `${label} — distância`, pending, true)
    if (!surface || !level) pending.push({ onde: label, valor: '', motivo: 'informe face e nível da perfurante', bloqueia: true })
    const diameter = numeric(state, `${prefix}diameter_mm`, `${label} — calibre`, pending)
    perforators.push({
      id: `${side}_p${index}`,
      location: [surface, level, distance !== undefined ? `${distance.toLocaleString('pt-BR')} cm do maléolo medial` : ''].filter(Boolean).join(', '),
      ...(diameter !== undefined ? { diameter: { value: diameter, unit: 'mm' as const } } : {}),
      reflux: reflux(state, prefix, true, label, pending, 'reflux_s'),
      outwardFlow: (text(state, `${prefix}connection`) || 'not_assessed') as 'not_assessed' | 'documented' | 'absent',
    })
  }
  return { segments, perforators }
}

/** O formulário só organiza os dados. Validação e redação seguem o contrato compartilhado. */
export function adaptarDopplerVenosoMmii(exam: ExamState, categoryCode: DopplerVenosoMmiiInput['categoryCode']) {
  const pending: Pending[] = []
  const initial = createInitialDopplerVenosoMmiiInput(categoryCode)
  const opts = exam.__opts ?? {}
  const dados: DopplerVenosoMmiiInput = {
    ...initial,
    protocol: (text(opts, 'protocol') || initial.protocol) as DopplerVenosoMmiiInput['protocol'],
    laterality: (text(opts, 'laterality') || 'bilateral') as DopplerVenosoMmiiInput['laterality'],
    physicianReviewed: text(opts, 'physician_reviewed') === 'yes',
    sides: { right: sideInput(exam, 'right', pending), left: sideInput(exam, 'left', pending) },
  }
  for (const side of ['right', 'left'] as const) {
    if (dados.laterality !== 'bilateral' && dados.laterality !== side) {
      const hasData = dados.sides[side].segments.some(segment => segment.assessment !== 'not_assessed' || segment.compressibility !== 'not_assessed' || segment.diameter || segment.thrombosis || segment.reflux.tested) || dados.sides[side].perforators.length > 0
      if (hasData) pending.push({ onde: side === 'right' ? 'Lado direito' : 'Lado esquerdo', valor: 'lado fora do exame', motivo: 'há campos preenchidos nesse lado; volte a bilateral ou limpe os campos antes de continuar', bloqueia: true })
    }
  }
  if (dados.protocol === 'tvp_only') {
    for (const side of ['right', 'left'] as const) {
      const hidden = dados.sides[side].segments.some(segment => {
        const definition = VENOUS_WEB_SEGMENTS.find(([id]) => id === segment.id)
        return definition?.[2].includes('superficial') && segment.id !== 'saphenofemoral_junction' &&
          (segment.assessment !== 'not_assessed' || segment.compressibility !== 'not_assessed' || segment.diameter || segment.thrombosis || segment.reflux.tested)
      })
      if (hidden || dados.sides[side].perforators.length) pending.push({ onde: 'Protocolo', valor: 'campos fora da pesquisa de TVP', motivo: 'há achados superficiais ou perfurantes preenchidos; selecione o protocolo completo para incluí-los', bloqueia: true })
    }
  }
  const validation = validateDopplerVenosoMmii(dados)
  for (const issue of validation.issues) {
    const side = issue.path.startsWith('sides.right') ? 'direita' : issue.path.startsWith('sides.left') ? 'esquerda' : ''
    const segment = VENOUS_WEB_SEGMENTS.find(([key]) => issue.path.includes(`.segments.${key}`))
    const where = segment ? `${segment[1]} (${side})` : side ? `Membro inferior ${side === 'direita' ? 'direito' : 'esquerdo'}` : 'Exame'
    pending.push({ onde: where, valor: issue.code, motivo: issue.message, bloqueia: true })
  }
  return { dados, alteracoes: [] as string[], pendencias: pending }
}
