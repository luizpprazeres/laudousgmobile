import assert from 'node:assert/strict'
import { composeReport, initialExamState, type ExamState } from '../src/lib/deterministic/compose'
import { CATEGORIES, GENERIC_CATEGORIES } from '../src/lib/deterministic'
import { transfontanela } from '../src/lib/deterministic/organs/transfontanela'
import { ocular } from '../src/lib/deterministic/organs/ocular'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

function patch(state: ExamState, section: string, values: Record<string, string | string[]>): ExamState {
  return { ...state, [section]: { ...state[section], ...values } }
}

function semIdentificadorCru(text: string) {
  assert.doesNotMatch(text, /\b[a-z]+_[a-z_]+\b/, 'identificador cru no laudo')
  assert.doesNotMatch(text, /undefined|null|NaN|\[object/)
}

test('as duas categorias são formulários estruturados locais e saem do writer', () => {
  for (const category of [transfontanela, ocular]) {
    assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(category.id))
    assert.equal(isWriterCategory(category.id), false)
    assert.equal(categoriaMigrada(category.id), false)
    assert.ok(GENERIC_CATEGORIES.includes(category))
    assert.equal(CATEGORIES[category.id], category)
  }
})

// ------------------------------------------------------------- TRANSFONTANELA

test('transfontanelar normal reproduz o modelo da casa sem medida nem idade inventadas', () => {
  const report = composeReport(transfontanela, initialExamState(transfontanela))
  assert.match(report.text, /^ULTRASSONOGRAFIA TRANSFONTANELAR/)
  assert.match(report.text, /Ventrículos laterais de calibre normal e simétricos\./)
  assert.match(report.text, /sem sinais de leucomalácia/)
  assert.match(report.text, /CONCLUSÃO:\nUltrassonografia transfontanelar dentro dos limites da normalidade\.$/)
  assert.doesNotMatch(report.text, /Levene|Dados informados|idade gestacional|____/)
  assert.equal(report.alteredCount, 0)
  semIdentificadorCru(report.text)
})

test('dados neonatais e medidas entram só quando informados, com unidade convertida', () => {
  let state = initialExamState(transfontanela)
  state = patch(state, 'dados_neonatais', { dias_vida: '10', ig_nascimento: '32+4', ig_corrigida: 'abc' })
  state = patch(state, 'parenquima_ventriculos', { levene_d: '0,9 cm', levene_e: '9' })
  const { text } = composeReport(transfontanela, state)
  assert.match(text, /Dados informados: 10 dias de vida; idade gestacional ao nascimento de 32 semanas e 4 dias; idade gestacional corrigida de ____\./)
  assert.match(text, /índice de Levene: 9 mm à direita e 9 mm à esquerda/)
})

test('hemorragia unilateral suprime a normalidade do lado acometido e só gradua com confirmação', () => {
  let state = initialExamState(transfontanela)
  state = patch(state, 'parenquima_ventriculos', {
    hemorragia: 'presente',
    'hemorragia.presente.lado': 'esquerdo',
    'hemorragia.presente.extensao': 'iv_sem_dilatacao',
  })
  let report = composeReport(transfontanela, state)
  assert.match(report.text, /Núcleo caudado direito de contornos e ecogenicidade normais\./)
  assert.doesNotMatch(report.text, /Núcleos caudados/)
  assert.match(report.text, /conteúdo ecogênico no interior do ventrículo lateral esquerdo, sem dilatação/)
  assert.match(report.text, /1\. Hemorragia peri-intraventricular com extensão intraventricular, sem dilatação ventricular à esquerda\./)
  assert.doesNotMatch(report.text, /Papile/)
  assert.match(report.text, /2\. Demais estruturas avaliadas sem alterações ecográficas\./)

  state = patch(state, 'parenquima_ventriculos', { 'hemorragia.presente.grau': 'incluir' })
  report = composeReport(transfontanela, state)
  assert.match(report.text, /Hemorragia peri-intraventricular grau II de Papile à esquerda\./)
  semIdentificadorCru(report.text)
})

