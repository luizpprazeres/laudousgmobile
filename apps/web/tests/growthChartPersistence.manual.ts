import assert from 'node:assert/strict'
import {
  GROWTH_CHART_CALCULATION_VERSION,
  GROWTH_CHART_FORMAT,
  GROWTH_CHART_FORMAT_V2,
  PRIOR_GROWTH_EXAM_SOURCE,
  attachStoredGrowthChart,
  attachStoredGrowthChartWithPrior,
  extractStoredGrowthChart,
  parseStoredGrowthChart,
  priorGrowthInputsFromChartState,
  priorGrowthRejectionMessage,
  storedGrowthChartPriorExams,
  storedGrowthChartFromPreview,
  storedGrowthChartToPreview,
} from '../src/lib/calculators/growthChartPersistence'
import { intergrowthBiometryPreviewFromDating } from '../src/lib/calculators/intergrowthBiometry'
import { intergrowth2020EfwPercentile, intergrowth2020EfwZScore } from '../src/lib/calculators/intergrowth2020'

const preview = intergrowthBiometryPreviewFromDating(
  { cc: '230', ca: '210', cf: '50' },
  'cf',
  {
    referencia: 'dum',
    'referencia.dum.dum_data': '01/01/2026',
    'referencia.dum.exame_data': '21/06/2026',
  },
)
assert.ok(preview)

const untouched = { __growth_chart: { incluir: 'nao' }, marker: 'preserved' }
assert.strictEqual(attachStoredGrowthChart(untouched, preview), untouched)

const saved = attachStoredGrowthChart({ __growth_chart: { incluir: 'sim' }, marker: 'preserved' }, preview)
const descriptor = extractStoredGrowthChart(saved)
assert.ok(descriptor)
assert.equal(descriptor.format, GROWTH_CHART_FORMAT)
assert.equal(descriptor.calculationVersion, GROWTH_CHART_CALCULATION_VERSION)
assert.equal(descriptor.gestationalAgeSource, 'dum')
assert.equal(descriptor.examDate, '2026-06-21')
assert.equal(descriptor.gestationalAgeDays, 171)
assert.deepEqual(descriptor.measurementsMm, { cc: 230, ca: 210, cf: 50 })
assert.equal(descriptor.weightGramsRaw, preview.weightG)
assert.equal(descriptor.zScore, preview.zScore)
assert.equal(descriptor.percentile, preview.percentile)
assert.equal(saved.marker, 'preserved')

const restored = storedGrowthChartToPreview(descriptor)
assert.deepEqual(restored, preview)

assert.equal(extractStoredGrowthChart({ __growth_chart: { incluir: 'nao', figure: descriptor } }), null)
assert.equal(extractStoredGrowthChart({ __growth_chart: { incluir: 'sim' } }), null)

const staleSource = { __growth_chart: { incluir: 'sim', figure: descriptor }, marker: 'preserved' }
const invalidated = attachStoredGrowthChart(staleSource, null)
assert.notStrictEqual(invalidated, staleSource)
assert.equal((invalidated.__growth_chart as { incluir?: unknown }).incluir, 'nao')
assert.equal('figure' in (invalidated.__growth_chart as object), false)
assert.equal(extractStoredGrowthChart(invalidated), null)
assert.strictEqual(extractStoredGrowthChart(staleSource), descriptor, 'a invalidação não pode mutar o estado anterior')
assert.equal(invalidated.marker, 'preserved')

const updatedPreview = intergrowthBiometryPreviewFromDating(
  { cc: '240', ca: '220', cf: '52' },
  'cf',
  {
    referencia: 'dum',
    'referencia.dum.dum_data': '01/01/2026',
    'referencia.dum.exame_data': '21/06/2026',
  },
)
assert.ok(updatedPreview)
const refreshed = attachStoredGrowthChart(staleSource, updatedPreview)
assert.deepEqual(extractStoredGrowthChart(refreshed), storedGrowthChartFromPreview(updatedPreview))
assert.strictEqual(extractStoredGrowthChart(staleSource), descriptor, 'a atualização não pode mutar a figura anterior')

const disabledSource = { __growth_chart: { incluir: 'nao', figure: descriptor }, marker: 'preserved' }
const disabledCleaned = attachStoredGrowthChart(disabledSource, preview)
assert.equal('figure' in (disabledCleaned.__growth_chart as object), false)
assert.equal(extractStoredGrowthChart(disabledCleaned), null)
assert.strictEqual(extractStoredGrowthChart({ ...disabledSource, __growth_chart: { ...disabledSource.__growth_chart, incluir: 'sim' } }), descriptor)
assert.equal(disabledCleaned.marker, 'preserved')

