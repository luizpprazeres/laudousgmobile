import type { OrganState, NoduloTireoide, TireoideState } from '@/lib/deterministic'

export type BreastSchemaFinding = {
  id: string
  side: 'direita' | 'esquerda'
  type: 'solid' | 'solid_lobulated' | 'cyst' | 'calcification'
  hour: number | null
  quadrant: 'QSL' | 'QSM' | 'QIL' | 'QIM' | null
  sizeMaxMm: number | null
  nippleDistanceCm: number | null
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

export function breastFindingsFromState(state: OrganState): BreastSchemaFinding[] {
  const ids = Array.isArray(state.achados_ids) ? state.achados_ids.map(String) : []
  return ids.map((id) => {
    const get = (key: string) => state[`achados.${id}.${key}`]
    const side = get('lado') === 'esquerda' ? 'esquerda' : 'direita'
    const rawType = String(get('tipo') ?? 'nodulo')
    const margin = String(get('margem') ?? '')
    const hour = hourFrom(get('horario'))
    const type: BreastSchemaFinding['type'] = rawType === 'cisto_simples' || rawType === 'multiplos_cistos'
      ? 'cyst'
      : rawType === 'calcificacoes'
        ? 'calcification'
        : margin === 'microlobulada' || margin === 'espiculada'
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
    }
  })
}

export function moveBreastFinding(
  state: OrganState,
  id: string,
  position: { side: BreastSchemaFinding['side']; hour: number; nippleDistanceCm: number },
): OrganState {
  const quadrant = quadrantFor(position.side, position.hour)
  return {
    ...state,
    [`achados.${id}.lado`]: position.side,
    [`achados.${id}.horario`]: `${position.hour} horas`,
    [`achados.${id}.dist_mamilo`]: position.nippleDistanceCm.toFixed(1).replace('.', ','),
    ...(quadrant ? { [`achados.${id}.local`]: QUADRANT_LABEL[quadrant] } : {}),
  }
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
