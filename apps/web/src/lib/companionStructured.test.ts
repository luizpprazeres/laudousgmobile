import assert from 'node:assert/strict'
import { applyCompanionBreast, applyCompanionStructured, applyCompanionThyroid } from './companionStructured'
import { initialTireoideState } from './deterministic/organs/tireoide'

const obstetrica = applyCompanionStructured({}, {
  category: 'OBSTETRICA',
  data: { dbp: '82', cc: '295', ipRightUterine: '0,72', ipLeftUterine: '0,68', ipUmbilical: '1,02' },
})
assert.deepEqual(obstetrica.biometria, { dbp: '82', cc: '295' })
assert.equal(obstetrica.doppler?.realizado, 'sim')
assert.equal(obstetrica.doppler?.['realizado.sim.ip_ut_medio'], '0,70')
assert.equal(obstetrica.doppler?.['realizado.sim.ip_umb'], '1,02')

const isolado = applyCompanionStructured({}, {
  category: 'DOPPLER_OBSTETRICO',
  data: { dbp: '90', irUmbilical: '0,58', ipUmbilical: '1,00' },
})
assert.equal(isolado.biometria, undefined)
assert.deepEqual(isolado.doppler, { ir_umb: '0,58', ip_umb: '1,00' })

const morfologico = applyCompanionStructured({ extrafetal: { placenta_loc: 'posterior' } }, {
  category: 'MORFOLOGICO',
  data: { cf: '33', cerebellum: '20', ila: '12' },
})
assert.equal(morfologico.biometria?.femur, '33')
assert.equal(morfologico.biometria?.cerebelo, '20')
assert.deepEqual(morfologico.extrafetal, { placenta_loc: 'posterior', ila: '12' })

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

console.log('companionStructured: ok')
