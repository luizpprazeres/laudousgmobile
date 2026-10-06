/**
 * ATALHOS DA PELVE — Pélvico transvaginal com Doppler, Pélvico abdominal com
 * Doppler e Monitorização folicular, sobre a pelve canônica.
 *
 * O texto é o do renderer de produção (`renderizarSelecao` da API), alimentado
 * pelo adaptador da tela — o mesmo caminho do `/api/catalog/.../render`.
 */
import assert from 'node:assert/strict'
import { categoryDisplayLabel } from '@laudousg/shared'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { alteracoesDe } from '../../api/src/server/renderer/catalog/alteracoes/index'
import { adaptarPelve, adaptarPelvePreset, adaptarPelveTransabdominal, adaptarPelveTransvaginal } from '../src/lib/catalog/pelveParaCatalogo'
import { categoriaDeRender, categoriaMigrada } from '../src/lib/catalog/migradas'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, pelvicoTransabdominal, pelvicoTransvaginal, type ExamState } from '../src/lib/deterministic'
import { MONITORIZACAO_FOLICULAR, PELVE_PRESET_IDS, PELVICO_TRANSABDOMINAL_DOPPLER, PELVICO_TRANSVAGINAL_DOPPLER } from '../src/lib/deterministic/organs/pelvePresets'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'
import { CATEGORY_DISPLAY_NAMES, CATEGORY_GROUPS, groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { categoriaLabel } from '../src/components/historico/HistoryItem'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

function patch(state: ExamState, section: string, values: Record<string, string | string[]>): ExamState {
  return { ...state, [section]: { ...state[section], ...values } }
}
/** Exame medido (sem achados) no card informado. */
function medido(categoria: string): ExamState {
  let s = initialExamState(CATEGORIES[categoria]!)
  if (categoria === PELVICO_TRANSABDOMINAL_DOPPLER) s = patch(s, 'bexiga', { replecao: 'adequada' })
  s = patch(s, 'utero', { medidas: '7,8 x 4,2 x 4,8' })
  s = patch(s, 'endometrio', { espessura: '0,7' })
  s = patch(s, 'ovario_direito', { medidas: '3,1 x 2,0 x 1,8' })
  s = patch(s, 'ovario_esquerdo', { medidas: '2,9 x 1,9 x 1,7' })
  if (categoria === MONITORIZACAO_FOLICULAR) s = patch(s, 'ovario_direito', { foliculos_mm: '8, 10, 18' })
  return s
}
const adaptar = (categoria: string, s: ExamState) => adaptarPelvePreset(s as Record<string, unknown>, categoria)
const bloqueios = (categoria: string, s: ExamState) => adaptar(categoria, s).pendencias.filter((p) => p.bloqueia).map((p) => `${p.onde}: ${p.motivo}`)
function renderDados(dados: unknown, alteracoes: string[]): string {
  const specs = alteracoesDe('PELVE_FEMININA').filter((x) => alteracoes.includes(x.id))
  const r = renderizarSelecao('PELVE_FEMININA', 'CLASSICO_COMPLETO', specs, dados as never)
  assert.ok(r.ok, `renderer recusou: ${JSON.stringify(r)}`)
  return (r as { texto: string }).texto
}
function render(categoria: string, s: ExamState): string {
  const a = adaptar(categoria, s)
  assert.deepEqual(a.pendencias.filter((p) => p.bloqueia), [], `${categoria}: render só sem pendência`)
  return renderDados(a.dados, a.alteracoes)
}
const conclusao = (t: string) => t.split('CONCLUSÃO:')[1] ?? ''

test('registro: três cards derivados da pelve, fora do writer, sem motor local', () => {
  for (const id of PELVE_PRESET_IDS) {
    const cat = CATEGORIES[id]!
    assert.ok(GENERIC_CATEGORIES.includes(cat), id)
    assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(id), id)
    assert.equal(isWriterCategory(id), false)
    assert.equal(categoriaMigrada(id), true)
    assert.equal(categoriaDeRender(id), 'PELVE_FEMININA')
    assert.throws(() => composeReport(cat, initialExamState(cat)), /renderer canônico/)
  }
})

test('nomes humanos, Saúde da mulher, busca e histórico', () => {
  const grupo = CATEGORY_GROUPS.find((g) => g.id === 'saude_mulher')!
  const nomes: Record<string, string> = {
    [PELVICO_TRANSVAGINAL_DOPPLER]: 'Pélvico transvaginal com Doppler',
    [PELVICO_TRANSABDOMINAL_DOPPLER]: 'Pélvico abdominal com Doppler',
    [MONITORIZACAO_FOLICULAR]: 'Monitorização folicular',
  }
  for (const [id, nome] of Object.entries(nomes)) {
    assert.ok(grupo.categories.includes(id), id)
    assert.equal(CATEGORY_DISPLAY_NAMES[id], nome)
    assert.equal(categoriaLabel(id), nome)
    assert.equal(categoryDisplayLabel(id), nome)
  }
  const entradas = groupCategories(PELVE_PRESET_IDS.map((id) => ({ id, name: id }))).flatMap((g) => g.entries)
  const busca = (q: string) => entradas.filter((e) => matchesCategory(e, q)).map((e) => e.id)
  assert.deepEqual(busca('foliculometria'), [MONITORIZACAO_FOLICULAR])
  assert.deepEqual(busca('transvaginal com doppler'), [PELVICO_TRANSVAGINAL_DOPPLER])
  assert.deepEqual(busca('doppler pelvico'), [PELVICO_TRANSVAGINAL_DOPPLER, PELVICO_TRANSABDOMINAL_DOPPLER])
})

