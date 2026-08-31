import assert from 'node:assert/strict'
import { applyCompanionBreast, applyCompanionCarotids, applyCompanionStructured, applyCompanionThyroid } from './companionStructured'
import { initialTireoideState } from './deterministic/organs/tireoide'

const obstetrica = applyCompanionStructured({}, {
  category: 'OBSTETRICA',
  data: {
    dbp: '8.2 cm', cc: '295 mm', weight: '1.250 g', percentile: 'P48',
    gestAgeBiometry: '32s4d', ipRightUterine: '0,72', ipLeftUterine: '0,68', ipUmbilical: '1,02',
  },
})
assert.deepEqual(obstetrica.biometria, { dbp: '82', cc: '295', peso: '1250' })
assert.deepEqual(obstetrica.ig, { bio_sem: '32', bio_dias: '4' })
assert.equal(obstetrica.crescimento_fetal?.avaliar, 'sim')
assert.equal(obstetrica.crescimento_fetal?.['avaliar.sim.percentil'], '48')
assert.equal(obstetrica.crescimento_fetal?.['avaliar.sim.fonte_outra'], 'informado pelo aparelho')
assert.equal(obstetrica.doppler?.realizado, 'sim')
assert.equal(obstetrica.doppler?.['realizado.sim.ip_ut_medio'], '0,70')
assert.equal(obstetrica.doppler?.['realizado.sim.ip_umb'], '1,02')

const isolado = applyCompanionStructured({}, {
  category: 'DOPPLER_OBSTETRICO',
  data: { dbp: '90', gestAgeLMP: '28w3d', irUmbilical: '0,58', ipUmbilical: '1,00' },
})
assert.equal(isolado.biometria, undefined)
assert.deepEqual(isolado.doppler, { ir_umb: '0,58', ip_umb: '1', ig_sem: '28', ig_dias: '3' })

const morfologico = applyCompanionStructured({ extrafetal: { placenta_loc: 'posterior' } }, {
  category: 'MORFOLOGICO',
  data: {
    cf: '3.3 cm', cerebellum: '20 mm', ila: '120 mm', gender: 'feminino',
    gestAgeBiometry: '21+2', percentile: '52%',
  },
})
assert.equal(morfologico.biometria?.femur, '33')
assert.equal(morfologico.biometria?.cerebelo, '20')
assert.deepEqual(morfologico.extrafetal, { placenta_loc: 'posterior', ila: '12' })
assert.deepEqual(morfologico.ig, { bio_sem: '21', bio_dias: '2' })
assert.equal(morfologico.anatomia?.genitalia, 'feminina')
assert.equal(morfologico.crescimento_fetal?.['avaliar.sim.percentil'], '52')

const tireoide = applyCompanionThyroid(initialTireoideState(), {
  category: 'TIREOIDE',
  data: {
    thyroidRightLobe: { a: '4.2', b: '1.6', c: '1.8' },
    thyroidNodules: [{ lobe: 'lobo_direito', c1: '1.2', c2: '0.9', c3: '0.8', echogenicity: 'hipoecoica', margin: 'regular' }],
  },
})
assert.deepEqual(tireoide.lobo_direito, { a: '4.2', b: '1.6', c: '1.8', ecotextura: 'normal' })
assert.equal(tireoide.nodulos.length, 1)
assert.equal(tireoide.nodulos[0]?.ecogenicidade, 'hipoecoica')
assert.equal(tireoide.nodulos[0]?.margem, 'regular')

