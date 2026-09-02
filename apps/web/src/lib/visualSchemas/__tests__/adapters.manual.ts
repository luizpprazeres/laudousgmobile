import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { addVisualBreastCyst, breastFindingsFromState, moveBreastFinding, moveThyroidFinding, removeVisualBreastCyst, thyroidFindingsFromState } from '../adapters'
import { initialTireoideState } from '../../deterministic'

const thyroidAssets = [
  ['frontal-v2.png', '6c9aac3ce785d7c872e0478c98acb72899a8f4f7d74970d8ca5bf82c8eeceac2'],
  ['transverse-v2.png', '92cfd76df6dc12320118cb29ee9c7b250ff2ff2d2c6dead310f7d8a10e459a0e'],
] as const

const breastAssets = [
  ['frontal-v5.svg', '7e714f46f5f044cc0b41659fbd9409ab6b4191821aa65d399b640e9f1eeb2d13'],
] as const

for (const [file, expected] of thyroidAssets) {
  const contents = readFileSync(resolve(process.cwd(), 'apps/web/public/schemas/thyroid', file))
  assert.equal(createHash('sha256').update(contents).digest('hex'), expected, `${file} foi alterado sem atualizar a revisão clínica e o manifesto`)
}

for (const [file, expected] of breastAssets) {
  const contents = readFileSync(resolve(process.cwd(), 'apps/web/public/schemas/breast', file))
  assert.equal(createHash('sha256').update(contents).digest('hex'), expected, `${file} foi alterado sem atualizar a revisão clínica e o manifesto`)
}

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

const retroareolarBreast = {
  ...breast,
  'achados.a.local': 'região retroareolar',
  'achados.a.margem': 'espiculada',
}
assert.equal(breastFindingsFromState(retroareolarBreast)[0]?.retroareolar, true)
assert.equal(breastFindingsFromState(retroareolarBreast)[0]?.type, 'solid_spiculated')
const movedToRetroareolar = moveBreastFinding(retroareolarBreast, 'a', { side: 'direita', hour: 12, nippleDistanceCm: 0.6, retroareolar: true })
assert.equal(movedToRetroareolar['achados.a.local'], 'região retroareolar')

const multipleCysts = {
  achados_ids: ['cistos'],
  'achados.cistos.lado': 'direita',
  'achados.cistos.tipo': 'multiplos_cistos',
  'achados.cistos.medidas': '0,8 x 0,6 x 0,5 cm',
  'achados.cistos.local': 'quadrante superolateral',
  'achados.cistos.horario': '11 horas',
  'achados.cistos.dist_mamilo': '2,0',
}
const withVisualCyst = addVisualBreastCyst(multipleCysts, 'cistos', 'extra-1')
assert.deepEqual(withVisualCyst.achados_ids, ['cistos'], 'o cisto visual não pode criar outro achado no laudo')
const projectedMultipleCysts = breastFindingsFromState(withVisualCyst)
assert.equal(projectedMultipleCysts.length, 2)
assert.equal(projectedMultipleCysts[1]?.visualOnly, true)
assert.equal(projectedMultipleCysts[1]?.sourceFindingId, 'cistos')
const movedVisualCyst = moveBreastFinding(withVisualCyst, 'visual-cyst:extra-1', { side: 'esquerda', hour: 4, nippleDistanceCm: 3.2 })
assert.equal(movedVisualCyst['schema_visual_cysts.extra-1.lado'], 'esquerda')
assert.equal(movedVisualCyst['achados.cistos.lado'], 'direita', 'arrastar o cisto visual não pode alterar o achado descrito')
const withoutVisualCyst = removeVisualBreastCyst(movedVisualCyst, 'visual-cyst:extra-1')
assert.equal(breastFindingsFromState(withoutVisualCyst).length, 1)

const thyroid = initialTireoideState()
thyroid.nodulos = [{ id: 'n', lobo: 'lobo_direito', ecogenicidade: 'anecoica', margem: 'regulares', halo: null, forma: null, calcificacoes: null, vascularizacao: null, c1: '1,1', c2: '', c3: '', localizacao: 'no terço superior' }]
assert.equal(thyroidFindingsFromState(thyroid)[0]?.type, 'cystic')
const movedThyroid = moveThyroidFinding(thyroid, 'n', { side: 'esquerdo', third: 'inferior' })
assert.equal(movedThyroid.nodulos[0]?.lobo, 'lobo_esquerdo')
assert.equal(movedThyroid.nodulos[0]?.localizacao, 'no terço inferior')

console.log('Sprint 18 visual schema adapters: OK')
