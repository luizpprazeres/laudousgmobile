import assert from 'node:assert/strict'
import { companionReviewItems, parseCompanionStructuredPayload } from './companionReview'

const obstetric = parseCompanionStructuredPayload({
  category: 'OBSTETRICA',
  data: { dbp: '82 mm', weight: '1.250 g', gestAgeBiometry: '32s4d', ignored: 'não entra' },
  summary: 'Biometria fetal',
})
assert.ok(obstetric)
assert.deepEqual(obstetric.data, { dbp: '82', weight: '1250', gestAgeBiometry: '32s4d' })
assert.deepEqual(companionReviewItems(obstetric).map(({ label, value }) => [label, value]), [
  ['DBP', '82 mm'],
  ['Peso fetal estimado', '1250 g'],
  ['IG pela biometria', '32s4d'],
])

assert.equal(parseCompanionStructuredPayload({ category: 'OBSTETRICA', data: {} }), null)
assert.equal(parseCompanionStructuredPayload({ category: 'CATEGORIA_INVENTADA', data: { dbp: '82' } }), null)
assert.equal(parseCompanionStructuredPayload({ category: 'OBSTETRICA', data: { dbp: 82 } }), null)
assert.equal(parseCompanionStructuredPayload({ category: 'OBSTETRICA', data: { gestAgeBiometry: 'abc' } }), null)
assert.equal(parseCompanionStructuredPayload({ category: 'OBSTETRICA', data: { thyroidRightLobe: { a: '4,2' } } }), null)
assert.equal(parseCompanionStructuredPayload({ category: 'TIREOIDE', data: { dbp: '82' } }), null)

const thyroid = parseCompanionStructuredPayload({
  category: 'TIREOIDE',
  data: {
    thyroidRightLobe: { a: '4,2', b: '1,8', c: '1,6', extra: 'ignorar' },
    thyroidNodules: [
      { lobe: 'lobo_direito', c1: '1,2', c2: '0,9', c3: '0,8', margin: 'regular' },
      { lobe: 'local_invalido', c1: '2' },
      null,
    ],
  },
})
assert.ok(thyroid)
assert.equal(thyroid.data.thyroidNodules?.length, 1)
assert.deepEqual(companionReviewItems(thyroid).map(({ label }) => label), ['Lobo direito', 'Nódulo tireoidiano 1'])

const carotids = parseCompanionStructuredPayload({
  category: 'DOPPLER_CAROTIDAS',
  data: {
    carotidMeasurements: [
      { side: 'direita', vessel: 'interna', psv: '82', vdf: '24', flowDirection: 'valor_invalido' },
      { side: 'direita', vessel: 'vaso_invalido', psv: '900' },
    ],
    carotidPlaques: [{ side: 'esquerda', location: 'bulbo', thickness: '2,1' }],
  },
})
assert.ok(carotids)
assert.equal(carotids.data.carotidMeasurements?.length, 1)
assert.equal(carotids.data.carotidMeasurements?.[0]?.flowDirection, undefined)
assert.equal(companionReviewItems(carotids).length, 2)

const doppler = parseCompanionStructuredPayload({
  category: 'DOPPLER_OBSTETRICO',
  data: { gestAge: '32+4', gestAgeLMP: '31+6', ipRightUterine: '0.72', ipLeftUterine: '0,68' },
})
assert.ok(doppler)
assert.equal(doppler.data.gestAge, '32s4d')
assert.equal(doppler.data.gestAgeLMP, undefined)
assert.deepEqual(companionReviewItems(doppler).at(-1), {
  key: 'ipMeanUterine',
  label: 'IP médio das uterinas (calculado)',
  value: '0,70',
})

console.log('companionReview: ok')
