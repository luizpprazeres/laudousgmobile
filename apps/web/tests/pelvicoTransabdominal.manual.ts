/**
 * PÉLVICO ABDOMINAL — atalho Web sobre a pelve canônica com via TA fixa.
 *
 * O texto é o do renderer de produção (`renderizarSelecao` da API), alimentado
 * pelo adaptador da tela — o mesmo caminho do `/api/catalog/.../render`.
 * Casos de aceitação: audits/lote3/pelvico-abdominal-2026-10-05.md §6.5.
 */
import assert from 'node:assert/strict'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { alteracoesDe } from '../../api/src/server/renderer/catalog/alteracoes/index'
import { adaptarPelveTransabdominal, adaptarPelveTransvaginal } from '../src/lib/catalog/pelveParaCatalogo'
import { categoriaDeRender, categoriaMigrada } from '../src/lib/catalog/migradas'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, pelvicoTransabdominal, pelvicoTransvaginal, type ExamState } from '../src/lib/deterministic'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'
import { CATEGORY_DISPLAY_NAMES, CATEGORY_GROUPS, CATEGORY_SYNONYMS } from '../src/components/laudar/categoryGroups'
import { categoriaLabel } from '../src/components/historico/HistoryItem'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

const cat = pelvicoTransabdominal
function patch(state: ExamState, section: string, values: Record<string, string | string[]>): ExamState {
  return { ...state, [section]: { ...state[section], ...values } }
}
/** Útero e ovários medidos, repleção adequada; endométrio a definir por caso. */
function medido(): ExamState {
  let s = initialExamState(cat)
  s = patch(s, 'bexiga', { replecao: 'adequada' })
  s = patch(s, 'utero', { medidas: '7,8 x 4,2 x 4,8' })
  s = patch(s, 'ovario_direito', { medidas: '3,1 x 2,0 x 1,8' })
  s = patch(s, 'ovario_esquerdo', { medidas: '2,9 x 1,9 x 1,7' })
  return s
}
const opcoesDe = (state: ExamState) => (state.__opts ?? {}) as Record<string, string | string[]>
const adaptar = (state: ExamState) => adaptarPelveTransabdominal(state as Record<string, unknown>, opcoesDe(state))
const bloqueios = (state: ExamState) => adaptar(state).pendencias.filter((p) => p.bloqueia).map((p) => `${p.onde}: ${p.motivo}`)
function render(state: ExamState): string {
  const a = adaptar(state)
  assert.deepEqual(a.pendencias.filter((p) => p.bloqueia), [], 'render só sem pendência bloqueante')
  const specs = alteracoesDe(categoriaDeRender(cat.id)).filter((s) => a.alteracoes.includes(s.id))
  const r = renderizarSelecao(categoriaDeRender(cat.id), 'CLASSICO_COMPLETO', specs, a.dados as never)
  assert.ok(r.ok, `renderer recusou: ${JSON.stringify(r)}`)
  return (r as { texto: string }).texto
}
const conclusao = (texto: string) => texto.split('CONCLUSÃO:')[1] ?? ''
const corpo = (texto: string) => texto.split('CONCLUSÃO:')[0] ?? ''

test('registro: Saúde da mulher, nome humano, busca, histórico; derivada da pelve, sem motor próprio', () => {
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(cat.id))
  assert.equal(isWriterCategory(cat.id), false)
  assert.ok(GENERIC_CATEGORIES.includes(cat))
  assert.equal(CATEGORIES[cat.id], cat)
  assert.ok(CATEGORY_GROUPS.find((g) => g.id === 'saude_mulher')!.categories.includes(cat.id))
  assert.equal(CATEGORY_DISPLAY_NAMES[cat.id], 'Pélvico abdominal')
  assert.equal(categoriaLabel(cat.id), 'Pélvico abdominal')
  assert.ok(CATEGORY_SYNONYMS[cat.id]!.includes('transabdominal'))
  assert.equal(categoriaMigrada(cat.id), true)
  assert.equal(categoriaDeRender(cat.id), 'PELVE_FEMININA')
  assert.throws(() => composeReport(cat, initialExamState(cat)), /renderer canônico/)
})

test('formulário: via fixa, finalidades compatíveis com TA, bexiga primeiro e repleção sem padrão', () => {
  assert.ok(!(cat.controls ?? []).some((c) => c.key === 'via'))
  const modo = (cat.controls ?? []).find((c) => c.key === 'modo_pelve')!
  assert.deepEqual(modo.options!.map((o) => o.value), ['rotina', 'doppler'])
  assert.equal(cat.sections[0]!.id, 'bexiga')
  assert.deepEqual(cat.sections.map((s) => s.id).sort(), ['bexiga', 'endometrio', 'ovario_direito', 'ovario_esquerdo', 'utero'])
  const replecao = cat.sections[0]!.module!.schema.fields.find((f) => f.key === 'replecao')!
  assert.ok(replecao.options!.every((o) => !o.isDefault))
  assert.equal(initialExamState(cat).bexiga!.replecao, '')
  assert.equal(cat.resolveTitle!({}), 'ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL')
  assert.match(cat.resolveTecnica!({}), /técnica transabdominal/)
})

