import type { ExamState, OrganState } from '@/lib/deterministic'

export type CarotidVisualSideId = 'direita' | 'esquerda'
export type CarotidVisualVesselId = 'comum' | 'interna' | 'externa' | 'vertebral'
export type CarotidPlateAnchor = 'comum' | 'bulbo' | 'interna' | 'externa' | 'unmapped'

export type CarotidVisualMeasurement = {
  vessel: CarotidVisualVesselId
  psv: string
  edv: string
  direction: string
}

export type CarotidVisualPlate = {
  id: string
  anchor: CarotidPlateAnchor
  location: string
  composition: string
  surface: string
  thickness: string
  stenosis: string
}

export type CarotidVisualSide = {
  id: CarotidVisualSideId
  assessment: string
  imt: string
  plaqueStatus: string
  classification: string
  measurements: CarotidVisualMeasurement[]
  plates: CarotidVisualPlate[]
}

export type CarotidVisualState = { sides: Record<CarotidVisualSideId, CarotidVisualSide> }

const text = (state: OrganState, key: string) => typeof state[key] === 'string' ? String(state[key]).trim() : ''

function plateAnchor(value: string): CarotidPlateAnchor {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/interna|\baci\b/.test(normalized)) return 'interna'
  if (/externa|\bace\b/.test(normalized)) return 'externa'
  if (/comum|\bacc\b/.test(normalized)) return 'comum'
  if (/bulbo|bifurca/.test(normalized)) return 'bulbo'
  return 'unmapped'
}

function sideFromState(id: CarotidVisualSideId, state: OrganState, conclusion: OrganState): CarotidVisualSide {
  const plateIds = Array.isArray(state.placas_ids) ? state.placas_ids.map(String) : []
  const measurements: CarotidVisualMeasurement[] = [
    { vessel: 'comum', psv: text(state, 'comum_vps'), edv: text(state, 'comum_vdf'), direction: '' },
    { vessel: 'interna', psv: text(state, 'interna_vps'), edv: text(state, 'interna_vdf'), direction: '' },
    { vessel: 'externa', psv: text(state, 'externa_vps'), edv: text(state, 'externa_vdf'), direction: '' },
    { vessel: 'vertebral', psv: text(state, 'vertebral_vps'), edv: '', direction: text(state, 'vertebral_direcao') },
  ]
  return {
    id,
    assessment: text(state, 'avaliacao'),
    imt: text(state, 'emi'),
    plaqueStatus: text(state, 'placas_status'),
    classification: text(conclusion, id === 'direita' ? 'classificacao_direita' : 'classificacao_esquerda'),
    measurements,
    plates: plateIds.map((plateId) => {
      const location = text(state, `placas.${plateId}.localizacao`)
      return {
        id: plateId,
        anchor: plateAnchor(location),
        location,
        composition: text(state, `placas.${plateId}.composicao`),
        surface: text(state, `placas.${plateId}.superficie`),
        thickness: text(state, `placas.${plateId}.espessura`),
        stenosis: text(state, `placas.${plateId}.estenose`),
      }
    }),
  }
}

/**
 * Projeção visual pura. Mantém os valores como digitados e não calcula
 * classificação, estenose ou normalidade a partir das velocidades.
 */
export function carotidVisualFromState(state: ExamState): CarotidVisualState {
  const conclusion = state.conclusao ?? {}
  return {
    sides: {
      direita: sideFromState('direita', state.direita ?? {}, conclusion),
      esquerda: sideFromState('esquerda', state.esquerda ?? {}, conclusion),
    },
  }
}
