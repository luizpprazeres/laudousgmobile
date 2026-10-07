/**
 * PÉLVICO TRANSVAGINAL — formulário Web próprio sobre a pelve canônica.
 *
 * O texto é o do renderer de produção (`renderizarSelecao` da API), alimentado
 * pelo adaptador da tela — o mesmo caminho do `/api/catalog/.../render`.
 */
import assert from 'node:assert/strict'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { alteracoesDe } from '../../api/src/server/renderer/catalog/alteracoes/index'
import { adaptarPelveTransvaginal } from '../src/lib/catalog/pelveParaCatalogo'
import { categoriaDeRender, categoriaMigrada } from '../src/lib/catalog/migradas'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, pelveFeminina, pelvicoTransvaginal, type ExamState } from '../src/lib/deterministic'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'
import { CATEGORY_DISPLAY_NAMES, CATEGORY_GROUPS, CATEGORY_SYNONYMS } from '../src/components/laudar/categoryGroups'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

const cat = pelvicoTransvaginal
function patch(state: ExamState, section: string, values: Record<string, string | string[]>): ExamState {
  return { ...state, [section]: { ...state[section], ...values } }
}
function normal(): ExamState {
  let s = initialExamState(cat)
  s = patch(s, 'utero', { medidas: '7,8 x 4,2 x 4,8' })
  s = patch(s, 'endometrio', { espessura: '0,7' })
  s = patch(s, 'ovario_direito', { medidas: '3,1 x 2,0 x 1,8' })
  s = patch(s, 'ovario_esquerdo', { medidas: '2,9 x 1,9 x 1,7' })
  return s
}
function adaptar(state: ExamState) {
  const opcoes = (state.__opts ?? {}) as Record<string, string | string[]>
  return adaptarPelveTransvaginal(state as Record<string, unknown>, opcoes)
}
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

// ---------------------------------------------------------------- registro

test('categoria própria em Saúde da mulher, derivada da pelve e fora do writer', () => {
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(cat.id))
  assert.equal(isWriterCategory(cat.id), false)
  assert.ok(GENERIC_CATEGORIES.includes(cat))
  assert.equal(CATEGORIES[cat.id], cat)
  assert.ok(CATEGORY_GROUPS.find((g) => g.id === 'saude_mulher')!.categories.includes(cat.id))
  assert.equal(CATEGORY_DISPLAY_NAMES[cat.id], 'Pelve transvaginal')
  assert.ok(CATEGORY_SYNONYMS[cat.id]!.includes('endovaginal'))
  assert.equal(categoriaMigrada(cat.id), true)
  assert.equal(categoriaDeRender(cat.id), 'PELVE_FEMININA')
  assert.equal(categoriaDeRender('PELVE_FEMININA'), 'PELVE_FEMININA')
  assert.throws(() => composeReport(cat, initialExamState(cat)), /renderer canônico/)
})

test('reaproveita os módulos da pelve, preserva lados e fixa a via transvaginal', () => {
  assert.deepEqual(cat.sections.map((s) => s.id), ['utero', 'endometrio', 'ovario_direito', 'ovario_esquerdo'])
  for (const section of cat.sections) {
    assert.equal(section.module, pelveFeminina.sections.find((s) => s.id === section.id)!.module)
  }
  assert.ok(!(cat.controls ?? []).some((c) => c.key === 'via'))
  assert.equal(cat.resolveTitle!({}), 'ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL')
  assert.match(cat.resolveTecnica!({}), /técnica transvaginal/)
  assert.doesNotMatch(cat.resolveTecnica!({}), /transabdominal/)
})

// ---------------------------------------------------------------- vazio / incompleto

test('estado vazio não afirma normalidade: bloqueia com a lista do que falta', () => {
  assert.deepEqual(bloqueios(initialExamState(cat)), [
    'útero: informe as três medidas do útero (L x AP x T, em cm)',
    'endométrio: informe a espessura do endométrio (cm)',
    'ovário direito: informe as três medidas do ovário direito ou marque não visualizado',
    'ovário esquerdo: informe as três medidas do ovário esquerdo ou marque não visualizado',
  ])
})

test('medida parcial ou ilegível também bloqueia', () => {
  let s = patch(normal(), 'utero', { medidas: '7,8 x 4,2' })
  assert.deepEqual(bloqueios(s), ['útero: medidas do útero inválidas: use L x AP x T em cm'])
  s = patch(normal(), 'endometrio', { espessura: 'fina' })
  assert.deepEqual(bloqueios(s), ['endométrio: espessura do endométrio inválida: use cm'])
})

// ---------------------------------------------------------------- normal

test('modelo normal transvaginal: título, técnica, sem bexiga e sem lacuna', () => {
  const s = normal()
  s.__opts = { ...s.__opts, via: 'ta_tv' } // resíduo de outra tela não muda a via
  const a = adaptar(s)
  assert.equal(a.dados.via, 'tv')
  assert.equal(a.dados.bexiga, null)
  const texto = render(s)
  assert.match(texto, /^ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL\n/)
  assert.doesNotMatch(texto, /transabdominal|Bexiga|____/)
  assert.match(texto, /Útero em anteversão, medindo 7,8 x 4,2 x 4,8 cm\./)
  assert.match(conclusao(texto), /Ovários ecograficamente normais \(o direito com 5,8 cm³ e o esquerdo 4,9 cm³\)/)
})

