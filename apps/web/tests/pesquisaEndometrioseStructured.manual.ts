import assert from 'node:assert/strict'
import { categoryDisplayLabel } from '@laudousg/shared'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, type ExamState } from '../src/lib/deterministic'
import { pesquisaEndometriose } from '../src/lib/deterministic/organs/pesquisaEndometriose'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'
import { CATEGORY_GROUPS, groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { categoriaLabel } from '../src/components/historico/HistoryItem'

let cases = 0
function test(name: string, run: () => void) {
  run()
  cases++
  console.log(`ok ${cases} - ${name}`)
}

const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1] ?? ''
const achados = (text: string) => text.split('OS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n\n')[1]?.split('\n\nCONCLUSÃO:')[0] ?? ''
const render = (state: ExamState) => composeReport(pesquisaEndometriose, state)
const CONCLUSAO_NORMAL = 'Ausência de sinais ultrassonográficos de endometriose profunda ou de endometrioma nas estruturas avaliadas.'

function modeloNormal(): ExamState {
  const state = initialExamState(pesquisaEndometriose)
  state.__opts = { ...state.__opts, model: 'normal' }
  return state
}

function bloqueado(state: ExamState, onde: string, motivo: RegExp) {
  const report = render(state)
  assert.equal(report.text, '', `laudo deveria estar bloqueado (${onde})`)
  assert.ok(report.pendencias.some((p) => p.onde === onde && motivo.test(p.motivo)), `sem pendência ${onde} ${motivo}: ${JSON.stringify(report.pendencias)}`)
}

/** Lesão intestinal completa (cenário sintético). */
function lesaoIntestinal(state: ExamState) {
  Object.assign(state.posterior!, {
    retossigmoide: 'lesao',
    'retossigmoide.lesao.segmento': 'reto_medio',
    'retossigmoide.lesao.camada': 'muscular',
    'retossigmoide.lesao.medidas': '2,5 x 0,8 x 1,2',
    'retossigmoide.lesao.borda_anal_cm': '8',
    'retossigmoide.lesao.circunferencia_pct': '25',
    'retossigmoide.lesao.estenose_pct': '30',
  })
}

test('registro, Saúde da mulher, nome humano, busca e histórico', () => {
  assert.ok(CATEGORIES.PESQUISA_ENDOMETRIOSE)
  assert.ok(GENERIC_CATEGORIES.includes(pesquisaEndometriose))
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes('PESQUISA_ENDOMETRIOSE'))
  assert.equal(isWriterCategory('PESQUISA_ENDOMETRIOSE'), false)
  assert.ok(CATEGORY_GROUPS.find((g) => g.id === 'saude_mulher')?.categories.includes('PESQUISA_ENDOMETRIOSE'))
  assert.equal(categoryDisplayLabel('PESQUISA_ENDOMETRIOSE'), 'Pesquisa de endometriose')
  assert.equal(categoriaLabel('PESQUISA_ENDOMETRIOSE'), 'Pesquisa de endometriose')
  const entry = groupCategories([{ id: 'PESQUISA_ENDOMETRIOSE', name: 'x' }]).flatMap((g) => g.entries)[0]!
  assert.equal(entry.name, 'Pesquisa de endometriose')
  for (const termo of ['endometriose', 'endometrioma', 'adenomiose', 'sinal de deslizamento']) assert.ok(matchesCategory(entry, termo), termo)
})

test('estado em branco não inventa normalidade: bloqueia até haver estrutura avaliada', () => {
  const state = initialExamState(pesquisaEndometriose)
  bloqueado(state, 'Exame', /ao menos uma estrutura/)
})

