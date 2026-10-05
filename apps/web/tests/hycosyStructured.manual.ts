import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { composeReport, initialExamState, CATEGORIES, type ExamState } from '../src/lib/deterministic'
import { hycosy, cotteDerivado } from '../src/lib/deterministic/organs/hycosy'
import { pendenciasLocais } from '../src/lib/deterministic/organs/pendenciasLocais'
import { groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { EXAM_CATEGORY_IMAGES } from '../src/components/laudar/examCategoryImages'
import { categoriaLabel } from '../src/components/historico/HistoryItem'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
const ID = 'HYCOSY'
const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1] ?? ''

function exame(modelo: 'em_branco' | 'normal' = 'normal'): ExamState {
  const state = initialExamState(hycosy)
  state.__opts = { ...state.__opts, modelo }
  state.tecnica = { ...state.tecnica, agente: 'microbolhas' }
  return state
}
const compor = (state: ExamState) => composeReport(hycosy, state)
function laudo(state: ExamState) {
  const report = compor(state)
  assert.deepEqual(report.pendencias, [], JSON.stringify(report.pendencias))
  assert.deepEqual(pendenciasLocais(ID, state), [])
  assert.doesNotMatch(report.text, /\b[a-z]+_[a-z_]+\b|\b[A-Z]+_[A-Z_]+\b|undefined|null|NaN|____/, 'identificador cru ou lacuna no laudo')
  return report.text
}
function bloqueado(state: ExamState, onde: string, motivo: RegExp) {
  const report = compor(state)
  assert.equal(report.text, '')
  assert.ok(report.pendencias.some(p => p.onde === onde && motivo.test(p.motivo)), JSON.stringify(report.pendencias))
}
const tuba = (state: ExamState, lado: 'direita' | 'esquerda', patch: Record<string, string | string[]>) => {
  state[`tuba_${lado}`] = { ...state[`tuba_${lado}`], ...patch }
}

test('categoria selecionável: registro, seletor em Saúde da mulher, busca, histórico e imagem própria', () => {
  assert.equal(CATEGORIES[ID], hycosy)
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(ID))
  assert.equal(isWriterCategory(ID), false)
  assert.equal(categoriaMigrada(ID), false)
  const grupo = groupCategories([{ id: ID, name: hycosy.name, mode: 'structured' as const }]).find(g => g.entries.some(e => e.id === ID))
  assert.equal(grupo?.id, 'saude_mulher')
  const entrada = grupo!.entries.find(e => e.id === ID)!
  for (const termo of ['hycosy', 'trompas', 'perviedade tubaria']) assert.ok(matchesCategory(entrada, termo), termo)
  assert.equal(categoriaLabel(ID), 'Histerossonossalpingografia (HyCoSy)')
  const url = EXAM_CATEGORY_IMAGES[ID]
  assert.equal(url, '/categories/lineart-v1/hycosy.png')
  assert.equal(Object.values(EXAM_CATEGORY_IMAGES).filter(u => u === url).length, 1, 'URL da imagem não pode ser compartilhada')
  assert.ok(existsSync(resolve(__dirname, '../public', `.${url}`)), 'arquivo da imagem ausente')
})

test('modelo normal explícito: técnica, cavidade e tubas pérvias com Cotte derivado; conclusão consolidada', () => {
  const text = laudo(exame())
  assert.match(text, /^HISTEROSSONOSSALPINGOGRAFIA COM CONTRASTE \(HYCOSY\)/)
  assert.match(text, /cateterização do canal cervical e infusão de agente de contraste ultrassonográfico de microbolhas, sob controle ultrassonográfico\./)
  assert.match(text, /Cavidade uterina preenchida pelo contraste, de contornos regulares, sem falhas de enchimento\./)
  assert.match(text, /Tuba uterina direita: progressão do contraste ao longo de todo o trajeto tubário, sem resistência à injeção, com dispersão peritoneal periovariana do contraste\. Sinal de Cotte positivo à direita\./)
  assert.match(text, /Sinal de Cotte positivo à esquerda\./)
  assert.equal(conclusao(text), '1. Cavidade uterina sem alterações identificáveis ao método.\n2. Tubas uterinas pérvias bilateralmente, com dispersão peritoneal bilateral do contraste.')
})