const tireoidePreservada = applyCompanionThyroid({
  ...tireoide,
  lobo_direito: { ...tireoide.lobo_direito, a: '4,5' },
}, {
  category: 'TIREOIDE',
  data: {
    thyroidRightLobe: { a: '4.8', b: '1.7' },
    thyroidNodules: [{ lobe: 'lobo_direito', c1: '1.2', c2: '0.9', c3: '0.8', echogenicity: 'hipoecoica', margin: 'irregular', shape: 'mais_larga_que_alta' }],
  },
})
assert.equal(tireoidePreservada.lobo_direito.a, '4,5')
assert.equal(tireoidePreservada.lobo_direito.b, '1.6')
assert.equal(tireoidePreservada.nodulos.length, 1)
assert.equal(tireoidePreservada.nodulos[0]?.forma, 'mais_larga_que_alta')
assert.equal(tireoidePreservada.nodulos[0]?.margem, 'regular')
assert.equal(tireoidePreservada.companionConflitos?.length, 3)

const mama = applyCompanionBreast({ mamas: { fundo: 'heterogeneo', achados_ids: [] } }, {
  category: 'MAMARIA',
  data: { breastFindings: [
    { side: 'direita', type: 'nodulo', c1: '1.2', c2: '0.9', c3: '0.8', margin: 'circunscrita' },
    { side: 'direita', type: 'cisto_simples', c1: '0.6', c2: '0.5', c3: '0.4' },
  ] },
})
assert.equal(mama.mamas?.achados_ids.length, 2)
const firstBreastId = mama.mamas?.achados_ids[0]
assert.equal(mama.mamas?.[`achados.${firstBreastId}.medidas`], '1.2 x 0.9 x 0.8')
assert.equal(mama.mamas?.[`achados.${firstBreastId}.margem`], 'circunscrita')

const mamaEnriquecida = applyCompanionBreast(mama, {
  category: 'MAMARIA',
  data: { breastFindings: [
    { side: 'direita', type: 'nodulo', c1: '1.2', c2: '0.9', c3: '0.8', margin: 'espiculada', shape: 'oval' },
  ] },
})
assert.equal(mamaEnriquecida.mamas?.achados_ids.length, 2)
assert.equal(mamaEnriquecida.mamas?.[`achados.${firstBreastId}.forma`], 'oval')
assert.equal(mamaEnriquecida.mamas?.[`achados.${firstBreastId}.margem`], 'circunscrita')
assert.equal(mamaEnriquecida.mamas?.companion_conflitos.length, 1)

const carotidas = applyCompanionCarotids({}, {
  category: 'DOPPLER_CAROTIDAS',
  data: {
    carotidMeasurements: [
      { side: 'direita', vessel: 'interna', psv: '82', vdf: '24', ir: '0.71' },
      { side: 'direita', vessel: 'externa', psv: '90', vdf: '18' },
      { side: 'esquerda', vessel: 'vertebral', psv: '41', flowDirection: 'anterogrado' },
    ],
    carotidPlaques: [{ side: 'direita', location: 'bulbo carotídeo', thickness: '2.1' }],
  },
})
assert.equal(carotidas.direita?.interna_vps, '82')
assert.equal(carotidas.direita?.externa_vdf, '18')
assert.equal(carotidas.esquerda?.vertebral_direcao, 'anterogrado')
assert.equal(carotidas.direita?.placas_ids.length, 1)

const carotidasComConflito = applyCompanionCarotids({}, {
  category: 'DOPPLER_CAROTIDAS',
  data: { carotidMeasurements: [
    { side: 'direita', vessel: 'interna', psv: '82' },
    { side: 'direita', vessel: 'interna', psv: '120' },
  ] },
})
assert.equal(carotidasComConflito.direita?.interna_vps, undefined)
assert.equal(carotidasComConflito.direita?.companion_conflitos.length, 1)

const carotidasPreservadas = applyCompanionCarotids({ direita: { interna_vps: '80' } }, {
  category: 'DOPPLER_CAROTIDAS',
  data: { carotidMeasurements: [{ side: 'direita', vessel: 'interna', psv: '82', vdf: '24' }] },
})
assert.equal(carotidasPreservadas.direita?.interna_vps, '80')
assert.equal(carotidasPreservadas.direita?.interna_vdf, '24')
assert.equal(carotidasPreservadas.direita?.companion_conflitos.length, 1)

console.log('companionStructured: ok')
