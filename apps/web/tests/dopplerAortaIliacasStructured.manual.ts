import assert from 'node:assert/strict'
import { composeReport, initialExamState, type ExamState } from '../src/lib/deterministic/compose'
import { CATEGORIES, GENERIC_CATEGORIES } from '../src/lib/deterministic'
import { dopplerAortaIliacas } from '../src/lib/deterministic/organs/dopplerAortaIliacas'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'
import { CATEGORY_GROUPS, CATEGORY_DISPLAY_NAMES } from '../src/components/laudar/categoryGroups'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

const cat = dopplerAortaIliacas
function patch(state: ExamState, section: string, values: Record<string, string>): ExamState {
  return { ...state, [section]: { ...state[section], ...values } }
}
const render = (state: ExamState) => composeReport(cat, state)
const motivos = (state: ExamState) => render(state).pendencias.map((p) => `${p.onde}: ${p.motivo}`)

function semLixo(text: string) {
  assert.doesNotMatch(text, /____|undefined|null|NaN|\[object/)
  assert.doesNotMatch(text, /\b[a-z]+_[a-z_]+\b/, 'identificador cru no laudo')
}

test('categoria estruturada local, no seletor vascular e fora do writer', () => {
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(cat.id))
  assert.equal(isWriterCategory(cat.id), false)
  assert.equal(categoriaMigrada(cat.id), false)
  assert.ok(GENERIC_CATEGORIES.includes(cat))
  assert.equal(CATEGORIES[cat.id], cat)
  assert.ok(CATEGORY_GROUPS.find((g) => g.id === 'vascular')!.categories.includes(cat.id))
  assert.equal(CATEGORY_DISPLAY_NAMES[cat.id], 'Doppler de aorta e ilíacas')
})

// ------------------------------------------------------------------ normal

test('modelo normal: aorta e quatro segmentos ilíacos, sem medida inventada', () => {
  const report = render(initialExamState(cat))
  assert.deepEqual(report.pendencias, [])
  assert.match(report.text, /^ULTRASSONOGRAFIA COM DOPPLER COLORIDO DA AORTA ABDOMINAL E ARTÉRIAS ILÍACAS/)
  assert.match(report.text, /Aorta abdominal com trajeto, calibre e contornos preservados, com fluxo ao Doppler colorido\./)
  for (const nome of ['comum direita', 'externa direita', 'comum esquerda', 'externa esquerda']) {
    assert.match(report.text, new RegExp(`Artéria ilíaca ${nome} pérvia, de calibre preservado, com fluxo ao Doppler colorido\\.`))
  }
  assert.match(report.text, /CONCLUSÃO:\nAorta abdominal e artérias ilíacas estudadas sem alterações ecográficas ou hemodinâmicas significativas\.$/)
  assert.doesNotMatch(report.text, /cm\/s|\d cm|todos os segmentos/)
  semLixo(report.text)
})

test('medidas opcionais entram com unidade padronizada (mm → cm)', () => {
  let state = patch(initialExamState(cat), 'aorta', { diametro_cm: '19 mm', vps_cms: '85' })
  state = patch(state, 'iliaca_externa_direita', { padrao: 'trifasico', vps_cms: '110 cm/s' })
  const { text, pendencias } = render(state)
  assert.deepEqual(pendencias, [])
  assert.match(text, /com fluxo ao Doppler colorido, com maior diâmetro anteroposterior de 1,9 cm e VPS de 85 cm\/s\./)
  assert.match(text, /Artéria ilíaca externa direita pérvia, de calibre preservado, com fluxo ao Doppler colorido, com padrão espectral trifásico e VPS de 110 cm\/s\./)
})

test('exame unilateral não descreve nem declara normal o lado não estudado', () => {
  const state = initialExamState(cat)
  state.__opts = { ...state.__opts, lateralidade: 'esquerdo' }
  const { text } = render(state)
  assert.doesNotMatch(text, /direita pérvia/)
  assert.match(text, /Foram estudados a aorta abdominal e as artérias ilíacas comum e externa esquerdas/)
})

// ------------------------------------------------------------------ alterado

