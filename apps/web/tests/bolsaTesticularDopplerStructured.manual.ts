import assert from 'node:assert/strict'
import { categoryDisplayLabel } from '@laudousg/shared'
import { composeReport, initialExamState, CATEGORIES, GENERIC_CATEGORIES, type ExamState } from '../src/lib/deterministic'
import { bolsaTesticularDoppler } from '../src/lib/deterministic/organs/bolsaTesticularDoppler'
import { escrotal } from '../src/lib/deterministic/organs/escrotal'
import { pendenciasLocais } from '../src/lib/deterministic/organs/pendenciasLocais'
import { groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1] ?? ''
const ID = 'BOLSA_TESTICULAR_DOPPLER'

function exame(modelo: 'em_branco' | 'normal' = 'normal', lateralidade = 'bilateral'): ExamState {
  const state = initialExamState(bolsaTesticularDoppler)
  state.__opts = { ...state.__opts, modelo, lateralidade }
  return state
}
const compor = (state: ExamState) => composeReport(bolsaTesticularDoppler, state)
function laudo(state: ExamState) {
  const report = compor(state)
  assert.deepEqual(report.pendencias, [], JSON.stringify(report.pendencias))
  assert.deepEqual(pendenciasLocais(ID, state), [])
  return report.text
}
const varicoceleEsquerda = (state: ExamState, extra: Record<string, string> = {}) => {
  state.doppler_esquerdo = {
    ...state.doppler_esquerdo, plexo: 'pesquisa', 'plexo.pesquisa.repouso_mm': '3,4', 'plexo.pesquisa.manobra_mm': '4,1',
    'plexo.pesquisa.manobra': 'valsalva', 'plexo.pesquisa.posicao': 'ortostase', 'plexo.pesquisa.refluxo': 'presente', ...extra,
  }
}

test('categoria estruturada local: registro, seletor humano, busca e nome no histórico', () => {
  assert.equal(CATEGORIES[ID], bolsaTesticularDoppler)
  assert.ok(GENERIC_CATEGORIES.includes(bolsaTesticularDoppler))
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(ID))
  assert.equal(isWriterCategory(ID), false)
  assert.equal(categoriaMigrada(ID), false)
  const grupos = groupCategories(GENERIC_CATEGORIES.map(({ id, name }) => ({ id, name })))
  const entry = grupos.flatMap(g => g.entries).find(e => e.id === ID)!
  assert.equal(entry.name, 'Bolsa testicular com Doppler')
  assert.equal(entry.groupId, 'medicina_interna')
  for (const busca of ['bolsa testicular', 'doppler escrotal', 'varicocele', 'torcao', 'epididimite']) assert.ok(matchesCategory(entry, busca), busca)
  assert.equal(categoryDisplayLabel(ID), 'Bolsa testicular com Doppler')
})

test('normal: modelo normal gera corpo Doppler e conclusão sem afirmar pesquisa de varicocele não feita', () => {
  const text = laudo(exame())
  assert.match(text, /BOLSA TESTICULAR COM DOPPLER/)
  assert.match(text, /Testículo direito com perfusão preservada ao Doppler colorido\./)
  assert.match(text, /Epidídimo esquerdo com vascularização habitual ao Doppler colorido\./)
  assert.match(text, /Testículo direito apresentando ecogenicidade e ecotextura normais\./)
  assert.doesNotMatch(text, /ecotextura e vascularização normais/)
  assert.match(conclusao(text), /^1\. Testículos ecograficamente normais, com perfusão preservada ao Doppler colorido\.\n2\. Epidídimos ecograficamente normais, com vascularização habitual\.\n3\. Veias dos plexos pampiniformes de calibre normal\.$/)
  assert.doesNotMatch(text.split('OBSERVADOS:')[1]!, /varicocele|torção|orquite|epididimite/i)
})

