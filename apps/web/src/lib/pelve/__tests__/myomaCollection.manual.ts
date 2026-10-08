import assert from 'node:assert/strict'
import { newMyomaFinding } from '@laudousg/schemes'
import { MAX_MYOMAS, MYOMA_ITEMS_KEY, readMyomaItems } from '../myomaCollection'

const extra = newMyomaFinding({
  id: 'extra-1', figo: 6, figoConfirmed: true, sizeMaxMm: 42,
  location: 'posterior', echo: 'heterogenea',
})

const legacy = readMyomaItems({
  mioma: ['sim'],
  'mioma.sim.medidas': '3,0 x 2,5 x 2,0',
  'mioma.sim.classificacao': 'intramural',
  'mioma.sim.parede': 'parede anterior',
  'mioma.sim.figo': '4',
  'mioma.sim.ecotextura': 'hipoecoica',
  '__myoma.extraFindings': JSON.stringify([extra]),
})
assert.equal(legacy.error, null)
assert.equal(legacy.items.length, 2)
assert.deepEqual(legacy.items[0], {
  id: 'mioma', medidas: '3,0 x 2,5 x 2,0', classificacao: 'intramural',
  parede: 'parede anterior', figo: '4', ecotextura: 'hipoecoica',
  sagittalPoint: null, axialPoint: null,
})
assert.equal(legacy.items[1]?.medidas, '4,2')
assert.equal(legacy.items[1]?.classificacao, 'subseroso')
assert.equal(legacy.items[1]?.parede, 'parede posterior')

const collection = readMyomaItems({
  mioma: ['sim'],
  'mioma.sim.medidas': '9,9',
  [MYOMA_ITEMS_KEY]: JSON.stringify(legacy.items),
})
assert.deepEqual(collection, legacy, 'a coleção nova precisa vencer resíduos dos slots antigos')
assert.equal(readMyomaItems({
  mioma: ['sim'],
  'mioma.sim.figo': '4',
  [MYOMA_ITEMS_KEY]: '',
}).items.length, 1, 'chave nova vazia não pode esconder um rascunho legado')
assert.deepEqual(readMyomaItems({
  [MYOMA_ITEMS_KEY]: JSON.stringify([{
    ...legacy.items[0], medidas: ` ${legacy.items[0]!.medidas} `, classificacao: ' intramural ',
    parede: ' parede anterior ', figo: ' 4 ', ecotextura: ' hipoecoica ',
  }]),
}).items[0], legacy.items[0], 'o caminho novo precisa normalizar texto como os slots legados')

assert.equal(readMyomaItems({ '__myoma.extraFindings': '{' }).error, 'ilegivel')
assert.equal(readMyomaItems({ '__myoma.extraFindings': JSON.stringify([extra, { id: 'quebrado' }]) }).error, 'ilegivel')
assert.equal(readMyomaItems({ [MYOMA_ITEMS_KEY]: JSON.stringify([legacy.items[0], legacy.items[0]]) }).error, 'ilegivel')

const tooMany = Array.from({ length: MAX_MYOMAS + 1 }, (_, index) => newMyomaFinding({ id: `extra-${index}` }))
const overflow = readMyomaItems({ '__myoma.extraFindings': JSON.stringify(tooMany) })
assert.equal(overflow.items.length, MAX_MYOMAS + 1, 'o leitor não pode cortar um achado silenciosamente')
assert.equal(overflow.error, 'excede_limite')

console.log('myoma collection: legado, precedência e falha fechada aprovados')