test('registro completo: cateter, balão, volume e modalidades só quando digitados', () => {
  const sem = laudo(exame())
  assert.doesNotMatch(sem, /mL|Fr|tridimensional/)
  const state = exame()
  state.tecnica = { ...state.tecnica, cateter: 'cateter de balão 8 Fr', balao_ml: '2', volume_ml: '10', modalidades: ['2d', '3d'] }
  assert.match(laudo(state), /cateterização do canal cervical com cateter de balão 8 Fr, com 2 mL no balão, e infusão de 10 mL de agente de contraste ultrassonográfico de microbolhas, sob controle ultrassonográfico, com avaliação bidimensional, tridimensional\/4D\./)
})

test('agente de contraste nunca presumido; modelo em branco exige todas as escolhas', () => {
  const normal = initialExamState(hycosy)
  normal.__opts = { ...normal.__opts, modelo: 'normal' }
  bloqueado(normal, 'Técnica', /selecione o agente de contraste/)
  const branco = exame('em_branco')
  const report = compor(branco)
  assert.equal(report.text, '')
  const motivos = report.pendencias.map(p => `${p.onde}: ${p.motivo}`)
  for (const esperado of [/cateterização/, /condições técnicas/, /canal endocervical/, /cavidade uterina/, /Tuba direita: informe a perviedade/, /Tuba esquerda: informe a perviedade/]) {
    assert.ok(motivos.some(m => esperado.test(m)), `${esperado} em ${JSON.stringify(motivos)}`)
  }
})

test('obstrução proximal unilateral: exige confirmação; lado contralateral segue pérvio e conclusivo', () => {
  const state = exame()
  tuba(state, 'direita', { estado: 'obstrucao_proximal' })
  bloqueado(state, 'Tuba direita', /confirme a obstrução proximal/)
  tuba(state, 'direita', { 'estado.obstrucao_proximal.confirmado': 'sim' })
  const text = laudo(state)
  assert.match(text, /Tuba uterina direita: ausência de progressão do contraste a partir do óstio tubário, sem dispersão peritoneal ipsilateral\. Sinal de Cotte negativo à direita\./)
  assert.match(text, /Sinal de Cotte positivo à esquerda\./)
  assert.match(conclusao(text), /Obstrução tubária proximal à direita\.\n3\. Tuba uterina esquerda pérvia, com dispersão peritoneal do contraste\./)
  assert.doesNotMatch(conclusao(text), /bilateralmente/)
})

test('obstrução distal exige segmento (localização) e confirmação; dilatação só se marcada', () => {
  const state = exame()
  tuba(state, 'esquerda', { estado: 'obstrucao_distal', 'estado.obstrucao_distal.confirmado': 'sim' })
  bloqueado(state, 'Tuba esquerda', /segmento da obstrução distal/)
  tuba(state, 'esquerda', { 'estado.obstrucao_distal.segmento': 'ampular', 'estado.obstrucao_distal.dilatacao': ['sim'] })
  const text = laudo(state)
  assert.match(text, /progressão do contraste até o segmento ampular, sem dispersão peritoneal ipsilateral, com dilatação tubária\. Sinal de Cotte negativo à esquerda\./)
  assert.match(conclusao(text), /Obstrução tubária distal à esquerda, no segmento ampular, com dilatação tubária\./)
})

test('espasmo não vira obstrução: perviedade indeterminada, Cotte indeterminado, hipótese confirmada', () => {
  const state = exame()
  tuba(state, 'direita', { estado: 'espasmo' })
  bloqueado(state, 'Tuba direita', /confirme a hipótese de espasmo/)
  tuba(state, 'direita', { 'estado.espasmo.confirmado': 'sim' })
  const text = laudo(state)
  assert.match(text, /Sinal de Cotte indeterminado à direita\./)
  assert.match(conclusao(text), /sem distinção segura de obstrução orgânica; perviedade tubária direita indeterminada neste exame\./)
  assert.doesNotMatch(text, /Obstrução tubária|reestudo/i)
  assert.match(conclusao(text), /Tuba uterina esquerda pérvia/)
})

