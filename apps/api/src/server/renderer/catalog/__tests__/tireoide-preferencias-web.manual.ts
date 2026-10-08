import assert from 'node:assert/strict'
import { adaptarTireoide } from '../../../../../../web/src/lib/catalog/tireoideParaCatalogo'
import {
  initialTireoideState,
  type NoduloTireoide,
} from '../../../../../../web/src/lib/deterministic/organs/tireoide'
import { renderizarSelecao } from '../alteracoes'

const nodulo: NoduloTireoide = {
  id: 'n1',
  lobo: 'lobo_direito',
  c1: '1,2', c2: '1,0', c3: '0,8',
  localizacao: 'no terço médio',
  domingosAtivo: false,
  ecogenicidade: null, margem: null, halo: null, forma: null,
  calcificacoes: null, vascularizacao: null,
  acrComposicao: 'solido',
  acrEcogenicidade: 'muito_hipoecoico',
  acrForma: 'mais_alta_que_larga',
  acrMargem: 'extensao_extratireoidiana',
  acrFocos: ['focos_puntiformes'],
}

const state = initialTireoideState()
state.nodulos = [nodulo]
const entrada = adaptarTireoide(state)
assert.equal(entrada.pendencias.some((item) => item.bloqueia), false)

const semConduta = renderizarSelecao(
  'TIREOIDE',
  'CLASSICO_COMPLETO',
  [],
  entrada.dados,
  { tireoidePreferences: { show_domingos_score: false, show_conduct_recommendation: false } },
)
const comConduta = renderizarSelecao(
  'TIREOIDE',
  'CLASSICO_COMPLETO',
  [],
  entrada.dados,
  { tireoidePreferences: { show_domingos_score: false, show_conduct_recommendation: true } },
)

assert.equal(semConduta.ok, true)
assert.equal(comConduta.ok, true)
if (!semConduta.ok || !comConduta.ok) throw new Error('Tireoide não renderizou')
assert.doesNotMatch(semConduta.texto, /Conduta sugerida/)
assert.match(comConduta.texto, /Conduta sugerida \(ACR TI-RADS 5\): punção aspirativa por agulha fina \(PAAF\)/)

console.log('Tireoide Web: preferência de recomendação chega ao renderer canônico')
