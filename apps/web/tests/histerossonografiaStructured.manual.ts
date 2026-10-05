import assert from 'node:assert/strict'
import { composeReport, initialExamState, CATEGORIES, GENERIC_CATEGORIES, type ExamState } from '../src/lib/deterministic'
import { histerossonografia } from '../src/lib/deterministic/organs/histerossonografia'
import { groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { categoriaLabel } from '../src/components/historico/HistoryItem'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
const ID = 'HISTEROSSONOGRAFIA'
const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1] ?? ''
const achados = (text: string) => text.split('OBSERVADOS:\n\n')[1]?.split('\n\nCONCLUSÃO:')[0] ?? ''

function exame(modelo: 'em_branco' | 'normal' = 'normal', opts: Record<string, string> = {}): ExamState {
  const state = initialExamState(histerossonografia)
  state.__opts = { ...state.__opts, modelo, ...opts }
  return state
}
const compor = (state: ExamState) => composeReport(histerossonografia, state)
function laudo(state: ExamState) {
  const report = compor(state)
  assert.deepEqual(report.pendencias, [], JSON.stringify(report.pendencias))
  return report.text
}
function bloqueado(state: ExamState, onde: string, motivo: RegExp) {
  const report = compor(state)
  assert.equal(report.text, '')
  assert.ok(report.pendencias.some(p => p.onde === onde && motivo.test(p.motivo)), JSON.stringify(report.pendencias))
}
const polipo = (state: ExamState, extra: Record<string, string> = {}) => {
  state.__opts = { ...state.__opts, cavidade: 'com_achados' }
  state.lesao_1 = { ...state.lesao_1, tipo: 'polipo', 'tipo.polipo.parede': 'anterior', 'tipo.polipo.medidas': '1,2 x 0,7 x 0,5', 'tipo.polipo.base': 'pediculada', 'tipo.polipo.doppler': 'pediculo', ...extra }
}

test('categoria selecionável: registro, seletor em Saúde da mulher, busca e histórico', () => {
  assert.equal(CATEGORIES[ID], histerossonografia)
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(ID))
  assert.equal(isWriterCategory(ID), false)
  assert.equal(categoriaMigrada(ID), false)
  const entry = groupCategories(GENERIC_CATEGORIES.map(({ id, name }) => ({ id, name }))).flatMap(g => g.entries).find(e => e.id === ID)!
  assert.equal(entry.groupId, 'saude_mulher')
  assert.equal(entry.name, 'Histerossonografia')
  for (const busca of ['histerossonografia', 'infusao salina', 'istmocele', 'polipo endometrial']) assert.ok(matchesCategory(entry, busca), busca)
  assert.equal(categoriaLabel(ID), 'Histerossonografia')
})

test('normal: modelo normal descreve técnica, canal e cavidade, sem inventar cateter ou volume', () => {
  const text = laudo(exame())
  assert.match(text, /^HISTEROSSONOGRAFIA\n/)
  assert.match(achados(text), /^Procedimento: cateterização do canal cervical e infusão de soro fisiológico 0,9%, sob controle ultrassonográfico, com aquisição bidimensional\.\n\nCanal endocervical pérvio, sem imagens focais\.\n\nCavidade endometrial adequadamente distendida, de contornos regulares, sem imagens focais identificáveis\.$/)
  assert.equal(conclusao(text), '1. Cavidade endometrial sem alterações identificáveis ao método.')
  assert.doesNotMatch(text, /mL|Fr|cateter de/)
})

test('técnica informada pelo médico entra no corpo como digitada', () => {
  const state = exame('normal', { modo: '3d' })
  state.procedimento = { ...state.procedimento, cateter: 'cateter de balão 5 Fr', volume_ml: '12' }
  assert.match(laudo(state), /cateterização do canal cervical com cateter de balão 5 Fr e infusão de 12 mL de soro fisiológico 0,9%, sob controle ultrassonográfico, com aquisição bidimensional e tridimensional\./)
})

test('incompleto: em branco bloqueia por cateterização, condições, canal, distensão e cavidade', () => {
  const report = compor(exame('em_branco'))
  assert.equal(report.text, '')
  const motivos = report.pendencias.map(p => p.motivo).join(' | ')
  for (const trecho of [/cateterização/, /condições técnicas/, /canal endocervical/, /qualidade da distensão/, /resultado da cavidade/]) assert.match(motivos, trecho)
})

