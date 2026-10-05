import assert from 'node:assert/strict'
import { categoryDisplayLabel } from '@laudousg/shared'
import { composeReport, initialExamState, CATEGORIES, GENERIC_CATEGORIES, type ExamState } from '../src/lib/deterministic'
import { axilas } from '../src/lib/deterministic/organs/axilas'
import { AXILA_FORMA_OPTIONS, AXILA_HILO_OPTIONS, mamaria } from '../src/lib/deterministic/organs/mamaria'
import { groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { categoriaLabel } from '../src/components/historico/HistoryItem'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
const ID = 'AXILAS'
const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1] ?? ''
const achados = (text: string) => text.split('OBSERVADOS:\n\n')[1]?.split('\n\nCONCLUSÃO:')[0] ?? ''

function exame(modelo: 'em_branco' | 'normal' = 'normal'): ExamState {
  const state = initialExamState(axilas)
  state.__opts = { ...state.__opts, modelo }
  return state
}
const compor = (state: ExamState) => composeReport(axilas, state)
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
const P = 'estado.alterada.'
const atipicaEsquerda = (state: ExamState, extra: Record<string, string> = {}) => {
  state.axila_esquerda = {
    ...state.axila_esquerda, estado: 'alterada', [`${P}eixo_longo_mm`]: '18', [`${P}eixo_curto_mm`]: '12', [`${P}cortical_mm`]: '5',
    [`${P}hilo`]: 'ausente', [`${P}forma`]: 'redonda', [`${P}classificacao`]: 'atipico', [`${P}confirmado`]: 'sim', ...extra,
  }
}

test('card selecionável em Pequenas partes, com busca, histórico e formulário da mama reaproveitado', () => {
  assert.equal(CATEGORIES[ID], axilas)
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(ID))
  assert.equal(isWriterCategory(ID), false)
  assert.equal(categoriaMigrada(ID), false)
  const entry = groupCategories(GENERIC_CATEGORIES.map(({ id, name }) => ({ id, name }))).flatMap(g => g.entries).find(e => e.id === ID)!
  assert.equal(entry.groupId, 'pequenas_partes')
  assert.equal(entry.name, 'Axilas')
  for (const busca of ['axilas', 'linfonodo axilar', 'regioes axilares']) assert.ok(matchesCategory(entry, busca), busca)
  assert.equal(categoriaLabel(ID), 'Axilas')
  assert.equal(categoryDisplayLabel(ID), 'Axilas')
  // Mesmos descritores do formulário axilar da MAMARIA (uma fonte só).
  const sub = axilas.sections[0]!.module!.schema.fields[0]!.options!.find(o => o.value === 'alterada')!.subFields!
  assert.equal(sub.find(f => f.key === 'forma')!.options, AXILA_FORMA_OPTIONS)
  assert.equal(sub.find(f => f.key === 'hilo')!.options, AXILA_HILO_OPTIONS)
  const mamaAxila = mamaria.sections.find(s => s.id === 'axilas')!.module!.schema.fields[0]!.options!.find(o => o.value === 'alteradas')!.subFields!
  assert.equal(mamaAxila.find(f => f.key === 'hilo')!.options, AXILA_HILO_OPTIONS)
})

test('em branco: nada é afirmado — as duas axilas ficam pendentes (caso 1)', () => {
  const report = compor(exame('em_branco'))
  assert.equal(report.text, '')
  assert.deepEqual(report.pendencias.map(p => p.onde), ['Axila direita', 'Axila esquerda'])
})

test('modelo normal explícito: título axilar, sem mamas nem BI-RADS, conclusão única (caso 2)', () => {
  const text = laudo(exame())
  assert.match(text, /^ULTRASSONOGRAFIA DAS REGIÕES AXILARES\n/)
  assert.match(achados(text), /Na axila direita, imagens ovais, com a periferia hipoecoica e o centro hiperecoico, compatíveis com linfonodos de aspecto habitual\./)
  assert.equal(conclusao(text), '1. Linfonodos axilares normais.')
  assert.doesNotMatch(text, /mama|BI-RADS/i)
})