test('formulário existente: mesmas seções e módulos dos cards TV/TA; finalidade fixa', () => {
  const pares = [[PELVICO_TRANSVAGINAL_DOPPLER, pelvicoTransvaginal], [MONITORIZACAO_FOLICULAR, pelvicoTransvaginal], [PELVICO_TRANSABDOMINAL_DOPPLER, pelvicoTransabdominal]] as const
  for (const [id, base] of pares) {
    const cat = CATEGORIES[id]!
    assert.deepEqual(cat.sections.map((s) => s.id), base.sections.map((s) => s.id), id)
    cat.sections.forEach((s, i) => assert.equal(s.module, base.sections[i]!.module, `${id}: módulo reutilizado`))
    assert.ok(!(cat.controls ?? []).some((c) => c.key === 'modo_pelve' || c.key === 'via'), id)
  }
  assert.ok(!(CATEGORIES[MONITORIZACAO_FOLICULAR]!.controls ?? []).some((c) => c.key === 'menopausa'))
  assert.match(CATEGORIES[PELVICO_TRANSVAGINAL_DOPPLER]!.resolveTecnica!({}), /Doppler colorido/)
  assert.equal(CATEGORIES[MONITORIZACAO_FOLICULAR]!.resolveTitle!({}), 'ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL – MONITORIZAÇÃO FOLICULAR')
})

test('estado vazio não inventa normalidade nos três cards', () => {
  for (const id of PELVE_PRESET_IDS) {
    const b = bloqueios(id, initialExamState(CATEGORIES[id]!))
    assert.ok(b.some((x) => /útero: informe as três medidas/.test(x)), `${id}: ${b.join(' | ')}`)
    assert.ok(b.some((x) => /ovário direito: informe as três medidas/.test(x)), id)
  }
  assert.ok(bloqueios(PELVICO_TRANSABDOMINAL_DOPPLER, initialExamState(CATEGORIES[PELVICO_TRANSABDOMINAL_DOPPLER]!)).some((x) => /confirme a repleção vesical/.test(x)))
  assert.ok(bloqueios(MONITORIZACAO_FOLICULAR, initialExamState(CATEGORIES[MONITORIZACAO_FOLICULAR]!)).some((x) => /folículos: informe os diâmetros/.test(x)))
})

test('normal: texto do renderer da pelve com o modo do card, igual ao adaptador-base com o mesmo modo', () => {
  const tv = medido(PELVICO_TRANSVAGINAL_DOPPLER)
  const textoTv = render(PELVICO_TRANSVAGINAL_DOPPLER, tv)
  const baseTv = adaptarPelveTransvaginal(tv as Record<string, unknown>, { modo_pelve: 'doppler' })
  assert.equal(textoTv, renderDados(baseTv.dados, baseTv.alteracoes))
  assert.match(textoTv, /Doppler/)
  assert.doesNotMatch(textoTv, /____/)

  const ta = medido(PELVICO_TRANSABDOMINAL_DOPPLER)
  const textoTa = render(PELVICO_TRANSABDOMINAL_DOPPLER, ta)
  const baseTa = adaptarPelveTransabdominal(ta as Record<string, unknown>, { modo_pelve: 'doppler' })
  assert.equal(textoTa, renderDados(baseTa.dados, baseTa.alteracoes))
  assert.match(textoTa, /transabdominal/i)

  const mf = medido(MONITORIZACAO_FOLICULAR)
  const textoMf = render(MONITORIZACAO_FOLICULAR, mf)
  assert.match(textoMf, /^ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL – MONITORIZAÇÃO FOLICULAR/)
  assert.match(conclusao(textoMf), /Monitorização folicular — ovário direito: 8 mm, 10 mm, 18 mm\./)
  assert.doesNotMatch(textoMf, /sem medidas informadas/)
})

test('alterado: achado ovariano com Doppler exige vascularização e sai pelo renderer', () => {
  let s = patch(medido(PELVICO_TRANSVAGINAL_DOPPLER), 'ovario_esquerdo', { achado: 'cisto_simples', 'achado.cisto_simples.medidas': '2,0 x 1,8 x 1,6' })
  assert.ok(bloqueios(PELVICO_TRANSVAGINAL_DOPPLER, s).some((x) => /informe a vascularização ao Doppler do achado no ovário esquerdo/.test(x)))
  s = patch(s, 'ovario_esquerdo', { 'achado.cisto_simples.vascularizacao': 'ausente' })
  const texto = render(PELVICO_TRANSVAGINAL_DOPPLER, s)
  assert.match(texto, /vascularização ausente ao Doppler colorido/)
})