test('distensão parcial suspende a normalidade e restringe a conclusão aos segmentos avaliados', () => {
  const state = exame('normal', { distensao: 'parcial' })
  bloqueado(state, 'Cavidade endometrial', /segmentos avaliados/)
  state.cavidade = { ...state.cavidade, segmentos: 'Corpo e fundo', motivo: 'Refluxo da solução pelo colo' }
  const text = laudo(state)
  assert.doesNotMatch(text, /adequadamente distendida|sem alterações identificáveis/)
  assert.match(achados(text), /Distensão parcial da cavidade endometrial \(refluxo da solução pelo colo\), com avaliação restrita aos seguintes segmentos: corpo e fundo\./)
  assert.match(conclusao(text), /^1\. Avaliação parcial da cavidade endometrial, por distensão parcial; sem imagens focais nos segmentos avaliados \(corpo e fundo\)\.$/)
})

test('distensão não obtida e procedimento interrompido: cavidade não avaliada, sem normalidade', () => {
  const state = exame('normal', { distensao: 'falha' })
  bloqueado(state, 'Cavidade endometrial', /não avaliada/)
  state.__opts.cavidade = 'nao_avaliada'
  state.procedimento = { ...state.procedimento, cateterizacao: 'nao_obtida', interrupcao: 'sim', 'interrupcao.sim.motivo': 'Intolerância da paciente' }
  state.canal = { ...state.canal, canal: 'dificuldade' }
  state.cavidade = { ...state.cavidade, motivo: 'falha de cateterização' }
  const text = laudo(state)
  assert.match(achados(text), /Procedimento: não foi possível a cateterização do canal cervical\./)
  assert.match(conclusao(text), /Procedimento interrompido \(intolerância da paciente\)\./)
  assert.match(conclusao(text), /Cavidade endometrial não avaliada ao método, por não ter sido obtida a distensão \(falha de cateterização\)\./)
  assert.doesNotMatch(text, /sem alterações identificáveis|estenose/i)
  // Cateterização não obtida com distensão adequada é contraditório.
  const contraditorio = exame()
  contraditorio.procedimento = { ...contraditorio.procedimento, cateterizacao: 'nao_obtida' }
  bloqueado(contraditorio, 'Técnica', /distensão deve ser registrada como não obtida/)
})

test('alterado: pólipo sem topografia/medidas bloqueia; sem confirmação fica indeterminado; confirmado nomeia', () => {
  const state = exame()
  polipo(state, { 'tipo.polipo.parede': 'nao_informada', 'tipo.polipo.medidas': '1,2' })
  bloqueado(state, 'Achado 1', /topografia e ao menos duas medidas/)
  polipo(state)
  const indeterminado = laudo(state)
  assert.match(achados(indeterminado), /Cavidade endometrial adequadamente distendida\.\n\nImagem focal ecogênica intracavitária, pediculada, na parede anterior, medindo 1,2 x 0,7 x 0,5 cm, com pedículo vascular ao Doppler colorido\./)
  assert.match(conclusao(indeterminado), /^1\. Imagem focal intracavitária na parede anterior, medindo 1,2 x 0,7 x 0,5 cm, de natureza não definida ao método\.$/)
  assert.doesNotMatch(indeterminado, /Pólipo|sem alterações identificáveis|histeroscopia/i)
  state.lesao_1['tipo.polipo.confirmado'] = 'sim'
  assert.match(conclusao(laudo(state)), /^1\. Pólipo endometrial na parede anterior, medindo 1,2 x 0,7 x 0,5 cm\.$/)
})

test('alterado: mioma com FIGO só com relação informada e confirmação; múltiplos achados não se fundem', () => {
  const state = exame('normal', { cavidade: 'com_achados', lesoes: '2' })
  state.lesao_1 = { ...state.lesao_1, tipo: 'mioma', 'tipo.mioma.parede': 'posterior', 'tipo.mioma.medidas': '2,0 x 1,8 x 1,6' }
  state.lesao_2 = { ...state.lesao_2, tipo: 'sinequia', 'tipo.sinequia.regiao': 'fundica', 'tipo.sinequia.medida': '3' }
  const pendente = conclusao(laudo(state))
  assert.match(pendente, /1\. Imagem nodular sólida com projeção na cavidade endometrial a partir da parede posterior, medindo 2,0 x 1,8 x 1,6 cm\./)
  assert.match(pendente, /2\. Trave ecogênica intracavitária na região fúndica\./)
  state.lesao_1 = { ...state.lesao_1, 'tipo.mioma.confirmado': 'sim' }
  assert.match(conclusao(laudo(state)), /Nódulo miomatoso submucoso na parede posterior, medindo 2,0 x 1,8 x 1,6 cm\.\n/)
  state.lesao_1['tipo.mioma.componente'] = 'menor_50'
  state.lesao_2['tipo.sinequia.confirmado'] = 'sim'
  const confirmado = conclusao(laudo(state))
  assert.match(confirmado, /medindo 2,0 x 1,8 x 1,6 cm \(FIGO 1\)\./)
  assert.match(confirmado, /2\. Sinéquia uterina na região fúndica\./)
})