for (const invalid of [
  { ...descriptor, format: 'fetal-growth-intergrowth-v2' },
  { ...descriptor, calculationVersion: 'future-engine' },
  { ...descriptor, standardVersion: 'INTERGROWTH future' },
  { ...descriptor, formula: 'Hadlock 4' },
  { ...descriptor, gestationalAgeSource: 'biometry' },
  { ...descriptor, examDate: '2026-02-31' },
  { ...descriptor, gestationalAgeDays: 125 },
  { ...descriptor, measurementsMm: { ...descriptor.measurementsMm, ca: 0 } },
  { ...descriptor, weightGramsRaw: Number.NaN },
  { ...descriptor, weightGramsRaw: descriptor.weightGramsRaw + 1 },
  { ...descriptor, zScore: descriptor.zScore + 0.01 },
  { ...descriptor, percentile: descriptor.percentile + 0.01 },
  { ...descriptor, percentile: 101 },
]) {
  assert.equal(parseStoredGrowthChart(invalid), null)
}

// --- v2: no máximo um exame anterior de PFE manual (data + peso) ---
const included = { __growth_chart: { incluir: 'sim' }, marker: 'preserved' }

const withoutPrior = attachStoredGrowthChartWithPrior(included, preview, [])
assert.ok(withoutPrior.ok)
assert.deepEqual(withoutPrior.state, attachStoredGrowthChart(included, preview), 'sem exame anterior o salvamento continua v1')
assert.equal(extractStoredGrowthChart(withoutPrior.state)?.format, GROWTH_CHART_FORMAT)

// Atual: 2026-06-21 com IG 171 d; 31 dias antes → IG 140 d.
const withPrior = attachStoredGrowthChartWithPrior(included, preview, [{ examDate: '2026-05-21', weightGrams: 400 }])
assert.ok(withPrior.ok)
const v2 = extractStoredGrowthChart(withPrior.state)
assert.ok(v2 && v2.format === GROWTH_CHART_FORMAT_V2)
const { format: _v1Format, ...v1Core } = descriptor
const { format: _v2Format, priorExams, ...v2Core } = v2
assert.deepEqual(v2Core, v1Core, 'o ponto atual do v2 é idêntico ao v1')
assert.deepEqual(priorExams, [{
  source: PRIOR_GROWTH_EXAM_SOURCE,
  examDate: '2026-05-21',
  weightGrams: 400,
  gestationalAgeDays: 140,
  zScore: intergrowth2020EfwZScore(400, 140),
  percentile: intergrowth2020EfwPercentile(400, 140),
}])
assert.deepEqual(storedGrowthChartToPreview(v2), preview, 'a figura restaurada continua só com o ponto atual')
assert.deepEqual(storedGrowthChartPriorExams(v2), priorExams, 'o histórico validado é restaurado para a figura')
assert.deepEqual(storedGrowthChartPriorExams(descriptor), [], 'v1 não inventa histórico')
assert.deepEqual(parseStoredGrowthChart(JSON.parse(JSON.stringify(v2))), v2, 'ida e volta por JSON')
assert.equal(withPrior.state.marker, 'preserved')
assert.equal('figure' in included.__growth_chart, false, 'o estado de origem não é mutado')

const brDate = attachStoredGrowthChartWithPrior(included, preview, [{ examDate: '21/05/2026', weightGrams: 400 }])
assert.ok(brDate.ok)
assert.deepEqual(extractStoredGrowthChart(brDate.state), v2, 'data DD/MM/AAAA equivale à ISO')

assert.deepEqual(priorGrowthInputsFromChartState({}), [])
assert.deepEqual(priorGrowthInputsFromChartState({ prior_exam_date: '', prior_exam_weight_g: '' }), [])
assert.deepEqual(priorGrowthInputsFromChartState({ prior_exam_date: '2026-05-21', prior_exam_weight_g: '400' }), [{ examDate: '2026-05-21', weightGrams: 400 }])
assert.equal(Number.isNaN(priorGrowthInputsFromChartState({ prior_exam_date: '2026-05-21' })[0]?.weightGrams), true)
assert.equal(priorGrowthRejectionMessage('invalid-weight'), 'Informe o PFE anterior em gramas inteiros e maior que zero.')

const boundary = attachStoredGrowthChartWithPrior(included, preview, [{ examDate: '2026-05-07', weightGrams: 150 }])
assert.ok(boundary.ok)
const boundaryChart = extractStoredGrowthChart(boundary.state)
assert.ok(boundaryChart?.format === GROWTH_CHART_FORMAT_V2)
assert.equal(boundaryChart.priorExams[0].gestationalAgeDays, 126, 'limite inferior da janela aceito')

