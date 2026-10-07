import assert from 'node:assert/strict'
import { adaptarTireoide } from '../src/lib/catalog/tireoideParaCatalogo'
import { previewAcrDoNodulo } from '../src/lib/calculators/tireoideAcr'
import { initialTireoideState, type NoduloTireoide } from '../src/lib/deterministic/organs/tireoide'

function nodulo(patch: Partial<NoduloTireoide> = {}): NoduloTireoide {
  return {
    id: 'n1',
    lobo: 'lobo_direito',
    c1: '2,0', c2: '1,2', c3: '1,0',
    localizacao: 'no terço médio',
    domingosAtivo: false,
    ecogenicidade: 'hipoecoica', margem: 'irregular', halo: 'sem_halo',
    forma: 'mais_alta_que_larga', calcificacoes: 'micro', vascularizacao: 'exclusiva_central',
    acrComposicao: 'solido', acrEcogenicidade: 'hiper_ou_isoecoico',
    acrForma: 'mais_larga_que_alta', acrMargem: 'lisa',
    acrFocos: ['nenhum_ou_cauda_cometa'],
    ...patch,
  }
}

const tr3 = previewAcrDoNodulo(nodulo())
assert.ok(tr3)
assert.equal(tr3.category, 'TR3')
assert.equal(tr3.score, 3)
assert.match(tr3.management, /1, 3 e 5 anos/)

const tr5 = previewAcrDoNodulo(nodulo({
  c1: '1,2',
  acrEcogenicidade: 'muito_hipoecoico',
  acrForma: 'mais_alta_que_larga',
  acrMargem: 'extensao_extratireoidiana',
  acrFocos: ['focos_puntiformes'],
}))
assert.ok(tr5)
assert.equal(tr5.category, 'TR5')
assert.equal(tr5.score, 14)
assert.match(tr5.management, /PAAF/)

assert.equal(previewAcrDoNodulo(nodulo({ acrMargem: null })), null)
assert.equal(previewAcrDoNodulo(nodulo({ acrFocos: [] })), null)
assert.equal(previewAcrDoNodulo(nodulo({
  acrComposicao: 'cistico',
  acrEcogenicidade: 'hiper_ou_isoecoico',
}))?.category, 'TR1')
assert.equal(previewAcrDoNodulo(nodulo({
  acrComposicao: 'espongiforme', acrEcogenicidade: null, acrForma: null, acrMargem: null, acrFocos: [],
}))?.category, 'TR1')

const state = initialTireoideState()
state.nodulos = [nodulo()]
const adaptacaoCompleta = adaptarTireoide(state)
assert.equal(adaptacaoCompleta.pendencias.length, 0)
const semDomingos = adaptacaoCompleta.dados.lobo_direito.nodulos[0]!
assert.equal(semDomingos.ecogenicidade, null)
assert.equal(semDomingos.margem, null)
assert.equal(semDomingos.localizacao, 'no terço médio')
assert.equal(semDomingos.acr_tirads?.composicao, 'solido')

state.nodulos = [nodulo({ domingosAtivo: true })]
const comDomingos = adaptarTireoide(state).dados.lobo_direito.nodulos[0]!
assert.equal(comDomingos.ecogenicidade, 'hipoecoica')
assert.equal(comDomingos.margem, 'irregular')

state.nodulos = [nodulo({ domingosAtivo: undefined })]
const adaptacaoLegada = adaptarTireoide(state)
const legado = adaptacaoLegada.dados.lobo_direito.nodulos[0]!
assert.equal(legado.ecogenicidade, 'hipoecoica', 'estado legado com descritores mantém Domingos ativo')
assert.equal(adaptacaoLegada.pendencias.length, 0, 'estado legado de Domingos continua abrindo sem exigir ACR retroativo')

state.nodulos = [nodulo({ c1: '', c2: '', c3: '', acrMargem: null })]
const incompleto = adaptarTireoide(state)
assert.equal(incompleto.pendencias.filter((item) => item.bloqueia).length, 2)

console.log('Tireoide ACR: prévia, localização e Domingos opcional aprovados')