test('modelo normal explícito: compartimentos, dinâmica e conclusão sem estruturas pendentes', () => {
  const { text, pendencias } = render(modeloNormal())
  assert.deepEqual(pendencias, [])
  assert.match(text, /^ULTRASSONOGRAFIA TRANSVAGINAL PARA PESQUISA DE ENDOMETRIOSE\n/)
  for (const frase of [
    /Bexiga com paredes finas e regulares/, /Espaço vesicouterino livre/, /Ovário direito de forma e ecotextura habituais/,
    /Ligamento uterossacro esquerdo de espessura habitual/, /Tórus uterino sem nódulos/, /Reto e sigmoide com camadas parietais preservadas/,
    /Sinal de deslizamento posterior \(útero–reto\) positivo\./, /Ovários móveis à compressão/, /Ausência de sinais de processo aderencial pélvico\./,
  ]) assert.match(achados(text), frase)
  assert.equal(conclusao(text), CONCLUSAO_NORMAL)
  assert.doesNotMatch(text, /não avaliad|____|pendente/)
})

test('estrutura não avaliada aparece no corpo e restringe a conclusão', () => {
  const state = modeloNormal()
  state.posterior!.retossigmoide = 'nao_avaliado'
  state.__opts = { ...state.__opts, preparo: 'nao_realizado' }
  const { text } = render(state)
  assert.match(text, /sem preparo intestinal, o que pode limitar a avaliação do retossigmoide\./)
  assert.match(achados(text), /Retossigmoide não avaliado\./)
  assert.equal(conclusao(text), `1. ${CONCLUSAO_NORMAL}\n2. Não avaliados neste exame: retossigmoide.`)
})

test('endometrioma: medidas, volume focal e O-RADS só quando informado; nunca vira endometriose profunda', () => {
  const state = modeloNormal()
  Object.assign(state.central!, { ovario_direito: 'endometrioma', 'ovario_direito.endometrioma.medidas': '3,2 x 2,8 x 2,5' })
  let { text } = render(state)
  assert.match(achados(text), /Ovário direito contendo imagem de baixa ecogenicidade com aspecto em vidro fosco, sem componente sólido ou septações, medindo 3,2 x 2,8 x 2,5 cm, com volume estimado de 11,7 cm³\./)
  assert.equal(conclusao(text), [
    '1. Imagem sugestiva de endometrioma no ovário direito.',
    '2. Demais estruturas avaliadas sem sinais ultrassonográficos de endometriose.',
  ].join('\n'))
  assert.doesNotMatch(text, /endometriose profunda|O-RADS/)
  state.central!['ovario_direito.endometrioma.orads'] = '2'
  text = render(state).text
  assert.match(conclusao(text), /1\. Imagem sugestiva de endometrioma no ovário direito \(O-RADS 2\)\./)
})

test('lesão intestinal preserva segmento, camada, medidas, borda anal, circunferência e estenose; dinâmica coerente', () => {
  const state = modeloNormal()
  lesaoIntestinal(state)
  Object.assign(state.dinamica!, { deslizamento_posterior: 'negativo', aderencias: 'presente', 'aderencias.presente.desc': 'fundo uterino aderido ao sigmoide' })
  const { text, pendencias } = render(state)
  assert.deepEqual(pendencias, [])
  assert.match(achados(text), /Lesão hipoecoica infiltrativa na parede do reto médio, acometendo até a camada muscular própria, medindo 2,5 x 0,8 x 1,2 cm, distando 8,0 cm da borda anal, envolvendo cerca de 25% da circunferência, com redução estimada de 30% da luz\./)
  assert.equal(conclusao(text), [
    '1. Lesão sugestiva de endometriose profunda intestinal no reto médio, acometendo até a camada muscular própria.',
    '2. Sinal de deslizamento posterior negativo, sugestivo de obliteração do fundo de saco posterior.',
    '3. Sinais de processo aderencial pélvico (fundo uterino aderido ao sigmoide).',
    '4. Demais estruturas avaliadas sem sinais ultrassonográficos de endometriose.',
  ].join('\n'))
})

