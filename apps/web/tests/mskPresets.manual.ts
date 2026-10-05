/**
 * ATALHOS MSK — 16 cards derivados do MUSCULOESQUELETICO.
 *
 * Prova: (1) os cards só fixam segmento/lado — mesmas seções, mesmos módulos,
 * mesmo adaptador e mesmo texto do motor-base; (2) nenhum card gera laudo
 * normal sem lado escolhido e sem a confirmação das estruturas normais.
 * O texto vem do renderer de produção (o mesmo caminho do /render).
 */
import assert from 'node:assert/strict'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { alteracoesDe } from '../../api/src/server/renderer/catalog/alteracoes/index'
import { adaptarMskPreset, adaptarMusculoesqueletico } from '../src/lib/catalog/musculoesqueleticoParaCatalogo'
import { categoriaDeRender, categoriaMigrada } from '../src/lib/catalog/migradas'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, musculoesqueletico, type ExamState } from '../src/lib/deterministic'
import { MSK_PRESETS, MSK_PRESET_CATEGORIES, SEGMENTOS_COBERTOS, opcoesDoPreset, type MskPreset } from '../src/lib/deterministic/organs/mskPresets'
import { idSecaoMsk } from '../src/lib/deterministic/organs/musculoesqueletico'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'
import { CATEGORY_DISPLAY_NAMES, CATEGORY_GROUPS, groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { EXAM_CATEGORY_IMAGES } from '../src/components/laudar/examCategoryImages'
import { categoriaLabel } from '../src/components/historico/HistoryItem'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

const BASE_SNAPSHOT = JSON.stringify({
  controls: musculoesqueletico.controls,
  sections: musculoesqueletico.sections.map((s) => s.id),
  title: musculoesqueletico.title,
})

function renderDe(categoria: string, dados: unknown): string {
  const cat = categoriaDeRender(categoria)
  const r = renderizarSelecao(cat, 'CLASSICO_COMPLETO', alteracoesDe(cat).filter(() => false), dados as never)
  assert.ok(r.ok, `renderer recusou: ${JSON.stringify(r)}`)
  return (r as { texto: string }).texto
}
const bloqueios = (preset: MskPreset, state: ExamState) =>
  adaptarMskPreset(state as Record<string, unknown>, preset.id).pendencias.filter((p) => p.bloqueia)
function render(preset: MskPreset, state: ExamState): string {
  const a = adaptarMskPreset(state as Record<string, unknown>, preset.id)
  assert.deepEqual(a.pendencias.filter((p) => p.bloqueia), [], `${preset.id}: render só sem pendência`)
  return renderDe(preset.id, a.dados)
}
/** O mesmo exame pelo motor-base, com as opções efetivas do card. */
function renderBase(preset: MskPreset, state: ExamState): string {
  const efetivas = opcoesDoPreset(preset, state.__opts ?? {})
  const a = adaptarMusculoesqueletico({ ...state, __opts: efetivas } as Record<string, unknown>)
  return renderDe('MUSCULOESQUELETICO', a.dados)
}
const catDe = (preset: MskPreset) => CATEGORIES[preset.id]!
function pronto(preset: MskPreset, lado: 'direito' | 'esquerdo' = 'direito'): ExamState {
  const s = initialExamState(catDe(preset))
  return { ...s, __opts: { ...s.__opts, revisao_normais: 'confirmado', ...(preset.bilateral ? {} : { lado }) } }
}
const ombro = MSK_PRESETS.find((p) => p.id === 'MSK_OMBRO')!
const ombroBilateral = MSK_PRESETS.find((p) => p.id === 'MSK_OMBRO_BILATERAL')!
function comAchado(state: ExamState, lado: 'direito' | 'esquerdo'): ExamState {
  return {
    ...state,
    [idSecaoMsk('ombro', lado, 'supraespinhal')]: {
      estado: 'alterado',
      'estado.alterado.corpo': 'espessamento com perda do padrão fibrilar, sem rotura',
      'estado.alterado.diag': 'Tendinopatia do supraespinhal',
    },
  }
}

test('16 cards: 8 segmentos × unilateral/bilateral, derivados do MSK, fora do writer', () => {
  assert.equal(MSK_PRESETS.length, 16)
  assert.ok(SEGMENTOS_COBERTOS)
  for (const p of MSK_PRESETS) {
    assert.ok(GENERIC_CATEGORIES.includes(catDe(p)), p.id)
    assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(p.id), p.id)
    assert.equal(isWriterCategory(p.id), false)
    assert.equal(categoriaMigrada(p.id), true)
    assert.equal(categoriaDeRender(p.id), 'MUSCULOESQUELETICO')
    assert.throws(() => composeReport(catDe(p), initialExamState(catDe(p))), /renderer canônico/)
  }
})

