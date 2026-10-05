import assert from 'node:assert/strict'
import { categoryDisplayLabel } from '@laudousg/shared'
import { composeReport, initialExamState, CATEGORIES, GENERIC_CATEGORIES, type ExamState } from '../src/lib/deterministic'
import { ecocardiografiaFetal } from '../src/lib/deterministic/organs/ecocardiografiaFetal'
import { pendenciasLocais } from '../src/lib/deterministic/organs/pendenciasLocais'
import { groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'
import { categoriaLabel } from '../src/components/historico/HistoryItem'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
const ID = 'ECOCARDIOGRAFIA_FETAL'
const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1]?.split('\n\n')[0] ?? ''
const achados = (text: string) => text.split('OBSERVADOS:\n\n')[1]?.split('\n\nCONCLUSÃO:')[0] ?? ''

function exame(modelo: 'em_branco' | 'normal' = 'normal'): ExamState {
  const state = initialExamState(ecocardiografiaFetal)
  state.__opts = { ...state.__opts, modelo }
  return state
}
const compor = (state: ExamState) => composeReport(ecocardiografiaFetal, state)
function laudo(state: ExamState) {
  const report = compor(state)
  assert.deepEqual(report.pendencias, [], JSON.stringify(report.pendencias))
  assert.deepEqual(pendenciasLocais(ID, state), [])
  return report.text
}
function bloqueado(state: ExamState, onde: string, motivo: RegExp) {
  const report = compor(state)
  assert.equal(report.text, '')
  assert.ok(report.pendencias.some(p => p.onde === onde && motivo.test(p.motivo)), JSON.stringify(report.pendencias))
}
const alterar = (state: ExamState, bloco: string, achado: string, extra: Record<string, string> = {}, confirmado = true) => {
  state[bloco] = { ...state[bloco], estado: 'alterado', 'estado.alterado.achado': achado, 'estado.alterado.confirmado': confirmado ? 'sim' : 'nao', ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k.startsWith('fc') ? k : `estado.alterado.${k}`, v])) }
}

test('selecionável em Obstetrícia, com nome humano, busca, histórico e caminho local', () => {
  assert.equal(CATEGORIES[ID], ecocardiografiaFetal)
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(ID))
  assert.equal(isWriterCategory(ID), false)
  assert.equal(categoriaMigrada(ID), false)
  const entry = groupCategories(GENERIC_CATEGORIES.map(({ id, name }) => ({ id, name }))).flatMap(g => g.entries).find(e => e.id === ID)!
  assert.equal(entry.groupId, 'obstetricia')
  assert.equal(entry.name, 'Ecocardiografia fetal')
  for (const busca of ['eco fetal', 'ecocardiograma fetal', 'coracao fetal', 'cardiopatia congenita', 'arritmia fetal']) assert.ok(matchesCategory(entry, busca), busca)
  assert.equal(categoriaLabel(ID), 'Ecocardiografia fetal')
  assert.equal(categoryDisplayLabel(ID), 'Ecocardiografia fetal')
})

test('em branco: não há normalidade implícita — cada bloco e as condições técnicas ficam pendentes', () => {
  const report = compor(exame('em_branco'))
  assert.equal(report.text, '')
  for (const onde of ['Condições técnicas', 'Situs e posição cardíaca', 'Ritmo cardíaco', 'Corte de quatro câmaras e septos', 'Vias de saída', 'Função e pericárdio']) {
    assert.ok(report.pendencias.some(p => p.onde === onde), onde)
  }
})

test('modelo normal explícito: anatomia sequencial normal e conclusão global, sem FC inventada', () => {
  const text = laudo(exame())
  assert.match(text, /^ECOCARDIOGRAFIA FETAL\n/)
  const corpo = achados(text)
  assert.match(corpo, /^Gestação única\.\nCondições técnicas adequadas\./)
  assert.match(corpo, /Situs solitus, com coração em levoposição/)
  assert.match(corpo, /septo interventricular íntegro/)
  assert.match(corpo, /cruzamento habitual das vias de saída/)
  assert.match(corpo, /arcos aórtico e ductal à esquerda da traqueia/)
  assert.match(corpo, /^Ritmo cardíaco regular\.$/m)
  assert.equal(conclusao(text), '1. Ecocardiografia fetal sem alterações estruturais ou funcionais identificáveis ao método.')
  assert.match(text, /A ecocardiografia fetal não afasta todas as cardiopatias congênitas/)
})

test('dados digitados pelo médico entram como informados', () => {
  const state = exame()
  state.exame = { ...state.exame, ig: '24 semanas e 3 dias', indicacao: 'diabetes' }
  state.ritmo = { ...state.ritmo, fc_bpm: '142' }
  const corpo = achados(laudo(state))
  assert.match(corpo, /^Gestação única, com idade gestacional de 24 semanas e 3 dias\. Indicação: diabetes materno\./)
  assert.match(corpo, /Ritmo cardíaco regular, com frequência cardíaca fetal de 142 bpm\./)
})

test('CIV: exige localização, medida e confirmação; substitui o septo íntegro só no bloco afetado', () => {
  const state = exame()
  alterar(state, 'quatro_camaras', 'civ', { tipo: 'muscular' })
  bloqueado(state, 'Corte de quatro câmaras e septos', /medida/)
  alterar(state, 'quatro_camaras', 'civ', { tipo: 'muscular', medida_mm: '2,5' }, false)
  bloqueado(state, 'Corte de quatro câmaras e septos', /confirme o achado/)
  alterar(state, 'quatro_camaras', 'civ', { tipo: 'muscular', medida_mm: '2,5' })
  const text = laudo(state)
  assert.match(achados(text), /Septo interventricular com descontinuidade na porção muscular, medindo 2,5 mm\./)
  assert.doesNotMatch(text, /septo interventricular íntegro|sem alterações estruturais ou funcionais/)
  assert.equal(conclusao(text), '1. Comunicação interventricular muscular, medindo 2,5 mm.\n2. Demais estruturas avaliadas sem alterações identificáveis.')
})

