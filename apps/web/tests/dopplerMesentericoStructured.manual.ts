import assert from 'node:assert/strict'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, type ExamState } from '../src/lib/deterministic'
import { dopplerMesenterico } from '../src/lib/deterministic/organs/dopplerMesenterico'
import { pendenciasLocais } from '../src/lib/deterministic/organs/pendenciasLocais'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'
import { CATEGORY_GROUPS } from '../src/components/laudar/categoryGroups'
import { categoryDisplayLabel } from '@laudousg/shared'

let cases = 0
function test(name: string, run: () => void) {
  run()
  cases++
  console.log(`ok ${cases} - ${name}`)
}

const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1] ?? ''
const achados = (text: string) => text.split('OS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n\n')[1]?.split('\n\nCONCLUSÃO:')[0] ?? ''

/** Modelo normal com preparo confirmado — ponto de partida dos cenários. */
function normal(): ExamState {
  const state = initialExamState(dopplerMesenterico)
  state.__opts = { ...state.__opts, model: 'normal', jejum: 'confirmado' }
  return state
}

function bloqueado(state: ExamState, onde: string, motivo: RegExp) {
  const report = composeReport(dopplerMesenterico, state)
  assert.equal(report.text, '', `laudo deveria estar bloqueado (${onde})`)
  const item = report.pendencias.find((p) => p.onde === onde && motivo.test(p.motivo))
  assert.ok(item, `sem pendência ${onde} ${motivo}: ${JSON.stringify(report.pendencias)}`)
}

test('integra registro, seletor Vascular, rótulo e caminho estruturado', () => {
  assert.ok(CATEGORIES.DOPPLER_MESENTERICO)
  assert.ok(GENERIC_CATEGORIES.includes(dopplerMesenterico))
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes('DOPPLER_MESENTERICO'))
  assert.equal(isWriterCategory('DOPPLER_MESENTERICO'), false)
  assert.ok(CATEGORY_GROUPS.find((g) => g.id === 'vascular')?.categories.includes('DOPPLER_MESENTERICO'))
  assert.equal(categoryDisplayLabel('DOPPLER_MESENTERICO'), 'Doppler de artérias mesentéricas')
})

test('estado inicial em branco: nenhum vaso avaliado bloqueia o exame e pede o preparo', () => {
  const state = initialExamState(dopplerMesenterico)
  assert.deepEqual(pendenciasLocais('DOPPLER_MESENTERICO', state), ['Exame: registre ao menos um vaso avaliado ou com avaliação limitada.'])
  bloqueado(state, 'Preparo', /jejum/)
})

test('modelo normal: TC e AMS pérvios, AMI não avaliada nunca vira normal, sem excluir isquemia', () => {
  const state = normal()
  const { text, pendencias } = composeReport(dopplerMesenterico, state)
  assert.deepEqual(pendencias, [])
  assert.deepEqual(pendenciasLocais('DOPPLER_MESENTERICO', state), [])
  assert.match(text, /^ULTRASSONOGRAFIA COM DOPPLER DAS ARTÉRIAS MESENTÉRICAS/)
  assert.match(text, /ângulo de insonação igual ou inferior a 60°, em jejum\./)
  assert.match(achados(text), /Tronco celíaco pérvio, com fluxo de padrão habitual/)
  assert.match(achados(text), /Artéria mesentérica superior pérvia/)
  assert.match(achados(text), /Artéria mesentérica inferior não avaliada\./)
  assert.equal(conclusao(text), [
    '1. Tronco celíaco pérvio, sem sinais ecográficos de estenose hemodinamicamente significativa.',
    '2. Artéria mesentérica superior pérvia, sem sinais ecográficos de estenose hemodinamicamente significativa.',
    '3. Artéria mesentérica inferior não avaliada.',
  ].join('\n'))
  assert.doesNotMatch(text, /isquemia|____|pendente/i)
})

test('aceleração focal na AMS sem confirmação fica descritiva; com confirmação conclui estenose', () => {
  const state = normal()
  Object.assign(state.ams, { alteration: 'stenosis', 'alteration.stenosis.lesion_psv_cms': '310', 'alteration.stenosis.lesion_edv_cms': '55' })
  state.aorta.psv_cms = '90'
  let { text } = composeReport(dopplerMesenterico, state)
  assert.match(achados(text), /Aorta abdominal de referência com velocidade de pico sistólico \(VPS\) de 90 cm\/s\./)
  assert.match(achados(text), /Artéria mesentérica superior com aceleração focal do fluxo, VPS de 310 cm\/s, VDF de 55 cm\/s\./)
  assert.match(conclusao(text), /2\. Aumento focal da velocidade de pico sistólico na artéria mesentérica superior \(VPS de 310 cm\/s\), sem estenose confirmada\./)
  assert.doesNotMatch(conclusao(text), /Estenose/)
  state.ams['alteration.stenosis.confirmed'] = 'yes'
  text = composeReport(dopplerMesenterico, state).text
  assert.match(conclusao(text), /2\. Estenose hemodinamicamente significativa da artéria mesentérica superior \(VPS de 310 cm\/s\), conforme confirmação médica\./)
})