test('nomes humanos, família Musculoesquelético, busca, histórico e imagem', () => {
  const grupo = CATEGORY_GROUPS.find((g) => g.id === 'musculoesqueletico')!
  for (const p of MSK_PRESETS) {
    assert.ok(grupo.categories.includes(p.id), p.id)
    assert.equal(CATEGORY_DISPLAY_NAMES[p.id], p.nome)
    assert.equal(categoriaLabel(p.id), p.nome)
    assert.equal(EXAM_CATEGORY_IMAGES[p.id], EXAM_CATEGORY_IMAGES.MUSCULOESQUELETICO)
  }
  assert.equal(ombro.nome, 'Ombro unilateral')
  assert.equal(MSK_PRESETS.find((p) => p.id === 'MSK_PE_BILATERAL')!.nome, 'Pé bilateral')
  const entradas = groupCategories(MSK_PRESETS.map((p) => ({ id: p.id, name: p.nome }))).flatMap((g) => g.entries)
  const busca = (q: string) => entradas.filter((e) => matchesCategory(e, q)).map((e) => e.id)
  assert.deepEqual(busca('ombro bilateral'), ['MSK_OMBRO_BILATERAL'])
  assert.deepEqual(busca('tornozelo'), ['MSK_TORNOZELO', 'MSK_TORNOZELO_BILATERAL'])
  assert.deepEqual(busca('mao unilateral'), ['MSK_MAO'])
})

test('o motor-base não muda: mesmas seções/módulos e controles intactos', () => {
  for (const p of MSK_PRESETS) {
    const cat = catDe(p)
    for (const lado of p.bilateral ? ['ambos'] : ['direito', 'esquerdo']) {
      const efetivas = opcoesDoPreset(p, { lado })
      const doCard = cat.resolveSections!({ lado })
      const doBase = musculoesqueletico.resolveSections!(efetivas)
      assert.deepEqual(doCard.map((s) => s.id), doBase.map((s) => s.id), p.id)
      doCard.forEach((s, i) => assert.equal(s.module, doBase[i]!.module, `${p.id}: módulo reutilizado`))
    }
    assert.ok(cat.sections.every((s) => s.id.startsWith(`${p.segmento}__`)))
  }
  assert.equal(JSON.stringify({ controls: musculoesqueletico.controls, sections: musculoesqueletico.sections.map((s) => s.id), title: musculoesqueletico.title }), BASE_SNAPSHOT)
  assert.equal(MSK_PRESET_CATEGORIES.length, 16)
})

test('segmento e lado coerentes ao abrir: segmento fixo; bilateral = ambos; unilateral sem lado pré-escolhido', () => {
  for (const p of MSK_PRESETS) {
    const s = initialExamState(catDe(p))
    assert.equal(s.__opts!.segmento, p.segmento, p.id)
    if (p.bilateral) assert.equal(s.__opts!.lado, 'ambos', p.id)
    else assert.equal(s.__opts!.lado, undefined, p.id)
    const lado = catDe(p).controls!.find((c) => c.key === 'lado')!
    assert.deepEqual(lado.options!.map((o) => o.value), p.bilateral ? ['ambos'] : ['direito', 'esquerdo'])
  }
})

