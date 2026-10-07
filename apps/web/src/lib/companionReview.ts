import type {
  CompanionBiometricData,
  CompanionBreastFinding,
  CompanionCarotidMeasurement,
  CompanionCarotidPlaque,
  CompanionStructuredPayload,
  CompanionThyroidMeasurements,
  CompanionThyroidNodule,
} from './companionStructured'
import { normalizeCompanionMeasurement, parseCompanionGestationalAge } from './companionStructured'

export type CompanionReviewItem = {
  key: string
  label: string
  value: string
}

const categories = new Set<CompanionStructuredPayload['category']>([
  'OBSTETRICA',
  'DOPPLER_OBSTETRICO',
  'MORFOLOGICO',
  'TIREOIDE',
  'MAMARIA',
  'DOPPLER_CAROTIDAS',
])

const scalarLabels: Record<string, string> = {
  dbp: 'DBP', cc: 'CC', ca: 'CA', cf: 'CF', weight: 'Peso fetal estimado',
  weightVariation: 'Variação do peso', percentile: 'Percentil',
  gestAge: 'Idade gestacional', gestAgeLMP: 'IG pela DUM', gestAgeBiometry: 'IG pela biometria',
  irRightUterine: 'IR uterina direita', ipRightUterine: 'IP uterina direita',
  irLeftUterine: 'IR uterina esquerda', ipLeftUterine: 'IP uterina esquerda',
  irUmbilical: 'IR umbilical', ipUmbilical: 'IP umbilical',
  irMCA: 'IR cerebral média', ipMCA: 'IP cerebral média',
  irDuctusVenosus: 'IR ducto venoso', ipDuctusVenosus: 'IP ducto venoso',
  tibia: 'Tíbia', fibula: 'Fíbula', humerus: 'Úmero', radius: 'Rádio', ulna: 'Ulna',
  cerebellum: 'Cerebelo', cisternaMagna: 'Cisterna magna', binocularDistance: 'Distância binocular',
  ila: 'ILA', gender: 'Sexo fetal',
}

const scalarKeys = Object.keys(scalarLabels)
const biometryKeys = ['dbp', 'cc', 'ca', 'cf', 'weight'] as const
const gestationalAgeKeys = ['gestAge', 'gestAgeBiometry'] as const
const dopplerKeys = [
  'irRightUterine', 'ipRightUterine', 'irLeftUterine', 'ipLeftUterine',
  'irUmbilical', 'ipUmbilical', 'irMCA', 'ipMCA', 'irDuctusVenosus', 'ipDuctusVenosus',
] as const
const morphologicKeys = [
  'tibia', 'fibula', 'humerus', 'radius', 'ulna', 'cerebellum', 'cisternaMagna',
  'binocularDistance', 'ila', 'gender',
] as const

function scalarKeysFor(category: CompanionStructuredPayload['category']) {
  if (category === 'OBSTETRICA') return [...biometryKeys, ...gestationalAgeKeys, 'percentile']
  if (category === 'MORFOLOGICO') return [...biometryKeys, ...gestationalAgeKeys, 'percentile', ...morphologicKeys, ...dopplerKeys]
  if (category === 'DOPPLER_OBSTETRICO') return [...biometryKeys, 'gestAge', 'gestAgeLMP', 'gestAgeBiometry', 'ila', ...dopplerKeys]
  return []
}

const millimeterKeys = new Set([
  'dbp', 'cc', 'ca', 'cf', 'tibia', 'fibula', 'humerus', 'radius', 'ulna',
  'cerebellum', 'cisternaMagna', 'binocularDistance',
])
const gestationalKeys = new Set(['gestAge', 'gestAgeLMP', 'gestAgeBiometry'])
const indexKeys = new Set([...dopplerKeys, 'percentile'])

