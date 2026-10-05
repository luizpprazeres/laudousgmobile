import assert from 'node:assert/strict'
import { adaptarDopplerRenal } from '../src/lib/catalog/dopplerRenalParaCatalogo'
import { initialExamState } from '../src/lib/deterministic/compose'
import { dopplerRenal } from '../src/lib/deterministic/organs/dopplerRenal'
import { viasUrinarias } from '../src/lib/deterministic/organs/viasUrinarias'

let cases = 0
function test(name: string, run: () => void) {
  run()
  cases++
  console.log(`ok ${cases} - ${name}`)
}

const moduleOf = (category: typeof dopplerRenal, id: string) => {
  const module = category.sections.find((section) => section.id === id)?.module
  assert.ok(module, `${category.id}/${id} sem módulo`)
  return module
}

test('reutiliza integralmente os módulos renais de Vias Urinárias', () => {
  for (const id of ['rim_direito', 'rim_esquerdo']) {
    const renal = moduleOf(dopplerRenal, id)
    const urinary = moduleOf(viasUrinarias, id)
    assert.deepEqual(renal.initialState(), urinary.initialState())
    assert.deepEqual(renal.schema.fields.map((field) => field.key), urinary.schema.fields.map((field) => field.key))
    assert.equal(renal.compose(renal.initialState()).body, urinary.compose(urinary.initialState()).body)
  }
})

test('preserva três eixos, espessura e medidas vasculares separadas por lado', () => {
  const state = initialExamState(dopplerRenal)
  state.aorta = { ...state.aorta, assessment: 'normal', vps_cms: '82,5' }
  state.rim_direito = { ...state.rim_direito, medidas: '10,2 x 4,8 x 5,1', espessura: '1,6' }
  state.rim_esquerdo = { ...state.rim_esquerdo, medidas: '12,1 x 5,2 x 5,4', espessura: '1,7' }
  state.arteria_renal_direita = {
    ...state.arteria_renal_direita,
    assessment: 'abnormal',
    psv_proximal_cms: '181,5',
    psv_middle_cms: '150',
    psv_distal_cms: '122',
    rar: '2,2',
    ir_upper: '0,61',
    ir_middle: '0,64',
    ir_lower: '0,63',
    spectral_pattern: 'tardus_parvus',
    ta_ms_upper: '72',
    ia_cms2_upper: '280',
  }
  state.arteria_renal_esquerda = {
    ...state.arteria_renal_esquerda,
    assessment: 'normal',
    psv_proximal_cms: '88',
    rar: '1,1',
    ir_unspecified: '0,58',
    spectral_pattern: 'normal',
    ta_ms_unspecified: '48',
    ia_cms2_unspecified: '510',
  }

  const adapted = adaptarDopplerRenal(state)
  assert.equal(adapted.dados.aorta.psv_cms, 82.5)
  assert.deepEqual(adapted.dados.sides.right.kidney.medidas_cm, [10.2, 4.8, 5.1])
  assert.equal(adapted.dados.sides.right.kidney.espessura_parenquima_cm, 1.6)
  assert.deepEqual(adapted.dados.sides.left.kidney.medidas_cm, [12.1, 5.2, 5.4])
  assert.deepEqual(adapted.dados.sides.right.artery.psv_cms.map((item) => item.value), [181.5, 150, 122])
  assert.deepEqual(adapted.dados.sides.left.artery.psv_cms.map((item) => item.value), [88])
  assert.equal(adapted.dados.sides.right.artery.documented_rar, 2.2)
  assert.deepEqual(adapted.dados.sides.right.intrarenal.ri.map((item) => item.value), [0.61, 0.64, 0.63])
  assert.deepEqual(adapted.dados.sides.right.intrarenal.acceleration_time_ms, [{ territory: 'upper_pole', value: 72 }])
  assert.deepEqual(adapted.dados.sides.right.intrarenal.acceleration_index_cms2, [{ territory: 'upper_pole', value: 280 }])
  assert.equal(adapted.dados.sides.right.intrarenal.spectral_pattern, 'tardus_parvus')
  assert.equal(adapted.dados.sides.left.intrarenal.spectral_pattern, 'normal')
  assert.equal(adapted.dados.derived.conclusion_candidate_strict_gt_1_8_cm, true)
  assert.deepEqual(adapted.pendencias, [])
})

test('limite de 1,8 cm é estrito e somente os dados clínicos mínimos bloqueiam', () => {
  const state = initialExamState(dopplerRenal)
  state.rim_direito = { ...state.rim_direito, medidas: '10,2 x 4,8 x 5,1' }
  state.rim_esquerdo = { ...state.rim_esquerdo, medidas: '12,0 x 5,2 x 5,4' }
  const adapted = adaptarDopplerRenal(state)
  assert.equal(adapted.dados.derived.maximum_renal_measurement_difference_cm, 1.8000000000000007)
  assert.equal(adapted.dados.derived.conclusion_candidate_strict_gt_1_8_cm, false)
  assert.ok(adapted.pendencias.some((item) => item.onde === 'aorta' && item.bloqueia))
  assert.ok(adapted.pendencias.some((item) => item.onde === 'artéria renal direita' && item.bloqueia))
  assert.ok(adapted.pendencias.some((item) => item.onde === 'artéria renal esquerda' && item.bloqueia))
  assert.ok(!adapted.pendencias.some((item) => item.onde === 'laudo final'))
})

