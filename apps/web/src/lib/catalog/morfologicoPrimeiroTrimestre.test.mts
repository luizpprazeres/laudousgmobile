import assert from 'node:assert/strict'

import * as importedAdapter from './morfologicoParaCatalogo.ts'
import * as importedCategory from '../deterministic/organs/morfologico.ts'

const adapterModule = importedAdapter as typeof importedAdapter & { default?: typeof importedAdapter }
const categoryModule = importedCategory as typeof importedCategory & { default?: typeof importedCategory }
const { adaptarMorfologico } = adapterModule.default ?? adapterModule
const { morfologico } = categoryModule.default ?? categoryModule

const estado = {
  ig: { bio_sem: '12', bio_dias: '3' },
  primeiro_trimestre: {
    bcf: '158',
    ccn: '64,0',
    tn: '1,5',
    osso_nasal: 'presente',
    ducto_venoso: 'normal',
    placenta_loc: 'posterior',
  },
  doppler: {
    realizado: 'sim',
    'realizado.sim.ip_ut_dir': '1,20',
    'realizado.sim.ip_ut_esq': '1,40',
  },
}

const adaptado = adaptarMorfologico(estado, { trimestre: '1t' })
assert.deepEqual(adaptado.pendencias, [])
assert.equal(adaptado.dados.trimestre, '1t')
assert.equal(adaptado.dados.bcf_bpm, 158)
assert.equal(adaptado.dados.ccn_mm, 64)
assert.equal(adaptado.dados.tn_mm, 1.5)
assert.equal(adaptado.dados.osso_nasal, 'presente')
assert.equal(adaptado.dados.ducto_venoso, 'normal')
assert.equal(adaptado.dados.uterina_ip_direita, 1.2)
assert.equal(adaptado.dados.uterina_ip_esquerda, 1.4)
assert.equal(adaptado.dados.placenta_localizacao, 'posterior')

const secoes1t = morfologico.resolveSections?.({ trimestre: '1t' }) ?? []
assert.deepEqual(
  secoes1t.map((secao) => secao.id),
  ['ig', 'primeiro_trimestre', 'cervicometria', 'doppler', 'achados'],
)
assert.equal(morfologico.resolveTitle?.({ trimestre: '1t' }), 'ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE')
assert.deepEqual(morfologico.resolveCalculators?.({ trimestre: '2t' }), [])
assert.equal(morfologico.resolveCalculators?.({ trimestre: '1t' })?.[0]?.id, 'pre-eclampsia-fmf')

console.log('✓ Morfológico 1º trimestre: tela → renderer e navegação aprovados')
