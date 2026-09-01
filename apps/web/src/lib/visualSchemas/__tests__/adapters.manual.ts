import assert from 'node:assert/strict'
import { breastFindingsFromState, moveBreastFinding, moveThyroidFinding, thyroidFindingsFromState } from '../adapters'
import { initialTireoideState } from '../../deterministic'

const breast = {
  achados_ids: ['a'],
  'achados.a.lado': 'direita',
  'achados.a.tipo': 'nodulo',
  'achados.a.margem': 'microlobulada',
  'achados.a.medidas': '1,2 x 0,8 cm',
  'achados.a.horario': '10 horas',
  'achados.a.dist_mamilo': '3,0',
}
const projectedBreast = breastFindingsFromState(breast)
assert.equal(projectedBreast[0]?.type, 'solid_lobulated')
assert.equal(projectedBreast[0]?.quadrant, 'QSL')
assert.equal(projectedBreast[0]?.sizeMaxMm, 12)
const movedBreast = moveBreastFinding(breast, 'a', { side: 'esquerda', hour: 2, nippleDistanceCm: 4.4 })
assert.equal(movedBreast['achados.a.lado'], 'esquerda')
assert.equal(movedBreast['achados.a.local'], 'quadrante superolateral')
assert.equal(movedBreast['achados.a.dist_mamilo'], '4,4')

const thyroid = initialTireoideState()
thyroid.nodulos = [{ id: 'n', lobo: 'lobo_direito', ecogenicidade: 'anecoica', margem: 'regulares', halo: null, forma: null, calcificacoes: null, vascularizacao: null, c1: '1,1', c2: '', c3: '', localizacao: 'no terço superior' }]
assert.equal(thyroidFindingsFromState(thyroid)[0]?.type, 'cystic')
const movedThyroid = moveThyroidFinding(thyroid, 'n', { side: 'esquerdo', third: 'inferior' })
assert.equal(movedThyroid.nodulos[0]?.lobo, 'lobo_esquerdo')
assert.equal(movedThyroid.nodulos[0]?.localizacao, 'no terço inferior')

console.log('Sprint 18 visual schema adapters: OK')
