import assert from 'node:assert/strict'
import { initialExamState } from '../src/lib/deterministic/compose'
import { dopplerObstetrico } from '../src/lib/deterministic/organs/dopplerObstetrico'
import { obstetrica } from '../src/lib/deterministic/organs/obstetrica'
import { morfologico } from '../src/lib/deterministic/organs/morfologico'
import { adaptarObstetrica } from '../src/lib/catalog/obstetricaParaCatalogo'
import { adaptarMorfologico } from '../src/lib/catalog/morfologicoParaCatalogo'
import { adaptarDopplerWeb, categoriaRenderDoppler, chaveDocumentoDoppler, estadoDopplerVisivel } from '../src/lib/catalog/dopplerWebMode'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'

let cases = 0
function test(name: string, run: () => void) {
  run()
  cases++
  console.log(`ok ${cases} - ${name}`)
}
const combined = initialExamState(dopplerObstetrico)
combined.ig = { ...combined.ig, bio_sem: '32', bio_dias: '2' }
combined.biometria = { dbp: '82', cc: '295', ca: '285', cf: '62', peso: '1900' }
combined.feto = { ...combined.feto, bcf: '142' }
combined.achados = { texto: 'OBSERVACAO OBSTETRICA TESTE' }
combined.doppler = {
  ...combined.doppler, ip_ut_dir: '0,7', ip_ut_esq: '0,8', ip_umb: '1', ip_acm: '1,9',
  'umbilical.diastole_ausente.confirmada': 'sim',
}
combined.cervicometria = { realizada: 'sim', 'realizada.sim.colo_cm': '3,4' }
const snapshot = JSON.stringify(combined)
const isolated = { ...combined, __opts: { somente_doppler: 'sim' } }

test('combined inherits obstetric calculator specs; isolated hides them without mutating source', () => {
  const specs = obstetrica.calculators ?? []
  assert.ok(specs.length > 0)
  assert.strictEqual(dopplerObstetrico.resolveCalculators!({}), specs)
  assert.deepEqual(dopplerObstetrico.resolveCalculators!({ somente_doppler: 'sim' }), [])
  assert.strictEqual(dopplerObstetrico.resolveCalculators!({ somente_doppler: 'nao' }), specs)
  assert.strictEqual(obstetrica.calculators, specs)
})

test('combined default; isolated hides obstetric sections including cervix', () => {
  assert.equal(categoriaRenderDoppler(combined), 'OBSTETRICA')
  assert.equal(categoriaRenderDoppler(isolated), 'DOPPLER_OBSTETRICO')
  assert.ok(dopplerObstetrico.resolveSections!({}).some(s => s.id === 'biometria'))
  assert.deepEqual(dopplerObstetrico.resolveSections!(isolated.__opts).map(s => s.id), ['ig', 'doppler'])
  assert.ok(!obstetrica.sections.some(s => s.id === 'doppler'))
})
test('isolated payload and saved state exclude hidden data; draft keys differ', () => {
  const out = adaptarDopplerWeb(isolated).dados
  for (const key of ['fetos', 'placenta_localizacao', 'crescimento_fetal', 'achados_adicionais']) assert.ok(!(key in out))
  assert.equal(out.cervicometria, null)
  assert.deepEqual(Object.keys(estadoDopplerVisivel(isolated)).sort(), ['__opts', 'doppler', 'ig'])
  assert.notEqual(chaveDocumentoDoppler('DOPPLER_OBSTETRICO', combined), chaveDocumentoDoppler('DOPPLER_OBSTETRICO', isolated))
  assert.equal(JSON.stringify(combined), snapshot)
  assert.equal(adaptarDopplerWeb(combined).dados.numero_fetos, 1)
})
test('hidden qualitative confirmations and pre-16-week indices do not leave web', () => {
  assert.equal(estadoDopplerVisivel(combined).doppler['umbilical.diastole_ausente.confirmada'], undefined)
  const early = { ...combined, ig: { bio_sem: '12', bio_dias: '3' } }
  const saved = estadoDopplerVisivel(early)
  assert.equal(saved.doppler.ip_umb, undefined)
  assert.equal(saved.doppler.ip_acm, undefined)
  assert.equal(saved.doppler.ip_ut_dir, '0,7')
  const doppler = adaptarDopplerWeb(early).dados.doppler as Record<string, unknown>
  assert.equal(doppler.ip_umbilical, null)
})
test('OBSTETRICA ignores legacy hidden Doppler, including growth calculations', () => {
  const legacy = {
    ...initialExamState(obstetrica),
    doppler: { realizado: 'sim', 'realizado.sim.ip_umb': '9' },
  }
  assert.deepEqual(adaptarObstetrica(legacy), adaptarObstetrica({ ...legacy, doppler: {} }))
  assert.equal(adaptarObstetrica(legacy).dados.doppler, null)
})
test('MORFOLOGICO optional Doppler remains available', () => {
  const state = initialExamState(morfologico)
  assert.equal(state.doppler.realizado, 'nao')
  assert.equal(adaptarMorfologico(state, { trimestre: '2t' }).dados.doppler, null)
  state.ig = { ...state.ig, bio_sem: '22', bio_dias: '0' }
  state.doppler = { ...state.doppler, realizado: 'sim', 'realizado.sim.ip_umb': '1' }
  assert.ok(adaptarMorfologico(state, { trimestre: '2t' }).dados.doppler)
})
for (const style of ['CLASSICO_COMPLETO', 'OBJETIVO']) {
  test(`${style}: catalog renders combined without losing biometry or Doppler`, () => {
    const r = renderizarSelecao(categoriaRenderDoppler(combined), style, [], adaptarDopplerWeb(combined).dados)
    assert.ok(r.ok, JSON.stringify(r))
    if (!r.ok) return
    assert.match(r.texto, /1900|1\.900/)
    assert.match(r.texto, /OBSERVACAO OBSTETRICA TESTE/)
    assert.match(r.texto, /umbilical/i)
    assert.match(r.texto, /cervicometria/i)
  })
  test(`${style}: isolated catalog never renders hidden obstetric findings`, () => {
    const r = renderizarSelecao(categoriaRenderDoppler(isolated), style, [], adaptarDopplerWeb(isolated).dados)
    assert.ok(r.ok, JSON.stringify(r))
    if (!r.ok) return
    assert.match(r.texto, /DOPPLERVELOCIMETRIA OBSTÉTRICA/)
    assert.match(r.texto, /umbilical/i)
    // "inserção na placenta" descreve a técnica de aquisição do Doppler e é
    // legítimo. O que não pode vazar é uma seção de avaliação placentária.
    assert.doesNotMatch(r.texto, /1900|1\.900|OBSERVACAO OBSTETRICA TESTE|^\s*Placenta\b|biometria|cervicometria/im)
  })
}
console.log(`${cases} Doppler web cases passed`)