test('alterado: linfonodo atípico só na esquerda; direita segue normal, sem colar o corpo na conclusão (caso 3)', () => {
  const state = exame()
  atipicaEsquerda(state)
  const text = laudo(state)
  assert.match(achados(text), /Na axila esquerda, linfonodo de forma redonda, com hilo gorduroso ausente, cortical de 5 mm, medindo 18 mm no eixo longo e 12 mm no eixo curto\./)
  assert.equal(conclusao(text), '1. Linfonodos de aspecto habitual na axila direita.\n2. Linfonodo axilar atípico à esquerda.')
  assert.doesNotMatch(conclusao(text), /18 mm|normais\./)
})

test('reacional e múltiplos: classificação vem do médico, por lado', () => {
  const state = exame()
  atipicaEsquerda(state, { [`${P}classificacao`]: 'reacional', [`${P}hilo`]: 'preservado', [`${P}cortical_mm`]: '', [`${P}forma`]: 'oval', [`${P}quantidade`]: 'multiplos' })
  const text = laudo(state)
  assert.match(achados(text), /Na axila esquerda, múltiplos linfonodos, o maior de forma oval, com hilo gorduroso preservado, medindo 18 mm/)
  assert.match(conclusao(text), /2\. Linfonodos axilares proeminentes, de aspecto reacional, à esquerda\./)
  assert.doesNotMatch(text, /atípic/)
})

test('não avaliada retira a normalidade daquele lado, sem rotular de atípico (caso 4)', () => {
  const state = exame()
  state.axila_direita = { ...state.axila_direita, estado: 'nao_avaliada', 'estado.nao_avaliada.motivo': 'Curativo local' }
  const text = laudo(state)
  assert.match(achados(text), /^Axila direita não avaliada \(curativo local\)\./)
  assert.equal(conclusao(text), '1. Axila direita não avaliada (curativo local).\n2. Linfonodos de aspecto habitual na axila esquerda.')
  assert.doesNotMatch(text, /atípic|axilares normais/)
})

test('pós-cirúrgica exige o procedimento e não afirma normalidade', () => {
  const state = exame()
  state.axila_direita = { ...state.axila_direita, estado: 'pos_cirurgica' }
  bloqueado(state, 'Axila direita', /procedimento prévio/)
  state.axila_direita['estado.pos_cirurgica.descricao'] = 'Esvaziamento axilar'
  const text = laudo(state)
  assert.match(achados(text), /Axila direita com alterações pós-cirúrgicas \(esvaziamento axilar\), sem linfonodos identificáveis ao método\./)
  assert.match(conclusao(text), /1\. Alterações pós-cirúrgicas na axila direita \(esvaziamento axilar\)\./)
  assert.doesNotMatch(text, /axilares normais|atípic/)
})

test('alterada sem dados mínimos, medidas incoerentes ou sem confirmação bloqueia (casos 5–7)', () => {
  const state = exame()
  state.axila_esquerda = { ...state.axila_esquerda, estado: 'alterada' }
  bloqueado(state, 'Axila esquerda', /eixo longo \(mm\), eixo curto \(mm\), hilo gorduroso ou espessura cortical, classificação/)
  atipicaEsquerda(state, { [`${P}eixo_longo_mm`]: '10', [`${P}eixo_curto_mm`]: '15' })
  bloqueado(state, 'Axila esquerda', /eixo curto não pode ser maior/)
  atipicaEsquerda(state, { [`${P}eixo_longo_mm`]: '1,8', [`${P}eixo_curto_mm`]: '1,2' })
  bloqueado(state, 'Axila esquerda', /unidade dos eixos/)
  atipicaEsquerda(state, { [`${P}confirmado`]: 'nao' })
  bloqueado(state, 'Axila esquerda', /confirme a classificação/)
})

test('reversão e persistência: desfazer volta ao normal sem resíduo; estado salvo reabre igual (caso 8)', () => {
  const normal = laudo(exame())
  const state = exame()
  atipicaEsquerda(state)
  state.axila_direita = { ...state.axila_direita, estado: 'nao_avaliada' }
  const alterado = laudo(state)
  assert.equal(laudo(JSON.parse(JSON.stringify(state)) as ExamState), alterado)
  state.axila_esquerda = { ...state.axila_esquerda, estado: 'modelo' }
  state.axila_direita = { ...state.axila_direita, estado: 'normal' }
  assert.equal(laudo(state), normal)
})

console.log(`${cases} Axilas structured web cases passed`)
