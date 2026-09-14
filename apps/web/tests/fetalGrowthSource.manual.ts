import assert from 'node:assert/strict'
import { criarFetalGrowthModule } from '../src/lib/deterministic/organs/fetalGrowth'
import { fetalGrowthDaTela } from '../src/lib/catalog/fetalGrowthParaCatalogo'
import { FetalGrowthModuleSchema, renderFetalGrowthModule } from '../../api/src/server/renderer/categories/fetalGrowthModule'
import { classifyFetalGrowth, formatFetalGrowthReport } from '@laudousg/shared'

let cases = 0
for (const category of ['OBSTETRICA', 'MORFOLOGICO']) {
  const module = criarFetalGrowthModule(category)
  assert.equal(module.initialState()['avaliar.sim.fonte'], 'nao_informada')
  const field = module.schema.fields[0].options!.find(o => o.value === 'sim')!.subFields!.find(f => f.key === 'fonte')!
  assert.deepEqual(field.options!.filter(o => o.isDefault).map(o => o.value), ['nao_informada'])
  cases++
}

const fixtures: [string | undefined, string | undefined, string][] = [
  [undefined, undefined, 'não informada'],
  ['', undefined, 'não informada'],
  ['   ', undefined, 'não informada'],
  ['nao_informada', 'nome residual', 'não informada'],
  ['Intergrowth-21st', 'nome residual', 'Intergrowth-21st'],
  ['Hadlock 1991', undefined, 'Hadlock 1991'],
  ['outra', 'Curva do aparelho', 'Curva do aparelho'],
  ['outra', '', 'não informada'],
  ['outra', '   ', 'não informada'],
  ['Fonte legada explicita', undefined, 'Fonte legada explicita'],
]
for (const [source, other, expected] of fixtures) {
  const growth = {
    avaliar: 'sim', 'avaliar.sim.percentil': '8',
    ...(source === undefined ? {} : {'avaliar.sim.fonte': source}),
    ...(other === undefined ? {} : {'avaliar.sim.fonte_outra': other}),
  }
  const state = {crescimento_fetal: growth, ig: {bio_sem: '32', bio_dias: '0'}}
  const snapshot = JSON.stringify(state)
  const data = FetalGrowthModuleSchema.parse(fetalGrowthDaTela(state))
  assert.equal(data.efwPercentileSource, expected)
  assert.equal(data.efwPercentile, 8)
  const rendered = renderFetalGrowthModule(data, 32, 0)
  assert.equal(rendered.achados[0], `Peso fetal estimado no percentil 8 pela curva ${expected}.`)
  const result = classifyFetalGrowth({...data, gestationalWeeks: 32, gestationalDays: 0})
  assert.ok(formatFetalGrowthReport(result).includes(`pela curva ${expected}.`))
  if (expected === 'não informada') assert.doesNotMatch(rendered.achados[0], /Intergrowth|Hadlock|curva Curva/)
  const explicit = classifyFetalGrowth({...data, efwPercentileSource: 'Hadlock 1991', gestationalWeeks: 32, gestationalDays: 0})
  assert.equal(result.classification, explicit.classification)
  assert.equal(JSON.stringify(state), snapshot)
  cases++
}
assert.equal(fetalGrowthDaTela({crescimento_fetal: criarFetalGrowthModule('OBSTETRICA').initialState()}), null)
console.log(`${cases + 1} source cases passed: defaults, explicit/legacy, absent, other, renderer and shared; no state mutation`)