test('assimetria usa a maior entre L, AP e T de cada rim', () => {
  const state = initialExamState(dopplerRenal)
  state.rim_direito = { ...state.rim_direito, medidas: '10,2 x 13,0 x 5,1' }
  state.rim_esquerdo = { ...state.rim_esquerdo, medidas: '10,5 x 9,0 x 8,0' }
  const adapted = adaptarDopplerRenal(state)
  assert.equal(adapted.dados.derived.right_maximum_measurement_cm, 13)
  assert.equal(adapted.dados.derived.left_maximum_measurement_cm, 10.5)
  assert.equal(adapted.dados.derived.maximum_renal_measurement_difference_cm, 2.5)
  assert.equal(adapted.dados.derived.conclusion_candidate_strict_gt_1_8_cm, true)
})

test('estado alterado sem dado objetivo falha fechado', () => {
  const state = initialExamState(dopplerRenal)
  state.aorta = { ...state.aorta, assessment: 'abnormal' }
  state.arteria_renal_direita = { ...state.arteria_renal_direita, assessment: 'abnormal' }
  state.arteria_renal_esquerda = { ...state.arteria_renal_esquerda, assessment: 'normal' }
  const adapted = adaptarDopplerRenal(state)
  assert.ok(adapted.pendencias.some((item) => item.onde === 'aorta' && item.motivo.includes('VPS')))
  assert.ok(adapted.pendencias.some((item) => item.onde === 'artéria renal direita' && item.motivo.includes('medida')))
})

test('padrão tardus-parvus conflita com avaliação sem alteração', () => {
  const state = initialExamState(dopplerRenal)
  state.aorta = { ...state.aorta, assessment: 'normal', vps_cms: '80' }
  state.arteria_renal_direita = { ...state.arteria_renal_direita, assessment: 'normal', spectral_pattern: 'tardus_parvus' }
  state.arteria_renal_esquerda = { ...state.arteria_renal_esquerda, assessment: 'normal' }
  const adapted = adaptarDopplerRenal(state)
  assert.ok(adapted.pendencias.some((item) => item.onde === 'artéria renal direita' && item.motivo.includes('conflita')))
})

test('entrada inválida e dados sem estado de avaliação geram bloqueios nomeados', () => {
  const state = initialExamState(dopplerRenal)
  state.aorta = { ...state.aorta, assessment: 'limited', limitation: '' }
  state.arteria_renal_direita = {
    ...state.arteria_renal_direita,
    psv_proximal_cms: 'cento e vinte',
    ta_ms_upper: '72',
  }
  const pending = adaptarDopplerRenal(state).pendencias
  assert.ok(pending.some((item) => item.onde === 'aorta' && item.motivo.includes('limitação')))
  assert.ok(pending.some((item) => item.onde === 'VPS ostial/proximal' && item.motivo.includes('numérico')))
  assert.ok(pending.some((item) => item.onde === 'artéria renal direita' && item.motivo.includes('estado')))
})

test('R3 mantém formulário utilizável sem VPS aórtica quando renal >250 e RAR pendente', () => {
  const state = initialExamState(dopplerRenal)
  state.arteria_renal_direita = { ...state.arteria_renal_direita, assessment: 'abnormal', psv_proximal_cms: '290' }
  state.arteria_renal_esquerda = { ...state.arteria_renal_esquerda, assessment: 'normal' }
  assert.deepEqual(adaptarDopplerRenal(state).pendencias, [])
})

test('extensões opcionais preservam lado e exigem confirmação de seus dados', () => {
  const state = initialExamState(dopplerRenal)
  state.aorta = { ...state.aorta, assessment: 'normal', vps_cms: '80' }
  state.arteria_renal_direita = { ...state.arteria_renal_direita, assessment: 'abnormal', spectral_pattern: 'tardus_parvus', indirect_conclusion: 'confirmed', ir_upper: '0,84', ri_conclusion: 'confirmed', accessory: 'identified', accessory_psv_cms: '115', renal_vein: 'patent', stent: 'present', stent_psv_cms: '290', renal_segmental_ratio: '3,2' }
  state.arteria_renal_esquerda = { ...state.arteria_renal_esquerda, assessment: 'normal' }
  const result = adaptarDopplerRenal(state)
  assert.deepEqual(result.pendencias, [])
  assert.equal(result.dados.sides.right.extensions.accessory_psv_cms, 115)
  assert.equal(result.dados.sides.left.extensions.accessory_identified, false)
  state.arteria_renal_direita.stent = 'not_assessed'
  assert.ok(adaptarDopplerRenal(state).pendencias.some((p) => /stent/.test(p.motivo)))
})

console.log(`${cases} Doppler renal structured web cases passed`)
