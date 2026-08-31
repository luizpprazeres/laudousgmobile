import assert from 'node:assert/strict'
import { applyCompanionStructured } from './companionStructured'

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

console.log('companionStructured: ok')
