import assert from 'node:assert/strict'
import { rimDireitoModule, rimEsquerdoModule } from '../src/lib/deterministic/organs/rim'
import { adaptarAbdome } from '../src/lib/catalog/abdomeParaCatalogo'
import { hasRenalMeasurementsGroup, renalMeasurementsEnabled, toggleRenalMeasurements } from '../src/components/laudar/renalMeasurementsState'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { renalTestTemplate } from './renalMeasurements.fixture'

let count = 0
function test(name: string, run: () => void) { run(); console.log(`PASS ${++count}: ${name}`) }
for (const module of [rimDireitoModule, rimEsquerdoModule]) {
  test(`${module.schema.id}: escopo estrito e estado vazio`, () => {
    assert.equal(hasRenalMeasurementsGroup(module.schema), true)
    assert.equal(hasRenalMeasurementsGroup({ ...module.schema, category: 'VIAS_URINARIAS' }), false)
    assert.equal(hasRenalMeasurementsGroup({ ...module.schema, id: 'figado' }), false)
    const initial = module.initialState()
    assert.equal(renalMeasurementsEnabled(initial), false)
    assert.equal(renalMeasurementsEnabled(toggleRenalMeasurements(initial, true)), true)
  })
  test(`${module.schema.id}: legado, rascunho imutavel e ciclos`, () => {
    const original = { ...module.initialState(), medidas: '10,2 x 4,8 x 5,1', espessura: '1,6', dimensoes: 'reduzido', litiase: ['calculo'], 'litiase.calculo.dimensao': '5 mm' }
    const snapshot = JSON.stringify(original)
    assert.equal(renalMeasurementsEnabled(original), true)
    const off = toggleRenalMeasurements(original, false)
    assert.equal(off.medidas, '')
    assert.equal(off.espessura, '')
    assert.equal(renalMeasurementsEnabled(off), false)
    assert.equal(JSON.stringify(original), snapshot)
    assert.equal(toggleRenalMeasurements(off, false), off)
    const on = toggleRenalMeasurements(off, true)
    for (const key of ['medidas', 'espessura', 'dimensoes', 'litiase', 'litiase.calculo.dimensao']) assert.deepEqual(on[key], original[key as keyof typeof original])
    const edited = { ...on, medidas: '9,9', espessura: '' }
    assert.equal(toggleRenalMeasurements(toggleRenalMeasurements(edited, false), true).medidas, '9,9')
    assert.equal(toggleRenalMeasurements(toggleRenalMeasurements(edited, false), true).espessura, '')
  })
  for (const dimensoes of ['normal', 'reduzido']) {
    for (const style of ['CLASSICO_COMPLETO', 'OBJETIVO']) {
      test(`${module.schema.id}/${dimensoes}/${style}: exclusao real e restauracao`, () => {
        const state = { ...module.initialState(), dimensoes, medidas: '10,2 x 4,8 x 5,1', espessura: '1,6' }
        const render = (renal: typeof state | ReturnType<typeof toggleRenalMeasurements>) => {
          const adapted = adaptarAbdome({ [module.schema.id]: renal })
          assert.deepEqual(adapted.pendencias, [])
          const result = renderizarSelecao('ABDOMEN_TOTAL', style, [], adapted.dados, { templateBody: renalTestTemplate })
          assert.ok(result.ok, JSON.stringify(result))
          if (!result.ok) throw new Error('Renderer failed')
          return result.texto
        }
        const before = render(state)
        assert.match(before, /10,2/)
        assert.match(before, /1,6/)
        const off = toggleRenalMeasurements(state, false)
        const without = render(off)
        assert.doesNotMatch(without, /10,2|4,8|5,1|1,6/)
        assert.equal(without, render({ ...state, medidas: '', espessura: '' }))
        assert.equal(render(toggleRenalMeasurements(off, true)), before)
      })
    }
  }
}
test('campos parciais e lados independentes', () => {
  for (const key of ['medidas', 'espessura']) {
    const partial = { ...rimDireitoModule.initialState(), [key]: '1,6' }
    assert.equal(renalMeasurementsEnabled(partial), true)
    assert.equal(toggleRenalMeasurements(toggleRenalMeasurements(partial, false), true)[key], '1,6')
  }
  const right = { ...rimDireitoModule.initialState(), medidas: '10,2' }
  const left = { ...rimEsquerdoModule.initialState(), medidas: '11,3' }
  const data = JSON.stringify(adaptarAbdome({ rim_direito: toggleRenalMeasurements(right, false), rim_esquerdo: left }).dados)
  assert.ok(!data.includes('10.2') && data.includes('11.3'))
})
console.log(`${count}/${count} renal focused tests passed`)