// ---------------------------------------------------------------- alterado

test('mioma e cisto simples à direita: achado fica no lado certo', () => {
  let s = patch(normal(), 'utero', { mioma: ['sim'], 'mioma.sim.medidas': '2,4 x 2,1 x 1,9', 'mioma.sim.classificacao': 'intramural' })
  s = patch(s, 'ovario_direito', { achado: 'cisto_simples', 'achado.cisto_simples.medidas': '3,2 x 2,8 x 2,6' })
  const texto = render(s)
  assert.match(texto, /2,4/)
  assert.match(texto, /Ovário direito medindo 3,1 x 2 x 1,8 cm, apresentando imagem anecoica/)
  assert.match(texto, /Ovário esquerdo medindo 2,9 x 1,9 x 1,7 cm, apresentando imagens anecoicas\./)
  assert.match(conclusao(texto), /Ovário direito[^\n]*\n[^\n]*Ovário esquerdo ecograficamente normal/)
  assert.match(conclusao(texto), /Miométrio/)
})

test('ovário não visualizado é dito como tal; com dados preenchidos, bloqueia', () => {
  let s = patch(normal(), 'ovario_esquerdo', { visualizado: 'nao', medidas: '' })
  assert.match(conclusao(render(s)), /Ovário esquerdo não visualizado/)
  s = patch(s, 'ovario_esquerdo', { achado: 'cisto_simples' })
  assert.deepEqual(bloqueios(s), ['ovário esquerdo: ovário marcado como não visualizado tem medidas ou achado preenchidos'])
})

// ---------------------------------------------------------------- menopausa / endométrio

test('menopausa: espessura dentro da regra existente sai com a frase da menopausa', () => {
  const s = patch(normal(), 'endometrio', { espessura: '0,3' })
  s.__opts = { ...s.__opts, menopausa: ['sim'] }
  const c = conclusao(render(s))
  assert.match(c, /faixa etária da menopausa/)
  assert.doesNotMatch(c, /fase do ciclo/)
})

test('menopausa com endométrio > 0,5 cm sem achado bloqueia; com achado descrito, renderiza', () => {
  let s = patch(normal(), 'endometrio', { espessura: '0,8' })
  s.__opts = { ...s.__opts, menopausa: ['sim'] }
  assert.match(bloqueios(s)[0]!, /endométrio acima de 0,5 cm na menopausa não pode sair como espessura normal/)
  s = patch(s, 'endometrio', { frase: 'menopausa' })
  s.__opts = { ...s.__opts, menopausa: [] }
  assert.equal(bloqueios(s).length, 1, 'a frase "menopausa" do módulo também conta')
  s = patch(s, 'endometrio', { achado_tipo: 'polipo', achado_medidas: '0,8 x 0,5' })
  assert.deepEqual(bloqueios(s), [])
})

// ---------------------------------------------------------------- lesão anexial

test('lesão anexial sem medida, "outro" sem descrição ou > 7 cm sem O-RADS bloqueiam', () => {
  let s = patch(normal(), 'ovario_direito', { achado: 'lesao_solida' })
  assert.deepEqual(bloqueios(s), ['ovário direito: informe as medidas do achado no ovário direito'])
  s = patch(normal(), 'ovario_esquerdo', { achado: 'outro', 'achado.outro.medidas': '2,0 x 1,5 x 1,0' })
  assert.deepEqual(bloqueios(s), ['ovário esquerdo: descreva o achado "outro" no ovário esquerdo'])
  s = patch(normal(), 'ovario_direito', { achado: 'cisto_complexo', 'achado.cisto_complexo.medidas': '8,2 x 6,0 x 5,5' })
  assert.deepEqual(bloqueios(s), ['ovário direito: lesão anexial acima de 7 cm no ovário direito exige O-RADS confirmado pelo médico'])
  s = patch(s, 'ovario_direito', { 'achado.cisto_complexo.orads': '3' })
  assert.deepEqual(bloqueios(s), [])
})

test('aspecto policístico não exige medida de lesão', () => {
  const s = patch(normal(), 'ovario_direito', { achado: 'sop' })
  assert.deepEqual(bloqueios(s), [])
})

// ---------------------------------------------------------------- reversão

test('desfazer achado e menopausa devolve o laudo normal, sem resíduo', () => {
  let s = patch(normal(), 'ovario_direito', { achado: 'lesao_solida' })
  s = patch(s, 'endometrio', { espessura: '0,8' })
  s.__opts = { ...s.__opts, menopausa: ['sim'] }
  assert.equal(bloqueios(s).length, 2)
  s = patch(s, 'ovario_direito', { achado: 'nenhum' })
  s.__opts = { ...s.__opts, menopausa: [] }
  assert.deepEqual(bloqueios(s), [])
  const texto = render(s)
  assert.doesNotMatch(texto, /sólid|menopausa/)
  assert.match(conclusao(texto), /fase do ciclo menstrual/)
})

console.log(`${cases} pélvico transvaginal structured Web cases passed`)
