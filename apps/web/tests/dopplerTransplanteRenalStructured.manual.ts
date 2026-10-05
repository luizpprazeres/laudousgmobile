import assert from 'node:assert/strict'
import { composeReport, initialExamState } from '../src/lib/deterministic/compose'
import { GENERIC_CATEGORIES } from '../src/lib/deterministic'
import {
  dopplerTransplanteRenal, irMedio, lerNumero, razaoAnastomoseIliaca,
} from '../src/lib/deterministic/organs/dopplerTransplanteRenal'
import { pendenciasLocais } from '../src/lib/deterministic/organs/pendenciasLocais'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { CATEGORY_GROUPS } from '../src/components/laudar/categoryGroups'

let cases = 0
function test(name: string, run: () => void) {
  run()
  cases++
  console.log(`ok ${cases} - ${name}`)
}

const CODE = 'DOPPLER_TRANSPLANTE_RENAL'
const pend = (state: ReturnType<typeof initialExamState>) => pendenciasLocais(CODE, state)
const texto = (state: ReturnType<typeof initialExamState>) => composeReport(dopplerTransplanteRenal, state).text

function semIdentificadorCru(text: string) {
  assert.doesNotMatch(text, /\b[a-z]+_[a-z_]+\b/, 'identificador snake_case no laudo')
  assert.doesNotMatch(text, /\b[A-Z]+_[A-Z_]+\b/, 'código cru no laudo')
  assert.doesNotMatch(text, /undefined|null|NaN|\[object|____/, 'valor cru ou lacuna no laudo')
}

/** Enxerto normal completo, com todas as escolhas explícitas do médico. */
function normalCompleto() {
  const state = initialExamState(dopplerTransplanteRenal)
  state.enxerto = { ...state.enxerto, localizacao: 'fid', medidas: '11,2 x 5,4 x 5,0' }
  state.arteria = { ...state.arteria, vps_anastomose: '180', vps_iliaca: '90', interpretacao: 'sem_estenose' }
  state.intrarrenal = { ...state.intrarrenal, ir_superior: '0,68', ir_medio: '0,70', ir_inferior: '0,66', interpretacao: 'esperado' }
  return state
}

test('categoria própria registrada como estruturada, no grupo Vascular, compondo localmente', () => {
  assert.ok(GENERIC_CATEGORIES.some((c) => c.id === CODE))
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(CODE))
  assert.equal(isWriterCategory(CODE), false)
  assert.equal(categoriaMigrada(CODE), false)
  assert.ok(CATEGORY_GROUPS.find((g) => g.id === 'vascular')?.categories.includes(CODE))
})

test('derivados só com as medidas de origem; unidades e limites', () => {
  assert.equal(razaoAnastomoseIliaca('300', '100'), 3)
  assert.equal(razaoAnastomoseIliaca('300', ''), null)
  assert.equal(razaoAnastomoseIliaca('', '100'), null)
  assert.equal(irMedio({ ir_superior: '0,68', ir_medio: '0,70', ir_inferior: '' }), 0.69)
  assert.equal(irMedio({}), null)
  assert.equal(lerNumero('0,7', 1), 0.7)
  assert.equal(lerNumero('1,2', 1), 'invalida')
  assert.equal(lerNumero('180 cm/s', 1000), 'invalida')
})

test('normal completo: modelo coerente, localização preservada, sem termos de rim nativo', () => {
  const state = normalCompleto()
  assert.deepEqual(pend(state), [])
  const text = texto(state)
  assert.match(text, /^ULTRASSONOGRAFIA COM DOPPLER DE TRANSPLANTE RENAL/)
  assert.match(text, /Enxerto renal em fossa ilíaca direita, medindo 11,2 x 5,4 x 5,0 cm/)
  assert.match(text, /VPS na anastomose de 180 cm\/s; VPS na artéria ilíaca de 90 cm\/s; razão anastomose\/ilíaca de 2,0/)
  assert.match(text, /superior 0,68; médio 0,70; inferior 0,66 \(média de 0,68\)/)
  assert.match(text, /1\. Enxerto renal em fossa ilíaca direita com parênquima de aspecto preservado, sem dilatação do sistema coletor\./)
  assert.match(text, /Anastomose arterial e artéria do enxerto pérvias, sem sinais de estenose ao Doppler\./)
  assert.match(text, /índices de resistência dentro do esperado \(IR médio de 0,68\)/)
  assert.match(text, /Veia do enxerto pérvia\./)
  assert.doesNotMatch(text, /aort|artérias renais|rim direito|rim esquerdo|rejeição/i)
  semIdentificadorCru(text)
})

test('modelo inicial não afirma normalidade: localização, medidas e interpretações são pendências', () => {
  const state = initialExamState(dopplerTransplanteRenal)
  assert.deepEqual(pend(state), [
    'Enxerto: selecione a localização do enxerto.',
    'Enxerto: informe as três medidas do enxerto.',
    'Anastomose arterial: escolha a interpretação (sem estenose, estenose ou ausência de fluxo).',
    'Anastomose arterial: informe a VPS na anastomose.',
    'Vasos intrarrenais: informe ao menos um índice de resistência.',
    'Vasos intrarrenais: escolha a interpretação dos índices de resistência.',
  ])
  const text = texto(state)
  assert.doesNotMatch(text, /sem sinais de estenose|dentro do esperado|____/)
})

test('velocidade alta sem interpretação nunca convive com conclusão normal', () => {
  const state = normalCompleto()
  state.arteria = { ...state.arteria, vps_anastomose: '350', interpretacao: '' }
  assert.ok(pend(state).some((i) => /escolha a interpretação/.test(i)))
  assert.doesNotMatch(texto(state), /sem sinais de estenose/)
})

