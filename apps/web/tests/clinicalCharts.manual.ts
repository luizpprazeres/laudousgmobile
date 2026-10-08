import assert from 'node:assert/strict'
import { dopplerChartInput, storeClinicalCharts, restoreClinicalCharts, hasClinicalCharts, attachClinicalCharts, extractClinicalCharts, invalidateClinicalCharts, clearClinicalChartFigure } from '../src/lib/calculators/clinicalCharts'
import { calcularPreEclampsiaWeb, type PeWebForm } from '../src/lib/calculators/preEclampsia'
import { calculateTrisomyWeb, type TrisomyWebForm } from '../src/lib/calculators/trisomyFmf'
const state = { ig: { bio_sem: '32', bio_dias: '0' }, doppler: { ip_umb: '1', ip_acm: '2', ip_ut_dir: '0,7', ip_ut_esq: '0,9', rcp: '1,3' } }
const input = dopplerChartInput('DOPPLER_OBSTETRICO', state)!
assert.equal(input.suppressRcp, true)
assert.equal(input.ipUmbilical, 1)
assert.equal(input.ipMCA, 2)
assert.equal(input.ipMedioUterinas, 0.8)
const compatible = dopplerChartInput('DOPPLER_OBSTETRICO', { ...state, doppler: { ...state.doppler, rcp: '2' } })!
assert.equal(compatible.suppressRcp, undefined)
assert.equal(dopplerChartInput('DOPPLER_OBSTETRICO', { ...state, ig: { bio_sem: '32', bio_dias: '' } }), undefined)
assert.equal(dopplerChartInput('DOPPLER_OBSTETRICO', { ...state, ig: { bio_sem: '32', bio_dias: '0.5' } }), undefined)
assert.equal(dopplerChartInput('OBSTETRICA', state), undefined)
assert.equal(dopplerChartInput('OBSTETRICA', { ...state, doppler: { realizado: 'sim', 'realizado.sim.ip_umb': '9' } }), undefined, 'Doppler legado oculto em obstétrica não vira gráfico')
assert.equal(dopplerChartInput('DOPPLER_OBSTETRICO', { ig: state.ig, doppler: { ip_umb: '1mg', ip_acm: 'NaN' } }), undefined)
const early = dopplerChartInput('DOPPLER_OBSTETRICO', { ...state, ig: { bio_sem: '12', bio_dias: '0' } })!
assert.equal(early.ipMedioUterinas, 0.8)
assert.equal(dopplerChartInput('DOPPLER_OBSTETRICO', { ig: { bio_sem: '19', bio_dias: '6' }, doppler: { ip_umb: '1', ip_acm: '2' } }), undefined)
const invalidBilateral = dopplerChartInput('DOPPLER_OBSTETRICO', { ...state, doppler: { ip_ut_dir: '0', ip_ut_esq: '2' } })
assert.equal(invalidBilateral, undefined)

const peForm: PeWebForm = {
  idade: '36', peso: '69', altura: '164', gaSemanas: '12', gaDias: '0', etnia: 'branca', paridade: 'nulipara',
  intervaloAnos: '', igPartoAnterior: '', zEscorePesoAnterior: '', histFamiliarPE: true, fiv: false,
  hipertensaoCronica: false, diabetes: false, lesSaf: false, fumante: false,
  afericoes: [{ sistolica: '120', diastolica: '80' }], utaPiMedio: '1,08', utaPiFonte: 'manual',
}
const trisomyForm: TrisomyWebForm = {
  maternalAge: '36', crl: '64', nt: '1.5', fhr: '160', ethnicity: 'white', weight: '69', smoking: false,
  previousT21: false, previousT18: false, previousT13: false, freeBetaHcgMoM: '', pappaMoM: '', isMoMCorrected: false,
  dvPI: '', tricuspid: '', nasalBone: '',
}
const charts = { doppler: input, pe: calcularPreEclampsiaWeb(peForm), trisomy: calculateTrisomyWeb(trisomyForm) }
const stored = JSON.parse(JSON.stringify(storeClinicalCharts(charts)))
const restored = restoreClinicalCharts(stored)
assert.deepEqual(restored.pe?.resultado.riscos, charts.pe.resultado.riscos)
assert.deepEqual(restored.pe?.resultado.marcadores, charts.pe.resultado.marcadores)
for (const key of ['t21', 't18', 't13'] as const) {
  assert.deepEqual(restored.trisomy?.result[key], charts.trisomy.result[key])
  assert.deepEqual(restored.trisomy?.result.basal[key], charts.trisomy.result.basal[key])
}
assert.equal(restored.trisomy?.result.clinicalStatus, 'validation-pending')
assert.equal(restored.doppler?.suppressRcp, true)
assert.equal(storeClinicalCharts({}), null)
assert.equal(hasClinicalCharts(restoreClinicalCharts({ ...stored, format: 'future' })), false)
assert.equal(restoreClinicalCharts({ ...stored, pe: { ...stored.pe, version: 'future' } }).pe, undefined)
assert.equal(restoreClinicalCharts({ ...stored, trisomy: { ...stored.trisomy, fingerprint: 'other' } }).trisomy, undefined)
assert.equal(restoreClinicalCharts({ ...stored, doppler: { ...stored.doppler, input: { ...input, days: 0.5 } } }).doppler, undefined)
assert.equal(restoreClinicalCharts({ ...stored, doppler: { ...stored.doppler, input: { ...input, ipUmbilical: '1' } } }).doppler, undefined)
assert.equal(restoreClinicalCharts({ ...stored, pe: { ...stored.pe, gestante: { ...stored.pe.gestante, peso: NaN } } }).pe, undefined)
assert.ok(restoreClinicalCharts({ ...stored, pe: { version: 'future' } }).trisomy)
const selected = attachClinicalCharts({ ...state, __clinical_charts: { incluir: 'sim' } }, charts)
assert.ok(extractClinicalCharts(selected).pe)
assert.equal(hasClinicalCharts(extractClinicalCharts(attachClinicalCharts({ __clinical_charts: { incluir: 'nao', figure: stored } }, charts))), false)
for (const key of ['ig', 'doppler', 'primeiro_trimestre', '__opts']) {
  const changed = invalidateClinicalCharts(selected, { ...selected, [key]: { changed: 'yes' } })
  assert.equal((changed.__clinical_charts as Record<string, unknown>).figure, undefined, key)
}
assert.equal(invalidateClinicalCharts(selected, { ...selected, unrelated: {} }).__clinical_charts, selected.__clinical_charts)
assert.equal((clearClinicalChartFigure(selected).__clinical_charts as Record<string, unknown>).figure, undefined)
assert.equal(hasClinicalCharts(extractClinicalCharts(attachClinicalCharts(selected, {}))), false)
console.log('Clinical charts: suppression, validity, FMF parity, versioning and invalidation passed')
