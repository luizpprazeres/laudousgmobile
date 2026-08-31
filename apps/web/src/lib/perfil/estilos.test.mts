import assert from 'node:assert/strict'

import * as importedStyles from './estilos.ts'

const stylesModule = importedStyles as typeof importedStyles & { default?: typeof importedStyles }
const { codigoDoEstilo, idDeEstiloValido, WRITING_STYLE_IDS } = stylesModule.default ?? stylesModule

assert.equal(codigoDoEstilo(WRITING_STYLE_IDS.CLASSICO_COMPLETO), 'CLASSICO_COMPLETO')
assert.equal(codigoDoEstilo(WRITING_STYLE_IDS.OBJETIVO), 'OBJETIVO')
assert.equal(codigoDoEstilo(null), 'CLASSICO_COMPLETO')
assert.equal(codigoDoEstilo('estilo-inventado'), 'CLASSICO_COMPLETO')

assert.equal(idDeEstiloValido(WRITING_STYLE_IDS.CLASSICO_COMPLETO), true)
assert.equal(idDeEstiloValido(WRITING_STYLE_IDS.OBJETIVO), true)
assert.equal(idDeEstiloValido(null), false)
assert.equal(idDeEstiloValido('estilo-inventado'), false)

console.log('✓ Estilo da conta: dois estilos oficiais e fallback clássico aprovados')