test('perviedade parcial exige confirmação; indeterminada exige motivo; não avaliada nunca vira normal', () => {
  const state = exame()
  tuba(state, 'direita', { estado: 'parcial' })
  bloqueado(state, 'Tuba direita', /confirme a perviedade parcial/)
  tuba(state, 'direita', { 'estado.parcial.confirmado': 'sim' })
  assert.match(conclusao(laudo(state)), /Perviedade parcial da tuba uterina direita\./)

  const ind = exame()
  tuba(ind, 'esquerda', { estado: 'indeterminada' })
  bloqueado(ind, 'Tuba esquerda', /motivo da indeterminação/)
  tuba(ind, 'esquerda', { 'estado.indeterminada.motivo': 'Sobreposição de alças' })
  assert.match(conclusao(laudo(ind)), /Perviedade tubária esquerda indeterminada ao método \(sobreposição de alças\)\./)

  const na = exame()
  tuba(na, 'esquerda', { estado: 'nao_avaliada' })
  const text = laudo(na)
  assert.match(conclusao(text), /Tuba uterina esquerda não avaliada\./)
  assert.doesNotMatch(text, /Cotte positivo à esquerda|bilateralmente/)
})

test('limitação técnica global entra na conclusão; reestudo só opt-in, confirmado e coerente', () => {
  const state = exame()
  state.tecnica = { ...state.tecnica, condicoes: 'limitadas' }
  bloqueado(state, 'Técnica', /descreva a limitação/)
  state.tecnica['condicoes.limitadas.motivo'] = 'Refluxo do contraste pelo colo'
  let text = laudo(state)
  assert.match(conclusao(text), /Exame com limitação técnica \(refluxo do contraste pelo colo\)\./)
  assert.doesNotMatch(text, /reestudo/i)
  state.recomendacao = { ...state.recomendacao, opcao: 'reestudo' }
  bloqueado(state, 'Recomendação', /confirme a recomendação/)
  state.recomendacao.confirmada = 'sim'
  text = laudo(state)
  assert.match(conclusao(text), /Convém, a critério clínico, reestudo em momento oportuno\./)

  const normal = exame()
  normal.recomendacao = { ...normal.recomendacao, opcao: 'reestudo', confirmada: 'sim' }
  assert.ok(pendenciasLocais(ID, normal).some(p => /reestudo só se aplica/.test(p)))
})

test('sem cateterização: cavidade e tubas precisam constar como não avaliadas', () => {
  const state = exame()
  state.tecnica = { ...state.tecnica, cateterizacao: 'nao_obtida' }
  const pend = pendenciasLocais(ID, state)
  assert.ok(pend.some(p => /tubas devem constar como não avaliadas/.test(p)))
  assert.ok(pend.some(p => /cavidade deve constar como não avaliada/.test(p)))
  state.cavidade = { ...state.cavidade, cavidade: 'nao_avaliada' }
  tuba(state, 'direita', { estado: 'nao_avaliada' })
  tuba(state, 'esquerda', { estado: 'nao_avaliada' })
  const text = laudo(state)
  assert.match(conclusao(text), /Não foi possível a cateterização do canal cervical/)
  assert.doesNotMatch(text, /pérvia|Cotte/)
})

test('Sinal de Cotte é derivado do estado, nunca digitado', () => {
  assert.equal(cotteDerivado('pervia'), 'positivo')
  assert.equal(cotteDerivado('obstrucao_distal'), 'negativo')
  assert.equal(cotteDerivado('espasmo'), 'indeterminado')
  assert.equal(cotteDerivado('nao_avaliada'), null)
  const campos = hycosy.sections.flatMap(s => s.module?.schema.fields ?? []).map(f => f.key)
  assert.ok(!campos.some(k => /cotte/i.test(k)))
})

console.log(`# ${cases} casos`)
