import { arredondarPesoGramas } from './fetalWeight'
import {
  HADLOCK3_FORMULA_LABEL,
  calcularPesoHadlock3,
  type DatedIntergrowthBiometryPreviewResult,
  type IntergrowthBiometryPreviewResult,
} from './intergrowthBiometry'
import {
  INTERGROWTH2020_EFW_VERSION,
  intergrowth2020EfwPercentile,
  intergrowth2020EfwZScore,
  isIntergrowth2020EfwGaDays,
} from './intergrowth2020'

export const GROWTH_CHART_FORMAT = 'fetal-growth-intergrowth-v1' as const
export const GROWTH_CHART_CALCULATION_VERSION = 'intergrowth2020-lms-hadlock3-v1' as const

export type StoredGrowthChart = {
  format: typeof GROWTH_CHART_FORMAT
  calculationVersion: typeof GROWTH_CHART_CALCULATION_VERSION
  standardVersion: typeof INTERGROWTH2020_EFW_VERSION
  formula: typeof HADLOCK3_FORMULA_LABEL
  gestationalAgeSource: 'dum' | 'early-ultrasound'
  examDate: string
  gestationalAgeDays: number
  measurementsMm: {
    cc: number
    ca: number
    cf: number
  }
  /** Peso Hadlock 3 sem arredondamento, exatamente como entrou no LMS. */
  weightGramsRaw: number
  zScore: number
  percentile: number
}

type GrowthChartState = {
  incluir?: unknown
  figure?: unknown
  [key: string]: unknown
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function validIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3])
}

/** Congela os dados que produziram a figura; SVG/PNG continuam derivados. */
export function storedGrowthChartFromPreview(preview: DatedIntergrowthBiometryPreviewResult): StoredGrowthChart {
  return {
    format: GROWTH_CHART_FORMAT,
    calculationVersion: GROWTH_CHART_CALCULATION_VERSION,
    standardVersion: preview.version,
    formula: preview.formula,
    gestationalAgeSource: preview.dating.source,
    examDate: preview.dating.examDate,
    gestationalAgeDays: preview.ig.gaDays,
    measurementsMm: {
      cc: preview.medidasMm.ccMm,
      ca: preview.medidasMm.caMm,
      cf: preview.medidasMm.cfMm,
    },
    weightGramsRaw: preview.weightG,
    zScore: preview.zScore,
    percentile: preview.percentile,
  }
}

/**
 * Anexa ao estado salvo somente uma figura válida e explicitamente incluída.
 * O estado vivo do formulário permanece livre de resultados calculados antigos.
 */
export function attachStoredGrowthChart(
  examState: unknown,
  preview: DatedIntergrowthBiometryPreviewResult | null,
): Record<string, unknown> {
  const base = examState && typeof examState === 'object' && !Array.isArray(examState)
    ? examState as Record<string, unknown>
    : { __form_state: examState ?? null }
  const chart = base.__growth_chart && typeof base.__growth_chart === 'object' && !Array.isArray(base.__growth_chart)
    ? base.__growth_chart as GrowthChartState
    : {}
  if (!preview) {
    if (!Object.prototype.hasOwnProperty.call(chart, 'figure') && chart.incluir !== 'sim') return base
    const nextChart = { ...chart, incluir: 'nao' }
    delete nextChart.figure
    return { ...base, __growth_chart: nextChart }
  }
  if (chart.incluir !== 'sim') {
    if (!Object.prototype.hasOwnProperty.call(chart, 'figure')) return base
    const nextChart = { ...chart }
    delete nextChart.figure
    return { ...base, __growth_chart: nextChart }
  }
  return {
    ...base,
    __growth_chart: {
      ...chart,
      figure: storedGrowthChartFromPreview(preview),
    },
  }
}

/**
 * Lê apenas o contrato exato desta versão. Mudança de curva ou fórmula deixa
 * a figura indisponível, em vez de redesenhar um laudo antigo com outra regra.
 */
export function parseStoredGrowthChart(value: unknown): StoredGrowthChart | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<StoredGrowthChart>
  const measurements = candidate.measurementsMm
  if (
    candidate.format !== GROWTH_CHART_FORMAT ||
    candidate.calculationVersion !== GROWTH_CHART_CALCULATION_VERSION ||
    candidate.standardVersion !== INTERGROWTH2020_EFW_VERSION ||
    candidate.formula !== HADLOCK3_FORMULA_LABEL ||
    (candidate.gestationalAgeSource !== 'dum' && candidate.gestationalAgeSource !== 'early-ultrasound') ||
    !validIsoDate(candidate.examDate) ||
    !isIntergrowth2020EfwGaDays(candidate.gestationalAgeDays) ||
    !measurements || typeof measurements !== 'object' || Array.isArray(measurements) ||
    !finitePositive(measurements.cc) ||
    !finitePositive(measurements.ca) ||
    !finitePositive(measurements.cf) ||
    !finitePositive(candidate.weightGramsRaw) ||
    typeof candidate.zScore !== 'number' || !Number.isFinite(candidate.zScore) ||
    typeof candidate.percentile !== 'number' || !Number.isFinite(candidate.percentile) ||
    candidate.percentile < 0 || candidate.percentile > 100
  ) return null
  const stored = candidate as StoredGrowthChart
  const expectedWeight = calcularPesoHadlock3({
    ccMm: stored.measurementsMm.cc,
    caMm: stored.measurementsMm.ca,
    cfMm: stored.measurementsMm.cf,
  })
  const expectedZ = intergrowth2020EfwZScore(stored.weightGramsRaw, stored.gestationalAgeDays)
  const expectedPercentile = intergrowth2020EfwPercentile(stored.weightGramsRaw, stored.gestationalAgeDays)
  if (
    expectedWeight === null || expectedZ === null || expectedPercentile === null ||
    Math.abs(expectedWeight - stored.weightGramsRaw) > 1e-6 ||
    Math.abs(expectedZ - stored.zScore) > 1e-9 ||
    Math.abs(expectedPercentile - stored.percentile) > 1e-7
  ) return null
  return stored
}

export function extractStoredGrowthChart(examState: unknown): StoredGrowthChart | null {
  if (!examState || typeof examState !== 'object' || Array.isArray(examState)) return null
  const chart = (examState as Record<string, unknown>).__growth_chart
  if (!chart || typeof chart !== 'object' || Array.isArray(chart)) return null
  const state = chart as GrowthChartState
  if (state.incluir !== 'sim') return null
  return parseStoredGrowthChart(state.figure)
}

/** Restaura exatamente o ponto salvo; curvas fixas vêm da versão declarada. */
export function storedGrowthChartToPreview(stored: StoredGrowthChart): IntergrowthBiometryPreviewResult | null {
  const valid = parseStoredGrowthChart(stored)
  if (!valid) return null
  const weightRounded = arredondarPesoGramas(valid.weightGramsRaw)
  if (weightRounded === null) return null
  const semanas = Math.floor(valid.gestationalAgeDays / 7)
  const dias = valid.gestationalAgeDays % 7
  return {
    version: valid.standardVersion,
    formula: valid.formula,
    medidasMm: {
      ccMm: valid.measurementsMm.cc,
      caMm: valid.measurementsMm.ca,
      cfMm: valid.measurementsMm.cf,
    },
    ig: { semanas, dias, gaDays: valid.gestationalAgeDays },
    weightG: valid.weightGramsRaw,
    weightRounded,
    zScore: valid.zScore,
    percentile: valid.percentile,
    dating: {
      source: valid.gestationalAgeSource,
      examDate: valid.examDate,
    },
  }
}
