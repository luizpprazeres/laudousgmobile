/**
 * ATALHOS COM DOPPLER — Tireoide, Cervical, Mamas e Mamas e axilas.
 *
 * O texto é o do renderer de produção (`renderizarSelecao` da API), alimentado
 * pelo adaptador do card — o mesmo caminho do `/api/catalog/.../render`.
 * Lacunas: audits/lote3/{tireoide,cervical,mamas}-doppler-2026-10-05.md.
 */
import assert from 'node:assert/strict'
import { categoryDisplayLabel } from '@laudousg/shared'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { alteracoesDe } from '../../api/src/server/renderer/catalog/alteracoes/index'
import { adaptarCervicalDoppler, adaptarMamasDoppler, adaptarTireoideDoppler } from '../src/lib/catalog/dopplerPresetsParaCatalogo'
import { categoriaDeRender, categoriaMigrada } from '../src/lib/catalog/migradas'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, initialTireoideState, type ExamState } from '../src/lib/deterministic'
import { cervicalDoppler, mamasAxilasDoppler, mamasDoppler } from '../src/lib/deterministic/organs/dopplerPresets'
import { mamaria } from '../src/lib/deterministic/organs/mamaria'
import type { TireoideState } from '../src/lib/deterministic/organs/tireoide'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'
import { CATEGORY_GROUPS, groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { categoriaLabel } from '../src/components/historico/HistoryItem'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
type Adaptado = { dados: Record<string, unknown>; alteracoes: string[]; pendencias: Array<{ onde: string; motivo: string; bloqueia: boolean }> }
const bloqueios = (a: Adaptado) => a.pendencias.filter(p => p.bloqueia).map(p => `${p.onde}: ${p.motivo}`)
function render(card: string, a: Adaptado, estilo = 'CLASSICO_COMPLETO'): string {
  assert.deepEqual(bloqueios(a), [], 'render só sem pendência bloqueante')
  const mae = categoriaDeRender(card)
  const specs = alteracoesDe(mae).filter(s => a.alteracoes.includes(s.id))
  const r = renderizarSelecao(mae, estilo as never, specs, a.dados as never)
  assert.ok(r.ok, `renderer recusou: ${JSON.stringify(r)}`)
  return (r as { texto: string }).texto
}
const conclusao = (texto: string) => texto.split('CONCLUSÃO:')[1] ?? ''

// ── Registro ──────────────────────────────────────────────────────────────────
test('registro: quatro cards derivados, nomes humanos, grupos, busca e histórico; sem motor próprio', () => {
  const esperado: Array<[string, string, string]> = [
    ['TIREOIDE_DOPPLER', 'TIREOIDE', 'Tireoide com Doppler'],
    ['CERVICAL_DOPPLER', 'CERVICAL', 'Cervical com Doppler'],
    ['MAMAS_DOPPLER', 'MAMARIA', 'Mamas com Doppler'],
    ['MAMAS_AXILAS_DOPPLER', 'MAMARIA', 'Mamas e axilas com Doppler'],
  ]
  const catalogo = [...GENERIC_CATEGORIES.map(({ id, name }) => ({ id, name })), { id: 'TIREOIDE_DOPPLER', name: 'Tireoide com Doppler' }]
  const entradas = groupCategories(catalogo).flatMap(g => g.entries)
  for (const [id, mae, nome] of esperado) {
    assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(id), id)
    assert.equal(isWriterCategory(id), false)
    assert.equal(categoriaMigrada(id), true)
    assert.equal(categoriaDeRender(id), mae)
    assert.equal(categoriaLabel(id), nome)
    assert.equal(categoryDisplayLabel(id), nome)
    assert.equal(entradas.find(e => e.id === id)?.name, nome)
  }
  assert.ok(CATEGORY_GROUPS.find(g => g.id === 'pequenas_partes')!.categories.includes('TIREOIDE_DOPPLER'))
  assert.ok(CATEGORY_GROUPS.find(g => g.id === 'saude_mulher')!.categories.includes('MAMAS_AXILAS_DOPPLER'))
  const entrada = (id: string) => entradas.find(e => e.id === id)!
  assert.ok(matchesCategory(entrada('TIREOIDE_DOPPLER'), 'tireoide doppler'))
  assert.ok(matchesCategory(entrada('CERVICAL_DOPPLER'), 'doppler cervical'))
  assert.ok(matchesCategory(entrada('MAMAS_DOPPLER'), 'doppler mamario'))
  for (const cat of [cervicalDoppler, mamasDoppler, mamasAxilasDoppler]) {
    assert.equal(CATEGORIES[cat.id], cat)
    assert.throws(() => composeReport(cat, initialExamState(cat)), /renderer canônico/)
  }
  // Reaproveita os módulos da mãe: mesmo painel, mesmos campos.
  assert.equal(mamasDoppler.sections[0]!.module, mamaria.sections.find(s => s.id === 'mamas')!.module)
  assert.deepEqual(mamasDoppler.sections.map(s => s.id), ['mamas'])
  assert.deepEqual(mamasAxilasDoppler.sections.map(s => s.id), ['mamas', 'axilas'])
  assert.ok(!mamasDoppler.controls!.some(c => c.key === 'escopo_exame' || c.key === 'doppler_mamario'))
})