function normalizedScalars(
  rawData: Record<string, unknown>,
  category: CompanionStructuredPayload['category'],
): CompanionBiometricData {
  const raw = strings(rawData, scalarKeysFor(category))
  const data: CompanionBiometricData = {}
  const target = data as Record<string, string>
  for (const [key, value] of Object.entries(raw)) {
    if (millimeterKeys.has(key)) target[key] = normalizeCompanionMeasurement(value, 'mm')
    else if (key === 'weight') target[key] = normalizeCompanionMeasurement(value, 'g')
    else if (key === 'ila') target[key] = normalizeCompanionMeasurement(value, 'cm')
    else if (indexKeys.has(key)) target[key] = normalizeCompanionMeasurement(value, 'index')
    else if (gestationalKeys.has(key)) {
      const parsed = parseCompanionGestationalAge(value)
      target[key] = parsed ? `${parsed.weeks}s${parsed.days}d` : ''
    } else if (key === 'gender') {
      if (/masculin/i.test(value)) target[key] = 'masculino'
      else if (/feminin/i.test(value)) target[key] = 'feminino'
    }
    if (!target[key]) delete target[key]
  }
  if ((category === 'OBSTETRICA' || category === 'MORFOLOGICO') && target.gestAgeBiometry) {
    delete target.gestAge
  }
  if (category === 'DOPPLER_OBSTETRICO') {
    if (target.gestAge) {
      delete target.gestAgeLMP
      delete target.gestAgeBiometry
    } else if (target.gestAgeLMP) delete target.gestAgeBiometry
  }
  return data
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function strings(source: Record<string, unknown>, keys: readonly string[]) {
  const result: Record<string, string> = {}
  for (const key of keys) {
    const value = string(source[key])
    if (value) result[key] = value
  }
  return result
}

function thyroidMeasurements(value: unknown): CompanionThyroidMeasurements | undefined {
  const source = record(value)
  if (!source) return undefined
  const clean = strings(source, ['a', 'b', 'c'])
  return Object.keys(clean).length ? clean : undefined
}

function thyroidNodules(value: unknown): CompanionThyroidNodule[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((candidate) => {
    const source = record(candidate)
    const lobe = string(source?.lobe)
    if (!source || !lobe || !['lobo_direito', 'lobo_esquerdo', 'istmo'].includes(lobe)) return []
    const clean = strings(source, ['c1', 'c2', 'c3', 'location', 'echogenicity', 'margin', 'halo', 'shape', 'calcifications', 'vascularization'])
    if (!clean.c1 && !clean.c2 && !clean.c3) return []
    return [{ lobe: lobe as CompanionThyroidNodule['lobe'], ...clean } as CompanionThyroidNodule]
  })
}

function breastFindings(value: unknown): CompanionBreastFinding[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((candidate) => {
    const source = record(candidate)
    const side = string(source?.side)
    const type = string(source?.type)
    if (!source || !side || !type || !['direita', 'esquerda'].includes(side) || !['cisto_simples', 'multiplos_cistos', 'nodulo', 'calcificacoes'].includes(type)) return []
    const clean = strings(source, ['c1', 'c2', 'c3', 'location', 'hour', 'distanceSkin', 'distanceNipple', 'echogenicity', 'shape', 'margin', 'orientation', 'posterior', 'calcifications'])
    if (type !== 'calcificacoes' && !clean.c1 && !clean.c2 && !clean.c3) return []
    return [{ side, type, ...clean } as CompanionBreastFinding]
  })
}

function carotidMeasurements(value: unknown): CompanionCarotidMeasurement[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((candidate) => {
    const source = record(candidate)
    const side = string(source?.side)
    const vessel = string(source?.vessel)
    if (!source || !side || !vessel || !['direita', 'esquerda'].includes(side) || !['comum', 'interna', 'externa', 'vertebral'].includes(vessel)) return []
    const clean = strings(source, ['psv', 'vdf', 'ir', 'emi'])
    const flowDirection = string(source.flowDirection)
    const validFlowDirection = ['anterogrado', 'retrogrado', 'ausente'].includes(flowDirection ?? '') ? flowDirection : undefined
    if (!Object.keys(clean).length && !validFlowDirection) return []
    return [{
      side,
      vessel,
      ...clean,
      ...(validFlowDirection ? { flowDirection: validFlowDirection } : {}),
    } as CompanionCarotidMeasurement]
  })
}

function carotidPlaques(value: unknown): CompanionCarotidPlaque[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((candidate) => {
    const source = record(candidate)
    const side = string(source?.side)
    if (!source || !side || !['direita', 'esquerda'].includes(side)) return []
    const clean = strings(source, ['location', 'thickness', 'stenosisPercent'])
    if (!Object.keys(clean).length) return []
    return [{ side, ...clean } as CompanionCarotidPlaque]
  })
}

/**
 * A coluna `payload` vem de JSONB. Este limite impede que casts TypeScript
 * transformem uma entrada externa malformada em alteração do formulário.
 */
export function parseCompanionStructuredPayload(value: unknown): CompanionStructuredPayload | null {
  const source = record(value)
  const category = string(source?.category) as CompanionStructuredPayload['category'] | undefined
  const rawData = record(source?.data)
  if (!source || !category || !categories.has(category) || !rawData) return null

  const data = normalizedScalars(rawData, category)
  if (category === 'TIREOIDE') {
    const right = thyroidMeasurements(rawData.thyroidRightLobe)
    const left = thyroidMeasurements(rawData.thyroidLeftLobe)
    const isthmus = thyroidMeasurements(rawData.thyroidIsthmus)
    const nodules = thyroidNodules(rawData.thyroidNodules)
    if (right) data.thyroidRightLobe = right
    if (left) data.thyroidLeftLobe = left
    if (isthmus) data.thyroidIsthmus = isthmus
    if (nodules.length) data.thyroidNodules = nodules
  } else if (category === 'MAMARIA') {
    const breasts = breastFindings(rawData.breastFindings)
    if (breasts.length) data.breastFindings = breasts
  } else if (category === 'DOPPLER_CAROTIDAS') {
    const vessels = carotidMeasurements(rawData.carotidMeasurements)
    const plaques = carotidPlaques(rawData.carotidPlaques)
    if (vessels.length) data.carotidMeasurements = vessels
    if (plaques.length) data.carotidPlaques = plaques
  }
  if (!Object.keys(data).length) return null

  const summary = string(source.summary)
  return { category, data, ...(summary ? { summary } : {}) }
}

function dimensions(value: CompanionThyroidMeasurements | CompanionThyroidNodule) {
  const axes = value as CompanionThyroidMeasurements & CompanionThyroidNodule
  return [axes.a ?? axes.c1, axes.b ?? axes.c2, axes.c ?? axes.c3]
    .filter(Boolean)
    .join(' × ')
}

export function companionReviewItems(payload: CompanionStructuredPayload): CompanionReviewItem[] {
  const items: CompanionReviewItem[] = []
  for (const key of scalarKeys) {
    const value = string(payload.data[key as keyof CompanionBiometricData])
    if (value) {
      const displayValue = millimeterKeys.has(key) ? `${value} mm`
        : key === 'weight' ? `${value} g`
          : key === 'ila' ? `${value} cm`
            : key === 'percentile' ? `P${value}`
              : value
      items.push({ key, label: scalarLabels[key]!, value: displayValue })
    }
  }
  const rightUterine = Number.parseFloat(payload.data.ipRightUterine?.replace(',', '.') ?? '')
  const leftUterine = Number.parseFloat(payload.data.ipLeftUterine?.replace(',', '.') ?? '')
  if (payload.category !== 'OBSTETRICA' && Number.isFinite(rightUterine) && Number.isFinite(leftUterine)) {
    items.push({
      key: 'ipMeanUterine',
      label: 'IP médio das uterinas (calculado)',
      value: ((rightUterine + leftUterine) / 2).toFixed(2).replace('.', ','),
    })
  }
  const lobes: Array<[string, string, CompanionThyroidMeasurements | undefined]> = [
    ['thyroidRightLobe', 'Lobo direito', payload.data.thyroidRightLobe],
    ['thyroidLeftLobe', 'Lobo esquerdo', payload.data.thyroidLeftLobe],
    ['thyroidIsthmus', 'Istmo', payload.data.thyroidIsthmus],
  ]
  for (const [key, label, value] of lobes) {
    if (value) items.push({ key, label, value: dimensions(value) })
  }
  for (const [index, nodule] of (payload.data.thyroidNodules ?? []).entries()) {
    items.push({ key: `thyroidNodules.${index}`, label: `Nódulo tireoidiano ${index + 1}`, value: `${nodule.lobe.replaceAll('_', ' ')} · ${dimensions(nodule)}` })
  }
  for (const [index, finding] of (payload.data.breastFindings ?? []).entries()) {
    const size = [finding.c1, finding.c2, finding.c3].filter(Boolean).join(' × ')
    items.push({ key: `breastFindings.${index}`, label: `Achado mamário ${index + 1}`, value: `${finding.side} · ${finding.type.replaceAll('_', ' ')}${size ? ` · ${size}` : ''}` })
  }
  for (const [index, measurement] of (payload.data.carotidMeasurements ?? []).entries()) {
    const values = [measurement.psv && `VPS ${measurement.psv}`, measurement.vdf && `VDF ${measurement.vdf}`, measurement.ir && `IR ${measurement.ir}`, measurement.emi && `EMI ${measurement.emi}`, measurement.flowDirection].filter(Boolean).join(' · ')
    items.push({ key: `carotidMeasurements.${index}`, label: `${measurement.vessel} ${measurement.side}`, value: values })
  }
  for (const [index, plaque] of (payload.data.carotidPlaques ?? []).entries()) {
    const values = [plaque.location, plaque.thickness && `${plaque.thickness} mm`, plaque.stenosisPercent && `${plaque.stenosisPercent}%`].filter(Boolean).join(' · ')
    items.push({ key: `carotidPlaques.${index}`, label: `Placa ${plaque.side}`, value: values })
  }
  return items.filter((item) => item.value)
}
