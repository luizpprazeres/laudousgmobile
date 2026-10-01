import {
  canonicalAxialPoint,
  canonicalSagittalPoint,
  MyomaFindingSchema,
  newMyomaFinding,
  type MyomaEcho,
  type MyomaFinding,
  type MyomaLocation,
} from '@laudousg/schemes'
import type { OrganState } from '@/lib/deterministic'

const SLOTS = ['mioma', 'mioma2', 'mioma3'] as const
const EXTRA_KEY = '__myoma.extraFindings'
const LOCATION_TEXT: Record<MyomaLocation, string> = {
  not_informed: '',
  anterior: 'parede anterior', posterior: 'parede posterior', lateral_direita: 'parede lateral direita',
  lateral_esquerda: 'parede lateral esquerda', fundo: 'região fúndica', cervical: 'região cervical',
}

function selected(state: OrganState, slot: string) {
  return ((state[slot] as string[] | undefined) ?? []).includes('sim')
}
function num(value: unknown) {
  const result = Number(String(value ?? '').replace(',', '.').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.'))
  return Number.isFinite(result) ? result : null
}
function maximumMm(value: unknown) {
  const raw = String(value ?? '')
  const values = raw.split(/[x×]/).map(num).filter((item): item is number => item != null)
  if (!values.length) return null
  return Math.max(...values) * (raw.toLowerCase().includes('mm') ? 1 : 10)
}
function locationFromText(value: unknown): MyomaLocation {
  const text = String(value ?? '').toLowerCase()
  if (/posterior/.test(text)) return 'posterior'
  if (/anterior/.test(text)) return 'anterior'
  if (/lateral.*direit|direit.*lateral/.test(text)) return 'lateral_direita'
  if (/lateral.*esquerd|esquerd.*lateral/.test(text)) return 'lateral_esquerda'
  if (/fundo|fúndic/.test(text)) return 'fundo'
  if (/cerv|colo/.test(text)) return 'cervical'
  return 'not_informed'
}
function point(state: OrganState, slot: string, plane: 'sagittal' | 'axial') {
  try {
    const parsed = JSON.parse(String(state[`__myoma.${slot}.${plane}Point`] ?? '')) as { x?: unknown; y?: unknown }
    return typeof parsed.x === 'number' && typeof parsed.y === 'number' ? { x: parsed.x, y: parsed.y } : null
  } catch { return null }
}

export function myomaFindingsFromPelvisState(state: OrganState): MyomaFinding[] {
  const slots = SLOTS.filter((slot) => selected(state, slot)).map((slot) => {
    const rawFigo = String(state[`${slot}.sim.figo`] ?? '').trim()
    const confirmed = /^[0-8]$/.test(rawFigo)
    const rawEcho = String(state[`${slot}.sim.ecotextura`] ?? '')
    const echo: MyomaEcho | null = ['hipoecoica', 'heterogenea', 'calcificada', 'degenerada'].includes(rawEcho) ? rawEcho as MyomaEcho : null
    const location = locationFromText(state[`${slot}.sim.parede`])
    return newMyomaFinding({
      id: slot,
      figo: confirmed ? Number(rawFigo) : 4,
      figoConfirmed: confirmed,
      sizeMaxMm: maximumMm(state[`${slot}.sim.medidas`]),
      location,
      echo,
      sagittalPoint: point(state, slot, 'sagittal'),
      axialPoint: point(state, slot, 'axial'),
    })
  })
  let extras: MyomaFinding[] = []
  try {
    const raw = JSON.parse(String(state[EXTRA_KEY] ?? '[]')) as unknown
    if (Array.isArray(raw)) extras = raw.flatMap((item) => {
      const parsed = MyomaFindingSchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    })
  } catch { /* rascunho inválido não vira achado clínico */ }
  return [...slots, ...extras].slice(0, 20)
}

export function addMyomaToPelvisState(state: OrganState): OrganState {
  const slot = SLOTS.find((candidate) => !selected(state, candidate))
  if (!slot) {
    const current = myomaFindingsFromPelvisState(state)
    if (current.length >= 20) return state
    const extras = current.filter((finding) => !SLOTS.includes(finding.id as typeof SLOTS[number]))
    return { ...state, [EXTRA_KEY]: JSON.stringify([...extras, newMyomaFinding()]) }
  }
  return {
    ...state,
    [slot]: ['sim'],
    [`${slot}.sim.medidas`]: '', [`${slot}.sim.classificacao`]: 'intramural',
    [`${slot}.sim.parede`]: '', [`${slot}.sim.figo`]: '', [`${slot}.sim.ecotextura`]: '',
  }
}
export function removeMyomaFromPelvisState(state: OrganState, id: string): OrganState {
  if (SLOTS.includes(id as typeof SLOTS[number])) return { ...state, [id]: [] }
  const extras = myomaFindingsFromPelvisState(state).filter((finding) => !SLOTS.includes(finding.id as typeof SLOTS[number]) && finding.id !== id)
  return { ...state, [EXTRA_KEY]: JSON.stringify(extras) }
}
export function updateMyomaInPelvisState(state: OrganState, finding: MyomaFinding): OrganState {
  const slot = SLOTS.find((candidate) => candidate === finding.id)
  if (!slot) {
    const extras = myomaFindingsFromPelvisState(state)
      .filter((item) => !SLOTS.includes(item.id as typeof SLOTS[number]))
      .map((item) => item.id === finding.id ? finding : item)
    return { ...state, [EXTRA_KEY]: JSON.stringify(extras) }
  }
  return {
    ...state,
    [slot]: ['sim'],
    [`${slot}.sim.figo`]: finding.figoConfirmed ? String(finding.figo) : '',
    [`${slot}.sim.classificacao`]: finding.figo <= 2 ? 'submucoso' : finding.figo <= 4 ? 'intramural' : finding.figo <= 7 ? 'subseroso' : 'outro',
    [`${slot}.sim.parede`]: LOCATION_TEXT[finding.location],
    [`${slot}.sim.medidas`]: finding.sizeMaxMm == null ? '' : String(finding.sizeMaxMm / 10).replace('.', ','),
    [`${slot}.sim.ecotextura`]: finding.echo ?? '',
    [`__myoma.${slot}.sagittalPoint`]: finding.sagittalPoint ? JSON.stringify(finding.sagittalPoint) : '',
    [`__myoma.${slot}.axialPoint`]: finding.axialPoint ? JSON.stringify(finding.axialPoint) : '',
  }
}
export function resetMyomaPoint(state: OrganState, finding: MyomaFinding): OrganState {
  return updateMyomaInPelvisState(state, { ...finding, sagittalPoint: canonicalSagittalPoint(finding.figo), axialPoint: canonicalAxialPoint(finding.location) })
}
