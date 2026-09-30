import assert from 'node:assert/strict'
import { biometryWeightMode, setBiometryWeightMode, updateBiometryMeasurements, progressiveIntergrowthWeight } from '../src/components/laudar/biometryAutomation'
import { intergrowthBiometryPreview } from '../src/lib/calculators/intergrowthBiometry'
import { invalidarPercentilManual } from '../src/components/laudar/fetalGrowthContext'

const full = { dbp: '82', cc: '295', ca: '285', cf: '62', peso: '' }
const ig = { bio_sem: '32', bio_dias: '0' }
for (const femur of ['cf', 'femur'] as const) {
  const measurements = { ...full, [femur]: '62' }
  let state = { peso: '' }
  for (const key of ['dbp', 'cc', 'ca'] as const) {
    state = updateBiometryMeasurements(state, { ...state, [key]: full[key] }, femur)
    assert.equal(state.peso, '')
  }
  state = updateBiometryMeasurements(state, { ...state, [femur]: '62' }, femur)
  assert.equal(state.peso, '1977')
  assert.equal(biometryWeightMode(state), 'automatico')
  assert.equal(biometryWeightMode({ ...state, ca: '300' }), 'manual')
  assert.equal(biometryWeightMode({ ...state, ca: '285,0' }), 'automatico')
  const changed = updateBiometryMeasurements(state, { ...state, ca: '290' }, femur)
  assert.notEqual(changed.peso, state.peso)
  const invalidated = invalidarPercentilManual(
    { biometria: state, ig, crescimento_fetal: { 'avaliar.sim.percentil': '50' } },
    { biometria: changed, ig, crescimento_fetal: { 'avaliar.sim.percentil': '50' } },
  )
  assert.equal(invalidated.crescimento_fetal['avaliar.sim.percentil'], '')
  for (const invalid of ['', '0', '-1', 'NaN', '62mm', '6e1']) {
    assert.equal(updateBiometryMeasurements(state, { ...state, [femur]: invalid }, femur).peso, '')
    assert.equal(progressiveIntergrowthWeight({ ...measurements, [femur]: invalid }, femur), null)
  }
  const manual = setBiometryWeightMode(state, femur, 'manual')
  assert.equal(updateBiometryMeasurements(manual, { ...manual, ca: '300', peso: '2100' }, femur).peso, '2100')
  assert.equal(setBiometryWeightMode({ ...manual, peso: '2100' }, femur, 'automatico').peso, '1977')
  assert.equal(biometryWeightMode({ ...state, peso: '2200' }), 'manual')
  assert.equal(updateBiometryMeasurements({ ...state, peso: '2200' }, { ...state, peso: '2200', ca: '300' }, femur).peso, '2200')
  assert.equal(biometryWeightMode({ ...measurements, peso: '1977' }), 'manual')
  assert.equal(biometryWeightMode(JSON.parse(JSON.stringify(manual))), 'manual')
  assert.ok(progressiveIntergrowthWeight(measurements, femur))
  assert.equal(intergrowthBiometryPreview(measurements, femur, {}), null)
  assert.ok(intergrowthBiometryPreview(measurements, femur, ig))
  assert.equal(intergrowthBiometryPreview(measurements, femur, { bio_sem: '40', bio_dias: '1' }), null)
  assert.equal(intergrowthBiometryPreview(measurements, femur, { ...ig, bio_dias: '' }), null)
  // Manual report weight cannot shift the independently calculated INTERGROWTH point.
  assert.deepEqual(intergrowthBiometryPreview({ ...measurements, peso: '9999' }, femur, ig), intergrowthBiometryPreview(measurements, femur, ig))
}
assert.equal(progressiveIntergrowthWeight(full, null), null)
assert.equal(setBiometryWeightMode(full, null, 'automatico').peso, '')
console.log('Biometry automation: progressive inputs, both femur schemas, clearing, manual/imported weights, persistence and percentile invalidation passed')