// ── Tireoide com Doppler ──────────────────────────────────────────────────────
function tireoideMedida(extra: Partial<TireoideState> = {}): TireoideState {
  const s = initialTireoideState()
  return {
    ...s,
    lobo_direito: { ...s.lobo_direito, a: '4,5', b: '1,5', c: '1,6' },
    lobo_esquerdo: { ...s.lobo_esquerdo, a: '4,3', b: '1,4', c: '1,5' },
    istmo: { ...s.istmo, a: '0,3' },
    ...extra,
  }
}

test('tireoide: estado vazio não laudado; Doppler do parênquima e medidas obrigatórios', () => {
  const vazio = bloqueios(adaptarTireoideDoppler(initialTireoideState()))
  assert.ok(vazio.some(p => /vascularização do parênquima/.test(p)))
  assert.ok(vazio.some(p => /três medidas do lobo direito/.test(p)))
  assert.ok(bloqueios(adaptarTireoideDoppler(tireoideMedida({ vascularizacaoParenquima: 'alterada' }))).some(p => /ainda não tem campo/.test(p)))
})

test('tireoide: Doppler fixo no título mesmo com o botão da tireoide desligado; vascularização normal só confirmada', () => {
  const a = adaptarTireoideDoppler(tireoideMedida({ doppler: false, vascularizacaoParenquima: 'normal' }))
  assert.equal(a.dados.com_doppler, true)
  const texto = render('TIREOIDE_DOPPLER', a)
  assert.match(texto, /DOPPLER/)
  assert.match(texto, /vasculariza/i)
})

test('tireoide: linfonodos pré-marcados não viram dado; só entram após o clique', () => {
  const sem = adaptarTireoideDoppler(tireoideMedida({ vascularizacaoParenquima: 'normal' }))
  assert.equal(sem.dados.linfonodos_descritos, false)
  assert.doesNotMatch(render('TIREOIDE_DOPPLER', sem), /linfonodos de morfologia preservada|I a V/)
  const com = adaptarTireoideDoppler(tireoideMedida({ vascularizacaoParenquima: 'normal', linfonodosConfirmados: true }))
  assert.equal(com.dados.linfonodos_descritos, true)
})

// ── Cervical com Doppler ──────────────────────────────────────────────────────
function cervicalExame(modelo: 'em_branco' | 'normal' = 'normal'): ExamState {
  const s = initialExamState(cervicalDoppler)
  s.__opts = { ...s.__opts, modelo }
  return s
}
const adaptarCervical = (s: ExamState) => adaptarCervicalDoppler(s as Record<string, unknown>) as unknown as Adaptado

test('cervical: em branco bloqueia; modelo normal sai com Doppler declarado no título, sem frase vascular inventada', () => {
  assert.ok(bloqueios(adaptarCervical(cervicalExame('em_branco'))).some(p => /modelo normal/.test(p)))
  const a = adaptarCervical(cervicalExame())
  assert.equal(a.dados.com_doppler, true)
  const texto = render('CERVICAL_DOPPLER', a)
  assert.match(texto, /COM DOPPLER COLORIDO/)
  assert.doesNotMatch(texto, /sem vascularização significativa|vascularização hilar/)
})

test('cervical: linfonodo alterado exige vascularização informada; nunca "ausente" por padrão', () => {
  const s = cervicalExame()
  assert.equal(s.cervical!['linfonodo.alterado.vasc'], 'nao_informada')
  s.cervical = { ...s.cervical, linfonodo: 'alterado', 'linfonodo.alterado.nivel': 'IIA', 'linfonodo.alterado.medidas': '1,8 x 0,7 x 0,6' }
  assert.ok(bloqueios(adaptarCervical(s)).some(p => /vascularização ao Doppler/.test(p)))
  s.cervical['linfonodo.alterado.vasc'] = 'hilar'
  assert.match(render('CERVICAL_DOPPLER', adaptarCervical(s)), /vascularização hilar ao Doppler colorido/)
})