test('aneurisma confirmado com diâmetro, topografia e trombo vai ao corpo e à conclusão', () => {
  const state = patch(initialExamState(cat), 'aorta', {
    diametro_cm: '4,5',
    alteracao: 'dilatacao',
    'alteracao.dilatacao.tipo': 'aneurisma',
    'alteracao.dilatacao.extensao': 'infrarrenal',
    'alteracao.dilatacao.trombo': 'sim',
    'alteracao.dilatacao.confirmacao': 'confirmado',
  })
  const report = render(state)
  assert.deepEqual(report.pendencias, [])
  assert.match(report.text, /Dilatação aneurismática do segmento infrarrenal, medindo até 4,5 cm, com trombo mural\./)
  assert.match(report.text, /1\. Dilatação aneurismática da aorta abdominal infrarrenal, medindo até 4,5 cm, com trombo mural\.\n2\. Demais segmentos avaliados/)
  assert.doesNotMatch(report.text, /calibre e contornos preservados/)
  semLixo(report.text)
})

test('estenose graduada só com VPS e razão que sustentam o grau, no lado certo', () => {
  const state = patch(initialExamState(cat), 'iliaca_externa_esquerda', {
    alteracao: 'estenose',
    'alteracao.estenose.vps_lesao': '320',
    'alteracao.estenose.vps_referencia': '100',
    'alteracao.estenose.grau': 'ge50',
    'alteracao.estenose.confirmacao': 'confirmado',
  })
  const report = render(state)
  assert.deepEqual(report.pendencias, [])
  assert.match(report.text, /Aceleração focal do fluxo, com VPS de 320 cm\/s na lesão e razão de velocidades de 3,2\./)
  assert.match(report.text, /1\. Estenose de 50% ou mais da artéria ilíaca externa esquerda \(VPS de 320 cm\/s na lesão e razão de velocidades de 3,2\)\./)
  assert.match(report.text, /Artéria ilíaca externa direita pérvia/)
  assert.doesNotMatch(report.text, /externa esquerda pérvia/)
})

test('oclusão confirmada e placas descritas sem graduação', () => {
  let state = patch(initialExamState(cat), 'iliaca_comum_direita', {
    alteracao: 'sem_fluxo',
    'alteracao.sem_fluxo.colaterais': 'presente',
    'alteracao.sem_fluxo.confirmacao': 'confirmado',
  })
  state = patch(state, 'aorta', { placas: 'presentes' })
  const { text, conclusion } = render(state)
  assert.match(text, /Ausência de fluxo ao Doppler colorido e espectral, com circulação colateral\./)
  assert.deepEqual(conclusion, ['Placas de ateromas na aorta abdominal.', 'Oclusão da artéria ilíaca comum direita.'])
})

test('segmento limitado ou não avaliado nunca é declarado normal', () => {
  let state = patch(initialExamState(cat), 'aorta', { avaliacao: 'limitada', 'avaliacao.limitada.motivo': 'interposição gasosa' })
  state = patch(state, 'iliaca_externa_esquerda', { avaliacao: 'nao_avaliada' })
  const { text, pendencias } = render(state)
  assert.deepEqual(pendencias, [])
  assert.match(text, /Aorta abdominal com avaliação limitada \(interposição gasosa\)\./)
  assert.match(text, /Artéria ilíaca externa esquerda não avaliada\./)
  assert.doesNotMatch(text, /trajeto, calibre e contornos preservados|externa esquerda pérvia/)
  assert.match(text, /1\. Avaliação limitada da aorta abdominal\.\n2\. Artéria ilíaca externa esquerda não avaliada\.\n3\. Demais segmentos/)
})

// ------------------------------------------------------------------ incompleto → pendência bloqueante