test('hemorragia com dilatação exige Levene do lado e desativar o achado limpa o texto', () => {
  let state = initialExamState(transfontanela)
  state = patch(state, 'parenquima_ventriculos', {
    hemorragia: 'presente',
    'hemorragia.presente.lado': 'direito',
    'hemorragia.presente.extensao': 'iv_com_dilatacao',
    'hemorragia.presente.grau': 'incluir',
  })
  let text = composeReport(transfontanela, state).text
  assert.match(text, /Ventrículo lateral direito com calibre aumentado \(índice de Levene: ____ mm à direita\)\./)
  assert.match(text, /Ventrículo lateral esquerdo de calibre normal\./)
  assert.match(text, /grau III de Papile à direita/)

  state = patch(state, 'parenquima_ventriculos', { hemorragia: 'ausente' })
  text = composeReport(transfontanela, state).text
  assert.doesNotMatch(text, /Papile|hiperecogênica|calibre aumentado/)
  assert.match(text, /dentro dos limites da normalidade/)
})

test('dilatação qualitativa não é graduada nem medida por conta própria', () => {
  let state = initialExamState(transfontanela)
  state = patch(state, 'parenquima_ventriculos', { laterais: 'dilatados' })
  const { text } = composeReport(transfontanela, state)
  assert.match(text, /Ventrículos laterais com calibre aumentado \(índice de Levene: ____ mm à direita e ____ mm à esquerda\)\./)
  assert.match(text, /1\. Dilatação dos ventrículos laterais\./)
  assert.doesNotMatch(text, /leve|moderad|acentuad|calibre normal e simétricos/)
})

test('leucomalácia e calcificações suprimem parênquima normal; recomendação só quando marcada', () => {
  let state = initialExamState(transfontanela)
  state = patch(state, 'parenquima_ventriculos', {
    periventricular: 'cistica',
    calcificacoes: 'presente',
    'calcificacoes.presente.local': 'periventriculares',
  })
  let text = composeReport(transfontanela, state).text
  assert.doesNotMatch(text, /sem evidências de lesões focais|sem sinais de leucomalácia/)
  assert.match(text, /leucomalácia periventricular cística de distribuição bilateral\./)
  assert.match(text, /que podem corresponder a calcificações\./)
  assert.doesNotMatch(text, /Controle|sorologias/)

  state = patch(state, 'parenquima_ventriculos', { 'periventricular.cistica.controle': 'sim', 'calcificacoes.presente.sorologias': 'sim' })
  text = composeReport(transfontanela, state).text
  assert.match(text, /Controle ultrassonográfico evolutivo a critério clínico\./)
  assert.match(text, /Correlacionar com sorologias maternas e neonatais/)
})

test('limitação técnica e estrutura não avaliada retiram a normalidade global', () => {
  let state = initialExamState(transfontanela)
  state = patch(state, 'dados_neonatais', { janela: 'limitada', 'janela.limitada.motivo': 'fontanela anterior pequena' })
  state = patch(state, 'linha_media', { fossa_posterior: 'nao_avaliada' })
  const { text } = composeReport(transfontanela, state)
  assert.match(text, /Estudo com janela acústica limitada \(fontanela anterior pequena\)\./)
  assert.doesNotMatch(text, /Cerebelo|Cisterna magna|dentro dos limites da normalidade/)
  assert.match(text, /1\. Estudo limitado pela janela acústica\.\n2\. Fossa posterior não avaliada\.\n3\. Demais estruturas avaliadas/)
})

// ------------------------------------------------------------- OCULAR

test('ocular normal bilateral reproduz o modelo da casa', () => {
  const report = composeReport(ocular, initialExamState(ocular))
  assert.match(report.text, /^ULTRASSONOGRAFIA OCULAR/)
  assert.match(report.text, /Olho direito:\nCâmara anterior de profundidade normal\. Cristalino tópico e de ecogenicidade habitual\.\nCâmara vítrea anecogênica, sem ecos internos\.\nRetina aplicada em toda a sua extensão\.\nNervo óptico de aspecto ecográfico normal\./)
  assert.match(report.text, /Olho esquerdo:/)
  assert.match(report.text, /CONCLUSÃO:\nUltrassonografia ocular sem alterações ecográficas significativas\.$/)
  semIdentificadorCru(report.text)
})