test('pendências da monitorização: folículos ilegíveis ou em ovário não visualizado', () => {
  let s = patch(medido(MONITORIZACAO_FOLICULAR), 'ovario_direito', { foliculos_mm: '8, dez, 12' })
  assert.ok(bloqueios(MONITORIZACAO_FOLICULAR, s).some((x) => /folículos do ovário direito ilegíveis/.test(x)))
  s = patch(medido(MONITORIZACAO_FOLICULAR), 'ovario_esquerdo', { visualizado: 'nao', medidas: '', foliculos_mm: '12' })
  assert.ok(bloqueios(MONITORIZACAO_FOLICULAR, s).some((x) => /ovário esquerdo não visualizado não pode ter folículos/.test(x)))
  // Menopausa salva no estado não vaza para a monitorização.
  const comMenopausa = { ...medido(MONITORIZACAO_FOLICULAR), __opts: { menopausa: ['sim'] } }
  assert.doesNotMatch(render(MONITORIZACAO_FOLICULAR, comMenopausa), /menopausa/i)
})

test('folículos: leitura única preserva decimais e bloqueia unidades/eixos em todas as entradas', () => {
  const entradas = [
    (s: ExamState) => adaptar(MONITORIZACAO_FOLICULAR, s),
    (s: ExamState) => adaptarPelve(s, { modo_pelve: 'monitorizacao_folicular' }),
    (s: ExamState) => adaptarPelveTransvaginal(s, { modo_pelve: 'monitorizacao_folicular' }),
  ]
  for (const entrada of entradas) {
    for (const [bruto, esperado] of [
      ['8, 10, 12,5', [8, 10, 12.5]],
      ['8; 10; 12,5 mm', [8, 10, 12.5]],
      ['12,5', [12.5]],
      ['12.5 18', [12.5, 18]],
    ] as const) {
      const estado = patch(medido(MONITORIZACAO_FOLICULAR), 'ovario_direito', { foliculos_mm: bruto })
      const salvo = JSON.stringify(estado)
      const a = entrada(estado)
      assert.deepEqual(a.pendencias.filter((p) => p.bloqueia), [])
      assert.deepEqual((a.dados.ovario_direito as { foliculos_mm: number[] }).foliculos_mm, esperado)
      assert.match(conclusao(renderDados(a.dados, a.alteracoes)), /12,5 mm/)
      assert.deepEqual(entrada(JSON.parse(salvo)), a, 'reabertura preserva os diâmetros')
      assert.equal(JSON.stringify(estado), salvo, 'não modifica o dado digitado')
    }
    for (const bruto of ['1,8 cm', '18 x 16', '18 × 16, 10, 9', '8,10,12', '8, dez, 12', '-8; 12', '0; 12', 'mm', '8;', '8;;12']) {
      const a = entrada(patch(medido(MONITORIZACAO_FOLICULAR), 'ovario_direito', { foliculos_mm: bruto }))
      assert.ok(a.pendencias.some((p) => p.bloqueia && /folículos do ovário direito ilegíveis/.test(p.motivo)), bruto)
      assert.equal((a.dados.ovario_direito as { foliculos_mm: unknown }).foliculos_mm, null, bruto)
    }
    const naoVisto = entrada(patch(medido(MONITORIZACAO_FOLICULAR), 'ovario_direito', { visualizado: 'nao', medidas: '', foliculos_mm: '15' }))
    assert.ok(naoVisto.pendencias.some((p) => p.bloqueia && /não visualizado não pode ter folículos/.test(p.motivo)))
    assert.equal((naoVisto.dados.ovario_direito as { foliculos_mm: unknown }).foliculos_mm, null)
    const apagado = entrada(patch(medido(MONITORIZACAO_FOLICULAR), 'ovario_direito', { foliculos_mm: '' }))
    assert.ok(apagado.pendencias.some((p) => p.bloqueia && p.onde === 'folículos'))
    assert.equal((apagado.dados.ovario_direito as { foliculos_mm: unknown }).foliculos_mm, null)
  }
})

test('reversão: remover o achado devolve o laudo normal sem resíduo', () => {
  const basal = render(PELVICO_TRANSVAGINAL_DOPPLER, medido(PELVICO_TRANSVAGINAL_DOPPLER))
  let s = patch(medido(PELVICO_TRANSVAGINAL_DOPPLER), 'ovario_esquerdo', { achado: 'cisto_simples', 'achado.cisto_simples.medidas': '2,0 x 1,8 x 1,6', 'achado.cisto_simples.vascularizacao': 'ausente' })
  assert.notEqual(render(PELVICO_TRANSVAGINAL_DOPPLER, s), basal)
  s = patch(s, 'ovario_esquerdo', { achado: 'nenhum' })
  assert.equal(render(PELVICO_TRANSVAGINAL_DOPPLER, s), basal)
})

test('persistência: o estado salvo (JSON) recompõe o mesmo laudo nos três cards', () => {
  for (const id of PELVE_PRESET_IDS) {
    const s = medido(id)
    assert.equal(render(id, JSON.parse(JSON.stringify(s)) as ExamState), render(id, s), id)
  }
})

console.log(`${cases} pelve preset cases passed`)