test('normal com pesquisa negativa documentada nos dois lados nega varicocele com manobra e posição', () => {
  const state = exame()
  for (const lado of ['direito', 'esquerdo']) {
    state[`doppler_${lado}`] = { ...state[`doppler_${lado}`], plexo: 'pesquisa', 'plexo.pesquisa.repouso_mm': '2,4', 'plexo.pesquisa.manobra_mm': '2,9', 'plexo.pesquisa.manobra': 'valsalva', 'plexo.pesquisa.posicao': 'ortostase', 'plexo.pesquisa.refluxo': 'ausente' }
  }
  const text = laudo(state)
  assert.match(text, /Pesquisa de varicocele à direita, em ortostase, com manobra de Valsalva: veias do plexo pampiniforme direito com calibre de até 2,4 mm em repouso e 2,9 mm à manobra de Valsalva, sem refluxo venoso ao Doppler espectral\./)
  assert.match(conclusao(text), /3\. Sem sinais de varicocele à pesquisa com Doppler\./)
})

test('incompleto: em branco bloqueia sem perfusão; pesquisa sem manobra/posição/refluxo bloqueia', () => {
  const blank = compor(exame('em_branco'))
  assert.equal(blank.text, '')
  assert.ok(blank.pendencias.some(p => p.onde === 'Doppler direito' && /perfusão/.test(p.motivo)))
  const state = exame()
  state.doppler_esquerdo = { ...state.doppler_esquerdo, plexo: 'pesquisa', 'plexo.pesquisa.repouso_mm': '3,4' }
  const report = compor(state)
  assert.equal(report.text, '')
  const motivos = report.pendencias.map(p => p.motivo).join(' | ')
  assert.match(motivos, /manobra/)
  assert.match(motivos, /posição/)
  assert.match(motivos, /refluxo/)
  state.doppler_esquerdo['plexo.pesquisa.repouso_mm'] = '0,34 cm'
  assert.ok(compor(state).pendencias.some(p => /em mm/.test(p.motivo)))
})

test('alterado: varicocele só com dados suficientes e confirmação; sem confirmação fica descritiva', () => {
  const state = exame()
  varicoceleEsquerda(state)
  const descritivo = conclusao(laudo(state))
  assert.match(descritivo, /Veias do plexo pampiniforme esquerdo com calibre de até 3,4 mm em repouso e 4,1 mm à manobra de Valsalva, com refluxo venoso ao Doppler espectral\./)
  assert.doesNotMatch(descritivo, /Varicocele/)
  state.doppler_esquerdo['plexo.pesquisa.confirmado'] = 'sim'
  assert.match(conclusao(laudo(state)), /1\. Varicocele à esquerda\.\n2\. Demais estruturas escrotais/)
  // Confirmação sem critério bloqueia.
  const semCriterio = exame()
  varicoceleEsquerda(semCriterio, { 'plexo.pesquisa.repouso_mm': '2,5', 'plexo.pesquisa.manobra_mm': '3,0', 'plexo.pesquisa.refluxo': 'ausente', 'plexo.pesquisa.confirmado': 'sim' })
  assert.ok(compor(semCriterio).pendencias.some(p => /exige refluxo ou calibre/.test(p.motivo)))
})

test('alterado: fluxo ausente é descritivo; torção exige contralateral preservado e confirmação', () => {
  const state = exame()
  state.doppler_direito = { ...state.doppler_direito, perfusao: 'ausente' }
  const descritivo = conclusao(laudo(state))
  assert.match(descritivo, /Fluxo não detectado ao Doppler colorido no testículo direito\. Correlacionar com dados clínicos\./)
  assert.doesNotMatch(descritivo, /torção/i)
  state.doppler_direito.hipotese = 'torcao'
  assert.deepEqual(pendenciasLocais(ID, state), ['Doppler direito: confirme a hipótese diagnóstica'])
  assert.doesNotMatch(compor(state).text, /torção/i)
  state.doppler_direito.hipotese_confirmada = 'sim'
  assert.match(conclusao(laudo(state)), /Achados compatíveis com torção testicular à direita, conforme avaliação médica\./)
  state.doppler_esquerdo = { ...state.doppler_esquerdo, perfusao: 'reduzida' }
  assert.ok(pendenciasLocais(ID, state).some(p => /contralateral/.test(p)))
  assert.doesNotMatch(compor(state).text, /torção/i)
})

