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
/** v1 + no máximo um exame anterior de PFE informado manualmente. */
export const GROWTH_CHART_FORMAT_V2 = 'fetal-growth-intergrowth-v2' as const
export const GROWTH_CHART_CALCULATION_VERSION = 'intergrowth2020-lms-hadlock3-v1' as const
export const GROWTH_CHART_MAX_PRIOR_EXAMS = 1
export const PRIOR_GROWTH_EXAM_SOURCE = 'manual-efw' as const
export const PRIOR_GROWTH_EXAM_DATE_KEY = 'prior_exam_date' as const
export const PRIOR_GROWTH_EXAM_WEIGHT_KEY = 'prior_exam_weight_g' as const

export type StoredGrowthChartV1 = {
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

/**
 * Exame anterior: só data e PFE vêm do usuário. A IG é derivada da datação do
 * exame atual menos a diferença de datas; Z/percentil são recalculados.
 */
export type StoredPriorGrowthExam = {
  source: typeof PRIOR_GROWTH_EXAM_SOURCE
  examDate: string
  /** PFE informado, em gramas inteiros; não passa por Hadlock. */
  weightGrams: number
  gestationalAgeDays: number
  zScore: number
  percentile: number
}

export type StoredGrowthChartV2 = Omit<StoredGrowthChartV1, 'format'> & {
  format: typeof GROWTH_CHART_FORMAT_V2
  priorExams: [StoredPriorGrowthExam]
}

export type StoredGrowthChart = StoredGrowthChartV1 | StoredGrowthChartV2

export type PriorGrowthExamInput = {
  /** `AAAA-MM-DD` ou `DD/MM/AAAA`. */
  examDate: string
  weightGrams: number
}

export type PriorGrowthExamRejection =
  | 'too-many'
  | 'duplicate'
  | 'invalid-date'
  | 'not-before-current'
  | 'ga-out-of-range'
  | 'invalid-weight'

export type PriorGrowthExamsResult =
  | { ok: true; priorExams: StoredPriorGrowthExam[] }
  | { ok: false; reason: PriorGrowthExamRejection }

export type AttachGrowthChartResult =
  | { ok: true; state: Record<string, unknown> }
  | { ok: false; reason: PriorGrowthExamRejection }

type GrowthChartState = {
  incluir?: unknown
  figure?: unknown
  [key: string]: unknown
}

/**
 * Converte os dois campos crus da interface no único exame anterior aceito.
 * Se apenas um campo estiver preenchido, devolve a entrada incompleta para a
 * validação bloquear o salvamento em vez de descartá-la silenciosamente.
 */
export function priorGrowthInputsFromChartState(chartState: unknown): PriorGrowthExamInput[] {
  if (!chartState || typeof chartState !== 'object' || Array.isArray(chartState)) return []
  const state = chartState as Record<string, unknown>
  const examDate = typeof state[PRIOR_GROWTH_EXAM_DATE_KEY] === 'string'
    ? state[PRIOR_GROWTH_EXAM_DATE_KEY].trim()
    : ''
  const rawWeight = state[PRIOR_GROWTH_EXAM_WEIGHT_KEY]
  const weightText = typeof rawWeight === 'string' || typeof rawWeight === 'number'
    ? String(rawWeight).trim()
    : ''
  if (!examDate && !weightText) return []
  return [{ examDate, weightGrams: weightText ? Number(weightText.replace(',', '.')) : Number.NaN }]
}

export function priorGrowthRejectionMessage(reason: PriorGrowthExamRejection): string {
  switch (reason) {
    case 'invalid-date': return 'Informe uma data válida para o exame anterior.'
    case 'not-before-current': return 'A data do exame anterior precisa ser anterior à data do exame atual.'
    case 'ga-out-of-range': return 'A idade gestacional derivada do exame anterior precisa estar entre 18 e 40 semanas.'
    case 'invalid-weight': return 'Informe o PFE anterior em gramas inteiros e maior que zero.'
    case 'duplicate': return 'O exame anterior está duplicado.'
    case 'too-many': return 'Nesta etapa, informe somente um exame anterior.'
  }
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isoDateUtcDays(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) return null
  return date.getTime() / 86_400_000
}

function validIsoDate(value: unknown): value is string {
  return isoDateUtcDays(value) !== null
}

/** Aceita `AAAA-MM-DD` ou `DD/MM/AAAA` e devolve ISO; `null` se a data não existir. */
function normalizeInputDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const iso = br ? `${br[3]}-${br[2]!.padStart(2, '0')}-${br[1]!.padStart(2, '0')}` : trimmed
  return validIsoDate(iso) ? iso : null
}

function validPriorWeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/** Posição do exame anterior na datação atual, ou o motivo da recusa. */
function derivePriorExam(
  current: Pick<StoredGrowthChartV1, 'examDate' | 'gestationalAgeDays'>,
  examDate: string,
  weightGrams: number,
): StoredPriorGrowthExam | PriorGrowthExamRejection {
  const currentDays = isoDateUtcDays(current.examDate)
  const priorDays = isoDateUtcDays(examDate)
  if (currentDays === null || priorDays === null) return 'invalid-date'
  if (priorDays >= currentDays) return 'not-before-current'
  if (!validPriorWeight(weightGrams)) return 'invalid-weight'
  const gestationalAgeDays = current.gestationalAgeDays - (currentDays - priorDays)
  if (!isIntergrowth2020EfwGaDays(gestationalAgeDays)) return 'ga-out-of-range'
  const zScore = intergrowth2020EfwZScore(weightGrams, gestationalAgeDays)
  const percentile = intergrowth2020EfwPercentile(weightGrams, gestationalAgeDays)
  if (zScore === null || percentile === null) return 'invalid-weight'
  return {
    source: PRIOR_GROWTH_EXAM_SOURCE,
    examDate,
    weightGrams,
    gestationalAgeDays,
    zScore,
    percentile,
  }
}

