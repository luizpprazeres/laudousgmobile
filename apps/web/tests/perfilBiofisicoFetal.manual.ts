import assert from 'node:assert/strict'
import { categoryDisplayLabel } from '@laudousg/shared'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, type ExamState } from '../src/lib/deterministic'
import { escorePerfilBiofisico, perfilBiofisicoFetal } from '../src/lib/deterministic/organs/perfilBiofisicoFetal'
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
const render = (state: ExamState) => composeReport(perfilBiofisicoFetal, state)

/** Modelo normal: quatro componentes ultrassonográficos presentes, sem CTG. */
function modeloNormal(): ExamState {
  const state = initialExamState(perfilBiofisicoFetal)
  state.__opts = { ...state.__opts, model: 'normal' }
  return state
}

function bloqueado(state: ExamState, onde: string, motivo: RegExp) {
  const report = render(state)
  assert.equal(report.text, '', `laudo deveria estar bloqueado (${onde})`)
  assert.ok(report.pendencias.some((p) => p.onde === onde && motivo.test(p.motivo)), `sem pendência ${onde} ${motivo}: ${JSON.stringify(report.pendencias)}`)
}

test('seletor em Obstetrícia, rótulo humano, busca e histórico', () => {
  assert.ok(CATEGORIES.PERFIL_BIOFISICO_FETAL)
  assert.ok(GENERIC_CATEGORIES.includes(perfilBiofisicoFetal))
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes('PERFIL_BIOFISICO_FETAL'))
  assert.equal(isWriterCategory('PERFIL_BIOFISICO_FETAL'), false)
  assert.ok(CATEGORY_GROUPS.find((g) => g.id === 'obstetricia')?.categories.includes('PERFIL_BIOFISICO_FETAL'))
  assert.equal(categoryDisplayLabel('PERFIL_BIOFISICO_FETAL'), 'Perfil biofísico fetal')
  assert.equal(categoriaLabel('PERFIL_BIOFISICO_FETAL'), 'Perfil biofísico fetal')
  const entry = groupCategories([{ id: 'PERFIL_BIOFISICO_FETAL', name: 'x' }]).flatMap((g) => g.entries)[0]!
  for (const termo of ['perfil biofisico', 'pbf', 'vitalidade fetal', 'cardiotocografia']) assert.ok(matchesCategory(entry, termo), termo)
})

test('sem normalidade implícita: estado inicial em branco não gera laudo', () => {
  const state = initialExamState(perfilBiofisicoFetal)
  assert.deepEqual(escorePerfilBiofisico(state.perfil!, state.__opts), { pontos: 0, maximo: 0, naoAvaliados: ['cardiotocografia', 'movimentos respiratórios', 'movimentos corporais', 'tônus', 'líquido amniótico'], alterados: [] })
  bloqueado(state, 'Perfil biofísico', /ao menos um componente/)
})

test('modelo basal 8/8 sem cardiotocografia: CTG explícita como não realizada, sem zero', () => {
  const { text, pendencias } = render(modeloNormal())
  assert.deepEqual(pendencias, [])
  assert.match(text, /^ULTRASSONOGRAFIA OBSTÉTRICA — PERFIL BIOFÍSICO FETAL\n/)
  assert.equal(achados(text), [
    'Cardiotocografia (teste sem estresse) não realizada.',
    'Movimentos respiratórios fetais presentes durante o período de observação (2 pontos).',
    'Os movimentos fetais são ativos (2 pontos).',
    'Tônus fetal preservado (2 pontos).',
    'Líquido amniótico em quantidade adequada (2 pontos).',
  ].join('\n'))
  assert.equal(conclusao(text), '1. Perfil biofísico fetal com 8/8 pontos nos componentes avaliados; não avaliados: cardiotocografia.')
  assert.doesNotMatch(text, /normalidade|0 pontos/)
})

test('10/10 com cardiotocografia reativa e interpretação médica de normalidade', () => {
  const state = modeloNormal()
  Object.assign(state.perfil!, { ctg: 'normal', interpretacao: 'normal', liquido_medida: 'mbv', liquido_cm: '4.5' })
  const { text } = render(state)
  assert.match(achados(text), /Cardiotocografia \(teste sem estresse\) reativa \(2 pontos\)\./)
  assert.match(achados(text), /Líquido amniótico em quantidade adequada, com maior bolsão vertical de 4,5 cm \(2 pontos\)\./)
  assert.equal(conclusao(text), [
    '1. Perfil biofísico fetal com 10/10 pontos nos componentes avaliados.',
    '2. Perfil biofísico fetal dentro da normalidade, conforme interpretação médica.',
  ].join('\n'))
})

test('alterado 8/10: o total não esconde o componente zerado', () => {
  const state = modeloNormal()
  Object.assign(state.perfil!, { ctg: 'normal', respiratorios: 'alterado' })
  const { text } = render(state)
  assert.match(achados(text), /Movimentos respiratórios fetais não observados durante o período de observação \(0 pontos\)\./)
  assert.equal(conclusao(text), [
    '1. Perfil biofísico fetal com 8/10 pontos nos componentes avaliados.',
    '2. Ausência de movimentos respiratórios fetais durante o período de observação.',
  ].join('\n'))
})

