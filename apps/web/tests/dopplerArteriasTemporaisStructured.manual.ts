import assert from 'node:assert/strict'
import { renderDopplerArteriasTemporais } from '@laudousg/shared'
import { adaptarDopplerArteriasTemporais } from '../src/lib/catalog/dopplerArteriasTemporaisParaCatalogo'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { CATEGORIES } from '../src/lib/deterministic'
import { composeReport, initialExamState, type ExamState } from '../src/lib/deterministic/compose'
import { dopplerArteriasTemporais } from '../src/lib/deterministic/organs/dopplerArteriasTemporais'
import { CATEGORY_GROUPS } from '../src/components/laudar/categoryGroups'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
const conclusion = (text: string) => text.split('CONCLUSÃO:')[1] ?? ''
const codes = (state: ExamState) => adaptarDopplerArteriasTemporais(state).pendencias.map(p => p.valor)

function exam(model: 'blank' | 'normal' = 'normal', laterality = 'bilateral'): ExamState {
  const state = initialExamState(dopplerArteriasTemporais)
  state.__opts = { ...state.__opts, model, laterality }
  return state
}
function text(state: ExamState) {
  const adapted = adaptarDopplerArteriasTemporais(state)
  assert.deepEqual(adapted.pendencias, [])
  return renderDopplerArteriasTemporais(adapted.dados)
}

test('categoria no seletor vascular, no registro estruturado e no renderer remoto', () => {
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes('DOPPLER_ARTERIAS_TEMPORAIS'))
  assert.equal(isWriterCategory('DOPPLER_ARTERIAS_TEMPORAIS'), false)
  assert.equal(categoriaMigrada('DOPPLER_ARTERIAS_TEMPORAIS'), true)
  assert.equal(CATEGORIES.DOPPLER_ARTERIAS_TEMPORAIS, dopplerArteriasTemporais)
  assert.ok(CATEGORY_GROUPS.find(g => g.id === 'vascular')!.categories.includes('DOPPLER_ARTERIAS_TEMPORAIS'))
  assert.throws(() => composeReport(dopplerArteriasTemporais, initialExamState(dopplerArteriasTemporais)))
})

test('normal: modelo bilateral restringe a conclusão aos segmentos avaliados, sem exclusão diagnóstica', () => {
  const out = text(exam())
  assert.match(out, /DAS ARTÉRIAS TEMPORAIS SUPERFICIAIS/)
  assert.match(out, /Fluxo detectável, sem halo parietal, em: tronco comum, ramo frontal e ramo parietal\./)
  assert.equal(out.match(/ramo frontal/g)?.length, 2) // uma linha-resumo por lado, sem repetição
  assert.match(conclusion(out), /Sem alterações ecográficas nos segmentos avaliados da artéria temporal superficial direita\./)
  assert.match(conclusion(out), /artéria temporal superficial esquerda\./)
  assert.doesNotMatch(out, /arterite|compressão|mm|afasta|exclui/i)
})

test('incompleto: em branco bloqueia e lado não avaliado nunca vira normal', () => {
  assert.ok(codes(exam('blank')).includes('COVERAGE_REQUIRED'))
  const state = exam('blank')
  for (const branch of ['common_trunk', 'frontal', 'parietal']) {
    state[`right_${branch}`] = { ...state[`right_${branch}`], assessment: 'evaluated', flow: 'detected', halo: 'absent' }
  }
  state.left_frontal = { ...state.left_frontal, assessment: 'evaluated', flow: 'detected', halo: 'absent' }
  state.left_parietal = { ...state.left_parietal, assessment: 'limited', limitation: 'trajeto tortuoso e cabelo espesso' }
  const out = text(state)
  assert.match(conclusion(out), /Sem alterações ecográficas nos segmentos avaliados da artéria temporal superficial esquerda \(ramo frontal\)\./)
  assert.match(conclusion(out), /Avaliação incompleta da artéria temporal superficial esquerda; segmentos não avaliados ou com limitação: tronco comum e ramo parietal\./)
  assert.match(out, /Ramo parietal: avaliação limitada\. Trajeto tortuoso e cabelo espesso\./)
  // Avaliado sem halo informado e lado sem nenhum segmento: bloqueiam.
  state.left_frontal = { ...state.left_frontal, halo: 'not_assessed' }
  assert.ok(codes(state).includes('HALO_REQUIRED'))
  const unilateral = exam('blank', 'left')
  assert.ok(codes(unilateral).includes('COVERAGE_REQUIRED'))
})