test('sem normalidade em branco: nenhum card abre com laudo', () => {
  for (const p of MSK_PRESETS) {
    const b = bloqueios(p, initialExamState(catDe(p))).map((x) => x.onde)
    assert.ok(b.includes('Estruturas sem alteração'), `${p.id}: ${b}`)
    if (!p.bilateral) assert.ok(b.includes('Lado'), `${p.id}: ${b}`)
    // Lado escolhido, mas sem confirmação: continua bloqueado.
    if (!p.bilateral) {
      const s = initialExamState(catDe(p))
      assert.deepEqual(bloqueios(p, { ...s, __opts: { ...s.__opts, lado: 'esquerdo' } }).map((x) => x.onde), ['Estruturas sem alteração'])
    }
  }
})

test('normal confirmado: texto idêntico ao do motor-base, com título do segmento e lado', () => {
  for (const p of MSK_PRESETS) {
    for (const lado of p.bilateral ? ['direito'] as const : ['direito', 'esquerdo'] as const) {
      const s = pronto(p, lado)
      const texto = render(p, s)
      assert.equal(texto, renderBase(p, s), p.id)
      assert.doesNotMatch(texto, /____/)
    }
  }
  assert.match(render(ombro, pronto(ombro, 'esquerdo')), /^ULTRASSONOGRAFIA DO OMBRO ESQUERDO/)
  // Bilateral no renderer canônico: um laudo por lado, direito primeiro (comportamento do motor-base).
  const bilateral = render(ombroBilateral, pronto(ombroBilateral))
  assert.match(bilateral, /^ULTRASSONOGRAFIA DO OMBRO DIREITO\n[\s\S]*\nULTRASSONOGRAFIA DO OMBRO ESQUERDO\n/)
  assert.equal(catDe(ombroBilateral).resolveTitle!({}), 'ULTRASSONOGRAFIA DO OMBRO DIREITO E ESQUERDO')
  assert.equal(catDe(ombro).resolveTitle!({ lado: 'esquerdo' }), 'ULTRASSONOGRAFIA DO OMBRO ESQUERDO')
})

test('bilateral ignora lado salvo no estado: sempre ambos', () => {
  const s = pronto(ombroBilateral)
  const comLado = { ...s, __opts: { ...s.__opts, lado: 'direito' } }
  assert.equal(render(ombroBilateral, comLado), render(ombroBilateral, s))
})

test('alterado: achado no lado escolhido sai igual ao motor-base', () => {
  const s = comAchado(pronto(ombro, 'esquerdo'), 'esquerdo')
  const texto = render(ombro, s)
  assert.equal(texto, renderBase(ombro, s))
  assert.match(texto, /Tendinopatia do supraespinhal/i)
})

test('achado registrado no lado não escolhido bloqueia (não some em silêncio)', () => {
  const s = comAchado(pronto(ombro, 'esquerdo'), 'direito')
  const b = bloqueios(ombro, s)
  assert.equal(b.length, 1)
  assert.match(b[0]!.motivo, /achado registrado no lado direito, mas o lado escolhido é esquerdo/)
})

test('reversão: voltar a estrutura para normal devolve o laudo normal', () => {
  const basal = render(ombro, pronto(ombro, 'direito'))
  const alterado = comAchado(pronto(ombro, 'direito'), 'direito')
  assert.notEqual(render(ombro, alterado), basal)
  const id = idSecaoMsk('ombro', 'direito', 'supraespinhal')
  const revertido = { ...alterado, [id]: { ...alterado[id], estado: 'normal' } }
  assert.equal(render(ombro, revertido), basal)
})

test('persistência: o estado salvo (JSON) recompõe o mesmo laudo', () => {
  const s = comAchado(pronto(ombro, 'esquerdo'), 'esquerdo')
  assert.equal(render(ombro, JSON.parse(JSON.stringify(s)) as ExamState), render(ombro, s))
})

console.log(`${cases} MSK preset cases passed`)
