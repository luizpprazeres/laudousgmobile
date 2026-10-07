import assert from 'node:assert/strict'
import {
  GROWTH_CHART_CALCULATION_VERSION,
  GROWTH_CHART_FORMAT,
  attachStoredGrowthChart,
  extractStoredGrowthChart,
  parseStoredGrowthChart,
  storedGrowthChartFromPreview,
  storedGrowthChartToPreview,
} from '../src/lib/calculators/growthChartPersistence'
import { intergrowthBiometryPreviewFromDating } from '../src/lib/calculators/intergrowthBiometry'

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

console.log('Persistência do gráfico: descritor versionado, ida e volta e fail-closed aprovados')