test('exame unilateral mostra só o olho examinado e declara o outro não avaliado', () => {
  const state = initialExamState(ocular)
  state.__opts = { ...state.__opts, lateralidade: 'esquerdo' }
  const { text } = composeReport(ocular, state)
  assert.doesNotMatch(text, /Olho direito:/)
  assert.match(text, /Exame unilateral do olho esquerdo; olho direito não avaliado\./)
})

test('descolamento de retina só é sugerido com inserção confirmada; recomendação opcional', () => {
  let state = initialExamState(ocular)
  state = patch(state, 'olho_direito', { retina: 'descolamento', 'retina.descolamento.extensao': 'parcial' })
  let text = composeReport(ocular, state).text
  assert.match(text, /inserção no disco óptico: ____/)
  assert.doesNotMatch(text, /descolamento de retina/)
  assert.match(text, /Câmara vítrea sem outros ecos internos\./)

  state = patch(state, 'olho_direito', { 'retina.descolamento.insercao': 'confirmada' })
  text = composeReport(ocular, state).text
  assert.match(text, /1\. Aspecto ecográfico sugestivo de descolamento de retina no olho direito\.\n2\. Demais estruturas avaliadas/)
  assert.doesNotMatch(text, /Avaliação oftalmológica/)

  state = patch(state, 'olho_direito', { 'retina.descolamento.avaliacao': 'urgente' })
  assert.match(composeReport(ocular, state).text, /Avaliação oftalmológica urgente recomendada\./)
})

test('hemorragia vítrea, DVP e cristalino opacificado ficam no olho certo', () => {
  let state = initialExamState(ocular)
  state = patch(state, 'olho_direito', { vitreo: 'hemorragia' })
  state = patch(state, 'olho_esquerdo', { vitreo: 'dvp', segmento_anterior: 'opacificado' })
  const { text, conclusion } = composeReport(ocular, state)
  assert.deepEqual(conclusion, [
    'Aspecto ecográfico sugestivo de hemorragia vítrea no olho direito.',
    'Opacificação do cristalino do olho esquerdo.',
    'Descolamento vítreo posterior no olho esquerdo.',
  ])
  assert.doesNotMatch(text, /Câmara vítrea anecogênica/)
})

test('bainha do nervo óptico: medida alta nunca convive com normalidade; aumentada sem medida vira lacuna', () => {
  let state = initialExamState(ocular)
  state = patch(state, 'olho_direito', { bainha_mm: '6,2' })
  state = patch(state, 'olho_esquerdo', { bainha_mm: '0,5 cm' })
  let text = composeReport(ocular, state).text
  assert.match(text, /Nervo óptico com diâmetro da bainha de 6,2 mm\./)
  assert.match(text, /acima do limite de 5,7 mm do modelo; interpretar conforme idade e contexto clínico/)
  assert.match(text, /Nervo óptico de aspecto ecográfico normal, com diâmetro da bainha de 5 mm\./)
  assert.doesNotMatch(text, /hipertensão intracraniana/)

  state = patch(state, 'olho_direito', { nervo: 'bainha_aumentada', bainha_mm: '' })
  text = composeReport(ocular, state).text
  assert.match(text, /Aumento do diâmetro da bainha do nervo óptico do olho direito \(____ mm\), achado que pode estar associado a hipertensão intracraniana\./)
})

test('estrutura ocular não avaliada impede conclusão de normalidade', () => {
  const state = patch(initialExamState(ocular), 'olho_esquerdo', { retina: 'nao_avaliada' })
  const { text } = composeReport(ocular, state)
  assert.match(text, /Não avaliados neste olho: retina\./)
  assert.match(text, /1\. Avaliação incompleta do olho esquerdo \(não avaliados: retina\)\./)
  assert.doesNotMatch(text, /CONCLUSÃO:\nUltrassonografia ocular sem alterações/)
})

console.log(`${cases} transfontanelar/ocular structured Web cases passed`)