test('estenose: exige VPS ilíaca e confirmação; sem aliasing se não marcado', () => {
  const state = normalCompleto()
  state.arteria = { ...state.arteria, vps_anastomose: '350', vps_iliaca: '', interpretacao: 'estenose' }
  let issues = pend(state)
  assert.ok(issues.includes('Anastomose arterial: estenose exige a VPS da artéria ilíaca para a razão.'))
  assert.ok(issues.includes('Anastomose arterial: confirme a estenose antes de gerar o laudo.'))
  assert.doesNotMatch(texto(state), /compatível com estenose/)

  state.arteria = { ...state.arteria, vps_iliaca: '100', 'interpretacao.estenose.confirmada': 'sim' }
  issues = pend(state)
  assert.deepEqual(issues, [])
  const text = texto(state)
  assert.match(text, /Aceleração focal do fluxo na anastomose arterial\. Medidas: VPS na anastomose de 350 cm\/s; VPS na artéria ilíaca de 100 cm\/s; razão anastomose\/ilíaca de 3,5\./)
  assert.match(text, /\(VPS na anastomose de 350 cm\/s; VPS na artéria ilíaca de 100 cm\/s; razão anastomose\/ilíaca de 3,5\), compatível com estenose da anastomose arterial do enxerto\./)
  assert.doesNotMatch(text, /aliasing|sem sinais de estenose/)
  semIdentificadorCru(text)
})

test('ausência de fluxo arterial: confirmação, urgência e sem frases normais conflitantes', () => {
  const state = normalCompleto()
  state.arteria = { ...state.arteria, vps_anastomose: '', vps_iliaca: '', interpretacao: 'sem_fluxo' }
  const issues = pend(state)
  assert.ok(issues.includes('Anastomose arterial: confirme a ausência de fluxo arterial antes de gerar o laudo.'))
  assert.ok(issues.some((i) => /perfusão homogênea conflita/.test(i)))
  assert.ok(issues.some((i) => /veia pérvia conflita/.test(i)))
  assert.doesNotMatch(texto(state), /trombose/)

  state.arteria['interpretacao.sem_fluxo.confirmada'] = 'sim'
  state.intrarrenal = { ...state.intrarrenal, avaliacao: 'nao_avaliada' }
  state.veia = { ...state.veia, avaliacao: 'nao_avaliada' }
  assert.deepEqual(pend(state), [])
  const text = texto(state)
  assert.match(text, /compatível com trombose arterial do enxerto\. Convém, a critério clínico, comunicação imediata à equipe de transplante\./)
  assert.match(text, /Vasos intrarrenais não avaliados\./)
  assert.match(text, /Veia do enxerto não avaliada\./)
  assert.doesNotMatch(text, /pérvia|homogênea|dentro do esperado/)
})

test('IR elevado: descrito como inespecífico, nunca como rejeição', () => {
  const state = normalCompleto()
  state.intrarrenal = { ...state.intrarrenal, ir_superior: '0,86', ir_medio: '0,90', ir_inferior: '0,88', interpretacao: 'elevados' }
  const text = texto(state)
  assert.match(text, /Índices de resistência intrarrenais elevados \(IR médio de 0,88\), achado inespecífico/)
  assert.doesNotMatch(text, /rejeição|necrose tubular|biópsia/i)
  assert.deepEqual(pend(state), [])
})

test('alterado no enxerto: dilatação graduada, coleção sem natureza inventada, lado da localização', () => {
  const state = normalCompleto()
  state.enxerto = {
    ...state.enxerto, localizacao: 'fie', coletor: 'dilatado', 'coletor.dilatado.grau': 'leve',
    colecao: 'presente', 'colecao.presente.local': 'junto ao polo inferior', 'colecao.presente.medidas': '4,0 x 3,1 x 2,5',
  }
  let text = texto(state)
  assert.match(text, /Enxerto renal em fossa ilíaca esquerda/)
  assert.match(text, /Dilatação do sistema coletor do enxerto, em grau leve\./)
  assert.match(text, /Coleção perienxerto junto ao polo inferior, medindo 4,0 x 3,1 x 2,5 cm, de natureza não determinada ao método\./)
  assert.doesNotMatch(text, /linfocele|urinoma|hematoma/)
  state.enxerto['colecao.presente.natureza'] = 'linfocele'
  text = texto(state)
  assert.match(text, /com aspecto sugestivo de linfocele\./)
  assert.deepEqual(pend(state), [])
})

test('incompleto: coleção sem medidas, IR fora do intervalo, limitação sem motivo bloqueiam', () => {
  const state = normalCompleto()
  state.enxerto = { ...state.enxerto, colecao: 'presente' }
  state.intrarrenal = { ...state.intrarrenal, ir_medio: '1,4' }
  state.veia = { ...state.veia, avaliacao: 'limitada' }
  assert.deepEqual(pend(state), [
    'Enxerto: informe as três medidas da coleção perienxerto.',
    'Vasos intrarrenais: IR médio com formato inválido (entre 0 e 1, ex.: 0,68).',
    'Veia do enxerto: informe o motivo da limitação.',
  ])
  assert.doesNotMatch(texto(state), /____/)
})

test('estrutura não avaliada sai como não avaliada, nunca como normal', () => {
  const state = normalCompleto()
  state.veia = { ...state.veia, avaliacao: 'nao_avaliada' }
  const text = texto(state)
  assert.match(text, /Veia do enxerto não avaliada neste exame\./)
  assert.doesNotMatch(text, /Veia do enxerto pérvia/)
  assert.deepEqual(pend(state), [])
})

console.log(`# ${cases} casos`)