test('alterado: orquite e epididimite exigem o achado de fluxo correspondente e modo B', () => {
  const state = exame()
  state.doppler_esquerdo = { ...state.doppler_esquerdo, fluxo_epididimo: 'aumentado', hipotese: 'epididimite', hipotese_confirmada: 'sim' }
  assert.ok(pendenciasLocais(ID, state).some(p => /epidídimo aumentado no modo B/.test(p)))
  assert.doesNotMatch(compor(state).text, /epididimite/i)
  state.escroto_esquerdo = { ...state.escroto_esquerdo, epididimo: 'aumentado' }
  const text = conclusao(laudo(state))
  assert.match(text, /Epidídimo esquerdo aumentado\. Correlacionar com dados clínicos\./)
  assert.match(text, /Aumento da vascularização do epidídimo esquerdo ao Doppler colorido\./)
  assert.match(text, /Achados compatíveis com epididimite à esquerda, conforme avaliação médica\./)
  const orquite = exame()
  orquite.doppler_direito = { ...orquite.doppler_direito, hipotese: 'orquite', hipotese_confirmada: 'sim' }
  assert.ok(pendenciasLocais(ID, orquite).some(p => /orquite exige aumento da perfusão/.test(p)))
})

test('lateralidade: exame unilateral mostra só o lado pedido e ajusta técnica e conclusão', () => {
  const state = exame('normal', 'esquerdo')
  assert.deepEqual(bolsaTesticularDoppler.resolveSections!(state.__opts).map(s => s.id), ['escroto_esquerdo', 'doppler_esquerdo'])
  state.doppler_direito = { ...state.doppler_direito, perfusao: 'ausente' } // lado fora do exame não entra
  const text = laudo(state)
  assert.doesNotMatch(text, /direit/)
  assert.match(text, /abrangendo o hemiescroto esquerdo/)
  assert.match(conclusao(text), /^1\. Testículo esquerdo ecograficamente normal, com perfusão preservada ao Doppler colorido\./)
  const bilateral = exame()
  bilateral.doppler_esquerdo = { ...bilateral.doppler_esquerdo, perfusao: 'aumentada' }
  const out = laudo(bilateral)
  assert.match(conclusao(out), /Aumento da vascularização do testículo esquerdo/)
  assert.doesNotMatch(conclusao(out), /testículo direito/)
})

test('reversão: desfazer achados devolve exatamente o laudo normal, sem resíduo', () => {
  const normal = laudo(exame())
  const state = exame()
  varicoceleEsquerda(state, { 'plexo.pesquisa.confirmado': 'sim' })
  state.doppler_direito = { ...state.doppler_direito, perfusao: 'ausente', hipotese: 'torcao', hipotese_confirmada: 'sim' }
  assert.notEqual(laudo(state), normal)
  state.doppler_esquerdo.plexo = 'modelo'
  state.doppler_direito = { ...state.doppler_direito, perfusao: 'modelo', hipotese: 'nenhuma', hipotese_confirmada: 'nao' }
  assert.equal(laudo(state), normal)
})

test('persistência: o estado salvo em exam_state reabre e recompõe o mesmo laudo', () => {
  const state = exame()
  varicoceleEsquerda(state, { 'plexo.pesquisa.confirmado': 'sim' })
  const reaberto = JSON.parse(JSON.stringify(state)) as ExamState
  assert.equal(laudo(reaberto), laudo(state))
})

test('ESCROTAL continua igual: vascularização no modo B e plexo no próprio formulário', () => {
  const text = composeReport(escrotal, initialExamState(escrotal)).text
  assert.match(text, /ecogenicidade, ecotextura e vascularização normais/)
  assert.match(text, /Veias do plexo pampiniforme direito de calibres normais\./)
  assert.ok(escrotal.sections[0]!.module!.schema.fields.some(f => f.key === 'plexo'))
  assert.ok(!bolsaTesticularDoppler.sections[0]!.module!.schema.fields.some(f => f.key === 'plexo'))
})

console.log(`${cases} Bolsa testicular com Doppler structured web cases passed`)
