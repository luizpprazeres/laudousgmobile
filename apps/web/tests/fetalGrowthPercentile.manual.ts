import assert from 'node:assert/strict'
import { adaptarObstetrica } from '../src/lib/catalog/obstetricaParaCatalogo'
import { adaptarMorfologico } from '../src/lib/catalog/morfologicoParaCatalogo'
import { adaptarDopplerWeb } from '../src/lib/catalog/dopplerWebMode'

let cases = 0
const adapters = [adaptarObstetrica, adaptarMorfologico, adaptarDopplerWeb]
const makeState = (value: string | undefined, active = 'sim') => ({
  ig: {bio_sem: '32', bio_dias: '0'},
  crescimento_fetal: {
    avaliar: active,
    ...(value === undefined ? {} : {'avaliar.sim.percentil': value}),
    'avaliar.sim.fonte': 'Hadlock 1991',
  },
})
for (const adapt of adapters) {
  for (const value of [undefined, '', '   ', '8abc', '8%', '8,2,3', '-1', '101', '100.01', 'NaN', 'Infinity', '1e1']) {
    const state = makeState(value)
    const snapshot = JSON.stringify(state)
    const result = adapt(state)
    assert.deepEqual(result.pendencias, [{
      onde: 'Percentil do peso fetal', valor: value ?? '',
      motivo: 'Informe um número entre 0 e 100, sem %.', bloqueia: true,
    }])
    assert.equal(result.dados.crescimento_fetal, null)
    assert.equal(JSON.stringify(state), snapshot)
    const off = {...state, crescimento_fetal: {...state.crescimento_fetal, avaliar: 'nao'}}
    assert.deepEqual(adapt(off).pendencias, [])
    assert.equal(adapt(off).dados.crescimento_fetal, null)
    assert.equal(off.crescimento_fetal['avaliar.sim.percentil'], value)
    assert.equal(adapt(state).pendencias[0].valor, value ?? '')
    cases++
  }
  for (const [value, expected] of [['0', 0], ['100', 100], ['8,2', 8.2], ['8.2', 8.2], [' 8,25 ', 8.25], ['0.01', 0.01]] as const) {
    const state = makeState(value)
    const snapshot = JSON.stringify(state)
    const result = adapt(state)
    assert.deepEqual(result.pendencias, [])
    const growth = result.dados.crescimento_fetal as Record<string, unknown>
    assert.equal(growth.efwPercentile, expected)
    assert.equal(growth.efwPercentileSource, 'Hadlock 1991')
    assert.equal(JSON.stringify(state), snapshot)
    cases++
  }
}
const isolated = adaptarDopplerWeb({...makeState('8abc'), __opts: {somente_doppler: 'sim'}})
assert.deepEqual(isolated.pendencias, [])
console.log(`${cases + 1} percentile cases passed: OBST/MORFO/combined, raw preserved, off/on, isolated excluded`)