test('aneurisma sem diâmetro, sem classificação ou sem confirmação bloqueia o laudo', () => {
  const base = patch(initialExamState(cat), 'aorta', { alteracao: 'dilatacao' })
  const report = render(base)
  assert.equal(report.text, '')
  assert.deepEqual(motivos(base), [
    'Aorta abdominal: informe o diâmetro para descrever a dilatação',
    'Aorta abdominal: escolha a classificação da dilatação (ectasia ou aneurisma)',
    'Aorta abdominal: confirme a classificação da dilatação',
  ])
  const semConfirmar = patch(base, 'aorta', { diametro_cm: '4,5', 'alteracao.dilatacao.tipo': 'aneurisma' })
  assert.equal(render(semConfirmar).text, '')
  assert.deepEqual(motivos(semConfirmar), ['Aorta abdominal: confirme a classificação da dilatação'])
})

test('diâmetro alto com calibre "preservado" bloqueia em vez de classificar sozinho', () => {
  const state = patch(initialExamState(cat), 'aorta', { diametro_cm: '45 mm' })
  assert.equal(render(state).text, '')
  assert.match(motivos(state)[0]!, /diâmetro de 4,5 cm com calibre descrito como preservado/)
})

test('estenose sem VPS, sem confirmação ou com grau não sustentado bloqueia', () => {
  const base = patch(initialExamState(cat), 'iliaca_externa_esquerda', { alteracao: 'estenose' })
  assert.deepEqual(motivos(base), [
    'Artéria ilíaca externa esquerda: informe a VPS na lesão',
    'Artéria ilíaca externa esquerda: confirme a estenose',
  ])
  const semReferencia = patch(base, 'iliaca_externa_esquerda', {
    'alteracao.estenose.vps_lesao': '320', 'alteracao.estenose.grau': 'ge70', 'alteracao.estenose.confirmacao': 'confirmado',
  })
  assert.deepEqual(motivos(semReferencia), ['Artéria ilíaca externa esquerda: graduação exige VPS na lesão e VPS de referência'])
  const naoSustenta = patch(semReferencia, 'iliaca_externa_esquerda', { 'alteracao.estenose.vps_referencia': '100' })
  assert.match(motivos(naoSustenta)[0]!, /valores não sustentam a graduação escolhida \(exige VPS > 400 cm\/s e razão > 4\)/)
  assert.equal(render(naoSustenta).text, '')
})

test('oclusão sem confirmação ou com velocidade residual bloqueia', () => {
  const state = patch(initialExamState(cat), 'iliaca_comum_direita', { alteracao: 'sem_fluxo', vps_cms: '90' })
  assert.deepEqual(motivos(state), [
    'Artéria ilíaca comum direita: confirme a oclusão (diferenciar de fluxo filiforme)',
    'Artéria ilíaca comum direita: VPS preenchida em segmento sem fluxo detectado: apague a velocidade',
  ])
})

test('dissecção só com confirmação; medida inválida e não avaliado com dados bloqueiam', () => {
  let state = patch(initialExamState(cat), 'aorta', { alteracao: 'disseccao' })
  assert.deepEqual(motivos(state), ['Aorta abdominal: confirme o flap intimal antes de concluir dissecção'])
  state = patch(initialExamState(cat), 'iliaca_comum_esquerda', { vps_cms: 'rápida' })
  assert.deepEqual(motivos(state), ['Artéria ilíaca comum esquerda: VPS inválida (use cm/s)'])
  state = patch(initialExamState(cat), 'iliaca_comum_esquerda', { avaliacao: 'nao_avaliada', placas: 'presentes' })
  assert.match(motivos(state)[0]!, /não avaliado tem achados ou medidas preenchidos/)
  state = patch(initialExamState(cat), 'iliaca_externa_direita', { vps_cms: '260' })
  assert.match(motivos(state)[0]!, /VPS de 260 cm\/s com segmento descrito sem alteração/)
})

test('desfazer o achado limpa texto e pendências', () => {
  let state = patch(initialExamState(cat), 'iliaca_externa_esquerda', { alteracao: 'estenose', 'alteracao.estenose.vps_lesao': '320' })
  assert.notEqual(render(state).pendencias.length, 0)
  state = patch(state, 'iliaca_externa_esquerda', { alteracao: 'nenhuma' })
  const report = render(state)
  assert.deepEqual(report.pendencias, [])
  assert.doesNotMatch(report.text, /Estenose|Aceleração|320/)
})

console.log(`${cases} Doppler aorta/ilíacas structured Web cases passed`)
