import assert from 'node:assert/strict'
import { groupCategories } from '../src/components/laudar/categoryGroups.ts'
import { HEPATIC_WEB_MODELS, HEPATIC_WEB_MODELS_ENABLED, isHepaticWebModel } from '../src/lib/hepaticModels.ts'

const expectedEnabled = process.env.NEXT_PUBLIC_HEPATIC_MODELS_V1 !== 'false'
assert.equal(HEPATIC_WEB_MODELS_ENABLED, expectedEnabled)
assert.equal(isHepaticWebModel('ELASTOGRAFIA_HEPATICA'), expectedEnabled)
assert.equal(isHepaticWebModel('AVALIACAO_MULTIPARAMETRICA_HEPATICA'), expectedEnabled)
assert.equal(isHepaticWebModel('ABDOMEN_TOTAL'), false)

const catalog = expectedEnabled ? HEPATIC_WEB_MODELS.map(({ id, name }) => ({ id, name, mode: 'structured' as const })) : []
const visible = groupCategories(catalog).flatMap((group) => group.entries.map((entry) => entry.id))
assert.deepEqual(visible, expectedEnabled ? ['AVALIACAO_MULTIPARAMETRICA_HEPATICA', 'ELASTOGRAFIA_HEPATICA'] : [])

console.log(`hepatic catalog flag ${expectedEnabled ? 'on' : 'off'} passed`)
