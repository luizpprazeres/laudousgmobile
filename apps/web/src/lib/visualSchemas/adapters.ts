import type { OrganState, NoduloTireoide, TireoideState } from '@/lib/deterministic'

export type BreastSchemaFinding = {
  id: string
  side: 'direita' | 'esquerda'
  type: 'solid' | 'solid_lobulated' | 'solid_spiculated' | 'cyst' | 'calcification'
  hour: number | null
  quadrant: 'QSL' | 'QSM' | 'QIL' | 'QIM' | null
  sizeMaxMm: number | null
  nippleDistanceCm: number | null
  retroareolar: boolean
  visualOnly: boolean
  sourceFindingId: string | null
}

export type ThyroidSchemaFinding = {
  id: string
  side: 'direito' | 'esquerdo' | 'istmo'
  third: 'superior' | 'medio' | 'inferior' | null
  type: 'cystic' | 'solid' | 'calcification'
  shape: 'round' | 'oval' | 'lobulated'
  sizeMaxMm: number | null
  hasCalcifications: boolean
}

function numberFrom(value: unknown): number | null {
  const match = String(value ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function hourFrom(value: unknown): number | null {
  const parsed = numberFrom(value)
  if (parsed === null) return null
  const hour = Math.round(parsed)
  return hour >= 1 && hour <= 12 ? hour : null
}

export function quadrantFor(side: BreastSchemaFinding['side'], hour: number): BreastSchemaFinding['quadrant'] {
  if (hour === 12 || hour === 3 || hour === 6 || hour === 9) return null
  if (side === 'direita') {
    if (hour >= 10) return 'QSL'
    if (hour <= 2) return 'QSM'
    if (hour >= 7) return 'QIL'
    return 'QIM'
  }
  if (hour >= 10) return 'QSM'
  if (hour <= 2) return 'QSL'
  if (hour >= 7) return 'QIM'
  return 'QIL'
}

const QUADRANT_LABEL: Record<NonNullable<BreastSchemaFinding['quadrant']>, string> = {
  QSL: 'quadrante superolateral',
  QSM: 'quadrante superomedial',
  QIL: 'quadrante inferolateral',
  QIM: 'quadrante inferomedial',
}

const VISUAL_CYST_IDS = 'schema_visual_cyst_ids'
const VISUAL_CYST_PREFIX = 'schema_visual_cysts.'

function isRetroareolar(value: unknown): boolean {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[\s-]+/g, '')
    .includes('retroareolar')
}

function visualCystKey(id: string, key: string): string {
  return `${VISUAL_CYST_PREFIX}${id}.${key}`
}

function visualCystRawId(id: string): string | null {
  return id.startsWith('visual-cyst:') ? id.slice('visual-cyst:'.length) : null
}

export function breastFindingsFromState(state: OrganState): BreastSchemaFinding[] {
  const ids = Array.isArray(state.achados_ids) ? state.achados_ids.map(String) : []
  const reportFindings: BreastSchemaFinding[] = ids.map((id) => {
    const get = (key: string) => state[`achados.${id}.${key}`]
    const side = get('lado') === 'esquerda' ? 'esquerda' : 'direita'
    const rawType = String(get('tipo') ?? 'nodulo')
    const margin = String(get('margem') ?? '')
    const hour = hourFrom(get('horario'))
    const retroareolar = isRetroareolar(get('local'))
    const type: BreastSchemaFinding['type'] = rawType === 'cisto_simples' || rawType === 'multiplos_cistos'
      ? 'cyst'
      : rawType === 'calcificacoes'
        ? 'calcification'
        : margin === 'espiculada'
          ? 'solid_spiculated'
          : margin === 'microlobulada'
          ? 'solid_lobulated'
          : 'solid'
    const sizeCm = numberFrom(get('medidas'))
    return {
      id,
      side,
      type,
      hour,
      quadrant: hour === null ? null : quadrantFor(side, hour),
      sizeMaxMm: sizeCm === null ? null : sizeCm * 10,
      nippleDistanceCm: numberFrom(get('dist_mamilo')),
      retroareolar,
      visualOnly: false,
      sourceFindingId: null,
    }
  })

  const reportIds = new Set(ids)
  const visualIds = Array.isArray(state[VISUAL_CYST_IDS]) ? state[VISUAL_CYST_IDS].map(String) : []
  const visualFindings = visualIds.flatMap((id): BreastSchemaFinding[] => {
    const get = (key: string) => state[visualCystKey(id, key)]
    const sourceFindingId = String(get('source') ?? '')
    if (!reportIds.has(sourceFindingId) || state[`achados.${sourceFindingId}.tipo`] !== 'multiplos_cistos') return []
    const side = get('lado') === 'esquerda' ? 'esquerda' : 'direita'
    const hour = hourFrom(get('horario'))
    return [{
      id: `visual-cyst:${id}`,
      side,
      type: 'cyst',
      hour,
      quadrant: hour === null ? null : quadrantFor(side, hour),
      sizeMaxMm: null,
      nippleDistanceCm: numberFrom(get('dist_mamilo')),
      retroareolar: isRetroareolar(get('local')),
      visualOnly: true,
      sourceFindingId,
    }]
  })

  return [...reportFindings, ...visualFindings]
}

export function moveBreastFinding(
  state: OrganState,
  id: string,
  position: { side: BreastSchemaFinding['side']; hour: number; nippleDistanceCm: number; retroareolar?: boolean },
): OrganState {
  const quadrant = quadrantFor(position.side, position.hour)
  const rawVisualId = visualCystRawId(id)
  if (rawVisualId) {
    return {
      ...state,
      [visualCystKey(rawVisualId, 'lado')]: position.side,
      [visualCystKey(rawVisualId, 'horario')]: `${position.hour} horas`,
      [visualCystKey(rawVisualId, 'dist_mamilo')]: position.nippleDistanceCm.toFixed(1).replace('.', ','),
      [visualCystKey(rawVisualId, 'local')]: position.retroareolar
        ? 'região retroareolar'
        : quadrant ? QUADRANT_LABEL[quadrant] : `${position.hour} horas`,
    }
  }
  return {
    ...state,
    [`achados.${id}.lado`]: position.side,
    [`achados.${id}.horario`]: `${position.hour} horas`,
    [`achados.${id}.dist_mamilo`]: position.nippleDistanceCm.toFixed(1).replace('.', ','),
    [`achados.${id}.local`]: position.retroareolar
      ? 'região retroareolar'
      : quadrant ? QUADRANT_LABEL[quadrant] : `${position.hour} horas`,
  }
}

export function addVisualBreastCyst(state: OrganState, sourceFindingId: string, id: string): OrganState {
  if (state[`achados.${sourceFindingId}.tipo`] !== 'multiplos_cistos') return state
  const currentIds = Array.isArray(state[VISUAL_CYST_IDS]) ? state[VISUAL_CYST_IDS].map(String) : []
  if (!id || currentIds.includes(id)) return state
  const get = (key: string) => state[`achados.${sourceFindingId}.${key}`]
  return {
    ...state,
    [VISUAL_CYST_IDS]: [...currentIds, id],
    [visualCystKey(id, 'source')]: sourceFindingId,
    [visualCystKey(id, 'lado')]: get('lado') === 'esquerda' ? 'esquerda' : 'direita',
    [visualCystKey(id, 'horario')]: String(get('horario') || '12 horas'),
    [visualCystKey(id, 'dist_mamilo')]: String(get('dist_mamilo') || '1,5'),
    [visualCystKey(id, 'local')]: String(get('local') || ''),
  }
}

export function removeVisualBreastCyst(state: OrganState, id: string): OrganState {
  const rawId = visualCystRawId(id) ?? id
  const currentIds = Array.isArray(state[VISUAL_CYST_IDS]) ? state[VISUAL_CYST_IDS].map(String) : []
  const next: OrganState = { ...state, [VISUAL_CYST_IDS]: currentIds.filter((item) => item !== rawId) }
  for (const key of Object.keys(next)) {
    if (key.startsWith(`${VISUAL_CYST_PREFIX}${rawId}.`)) delete next[key]
  }
  return next
}

function thyroidSide(lobo: NoduloTireoide['lobo']): ThyroidSchemaFinding['side'] {
  if (lobo === 'lobo_esquerdo') return 'esquerdo'
  if (lobo === 'istmo') return 'istmo'
  return 'direito'
}

export function thyroidThird(value: string): ThyroidSchemaFinding['third'] {
  const text = value.toLocaleLowerCase('pt-BR')
  if (text.includes('super')) return 'superior'
  if (text.includes('infer')) return 'inferior'
  if (text.includes('méd') || text.includes('med')) return 'medio'
  return null
}

export function thyroidFindingsFromState(state: TireoideState): ThyroidSchemaFinding[] {
  return state.nodulos.map((nodulo) => {
    const dimensions = [nodulo.c1, nodulo.c2, nodulo.c3]
      .map(numberFrom)
      .filter((value): value is number => value !== null)
    const side = thyroidSide(nodulo.lobo)
    return {
      id: nodulo.id,
      side,
      third: side === 'istmo' ? null : thyroidThird(nodulo.localizacao) ?? 'medio',
      type: nodulo.ecogenicidade?.startsWith('anecoica')
          ? 'cystic'
          : 'solid',
      shape: nodulo.margem === 'lobuladas' || nodulo.margem === 'irregulares'
        ? 'lobulated'
        : nodulo.forma?.includes('oval') ? 'oval' : 'round',
      sizeMaxMm: dimensions.length ? Math.max(...dimensions) * 10 : null,
      hasCalcifications: Boolean(nodulo.calcificacoes && nodulo.calcificacoes !== 'ausentes'),
    }
  })
}

export function moveThyroidFinding(
  state: TireoideState,
  id: string,
  position: { side: ThyroidSchemaFinding['side']; third: ThyroidSchemaFinding['third'] },
): TireoideState {
  const lobo: NoduloTireoide['lobo'] = position.side === 'esquerdo'
    ? 'lobo_esquerdo'
    : position.side === 'istmo' ? 'istmo' : 'lobo_direito'
  const localizacao = position.side === 'istmo'
    ? 'no istmo'
    : `no terço ${position.third === 'medio' ? 'médio' : position.third ?? 'médio'}`
  return {
    ...state,
    nodulos: state.nodulos.map((nodulo) => nodulo.id === id ? { ...nodulo, lobo, localizacao } : nodulo),
  }
}