test('alterado: istmocele exige nicho e miométrio residual; malformação só classifica com 3D e confirmação', () => {
  const state = exame('normal', { cavidade: 'com_achados' })
  state.lesao_1 = { ...state.lesao_1, tipo: 'istmocele', 'tipo.istmocele.profundidade_mm': '5' }
  bloqueado(state, 'Achado 1', /miométrio residual/)
  state.lesao_1['tipo.istmocele.residual_mm'] = '3,5'
  assert.match(conclusao(laudo(state)), /Falha de continuidade na parede anterior do istmo uterino, com miométrio residual de 3,5 mm\./)
  state.lesao_1['tipo.istmocele.confirmado'] = 'sim'
  assert.match(conclusao(laudo(state)), /^1\. Istmocele, com miométrio residual de 3,5 mm\.$/)
  const malf = exame('normal', { cavidade: 'com_achados' })
  malf.lesao_1 = { ...malf.lesao_1, tipo: 'malformacao', 'tipo.malformacao.indentacao_mm': '14', 'tipo.malformacao.classificacao': 'septado_parcial', 'tipo.malformacao.confirmado': 'sim' }
  bloqueado(malf, 'Achado 1', /tridimensional/)
  malf.__opts.modo = '3d'
  assert.match(conclusao(laudo(malf)), /Achados compatíveis com útero septado parcial\./)
  malf.lesao_1['tipo.malformacao.classificacao'] = 'nao_classificar'
  assert.match(conclusao(laudo(malf)), /Indentação do contorno fúndico da cavidade endometrial, com 14 mm\./)
})

test('recomendação é opt-in, confirmada e coerente com o exame', () => {
  const state = exame()
  state.recomendacao = { ...state.recomendacao, opcao: 'histeroscopia', confirmada: 'sim' }
  bloqueado(state, 'Recomendação', /achado intracavitário/)
  polipo(state, { 'tipo.polipo.confirmado': 'sim' })
  state.recomendacao.confirmada = 'nao'
  bloqueado(state, 'Recomendação', /confirme a recomendação/)
  state.recomendacao.confirmada = 'sim'
  assert.match(conclusao(laudo(state)), /2\. Convém, a critério clínico, complementação com histeroscopia\.$/)
})

test('reversão: desfazer achados e limitação devolve exatamente o laudo normal', () => {
  const normal = laudo(exame())
  const state = exame('normal', { distensao: 'parcial', modo: '3d' })
  state.cavidade = { ...state.cavidade, segmentos: 'corpo', motivo: 'refluxo' }
  polipo(state, { 'tipo.polipo.confirmado': 'sim' })
  state.procedimento = { ...state.procedimento, intercorrencia: 'dor' }
  state.recomendacao = { ...state.recomendacao, opcao: 'histologia', confirmada: 'sim' }
  assert.notEqual(laudo(state), normal)
  state.__opts = { ...state.__opts, distensao: 'modelo', cavidade: 'modelo', modo: 'modelo' }
  state.cavidade = { ...state.cavidade, segmentos: '', motivo: '' }
  state.procedimento = { ...state.procedimento, intercorrencia: 'nenhuma' }
  state.recomendacao = { ...state.recomendacao, opcao: 'nenhuma', confirmada: 'nao' }
  assert.equal(laudo(state), normal)
})

test('persistência: o estado salvo em exam_state reabre e recompõe o mesmo laudo', () => {
  const state = exame('normal', { modo: '3d' })
  polipo(state, { 'tipo.polipo.confirmado': 'sim' })
  assert.equal(laudo(JSON.parse(JSON.stringify(state)) as ExamState), laudo(state))
})

console.log(`${cases} Histerossonografia structured web cases passed`)
