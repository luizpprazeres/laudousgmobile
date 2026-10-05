import assert from 'node:assert/strict'
import { composeReport, initialExamState, CATEGORIES, GENERIC_CATEGORIES } from '../src/lib/deterministic'
import { escrotal } from '../src/lib/deterministic/organs/escrotal'
import { paredeAbdominal } from '../src/lib/deterministic/organs/paredeAbdominal'
import { regiaoInguinal } from '../src/lib/deterministic/organs/regiaoInguinal'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) {
  run()
  cases++
  console.log(`ok ${cases} - ${name}`)
}

const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1] ?? ''
const achados = (text: string) => text.split('OS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n\n')[1]?.split('\n\nCONCLUSÃO:')[0] ?? ''

test('as três categorias entram no registro estruturado e saem do caminho writer', () => {
  for (const id of ['PAREDE_ABDOMINAL', 'REGIAO_INGUINAL', 'ESCROTAL']) {
    assert.ok(CATEGORIES[id], id)
    assert.ok(GENERIC_CATEGORIES.some((c) => c.id === id), id)
    assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(id), id)
    assert.equal(isWriterCategory(id), false, id)
  }
})

test('parede abdominal normal usa o modelo-base e conclusão sem defeito herniário', () => {
  const { text, alteredCount } = composeReport(paredeAbdominal, initialExamState(paredeAbdominal))
  assert.equal(alteredCount, 0)
  assert.match(text, /^ULTRASSONOGRAFIA DA PAREDE ABDOMINAL/)
  assert.match(achados(text), /Planos musculoaponeuróticos da parede abdominal preservados/)
  assert.equal(conclusao(text), 'Parede abdominal sem evidência de defeitos herniários à manobra de Valsalva.')
})

test('hérnia umbilical preserva colo/saco e só nomeia hérnia na conclusão', () => {
  const state = initialExamState(paredeAbdominal)
  Object.assign(state.parede_abdominal, {
    achado: 'hernia', 'achado.hernia.colo': '1.2', 'achado.hernia.saco': '2,1x1,4',
    'achado.hernia.conteudo': 'gordura', 'achado.hernia.redutibilidade': 'redutivel',
  })
  const { text } = composeReport(paredeAbdominal, state)
  assert.doesNotMatch(achados(text), /[Hh]érnia/)
  assert.match(achados(text), /cicatriz umbilical.*colo medindo 1,2 cm/)
  assert.match(achados(text), /O saco herniário mede 2,1 x 1,4 cm\./)
  assert.equal(conclusao(text), '1. Hérnia umbilical, de conteúdo gorduroso, redutível, com colo de 1,2 cm.')
})

test('hérnia incisional sem lado e sem redutibilidade não conclui diagnóstico', () => {
  const state = initialExamState(paredeAbdominal)
  Object.assign(state.parede_abdominal, { achado: 'hernia', 'achado.hernia.local': 'incisional', 'achado.hernia.conteudo': 'alca' })
  const { text } = composeReport(paredeAbdominal, state)
  assert.doesNotMatch(conclusao(text), /Hérnia/)
  assert.match(conclusao(text), /Conclusão pendente .*lado, redutibilidade/)
  assert.match(achados(text), /redutibilidade ____/)
  state.parede_abdominal['achado.hernia.lado'] = 'direita'
  state.parede_abdominal['achado.hernia.redutibilidade'] = 'nao_redutivel'
  assert.match(conclusao(composeReport(paredeAbdominal, state).text), /^1\. Hérnia incisional à direita, de conteúdo entérico, não redutível\. Convém, a critério clínico, avaliação cirúrgica\.$/)
})

test('diástase exige distância inter-retos e preserva os dois níveis', () => {
  const state = initialExamState(paredeAbdominal)
  state.parede_abdominal.achado = 'diastase'
  assert.match(conclusao(composeReport(paredeAbdominal, state).text), /Conclusão pendente/)
  Object.assign(state.parede_abdominal, { 'achado.diastase.supra': '3,8', 'achado.diastase.infra': '2,2' })
  assert.equal(conclusao(composeReport(paredeAbdominal, state).text),
    '1. Diástase dos músculos retos abdominais, com distância intermuscular de 3,8 cm na região supraumbilical e de 2,2 cm na região infraumbilical.')
})

test('região inguinal normal bilateral e unilateral', () => {
  const state = initialExamState(regiaoInguinal)
  let { text } = composeReport(regiaoInguinal, state)
  assert.match(achados(text), /Região inguinal direita com planos.*\n.*\n\nRegião inguinal esquerda/)
  assert.equal(conclusao(text), 'Regiões inguinais sem evidência de defeitos herniários à manobra de Valsalva.')
  state.__opts = { lados: 'esquerda' }
  text = composeReport(regiaoInguinal, state).text
  assert.doesNotMatch(text, /direit/)
  assert.match(text, /avaliação da região inguinal esquerda/)
  assert.equal(conclusao(text), 'Região inguinal esquerda sem evidência de defeitos herniários à manobra de Valsalva.')
})