// Exame anterior não liga o gráfico nem sobrevive sem prévia válida.
for (const [state, current] of [
  [{ __growth_chart: { incluir: 'nao' }, marker: 'preserved' }, preview],
  [{ marker: 'preserved' }, preview],
  [included, null],
] as const) {
  for (const prior of [{ examDate: '2026-05-21', weightGrams: 400 }, { examDate: '2026-06-21', weightGrams: 0 }]) {
    const result = attachStoredGrowthChartWithPrior(state, current, [prior])
    assert.ok(result.ok)
    assert.deepEqual(result.state, attachStoredGrowthChart(state, current))
    assert.equal(extractStoredGrowthChart(result.state), null)
  }
}

for (const [inputs, reason] of [
  [[{ examDate: '2026-06-21', weightGrams: 400 }], 'not-before-current'],
  [[{ examDate: '2026-06-22', weightGrams: 400 }], 'not-before-current'],
  [[{ examDate: '2026-05-06', weightGrams: 150 }], 'ga-out-of-range'],
  [[{ examDate: '2025-06-21', weightGrams: 400 }], 'ga-out-of-range'],
  [[{ examDate: '2026-02-31', weightGrams: 400 }], 'invalid-date'],
  [[{ examDate: '31/02/2026', weightGrams: 400 }], 'invalid-date'],
  [[{ examDate: '2026/05/21', weightGrams: 400 }], 'invalid-date'],
  [[{ examDate: '', weightGrams: 400 }], 'invalid-date'],
  [[{ examDate: '2026-05-21', weightGrams: 0 }], 'invalid-weight'],
  [[{ examDate: '2026-05-21', weightGrams: -400 }], 'invalid-weight'],
  [[{ examDate: '2026-05-21', weightGrams: 400.5 }], 'invalid-weight'],
  [[{ examDate: '2026-05-21', weightGrams: Number.NaN }], 'invalid-weight'],
  [[{ examDate: '2026-05-21', weightGrams: Number.POSITIVE_INFINITY }], 'invalid-weight'],
  [[{ examDate: '2026-05-21', weightGrams: '400' as unknown as number }], 'invalid-weight'],
  [[{ examDate: '2026-05-21', weightGrams: 400 }, { examDate: '21/05/2026', weightGrams: 410 }], 'duplicate'],
  [[{ examDate: '2026-05-21', weightGrams: 400 }, { examDate: '2026-06-01', weightGrams: 500 }], 'too-many'],
] as const) {
  const source = { __growth_chart: { incluir: 'sim' }, marker: 'preserved' }
  const result = attachStoredGrowthChartWithPrior(source, preview, inputs)
  assert.deepEqual(result, { ok: false, reason }, JSON.stringify(inputs))
  assert.deepEqual(source, { __growth_chart: { incluir: 'sim' }, marker: 'preserved' })
}

const prior = v2.priorExams[0]
for (const tampered of [
  { ...v2, priorExams: [] },
  { ...v2, priorExams: [prior, prior] },
  { ...v2, priorExams: prior },
  { ...v2, priorExams: undefined },
  { ...v2, priorExams: [{ ...prior, source: 'biometry' }] },
  { ...v2, priorExams: [{ ...prior, examDate: '2026-05-22' }] },
  { ...v2, priorExams: [{ ...prior, examDate: '2026-06-21' }] },
  { ...v2, priorExams: [{ ...prior, gestationalAgeDays: 141 }] },
  { ...v2, priorExams: [{ ...prior, weightGrams: 401 }] },
  { ...v2, priorExams: [{ ...prior, weightGrams: 0 }] },
  { ...v2, priorExams: [{ ...prior, zScore: prior.zScore + 0.01 }] },
  { ...v2, priorExams: [{ ...prior, percentile: prior.percentile + 0.01 }] },
  { ...v2, priorExams: [{ ...prior, percentile: Number.NaN }] },
  { ...v2, zScore: v2.zScore + 0.01 },
  { ...v2, examDate: '2026-06-22' },
  { ...v2, format: GROWTH_CHART_FORMAT },
  { ...descriptor, priorExams: [prior] },
]) {
  assert.equal(parseStoredGrowthChart(tampered), null, JSON.stringify(tampered))
  assert.equal(extractStoredGrowthChart({ __growth_chart: { incluir: 'sim', figure: tampered } }), null)
}

console.log('Persistência do gráfico: descritor versionado, ida e volta e fail-closed aprovados (v1 e v2 com exame anterior)')