test('alterado: halo unilateral fica descritivo, no lado e ramo corretos, sem hipótese automática', () => {
  const state = exam()
  state.right_frontal = { ...state.right_frontal, halo: 'present', wall_mm: '0,8' }
  const out = text(state)
  assert.match(out, /Ramo frontal: fluxo detectável ao Doppler, halo hipoecogênico parietal, espessura parietal de 0,8 mm\./)
  assert.match(conclusion(out), /Halo hipoecogênico parietal no ramo frontal da artéria temporal superficial direita\./)
  assert.match(conclusion(out), /Sem alterações ecográficas nos segmentos avaliados da artéria temporal superficial direita \(tronco comum e ramo parietal\)/)
  assert.match(conclusion(out), /Sem alterações ecográficas nos segmentos avaliados da artéria temporal superficial esquerda\./)
  assert.doesNotMatch(out, /arterite|células gigantes|recomenda/i)
})

test('medida isolada não conclui: espessura sem halo só aparece no corpo', () => {
  const state = exam('normal', 'right')
  state.right_parietal = { ...state.right_parietal, wall_mm: '0,9' }
  const out = text(state)
  assert.match(out, /Ramo parietal: espessura parietal de 0,9 mm\./)
  assert.doesNotMatch(conclusion(out), /0,9|espessura|arterite/)
  state.right_parietal.wall_mm = '8'
  assert.ok(codes(state).includes('WALL_THICKNESS_SCALE'))
})

test('hipótese de arterite exige halo + segundo marcador no mesmo ramo e confirmação médica', () => {
  const state = exam('normal', 'right')
  state.right_frontal = { ...state.right_frontal, halo: 'present' }
  state.context = { ...state.context, hypothesis: 'include', hypothesis_confirmed: 'yes' }
  assert.ok(codes(state).includes('HYPOTHESIS_DATA_INSUFFICIENT'))
  state.right_frontal.compression = 'positive'
  state.context.hypothesis_confirmed = 'no'
  assert.deepEqual(codes(state), ['HYPOTHESIS_CONFIRMATION_REQUIRED'])
  state.context.hypothesis_confirmed = 'yes'
  const out = conclusion(text(state))
  assert.match(out, /Halo hipoecogênico parietal no ramo frontal da artéria temporal superficial direita, com sinal de compressão positivo\./)
  assert.match(out, /Achados ecográficos compatíveis com arterite de células gigantes \(ramo frontal direito\), conforme avaliação médica/)
})

test('lateralidade, fluxo ausente e corticoide', () => {
  const state = exam('normal', 'left')
  state.right_frontal = { ...state.right_frontal, assessment: 'evaluated', flow: 'detected', halo: 'absent' }
  assert.ok(codes(state).includes('UNREQUESTED_SIDE_HAS_RESULTS'))
  state.right_frontal = { ...state.right_frontal, assessment: 'model', flow: 'model', halo: 'model' }
  state.left_common_trunk = { ...state.left_common_trunk, flow: 'not_detected', halo: 'not_assessed' }
  state.context = { ...state.context, corticosteroid: 'yes', corticosteroid_days: '10' }
  const out = text(state)
  assert.match(out, /DA ARTÉRIA TEMPORAL SUPERFICIAL ESQUERDA/)
  assert.doesNotMatch(out, /direita/)
  assert.match(conclusion(out), /Fluxo não detectado ao Doppler no tronco comum da artéria temporal superficial esquerda\./)
  assert.doesNotMatch(out, /oclus/i)
  assert.match(conclusion(out), /Uso prévio de corticosteroide informado \(10 dias\), o que pode reduzir a sensibilidade do método\./)
})

console.log(`${cases} Doppler artérias temporais structured web cases passed`)