test('hérnia inguinal indireta mantém lado, relação com a epigástrica e fechamento contralateral', () => {
  const state = initialExamState(regiaoInguinal)
  Object.assign(state.inguinal_direita, {
    hernia: 'presente', 'hernia.presente.tipo': 'indireta', 'hernia.presente.colo': '1,2',
    'hernia.presente.conteudo': 'gordura', 'hernia.presente.redutibilidade': 'redutivel',
  })
  const { text } = composeReport(regiaoInguinal, state)
  assert.match(achados(text), /canal inguinal direito, lateral à artéria epigástrica inferior/)
  assert.match(achados(text), /Região inguinal esquerda com planos/)
  assert.equal(conclusao(text), [
    '1. Hérnia inguinal indireta à direita, de conteúdo gorduroso, redutível, com colo de 1,2 cm.',
    '2. Região inguinal contralateral sem evidência de defeitos herniários à manobra de Valsalva.',
  ].join('\n'))
  state.__opts = { lados: 'direita' }
  assert.doesNotMatch(conclusao(composeReport(regiaoInguinal, state).text), /contralateral/)
})

test('linfonodo inguinal proeminente sem medidas fica pendente', () => {
  const state = initialExamState(regiaoInguinal)
  state.inguinal_esquerda.linfonodos = 'proeminente'
  assert.match(conclusao(composeReport(regiaoInguinal, state).text), /Conclusão pendente \(linfonodo inguinal à esquerda\): informe medidas/)
  state.inguinal_esquerda['linfonodos.proeminente.medidas'] = '2,0 x 1,0'
  assert.match(conclusao(composeReport(regiaoInguinal, state).text), /1\. Linfonodo inguinal proeminente à esquerda, medindo 2,0 x 1,0 cm/)
})

test('escrotal normal preserva medidas por lado e usa a conclusão do modelo-base', () => {
  const state = initialExamState(escrotal)
  state.escroto_direito.medidas = '3,7 x 1,9 x 2,7'
  state.escroto_esquerdo.medidas = '3.8 x 1.8 x 3.1 cm'
  const { text, alteredCount } = composeReport(escrotal, state)
  assert.equal(alteredCount, 0)
  assert.match(achados(text), /Testículo direito medindo 3,7 x 1,9 x 2,7 cm, apresentando ecogenicidade/)
  assert.match(achados(text), /Testículo esquerdo medindo 3,8 x 1,8 x 3,1 cm,/)
  assert.equal(conclusao(text), '1. Testículos ecograficamente normais.\n2. Cabeças do epidídimo ecograficamente normais.\n3. Não há sinais evidentes de varicocele.')
})

test('varicocele à esquerda só com critério documentado; demais achados mantêm o lado', () => {
  const state = initialExamState(escrotal)
  Object.assign(state.escroto_esquerdo, { plexo: 'dilatado', 'plexo.dilatado.repouso': '2,8', 'plexo.dilatado.valsalva': '3,2' })
  assert.match(conclusao(composeReport(escrotal, state).text), /Conclusão pendente \(plexo pampiniforme esquerdo\)/)
  state.escroto_esquerdo['plexo.dilatado.valsalva'] = '3,6'
  Object.assign(state.escroto_direito, {
    epididimo: 'cisto', 'epididimo.cisto.medida': '0,8',
    hidrocele: 'presente', 'hidrocele.presente.volume': 'pequeno',
  })
  const { text } = composeReport(escrotal, state)
  assert.match(achados(text), /plexo pampiniforme esquerdo, com calibre de até 2,8 mm em repouso e 3,6 mm à manobra de Valsalva/)
  assert.equal(conclusao(text), [
    '1. Cisto da cabeça do epidídimo direito, medindo 0,8 cm.',
    '2. Hidrocele à direita, de pequeno volume.',
    '3. Varicocele à esquerda.',
    '4. Demais estruturas escrotais examinadas sem evidência de alterações ecográficas.',
  ].join('\n'))
})

test('nódulo e microlitíase sem dado essencial não viram diagnóstico', () => {
  const state = initialExamState(escrotal)
  state.escroto_direito.parenquima = 'nodulo'
  state.escroto_esquerdo.parenquima = 'microlitiase'
  let text = conclusao(composeReport(escrotal, state).text)
  assert.doesNotMatch(text, /Nódulo sólido|Microlitíase/)
  assert.match(text, /imagem sólida no testículo direito\): informe terço, medidas/)
  assert.match(text, /focos hiperecoicos no testículo esquerdo\): informe número de focos/)
  Object.assign(state.escroto_direito, { 'parenquima.nodulo.terco': 'medio', 'parenquima.nodulo.medidas': '1,2 x 0,9 x 1,1', 'parenquima.nodulo.vasc': 'presente' })
  state.escroto_esquerdo['parenquima.microlitiase.grau'] = 'classica'
  text = conclusao(composeReport(escrotal, state).text)
  assert.match(text, /1\. Nódulo sólido no terço médio do testículo direito, medindo 1,2 x 0,9 x 1,1 cm\. Convém/)
  assert.match(text, /2\. Microlitíase testicular à esquerda\./)
})

console.log(`${cases} superficial structured web cases passed`)
