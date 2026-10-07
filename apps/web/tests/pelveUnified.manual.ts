import assert from 'node:assert/strict'
import {
  adaptarPelve,
  adaptarPelvePreset,
  adaptarPelveTransabdominal,
  adaptarPelveTransvaginal,
  adaptarPelveUnificada,
} from '../src/lib/catalog/pelveParaCatalogo'
import {
  CATEGORIES,
  initialExamState,
  type ExamState,
} from '../src/lib/deterministic'
import {
  MONITORIZACAO_FOLICULAR,
  PELVICO_TRANSABDOMINAL_DOPPLER,
  PELVICO_TRANSVAGINAL_DOPPLER,
} from '../src/lib/deterministic/organs/pelvePresets'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

function patch(state: ExamState, section: string, values: Record<string, string | string[]>): ExamState {
  return { ...state, [section]: { ...state[section], ...values } }
}

function measured(category: string): ExamState {
  let state = initialExamState(CATEGORIES[category]!)
  if (category.includes('TRANSABDOMINAL')) state = patch(state, 'bexiga', { replecao: 'adequada' })
  state = patch(state, 'utero', { medidas: '7,8 x 4,2 x 4,8' })
  state = patch(state, 'endometrio', { espessura: '0,7' })
  state = patch(state, 'ovario_direito', { medidas: '3,1 x 2,0 x 1,8' })
  state = patch(state, 'ovario_esquerdo', { medidas: '2,9 x 1,9 x 1,7' })
  if (category === MONITORIZACAO_FOLICULAR) state = patch(state, 'ovario_direito', { foliculos_mm: '8, 10, 18' })
  return state
}

const options = (state: ExamState) => (state.__opts ?? {}) as Record<string, string | string[]>
const blocked = (result: ReturnType<typeof adaptarPelveUnificada>) => result.pendencias.filter((item) => item.bloqueia)

test('despacho único preserva os adaptadores dos cinco cards existentes', () => {
  const tv = measured('PELVICO_TRANSVAGINAL')
  assert.deepEqual(adaptarPelveUnificada(tv, 'PELVICO_TRANSVAGINAL'), adaptarPelveTransvaginal(tv, options(tv)))

  const ta = measured('PELVICO_TRANSABDOMINAL')
  assert.deepEqual(adaptarPelveUnificada(ta, 'PELVICO_TRANSABDOMINAL'), adaptarPelveTransabdominal(ta, options(ta)))

  for (const category of [PELVICO_TRANSVAGINAL_DOPPLER, PELVICO_TRANSABDOMINAL_DOPPLER, MONITORIZACAO_FOLICULAR]) {
    const state = measured(category)
    assert.deepEqual(adaptarPelveUnificada(state, category), adaptarPelvePreset(state, category), category)
  }
})

test('categoria Pelve usa o mesmo portão seguro quando a via escolhida é TV', () => {
  const state = { ...initialExamState(CATEGORIES.PELVE_FEMININA!), __opts: { via: 'tv', modo_pelve: 'rotina' } }
  const result = adaptarPelveUnificada(state, 'PELVE_FEMININA')
  assert.ok(blocked(result).some((item) => item.onde === 'útero'))
  assert.ok(blocked(result).some((item) => item.onde === 'endométrio'))
  assert.ok(blocked(result).some((item) => item.onde === 'ovário direito'))
  assert.equal(result.dados.via, 'tv')
})

test('categoria Pelve usa o mesmo portão seguro quando a via escolhida é TA', () => {
  const state = { ...initialExamState(CATEGORIES.PELVE_FEMININA!), __opts: { via: 'ta', modo_pelve: 'rotina' } }
  const result = adaptarPelveUnificada(state, 'PELVE_FEMININA')
  assert.ok(blocked(result).some((item) => item.onde === 'bexiga' && /confirme a repleção/.test(item.motivo)))
  assert.ok(blocked(result).some((item) => item.onde === 'útero'))
  assert.equal(result.dados.via, 'ta')
})

test('repleção pendente aparece como pendente no seletor, sem exibir adequada', () => {
  const field = CATEGORIES.PELVE_FEMININA!.sections
    .find((section) => section.id === 'bexiga')!
    .module!.schema.fields.find((item) => item.key === 'replecao')!
  assert.equal(field.options?.[0]?.value, '')
  assert.equal(field.options?.[0]?.label, 'Confirme a repleção')
  assert.equal(initialExamState(CATEGORIES.PELVE_FEMININA!).bexiga?.replecao, '')
})

test('TA + TV e pós-abortamento preservam o adaptador canônico já validado', () => {
  const combined = { ...measured('PELVE_FEMININA'), __opts: { via: 'ta_tv', modo_pelve: 'rotina' } }
  assert.deepEqual(adaptarPelveUnificada(combined, 'PELVE_FEMININA'), adaptarPelve(combined, options(combined)))

  const postAbortion = { ...combined, __opts: { via: 'ta_tv', modo_pelve: 'pos_abortamento' } }
  assert.deepEqual(adaptarPelveUnificada(postAbortion, 'PELVE_FEMININA'), adaptarPelve(postAbortion, options(postAbortion)))
})

test('Doppler exige vascularização do achado também na categoria unificada', () => {
  let state = { ...measured('PELVE_FEMININA'), __opts: { via: 'tv', modo_pelve: 'doppler' } }
  state = patch(state, 'ovario_esquerdo', {
    achado: 'cisto_simples',
    'achado.cisto_simples.medidas': '2,0 x 1,8 x 1,6',
  })
  assert.ok(blocked(adaptarPelveUnificada(state, 'PELVE_FEMININA')).some((item) => /vascularização ao Doppler/.test(item.motivo)))
  state = patch(state, 'ovario_esquerdo', { 'achado.cisto_simples.vascularizacao': 'ausente' })
  assert.equal(blocked(adaptarPelveUnificada(state, 'PELVE_FEMININA')).length, 0)
})

test('monitorização força TV e não deixa menopausa residual chegar ao laudo', () => {
  let state = { ...measured('PELVE_FEMININA'), __opts: { via: 'ta_tv', modo_pelve: 'monitorizacao_folicular', menopausa: ['sim'] } }
  state = patch(state, 'ovario_direito', { foliculos_mm: '8, 10, 18' })
  const result = adaptarPelveUnificada(state, 'PELVE_FEMININA')
  assert.equal(result.dados.via, 'tv')
  assert.notEqual(result.dados.endometrio_frase, 'menopausa')
  assert.equal(blocked(result).length, 0)
})

assert.throws(() => adaptarPelveUnificada({}, 'CATEGORIA_FORA_DA_PELVE'), /não pertence à família Pelve/)
console.log(`${cases} pelve unified cases passed`)