test('extrassístoles: qualificadores não informados não viram fato; FC é obrigatória', () => {
  const state = exame()
  alterar(state, 'ritmo', 'extrassistoles')
  bloqueado(state, 'Ritmo cardíaco', /frequência cardíaca fetal/)
  alterar(state, 'ritmo', 'extrassistoles', { fc_bpm: '145' })
  const generico = laudo(state)
  assert.match(achados(generico), /Ritmo cardíaco irregular, com extrassístoles, e frequência cardíaca fetal de 145 bpm\./)
  assert.match(conclusao(generico), /^1\. Extrassístoles, com frequência cardíaca fetal de 145 bpm\./)
  const linhaRitmo = achados(generico).split('\n').find(l => l.startsWith('Ritmo cardíaco'))!
  assert.doesNotMatch(`${linhaRitmo}\n${conclusao(generico)}`, /atria|ventricular|conduzid|isolad/i)
  alterar(state, 'ritmo', 'extrassistoles', { fc_bpm: '145', origem: 'atrial', conducao: 'conduzidas', padrao: 'isoladas' })
  const qualificado = laudo(state)
  assert.match(achados(qualificado), /extrassístoles isoladas, de origem atrial, conduzidas aos ventrículos/)
  assert.match(conclusao(qualificado), /^1\. Extrassístoles atriais, com frequência cardíaca fetal de 145 bpm\./)
})

test('outras alterações principais: vias de saída, arco, derrame e situs', () => {
  const state = exame()
  alterar(state, 'vias_saida', 'paralelas')
  alterar(state, 'tres_vasos', 'arco_direito')
  alterar(state, 'funcao', 'derrame', { medida_mm: '3' })
  alterar(state, 'situs', 'dextrocardia')
  const c = conclusao(laudo(state))
  assert.match(c, /Dextrocardia\./)
  assert.match(c, /Transposição das grandes artérias\./)
  assert.match(c, /Arco aórtico à direita\./)
  assert.match(c, /Derrame pericárdico de 3 mm\./)
  assert.match(c, /Demais estruturas avaliadas sem alterações identificáveis\.$/)
  const semDado = exame()
  alterar(semDado, 'tres_vasos', 'calibres')
  bloqueado(semDado, 'Corte de três vasos e traqueia e arcos', /vaso de menor calibre/)
})

test('limitação técnica exige escopo por bloco; normalidade fica restrita ao avaliado', () => {
  const state = exame()
  state.exame = { ...state.exame, qualidade: 'limitada', 'qualidade.limitada.motivo': 'Posição fetal desfavorável' }
  assert.deepEqual(pendenciasLocais(ID, state), ['Condições técnicas: com limitação técnica, indique os blocos com avaliação parcial ou não realizada'])
  state.tres_vasos = { ...state.tres_vasos, estado: 'parcial', 'estado.parcial.motivo': 'Sombra acústica da coluna' }
  state.veias = { ...state.veias, estado: 'nao_avaliado' }
  const text = laudo(state)
  assert.match(achados(text), /Condições técnicas limitadas \(posição fetal desfavorável\)\./)
  assert.match(achados(text), /Corte de três vasos e traqueia e arcos: avaliação parcial \(sombra acústica da coluna\)\./)
  assert.match(achados(text), /Conexões venosas: não avaliado\./)
  assert.equal(conclusao(text), '1. Sem alterações identificáveis nas estruturas avaliadas.\n2. Avaliação parcial ou não realizada de: conexões venosas e corte de três vasos e traqueia e arcos.')
  assert.doesNotMatch(text, /sem alterações estruturais ou funcionais/)
})

test('recomendação opt-in: confirmada e coerente com o exame', () => {
  const state = exame()
  state.recomendacao = { opcao: 'cardiopediatria', confirmada: 'nao' }
  bloqueado(state, 'Recomendação', /confirme a recomendação/)
  state.recomendacao.confirmada = 'sim'
  assert.ok(pendenciasLocais(ID, state).some(p => /exige achado alterado/.test(p)))
  alterar(state, 'quatro_camaras', 'civ', { tipo: 'perimembranosa', medida_mm: '3,1' })
  assert.match(conclusao(laudo(state)), /3\. Convém, a critério clínico, avaliação com cardiologia pediátrica\.$/)
})

test('reversão e persistência: desfazer volta ao laudo normal; estado salvo reabre igual', () => {
  const normal = laudo(exame())
  const state = exame()
  alterar(state, 'quatro_camaras', 'civ', { tipo: 'muscular', medida_mm: '2,5' })
  alterar(state, 'ritmo', 'extrassistoles', { fc_bpm: '145', origem: 'atrial' })
  state.exame = { ...state.exame, qualidade: 'limitada', 'qualidade.limitada.motivo': 'obesidade materna' }
  state.veias = { ...state.veias, estado: 'parcial', 'estado.parcial.motivo': 'posição' }
  const alterado = laudo(state)
  assert.equal(laudo(JSON.parse(JSON.stringify(state)) as ExamState), alterado)
  for (const bloco of ['quatro_camaras', 'ritmo', 'veias']) state[bloco] = { ...state[bloco], estado: 'modelo' }
  state.ritmo.fc_bpm = ''
  state.exame = { ...state.exame, qualidade: 'modelo' }
  assert.equal(laudo(state), normal)
})

console.log(`${cases} Ecocardiografia fetal structured web cases passed`)
