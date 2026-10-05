import assert from 'node:assert/strict'
import { adaptarDopplerVenosoMmii } from '../src/lib/catalog/dopplerVenosoMmiiParaCatalogo'
import { initialExamState, composeReport } from '../src/lib/deterministic/compose'
import { dopplerVenosoMmii, dopplerVenosoMmiiMedidas, venousSectionId } from '../src/lib/deterministic/organs/dopplerVenosoMmii'
import { DOPPLER_VENOSO_MMII_TVP_REQUIRED, DOPPLER_VENOSO_MMII_REFLUX_REQUIRED, validateDopplerVenosoMmii, renderDopplerVenosoMmii } from '@laudousg/shared'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { venousMapFromCatalog } from '../src/lib/writerVenousMap'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
function normalTvp() {
  const state = initialExamState(dopplerVenosoMmii)
  state.__opts = { ...state.__opts, laterality: 'right' }
  for (const id of DOPPLER_VENOSO_MMII_TVP_REQUIRED) state[venousSectionId('right', id)] = { ...state[venousSectionId('right', id)], assessment: 'evaluated', compressibility: 'complete' }
  return state
}

test('as duas categorias usam formulário e renderer remoto, sem compositor local', () => {
  for (const category of [dopplerVenosoMmii, dopplerVenosoMmiiMedidas]) {
    assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(category.id))
    assert.equal(isWriterCategory(category.id), false)
    assert.equal(categoriaMigrada(category.id), true)
    assert.throws(() => composeReport(category, initialExamState(category)))
  }
})
test('abrir o formulário não inventa normalidade ou pesquisa de refluxo', () => {
  const adapted = adaptarDopplerVenosoMmii(initialExamState(dopplerVenosoMmii), 'DOPPLER_VENOSO_MMII')
  assert.ok(adapted.pendencias.some(p => p.bloqueia))
  assert.ok(adapted.dados.sides.right.segments.every(s => s.assessment === 'not_assessed' && !s.reflux.tested))
})
test('TVP inclui a junção safenofemoral e três segmentos femorais', () => {
  const state = initialExamState(dopplerVenosoMmii)
  const ids = dopplerVenosoMmii.resolveSections!(state.__opts).map(s => s.id)
  for (const id of DOPPLER_VENOSO_MMII_TVP_REQUIRED) assert.ok(ids.includes(venousSectionId('right', id)), id)
  assert.ok(!ids.includes('right_perforators'))
  assert.ok(!ids.includes('right_great_saphenous_mid_thigh'))
})
test('seleção normal explícita gera laudo TVP normal válido', () => {
  const adapted = adaptarDopplerVenosoMmii(normalTvp(), 'DOPPLER_VENOSO_MMII')
  assert.deepEqual(adapted.pendencias, [])
  assert.equal(validateDopplerVenosoMmii(adapted.dados).success, true)
  assert.match(renderDopplerVenosoMmii(adapted.dados), /direito/i)
})
test('protocolo completo exige compressibilidade e refluxo medidos no conjunto obrigatório', () => {
  const state = normalTvp()
  state.__opts.protocol = 'complete'
  const visible = dopplerVenosoMmii.resolveSections!(state.__opts).map(s => s.id)
  for (const id of DOPPLER_VENOSO_MMII_REFLUX_REQUIRED) {
    assert.ok(visible.includes(venousSectionId('right', id)), id)
    state[venousSectionId('right', id)] = { ...state[venousSectionId('right', id)], assessment: 'evaluated', compressibility: 'complete', reflux: 'tested', 'reflux.tested.time_s': '0', 'reflux.tested.maneuver': 'release', 'reflux.tested.position': 'standing' }
  }
  const result = adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII')
  assert.deepEqual(result.pendencias, [])
  assert.equal(validateDopplerVenosoMmii(result.dados).success, true)
})
test('mudar para TVP preserva e sinaliza achados superficiais ocultos', () => {
  const state = normalTvp()
  state.right_great_saphenous_mid_thigh = { assessment: 'evaluated', compressibility: 'complete', diameter_mm: '6,5' }
  const result = adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII')
  assert.ok(result.pendencias.some(p => p.onde === 'Protocolo'))
  assert.equal(result.dados.sides.right.segments.find(s => s.id === 'great_saphenous_mid_thigh')!.diameter!.value, 6.5)
})
test('trombose e extensão preservadas sem inventar fase', () => {
  const state = normalTvp()
  state.right_popliteal = { ...state.right_popliteal, compressibility: 'absent', thrombosis: 'present', 'thrombosis.present.confirmed': 'yes', 'thrombosis.present.extent_to': 'Da poplítea às tibiais posteriores', 'thrombosis.present.occlusion': 'occlusive' }
  const adapted = adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII')
  assert.deepEqual(adapted.pendencias, [])
  const finding = adapted.dados.sides.right.segments.find(s => s.id === 'popliteal')!.thrombosis!
  assert.equal(finding.phase, 'not_assessed')
  assert.equal(finding.extent, 'Da poplítea às tibiais posteriores')
  assert.match(renderDopplerVenosoMmii(adapted.dados), /trombose/i)
})
test('fase aguda exige confirmação e achados de suporte', () => {
  const state = normalTvp()
  state.right_popliteal = { ...state.right_popliteal, compressibility: 'partial', thrombosis: 'present', 'thrombosis.present.confirmed': 'yes', 'thrombosis.present.phase': 'acute' }
  assert.ok(adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII').pendencias.some(p => p.valor === 'PHASE_EVIDENCE_REQUIRED'))
})
test('calibre aceita vírgula decimal e valores inválidos bloqueiam', () => {
  const state = normalTvp()
  state.right_popliteal.diameter_mm = '5,2'
  assert.deepEqual(adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII').dados.sides.right.segments.find(s => s.id === 'popliteal')!.diameter, { value: 5.2, unit: 'mm' })
  state.right_popliteal.diameter_mm = '-5'
  assert.ok(adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII').pendencias.some(p => p.bloqueia && p.valor === '-5'))
})
test('trocar lateralidade não apaga silenciosamente achados do outro lado', () => {
  const state = normalTvp()
  state.__opts.laterality = 'left'
  assert.ok(adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII').pendencias.some(p => p.onde === 'Lado direito'))
})
test('refluxo preserva zero medido e exige posição e manobra', () => {
  const state = normalTvp()
  state.right_popliteal = { ...state.right_popliteal, reflux: 'tested', 'reflux.tested.time_s': '0' }
  let result = adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII')
  assert.equal(result.dados.sides.right.segments.find(s => s.id === 'popliteal')!.reflux.time!.value, 0)
  assert.ok(result.pendencias.some(p => p.valor === 'REFLUX_MANEUVER_REQUIRED'))
  state.right_popliteal['reflux.tested.maneuver'] = 'release'
  state.right_popliteal['reflux.tested.position'] = 'standing'
  result = adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII')
  assert.deepEqual(result.pendencias, [])
})
test('perfurante envia localização, calibre, refluxo e direção separados', () => {
  const state = normalTvp()
  state.right_perforators = { p1: 'assessed', 'p1.assessed.surface': 'medial', 'p1.assessed.level': 'distal_calf', 'p1.assessed.distance_cm': '12', 'p1.assessed.diameter_mm': '4,1', 'p1.assessed.reflux_s': '0,7', 'p1.assessed.maneuver': 'release', 'p1.assessed.position': 'standing', 'p1.assessed.connection': 'documented' }
  const perforator = adaptarDopplerVenosoMmii(state, 'DOPPLER_VENOSO_MMII').dados.sides.right.perforators[0]
  assert.match(perforator.location, /12 cm/)
  assert.deepEqual(perforator.diameter, { value: 4.1, unit: 'mm' })
  assert.deepEqual(perforator.reflux.time, { value: .7, unit: 's' })
  assert.equal(perforator.outwardFlow, 'documented')
})
test('apresentação com medidas mantém a categoria solicitada e seu protocolo', () => {
  const result = adaptarDopplerVenosoMmii(initialExamState(dopplerVenosoMmiiMedidas), 'DOPPLER_VENOSO_MMII_MEDIDAS')
  assert.equal(result.dados.categoryCode, 'DOPPLER_VENOSO_MMII_MEDIDAS')
  assert.equal(result.dados.protocol, 'mapping_measurements')
})
test('cartografia só é aceita com estrutura e versão compatíveis', () => {
  assert.equal(venousMapFromCatalog({}, 'venous-4view-1'), undefined)
  const map = { lados: { direito: { avaliado: true, segmentos: {} }, esquerdo: { avaliado: false, segmentos: {} } }, lesoes: [], perfurantes: [], tvp_presente: false }
  assert.ok(venousMapFromCatalog(map, 'venous-4view-1'))
  assert.equal(venousMapFromCatalog(map, 'legacy'), undefined)
})
console.log(`${cases} venous structured Web cases passed`)