test('estenose sem VPS na lesão bloqueia, mesmo confirmada', () => {
  const state = normal()
  Object.assign(state.ams, { alteration: 'stenosis', 'alteration.stenosis.confirmed': 'yes' })
  bloqueado(state, 'Artéria mesentérica superior', /VPS na lesão/)
  state.ams['alteration.stenosis.lesion_psv_cms'] = 'alta'
  bloqueado(state, 'Artéria mesentérica superior', /inválida/)
})

test('fluxo não detectado: oclusão só com confirmação e sem limitação', () => {
  const state = normal()
  state.ami.assessment = 'evaluated'
  state.ami.alteration = 'no_flow'
  let { text } = composeReport(dopplerMesenterico, state)
  assert.match(conclusao(text), /Fluxo não detectado na artéria mesentérica inferior, sem confirmação de oclusão\./)
  state.ami['alteration.no_flow.occlusion_confirmed'] = 'yes'
  text = composeReport(dopplerMesenterico, state).text
  assert.match(conclusao(text), /Ausência de fluxo na artéria mesentérica inferior, compatível com oclusão, conforme confirmação médica\./)
  Object.assign(state.ami, { assessment: 'limited', limitation: 'interposição gasosa' })
  bloqueado(state, 'Artéria mesentérica inferior', /sem limitação/)
})

test('avaliação limitada exige motivo e restringe a conclusão; jejum não confirmado aparece na técnica', () => {
  const state = normal()
  state.__opts = { ...state.__opts, jejum: 'nao_confirmado', fase: 'jejum_pos_prandial' }
  state.ami.assessment = 'limited'
  bloqueado(state, 'Artéria mesentérica inferior', /limitação/)
  state.ami.limitation = 'interposição gasosa.'
  const { text } = composeReport(dopplerMesenterico, state)
  assert.match(text, /em jejum e após refeição \(fase pós-prandial\)\. Jejum não confirmado, o que pode limitar a avaliação\./)
  assert.match(conclusao(text), /3\. Avaliação limitada da artéria mesentérica inferior \(interposição gasosa\)\./)
  assert.doesNotMatch(conclusao(text), /mesentérica inferior pérvia/)
})

test('ligamento arqueado: exige as duas fases respiratórias e confirmação médica', () => {
  const state = normal()
  Object.assign(state.tronco_celiaco, { insp_psv_cms: '140', arcuate_confirmed: 'yes' })
  bloqueado(state, 'Tronco celíaco', /inspiração e na expiração/)
  state.tronco_celiaco.exp_psv_cms = '290'
  state.tronco_celiaco.arcuate_confirmed = 'no'
  let { text } = composeReport(dopplerMesenterico, state)
  assert.match(achados(text), /VPS de 140 cm\/s na inspiração e de 290 cm\/s na expiração\./)
  assert.doesNotMatch(conclusao(text), /ligamento arqueado/)
  state.tronco_celiaco.arcuate_confirmed = 'yes'
  text = composeReport(dopplerMesenterico, state).text
  assert.match(conclusao(text), /compressão extrínseca pelo ligamento arqueado mediano, conforme interpretação médica\./)
})

test('dados em vaso não avaliado e VPS inválida bloqueiam; placa vira achado descritivo', () => {
  const state = normal()
  state.ami.psv_cms = '80'
  bloqueado(state, 'Artéria mesentérica inferior', /não avaliado/)
  state.ami.psv_cms = ''
  state.tronco_celiaco.psv_cms = '12O'
  bloqueado(state, 'Tronco celíaco', /VPS inválida/)
  state.tronco_celiaco.psv_cms = '120'
  state.aorta.psv_cms = 'x'
  bloqueado(state, 'Aorta de referência', /inválida/)
  state.aorta.psv_cms = ''
  state.tronco_celiaco.plaque = 'present'
  const { text } = composeReport(dopplerMesenterico, state)
  assert.match(achados(text), /Tronco celíaco pérvio, com fluxo de padrão habitual ao Doppler colorido e espectral \(VPS de 120 cm\/s\), com placas ateromatosas parietais\./)
  assert.match(conclusao(text), /1\. Placas ateromatosas no tronco celíaco, sem aceleração focal do fluxo documentada\./)
})

console.log(`${cases} Doppler mesentérico structured web cases passed`)