test('estado inicial bloqueia: repleção, útero e ovários; nenhuma normalidade', () => {
  const b = bloqueios(initialExamState(cat))
  assert.ok(b.some((p) => /bexiga: confirme a repleção vesical/.test(p)), b.join('\n'))
  assert.ok(b.some((p) => /útero: informe as três medidas/.test(p)))
  assert.ok(b.some((p) => /ovário direito: informe as três medidas/.test(p)))
  assert.ok(b.some((p) => /ovário esquerdo: informe as três medidas/.test(p)))
  assert.ok(!b.some((p) => /repleção tem opção inválida/.test(p)), 'sem mensagem técnica confusa')
})

test('endométrio não medido sai como limitado pela técnica, no corpo e na conclusão', () => {
  const texto = render(medido())
  assert.match(texto, /^ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL/)
  assert.match(corpo(texto), /A técnica transabdominal não permite avaliar detalhadamente a espessura do endométrio\./)
  assert.match(conclusao(texto), /Não foi possível avaliar detalhadamente a espessura do endométrio pela técnica transabdominal\./)
  assert.doesNotMatch(texto, /espessura normal|____/)
})

test('menopausa não reintroduz normalidade do endométrio não medido', () => {
  let s = medido()
  s = { ...s, __opts: { ...s.__opts, menopausa: ['sim'] } }
  const texto = render(s)
  assert.match(conclusao(texto), /Não foi possível avaliar detalhadamente a espessura do endométrio pela técnica transabdominal\./)
  assert.doesNotMatch(texto, /espessura normal para a faixa etária da menopausa/)
})

test('modelo normal completo (tudo medido, repleção adequada): endométrio com espessura', () => {
  const texto = render(patch(medido(), 'endometrio', { espessura: '0,7' }))
  assert.match(corpo(texto), /Endométrio homogêneo, medindo 0,7 cm de espessura\./)
  assert.match(conclusao(texto), /O endométrio tem espessura normal para a fase do ciclo menstrual\./)
  assert.doesNotMatch(texto, /____|não permite avaliar/)
})

test('repleção pequena/insuficiente/vazia bloqueia: a técnica afirmaria bexiga repleta', () => {
  for (const replecao of ['pequena', 'insuficiente', 'vazia']) {
    const b = bloqueios(patch(medido(), 'bexiga', { replecao }))
    assert.ok(b.some((p) => /bexiga: repleção vesical insuficiente para a via transabdominal/.test(p)), `${replecao}: ${b.join('\n')}`)
  }
  assert.deepEqual(bloqueios(patch(medido(), 'bexiga', { replecao: 'moderada' })), [])
})

test('ovário não visualizado: só o lado marcado; dados no lado não visualizado bloqueiam', () => {
  let s = patch(medido(), 'ovario_esquerdo', { visualizado: 'nao', medidas: '' })
  const texto = render(s)
  assert.match(texto, /[Oo]vário esquerdo não visualizado/)
  assert.match(texto, /Ovário direito/)
  s = patch(s, 'ovario_esquerdo', { medidas: '2,9 x 1,9 x 1,7' })
  assert.ok(bloqueios(s).some((p) => /ovário esquerdo: ovário marcado como não visualizado/.test(p)))
})

test('cisto no ovário esquerdo aparece e some sem resíduo (reversão)', () => {
  const basal = render(medido())
  let s = patch(medido(), 'ovario_esquerdo', { achado: 'cisto_simples' })
  assert.ok(bloqueios(s).some((p) => /informe as medidas do achado no ovário esquerdo/.test(p)))
  s = patch(s, 'ovario_esquerdo', { 'achado.cisto_simples.medidas': '2,0 x 1,8 x 1,6' })
  const comCisto = render(s)
  assert.notEqual(comCisto, basal)
  assert.match(conclusao(comCisto), /ovário esquerdo/i)
  s = patch(s, 'ovario_esquerdo', { achado: 'nenhum' })
  assert.equal(render(s), basal)
})

test('finalidades da pelve que trocariam a via são ignoradas na TA', () => {
  const s = { ...medido(), __opts: { modo_pelve: 'pos_abortamento' } }
  assert.equal(adaptar(s).dados.via, 'ta')
  assert.equal(adaptar({ ...medido(), __opts: { modo_pelve: 'doppler' } }).dados.via, 'ta')
})

test('persistência: o estado salvo (JSON) recompõe o mesmo laudo', () => {
  const s = patch(medido(), 'endometrio', { espessura: '0,7' })
  assert.equal(render(JSON.parse(JSON.stringify(s)) as ExamState), render(s))
})

test('o portão comum não mudou o transvaginal: espessura continua obrigatória lá', () => {
  let s = initialExamState(pelvicoTransvaginal)
  s = patch(s, 'utero', { medidas: '7,8 x 4,2 x 4,8' })
  s = patch(s, 'ovario_direito', { medidas: '3,1 x 2,0 x 1,8' })
  s = patch(s, 'ovario_esquerdo', { medidas: '2,9 x 1,9 x 1,7' })
  const b = adaptarPelveTransvaginal(s as Record<string, unknown>, opcoesDe(s)).pendencias.map((p) => `${p.onde}: ${p.motivo}`)
  assert.deepEqual(b, ['endométrio: informe a espessura do endométrio (cm)'])
})

console.log(`${cases} pélvico abdominal (TA) cases passed`)
