import { z } from 'zod'
import { MyomaFindingSchema, type MyomaFinding } from '@laudousg/schemes'

type MyomaState = Record<string, unknown>

export const MYOMA_ITEMS_KEY = '__myoma.items'
export const MYOMA_EXTRA_KEY = '__myoma.extraFindings'
export const MAX_MYOMAS = 20

const PointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict()

export const PelveMyomaItemSchema = z.object({
  id: z.string().min(1),
  medidas: z.string().trim(),
  classificacao: z.string().trim(),
  parede: z.string().trim(),
  figo: z.string().trim(),
  ecotextura: z.string().trim(),
  sagittalPoint: PointSchema.nullable().default(null),
  axialPoint: PointSchema.nullable().default(null),
}).strict()

export type PelveMyomaItem = z.infer<typeof PelveMyomaItemSchema>
export type MyomaCollectionError = 'ilegivel' | 'excede_limite'

const SLOTS = ['mioma', 'mioma2', 'mioma3'] as const

const LOCATION_TEXT: Record<MyomaFinding['location'], string> = {
  not_informed: '',
  anterior: 'parede anterior',
  posterior: 'parede posterior',
  lateral_direita: 'parede lateral direita',
  lateral_esquerda: 'parede lateral esquerda',
  fundo: 'região fúndica',
  cervical: 'região cervical',
}

function selected(state: MyomaState, slot: string): boolean {
  return Array.isArray(state[slot]) && (state[slot] as string[]).includes('sim')
}

function text(state: MyomaState, key: string): string {
  return typeof state[key] === 'string' ? String(state[key]).trim() : ''
}

function point(state: MyomaState, slot: string, plane: 'sagittal' | 'axial') {
  try {
    const parsed = JSON.parse(text(state, `__myoma.${slot}.${plane}Point`)) as { x?: unknown; y?: unknown }
    return typeof parsed.x === 'number' && Number.isFinite(parsed.x) && typeof parsed.y === 'number' && Number.isFinite(parsed.y)
      ? { x: parsed.x, y: parsed.y }
      : null
  } catch {
    return null
  }
}

function classificationFromFigo(finding: MyomaFinding): string {
  if (!finding.figoConfirmed) return ''
  if (finding.figo <= 2) return 'submucoso'
  if (finding.figo <= 4) return 'intramural'
  if (finding.figo <= 7) return 'subseroso'
  return 'outro'
}

function itemFromFinding(finding: MyomaFinding): PelveMyomaItem {
  return {
    id: finding.id,
    medidas: finding.sizeMaxMm == null ? '' : String(finding.sizeMaxMm / 10).replace('.', ','),
    classificacao: classificationFromFigo(finding),
    parede: LOCATION_TEXT[finding.location],
    figo: finding.figoConfirmed ? String(finding.figo) : '',
    ecotextura: finding.echo ?? '',
    sagittalPoint: finding.sagittalPoint,
    axialPoint: finding.axialPoint,
  }
}

function legacyItems(state: MyomaState): { items: PelveMyomaItem[]; error: MyomaCollectionError | null } {
  const slots = SLOTS.filter((slot) => selected(state, slot)).map((slot): PelveMyomaItem => ({
    id: slot,
    medidas: text(state, `${slot}.sim.medidas`),
    classificacao: text(state, `${slot}.sim.classificacao`),
    parede: text(state, `${slot}.sim.parede`),
    figo: text(state, `${slot}.sim.figo`),
    ecotextura: text(state, `${slot}.sim.ecotextura`),
    sagittalPoint: point(state, slot, 'sagittal'),
    axialPoint: point(state, slot, 'axial'),
  }))

  const rawExtras = text(state, MYOMA_EXTRA_KEY)
  if (!rawExtras) return {
    items: slots,
    error: slots.length > MAX_MYOMAS ? 'excede_limite' : null,
  }

  try {
    const parsed = JSON.parse(rawExtras) as unknown
    if (!Array.isArray(parsed)) return { items: slots, error: 'ilegivel' }
    const extras: PelveMyomaItem[] = []
    let invalid = false
    for (const raw of parsed) {
      const finding = MyomaFindingSchema.safeParse(raw)
      if (!finding.success) invalid = true
      else extras.push(itemFromFinding(finding.data))
    }
    const items = [...slots, ...extras]
    if (items.length > MAX_MYOMAS) return { items, error: 'excede_limite' }
    return { items, error: invalid ? 'ilegivel' : null }
  } catch {
    return { items: slots, error: 'ilegivel' }
  }
}

export function readMyomaItems(state: MyomaState): { items: PelveMyomaItem[]; error: MyomaCollectionError | null } {
  const rawItems = text(state, MYOMA_ITEMS_KEY)
  if (!rawItems) return legacyItems(state)
  try {
    const raw = JSON.parse(rawItems) as unknown
    if (!Array.isArray(raw)) return { items: [], error: 'ilegivel' }
    const parsed = z.array(PelveMyomaItemSchema).safeParse(raw)
    if (!parsed.success) return { items: [], error: 'ilegivel' }
    if (new Set(parsed.data.map((item) => item.id)).size !== parsed.data.length) return { items: [], error: 'ilegivel' }
    if (parsed.data.length > MAX_MYOMAS) return { items: parsed.data, error: 'excede_limite' }
    return { items: parsed.data, error: null }
  } catch {
    return { items: [], error: 'ilegivel' }
  }
}