test('compartimentos anterior e posterior: nódulos com localização e medidas', () => {
  const state = modeloNormal()
  Object.assign(state.anterior!, { bexiga: 'nodulo', 'bexiga.nodulo.local': 'posterior', 'bexiga.nodulo.medidas': '1,2 x 0,9 x 0,7' })
  Object.assign(state.posterior!, { uterossacro_esquerdo: 'nodulo', 'uterossacro_esquerdo.nodulo.medidas': '1,5 x 0,8 x 0,6' })
  const { text } = render(state)
  assert.match(achados(text), /Imagem nodular hipoecoica na parede vesical, na parede posterior, medindo 1,2 x 0,9 x 0,7 cm\./)
  assert.match(conclusao(text), /1\. Lesão sugestiva de endometriose profunda na parede vesical, na parede posterior\./)
  assert.match(conclusao(text), /2\. Lesão sugestiva de endometriose profunda no ligamento uterossacro esquerdo\./)
})

test('incompleto: achado sem dado essencial bloqueia o laudo', () => {
  let state = modeloNormal()
  state.posterior!.retossigmoide = 'lesao'
  bloqueado(state, 'Retossigmoide', /segmento, camada mais profunda, medidas nos três eixos/)
  lesaoIntestinal(state)
  state.posterior!['retossigmoide.lesao.circunferencia_pct'] = '140'
  bloqueado(state, 'Retossigmoide', /percentual válido \(circunferência\)/)
  state = modeloNormal()
  state.central!.ovario_esquerdo = 'endometrioma'
  bloqueado(state, 'Ovário esquerdo', /medidas nos três eixos/)
  state = modeloNormal()
  state.anterior!.bexiga = 'nodulo'
  bloqueado(state, 'Bexiga', /localização/)
  state = modeloNormal()
  state.dinamica!.aderencias = 'presente'
  bloqueado(state, 'Processo aderencial', /estruturas envolvidas/)
})

test('coerência: deslizamento negativo ou mobilidade reduzida com "sem processo aderencial" bloqueia', () => {
  let state = modeloNormal()
  state.dinamica!.deslizamento_posterior = 'negativo'
  bloqueado(state, 'Avaliação dinâmica', /deslizamento negativo/)
  state = modeloNormal()
  Object.assign(state.dinamica!, { mobilidade_ovarios: 'reduzida', 'mobilidade_ovarios.reduzida.lado': 'direito' })
  bloqueado(state, 'Avaliação dinâmica', /mobilidade ovariana reduzida/)
  state = modeloNormal()
  state.anterior!.vesicouterino = 'obliterado'
  bloqueado(state, 'Compartimento anterior', /deslizamento anterior positivo/)
  state.dinamica!.deslizamento_anterior = 'nao_avaliado'
  assert.notEqual(render(state).text, '')
})

test('reversão: desfazer achados devolve o laudo normal sem resíduo', () => {
  const basal = render(modeloNormal()).text
  const state = modeloNormal()
  lesaoIntestinal(state)
  Object.assign(state.central!, { ovario_direito: 'endometrioma', 'ovario_direito.endometrioma.medidas': '3,2 x 2,8 x 2,5' })
  Object.assign(state.dinamica!, { deslizamento_posterior: 'negativo', aderencias: 'presente', 'aderencias.presente.desc': 'x' })
  assert.notEqual(render(state).text, basal)
  Object.assign(state.posterior!, { retossigmoide: 'model' })
  Object.assign(state.central!, { ovario_direito: 'model' })
  Object.assign(state.dinamica!, { deslizamento_posterior: 'model', aderencias: 'model' })
  const revertido = render(state)
  assert.deepEqual(revertido.pendencias, [])
  assert.equal(revertido.text, basal)
})

test('persistência: estado salvo em JSON recompõe o mesmo laudo', () => {
  const state = modeloNormal()
  lesaoIntestinal(state)
  Object.assign(state.dinamica!, { deslizamento_posterior: 'negativo', aderencias: 'presente', 'aderencias.presente.desc': 'fundo uterino aderido ao sigmoide' })
  const salvo = JSON.parse(JSON.stringify(state)) as ExamState
  assert.equal(render(salvo).text, render(state).text)
})

console.log(`${cases} pesquisa de endometriose structured web cases passed`)
