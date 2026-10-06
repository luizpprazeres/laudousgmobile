import assert from 'node:assert/strict'

import * as importedAdapter from './morfologicoParaCatalogo.ts'
import * as importedCategory from '../deterministic/organs/morfologico.ts'

const adapterModule = importedAdapter as typeof importedAdapter & { default?: typeof importedAdapter }
const categoryModule = importedCategory as typeof importedCategory & { default?: typeof importedCategory }
const { adaptarMorfologico } = adapterModule.default ?? adapterModule
const { morfologico } = categoryModule.default ?? categoryModule

function estadoInicial(trimestre: '2t' | '3t') {
  const secoes = morfologico.resolveSections?.({ trimestre }) ?? []
  return Object.fromEntries(secoes.map((secao) => [secao.id, secao.module.initialState()]))
}

const base2t = estadoInicial('2t')
const numerosInvalidos = adaptarMorfologico({
  ...base2t,
  feto: { ...base2t.feto, bcf: '145 bpm' },
  biometria: {
    ...base2t.biometria,
    dbp: '52 mm',
    cc: '-180',
    ca: '150x',
    peso: '480 g',
  },
  extrafetal: { ...base2t.extrafetal, ila: '14 cm' },
}, { trimestre: '2t' })
assert.deepEqual(
  numerosInvalidos.pendencias.filter((p) => p.bloqueia).map((p) => p.onde),
  ['BCF', 'biometria · DBP', 'biometria · CC', 'biometria · CA', 'biometria · peso fetal', 'ILA'],
)
assert.equal(numerosInvalidos.dados.bcf_bpm, null)
assert.equal(numerosInvalidos.dados.dbp_mm, null)
assert.equal(numerosInvalidos.dados.cc_mm, null)
assert.equal(numerosInvalidos.dados.ca_mm, null)
assert.equal(numerosInvalidos.dados.peso_g, null)
assert.equal(numerosInvalidos.dados.ila_cm, null)

const numerosValidos = adaptarMorfologico({
  ...base2t,
  feto: { ...base2t.feto, bcf: '145' },
  biometria: {
    ...base2t.biometria,
    dbp: '52,3', cc: '180', ca: '152,5', femur: '33', peso: '480',
  },
  extrafetal: { ...base2t.extrafetal, ila: '14,2' },
}, { trimestre: '2t' })
assert.equal(numerosValidos.pendencias.some((p) => p.bloqueia), false)
assert.equal(numerosValidos.dados.bcf_bpm, 145)
assert.equal(numerosValidos.dados.dbp_mm, 52.3)
assert.equal(numerosValidos.dados.ca_mm, 152.5)
assert.equal(numerosValidos.dados.peso_g, 480)
assert.equal(numerosValidos.dados.ila_cm, 14.2)

const vitalidadeContraditoria = adaptarMorfologico({
  ...base2t,
  feto: { ...base2t.feto, vitalidade: 'ausente', bcf: '145', movimentos: 'normais' },
}, { trimestre: '2t' })
assert.ok(vitalidadeContraditoria.pendencias.some((p) => p.bloqueia && p.onde === 'vitalidade'))
assert.ok(vitalidadeContraditoria.pendencias.some((p) => p.bloqueia && p.onde === 'movimentos'))
assert.equal(vitalidadeContraditoria.dados.bcf_bpm, null)

const base3t = estadoInicial('3t')
const binocularOculta = adaptarMorfologico({
  ...base3t,
  biometria: { ...base3t.biometria, binocular: '30 mm' },
}, { trimestre: '3t' })
assert.equal(binocularOculta.pendencias.some((p) => p.onde === 'biometria · distância binocular'), false)
assert.equal(binocularOculta.dados.binocular_mm, null)

console.log('✓ Morfológico 2º/3º trimestre: números estritos e contradições aprovados')