// ── Mamas com Doppler / Mamas e axilas com Doppler ────────────────────────────
function mamaExame(card: typeof mamasDoppler, modelo: 'em_branco' | 'normal' = 'normal'): ExamState {
  const s = initialExamState(card)
  s.__opts = { ...s.__opts, modelo }
  return s
}
const adaptarMama = (s: ExamState, card: 'MAMAS_DOPPLER' | 'MAMAS_AXILAS_DOPPLER') => adaptarMamasDoppler(s as Record<string, unknown>, card) as unknown as Adaptado
const comCisto = (s: ExamState, extra: Record<string, string> = {}): ExamState => ({
  ...s,
  mamas: { ...s.mamas, achados_ids: ['a1'], 'achados.a1.tipo': 'cisto_simples', 'achados.a1.lado': 'direita', 'achados.a1.medidas': '1,2 x 0,8', 'achados.a1.local': 'qse', ...extra },
})

test('mamas: escopo e Doppler fixos; em branco bloqueia; normal sem axilas e com técnica Doppler', () => {
  assert.ok(bloqueios(adaptarMama(mamaExame(mamasDoppler, 'em_branco'), 'MAMAS_DOPPLER')).some(p => /modelo normal/.test(p)))
  const a = adaptarMama(mamaExame(mamasDoppler), 'MAMAS_DOPPLER')
  assert.equal(a.dados.escopo_exame, 'mamas')
  assert.equal(a.dados.doppler_realizado, true)
  const texto = render('MAMAS_DOPPLER', a)
  assert.match(texto, /Doppler colorido/)
  assert.doesNotMatch(texto, /axila/i)
})

test('mamas: achado focal exige vascularização; cisto simples com fluxo interno bloqueia', () => {
  const sem = adaptarMama(comCisto(mamaExame(mamasDoppler)), 'MAMAS_DOPPLER')
  assert.ok(bloqueios(sem).some(p => /vascularização ao Doppler/.test(p)))
  const interno = adaptarMama(comCisto(mamaExame(mamasDoppler), { 'achados.a1.vascularizacao': 'interna' }), 'MAMAS_DOPPLER')
  assert.ok(bloqueios(interno).some(p => /incompatível com cisto simples/.test(p)))
  const ausente = adaptarMama(comCisto(mamaExame(mamasDoppler), { 'achados.a1.vascularizacao': 'ausente' }), 'MAMAS_DOPPLER')
  assert.deepEqual(bloqueios(ausente), [])
})

test('mamas e axilas: escopo com axilas; "não avaliadas" e axila alterada sem lado/medidas bloqueiam', () => {
  const s = mamaExame(mamasAxilasDoppler)
  const normal = adaptarMama(s, 'MAMAS_AXILAS_DOPPLER')
  assert.equal(normal.dados.escopo_exame, 'mamas_axilas')
  assert.match(conclusao(render('MAMAS_AXILAS_DOPPLER', normal)), /Linfonodos axilares normais/)
  s.axilas = { ...s.axilas, axilas: 'nao' }
  assert.ok(bloqueios(adaptarMama(s, 'MAMAS_AXILAS_DOPPLER')).some(p => /use o card "Mamas com Doppler"/.test(p)))
  s.axilas = { ...s.axilas, axilas: 'alteradas' }
  assert.ok(bloqueios(adaptarMama(s, 'MAMAS_AXILAS_DOPPLER')).some(p => /lado e as medidas/.test(p)))
  s.axilas = { ...s.axilas, 'axilas.alteradas.lado': 'esquerda', 'axilas.alteradas.medidas': '1,8 x 1,2' }
  assert.deepEqual(bloqueios(adaptarMama(s, 'MAMAS_AXILAS_DOPPLER')), [])
})

test('persistência e reversão: estado salvo reabre igual; desfazer o achado volta ao laudo normal', () => {
  const base = mamaExame(mamasDoppler)
  const normal = render('MAMAS_DOPPLER', adaptarMama(base, 'MAMAS_DOPPLER'))
  const alterado = comCisto(base, { 'achados.a1.vascularizacao': 'ausente' })
  const textoAlterado = render('MAMAS_DOPPLER', adaptarMama(alterado, 'MAMAS_DOPPLER'))
  assert.notEqual(textoAlterado, normal)
  const reaberto = JSON.parse(JSON.stringify(alterado)) as ExamState
  assert.equal(render('MAMAS_DOPPLER', adaptarMama(reaberto, 'MAMAS_DOPPLER')), textoAlterado)
  const revertido = { ...alterado, mamas: { ...alterado.mamas, achados_ids: [] } }
  assert.equal(render('MAMAS_DOPPLER', adaptarMama(revertido, 'MAMAS_DOPPLER')), normal)
  const t = tireoideMedida({ vascularizacaoParenquima: 'normal' })
  assert.deepEqual(adaptarTireoideDoppler(JSON.parse(JSON.stringify(t))).dados, adaptarTireoideDoppler(t).dados)
})

console.log(`${cases} Doppler presets structured web cases passed`)