/** Valida e deriva os exames anteriores informados (no máximo um). */
export function derivePriorGrowthExams(
  current: Pick<StoredGrowthChartV1, 'examDate' | 'gestationalAgeDays'>,
  inputs: readonly PriorGrowthExamInput[],
): PriorGrowthExamsResult {
  const dates: string[] = []
  for (const input of inputs) {
    const examDate = normalizeInputDate(input?.examDate)
    if (examDate === null) return { ok: false, reason: 'invalid-date' }
    if (dates.includes(examDate)) return { ok: false, reason: 'duplicate' }
    dates.push(examDate)
  }
  if (inputs.length > GROWTH_CHART_MAX_PRIOR_EXAMS) return { ok: false, reason: 'too-many' }
  const priorExams: StoredPriorGrowthExam[] = []
  for (const [index, input] of inputs.entries()) {
    const derived = derivePriorExam(current, dates[index]!, input.weightGrams)
    if (typeof derived === 'string') return { ok: false, reason: derived }
    priorExams.push(derived)
  }
  return { ok: true, priorExams }
}

/** Congela os dados que produziram a figura; SVG/PNG continuam derivados. */
export function storedGrowthChartFromPreview(preview: DatedIntergrowthBiometryPreviewResult): StoredGrowthChartV1 {
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
 * Igual a `attachStoredGrowthChart`, mas grava v2 quando há exame anterior.
 * O exame anterior não liga a inclusão: sem `incluir: 'sim'` ele é ignorado.
 * Entrada inválida não grava nada e devolve o motivo.
 */
export function attachStoredGrowthChartWithPrior(
  examState: unknown,
  preview: DatedIntergrowthBiometryPreviewResult | null,
  priorExams: readonly PriorGrowthExamInput[],
): AttachGrowthChartResult {
  const state = attachStoredGrowthChart(examState, preview)
  const chart = state.__growth_chart as GrowthChartState | undefined
  if (priorExams.length === 0 || !preview || !chart || chart.figure === undefined) return { ok: true, state }
  const current = storedGrowthChartFromPreview(preview)
  const derived = derivePriorGrowthExams(current, priorExams)
  if (!derived.ok) return derived
  const figure: StoredGrowthChartV2 = {
    ...current,
    format: GROWTH_CHART_FORMAT_V2,
    priorExams: derived.priorExams as [StoredPriorGrowthExam],
  }
  return { ok: true, state: { ...state, __growth_chart: { ...chart, figure } } }
}

function sameNumber(actual: unknown, expected: number, tolerance: number): boolean {
  return typeof actual === 'number' && Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance
}

/** Exige que o exame anterior salvo seja exatamente o que a regra derivaria. */
function parseStoredPriorExams(value: unknown, current: StoredGrowthChartV1 | StoredGrowthChartV2): [StoredPriorGrowthExam] | null {
  if (!Array.isArray(value) || value.length !== GROWTH_CHART_MAX_PRIOR_EXAMS) return null
  const raw = value[0] as Partial<StoredPriorGrowthExam> | null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  if (raw.source !== PRIOR_GROWTH_EXAM_SOURCE || !validIsoDate(raw.examDate)) return null
  const expected = derivePriorExam(current, raw.examDate, raw.weightGrams as number)
  if (
    typeof expected === 'string' ||
    raw.weightGrams !== expected.weightGrams ||
    raw.gestationalAgeDays !== expected.gestationalAgeDays ||
    !sameNumber(raw.zScore, expected.zScore, 1e-9) ||
    !sameNumber(raw.percentile, expected.percentile, 1e-7)
  ) return null
  return [raw as StoredPriorGrowthExam]
}

/**
 * Lê apenas os contratos exatos v1 e v2. Mudança de curva ou fórmula deixa
 * a figura indisponível, em vez de redesenhar um laudo antigo com outra regra.
 */
export function parseStoredGrowthChart(value: unknown): StoredGrowthChart | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<StoredGrowthChartV1> & Partial<Omit<StoredGrowthChartV2, 'format'>> & { format?: unknown }
  const measurements = candidate.measurementsMm
  if (
    (candidate.format !== GROWTH_CHART_FORMAT && candidate.format !== GROWTH_CHART_FORMAT_V2) ||
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
  if (stored.format === GROWTH_CHART_FORMAT_V2) {
    if (!parseStoredPriorExams(stored.priorExams, stored)) return null
  } else if (Object.prototype.hasOwnProperty.call(stored, 'priorExams')) {
    // v2 rebaixado a v1 escondendo o exame anterior: adulterado.
    return null
  }
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

/** Exames anteriores apenas quando todo o descritor v2 passa novamente pela validação. */
export function storedGrowthChartPriorExams(stored: StoredGrowthChart): readonly StoredPriorGrowthExam[] {
  const valid = parseStoredGrowthChart(stored)
  return valid?.format === GROWTH_CHART_FORMAT_V2 ? valid.priorExams : []
}