test('alterado 6/8: oligoâmnio entra na conclusão com a medida, sem CTG', () => {
  const state = modeloNormal()
  Object.assign(state.perfil!, { liquido: 'alterado', liquido_medida: 'ila', liquido_cm: '3,5', interpretacao: 'alterado' })
  const { text, pendencias } = render(state)
  assert.deepEqual(pendencias, [])
  assert.match(achados(text), /Líquido amniótico reduzido, com índice de líquido amniótico \(ILA\) de 3,5 cm \(0 pontos\)\./)
  assert.equal(conclusao(text), [
    '1. Perfil biofísico fetal com 6/8 pontos nos componentes avaliados; não avaliados: cardiotocografia.',
    '2. Oligoâmnio (ILA de 3,5 cm).',
    '3. Perfil biofísico fetal alterado, conforme interpretação médica.',
  ].join('\n'))
})

test('denominador só com componentes avaliados; não avaliado aparece escrito', () => {
  const state = modeloNormal()
  Object.assign(state.perfil!, { tonus: 'nao_avaliado', corporais: 'nao_avaliado' })
  const { text } = render(state)
  assert.match(achados(text), /Tônus fetal não avaliado\./)
  assert.match(conclusao(text), /^1\. Perfil biofísico fetal com 4\/4 pontos nos componentes avaliados; não avaliados: cardiotocografia, movimentos corporais e tônus\.$/m)
})

test('incompleto e contraditório: líquido sem medida, medida incoerente, interpretação incoerente', () => {
  let state = modeloNormal()
  state.perfil!.liquido = 'alterado'
  bloqueado(state, 'Líquido amniótico', /exige a medida/)
  Object.assign(state.perfil!, { liquido_medida: 'mbv', liquido_cm: '5' })
  bloqueado(state, 'Líquido amniótico', /não caracteriza líquido reduzido/)
  state = modeloNormal()
  Object.assign(state.perfil!, { liquido_medida: 'ila', liquido_cm: '3' })
  bloqueado(state, 'Líquido amniótico', /caracteriza líquido reduzido/)
  state.perfil!.liquido_cm = 'abc'
  bloqueado(state, 'Líquido amniótico', /inválida/)
  state = modeloNormal()
  Object.assign(state.perfil!, { tonus: 'nao_avaliado', interpretacao: 'normal' })
  bloqueado(state, 'Interpretação', /quatro componentes/)
  state = modeloNormal()
  state.perfil!.interpretacao = 'limitrofe'
  bloqueado(state, 'Interpretação', /ao menos um componente alterado/)
  state = modeloNormal()
  Object.assign(state.perfil!, { liquido: 'alterado', liquido_medida: 'mbv', liquido_cm: '1,5', interpretacao: 'normal' })
  bloqueado(state, 'Interpretação', /líquido amniótico reduzido/)
  state = modeloNormal()
  Object.assign(state.perfil!, { liquido: 'nao_avaliado', liquido_medida: 'mbv', liquido_cm: '4' })
  bloqueado(state, 'Líquido amniótico', /não avaliado/)
})

test('polidrâmnio pela medida não muda o escore, mas aparece na conclusão', () => {
  const state = modeloNormal()
  Object.assign(state.perfil!, { liquido_medida: 'ila', liquido_cm: '27' })
  const { text } = render(state)
  assert.match(conclusao(text), /1\. Perfil biofísico fetal com 8\/8 pontos/)
  assert.match(conclusao(text), /2\. Polidrâmnio \(ILA de 27 cm\)\./)
})

test('reversão: desfazer as alterações reproduz o laudo basal sem resíduos', () => {
  const basal = render(modeloNormal()).text
  const state = modeloNormal()
  Object.assign(state.perfil!, { ctg: 'alterado', respiratorios: 'alterado', liquido: 'alterado', liquido_medida: 'ila', liquido_cm: '3,5', interpretacao: 'alterado' })
  assert.notEqual(render(state).text, basal)
  Object.assign(state.perfil!, { ctg: 'model', respiratorios: 'model', liquido: 'model', liquido_medida: 'nao_medido', liquido_cm: '', interpretacao: 'nao_informada' })
  const revertido = render(state)
  assert.deepEqual(revertido.pendencias, [])
  assert.equal(revertido.text, basal)
})

test('persistência: o estado salvo (JSON) recompõe o mesmo laudo', () => {
  const state = modeloNormal()
  Object.assign(state.perfil!, { ctg: 'normal', respiratorios: 'alterado', liquido_medida: 'mbv', liquido_cm: '3,1' })
  const salvo = JSON.parse(JSON.stringify(state)) as ExamState
  assert.equal(render(salvo).text, render(state).text)
  assert.match(conclusao(render(salvo).text), /8\/10 pontos/)
})

console.log(`${cases} perfil biofísico fetal structured web cases passed`)
