import assert from 'node:assert/strict'
import { renderDopplerArterialMmii, renderDopplerFistulaAv } from '@laudousg/shared'
import { adaptarDopplerArterialMmii } from '../src/lib/catalog/dopplerArterialMmiiParaCatalogo'
import { adaptarDopplerFistulaAv } from '../src/lib/catalog/dopplerFistulaAvParaCatalogo'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { CATEGORIES } from '../src/lib/deterministic'
import { composeReport, initialExamState, type ExamState } from '../src/lib/deterministic/compose'
import { dopplerArterialMmii } from '../src/lib/deterministic/organs/dopplerArterialMmii'
import { dopplerFistulaAv } from '../src/lib/deterministic/organs/dopplerFistulaAv'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
const conclusion = (text: string) => text.split('CONCLUSÃO:')[1] ?? ''

function arterial(model: 'blank' | 'normal' = 'normal', laterality = 'right'): ExamState {
  const state = initialExamState(dopplerArterialMmii)
  state.__opts = { ...state.__opts, model, laterality }
  return state
}
function arterialText(state: ExamState) {
  const adapted = adaptarDopplerArterialMmii(state)
  assert.deepEqual(adapted.pendencias, [])
  return renderDopplerArterialMmii(adapted.dados)
}
function fistula(model: 'blank' | 'normal' = 'normal'): ExamState {
  const state = initialExamState(dopplerFistulaAv)
  state.__opts = { ...state.__opts, model }
  return state
}
function fistulaText(state: ExamState) {
  const adapted = adaptarDopplerFistulaAv(state)
  assert.deepEqual(adapted.pendencias, [])
  return renderDopplerFistulaAv(adapted.dados)
}

test('as duas categorias entram no seletor/registro estruturado e saem do renderer remoto', () => {
  for (const category of [dopplerArterialMmii, dopplerFistulaAv]) {
    assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(category.id))
    assert.equal(isWriterCategory(category.id), false)
    assert.equal(categoriaMigrada(category.id), true)
    assert.equal(CATEGORIES[category.id], category)
    assert.throws(() => composeReport(category, initialExamState(category)))
  }
})

test('arterial: abrir em branco não inventa normalidade', () => {
  const adapted = adaptarDopplerArterialMmii(initialExamState(dopplerArterialMmii))
  assert.ok(adapted.pendencias.some(p => p.valor === 'COVERAGE_REQUIRED'))
  assert.ok(adapted.dados.sides.right.segments.every(s => s.assessment === 'not_assessed'))
})

test('arterial: modelo normal bilateral gera conclusão de normalidade sem medidas inventadas', () => {
  const text = arterialText(arterial('normal', 'bilateral'))
  assert.match(text, /DOS MEMBROS INFERIORES/)
  assert.match(conclusion(text), /Artérias avaliadas do membro inferior direito pérvias, com fluxo de padrão trifásico/)
  assert.match(conclusion(text), /membro inferior esquerdo pérvias/)
  assert.doesNotMatch(text, /cm\/s|ITB|Estenose|Oclusão/)
  // Cada segmento preservado aparece uma vez: na frase-resumo, não de novo linha a linha.
  assert.equal(text.match(/artéria poplítea/gi)?.length, 2)
  assert.doesNotMatch(text, /^Artéria .*: fluxo de padrão trifásico/m)
})

test('arterial: VPS informada em segmento normal fica numa linha só com a medida', () => {
  const state = arterial()
  state.right_popliteal = { ...state.right_popliteal, psv_cms: '75' }
  const body = arterialText(state).split('CONCLUSÃO:')[0]
  assert.match(body, /^Artéria poplítea: VPS de 75 cm\/s\.$/m)
  assert.equal(body.match(/artéria poplítea/gi)?.length, 2)
})

test('campos de confirmação médica têm rótulo explícito', () => {
  const labels = (category: typeof dopplerArterialMmii, sectionId: string) => {
    const fields = category.sections.find(s => s.id === sectionId)!.module!.schema.fields
    return fields.flatMap(f => [f.label, ...(f.options ?? []).flatMap(o => (o.subFields ?? []).map(sf => sf.label))])
  }
  const arterialLabels = labels(dopplerArterialMmii, 'right_popliteal')
  assert.ok(arterialLabels.includes('Confirmação médica da graduação'))
  assert.equal(arterialLabels.filter(l => l === 'Graduação').length, 1)
  const accessLabels = labels(dopplerFistulaAv, 'access')
  assert.ok(accessLabels.includes('Confirmação médica da classificação do volume'))
  assert.equal(accessLabels.filter(l => l === 'Classificação do volume').length, 1)
})

test('arterial: estenose sem confirmação descreve a aceleração sem percentual', () => {
  const state = arterial()
  state.right_femoral_mid = { ...state.right_femoral_mid, alteration: 'stenosis', 'alteration.stenosis.lesion_psv_cms': '320', 'alteration.stenosis.reference_psv_cms': '100' }
  const text = arterialText(state)
  assert.match(text, /razão de velocidades de 3,2/)
  assert.match(conclusion(text), /Aumento focal da velocidade de pico sistólico na artéria femoral — terço médio do membro inferior direito .*sem graduação confirmada/)
  assert.doesNotMatch(conclusion(text), /%|pérvias/)
})

test('arterial: graduação exige razão, critério da base e confirmação', () => {
  const state = arterial()
  state.right_popliteal = { ...state.right_popliteal, alteration: 'stenosis', 'alteration.stenosis.lesion_psv_cms': '320', 'alteration.stenosis.grade': 'ge50' }
  assert.ok(adaptarDopplerArterialMmii(state).pendencias.some(p => p.valor === 'GRADE_DATA_INSUFFICIENT'))
  assert.ok(adaptarDopplerArterialMmii(state).pendencias.some(p => p.valor === 'GRADE_CONFIRMATION_REQUIRED'))
  state.right_popliteal['alteration.stenosis.reference_psv_cms'] = '100'
  state.right_popliteal['alteration.stenosis.grade'] = 'ge70'
  state.right_popliteal['alteration.stenosis.confirmed'] = 'yes'
  assert.ok(adaptarDopplerArterialMmii(state).pendencias.some(p => p.valor === 'GRADE_CRITERIA_MISMATCH'))
  state.right_popliteal['alteration.stenosis.grade'] = 'ge50'
  assert.match(conclusion(arterialText(state)), /Estenose estimada em 50% ou mais na artéria poplítea do membro inferior direito \(VPS de 320 cm\/s; razão de velocidades de 3,2\)/)
})

test('arterial: fluxo ausente só vira oclusão com confirmação', () => {
  const state = arterial()
  state.right_femoral_distal = { ...state.right_femoral_distal, alteration: 'no_flow', 'alteration.no_flow.collaterals': 'present', 'alteration.no_flow.reconstitution': 'artéria poplítea' }
  const pending = arterialText(state)
  assert.match(conclusion(pending), /Fluxo não detectado ao Doppler na artéria femoral — terço distal do membro inferior direito/)
  assert.doesNotMatch(pending, /Oclusão/)
  state.right_femoral_distal['alteration.no_flow.occlusion_confirmed'] = 'yes'
  assert.match(conclusion(arterialText(state)), /Oclusão da artéria femoral — terço distal do membro inferior direito, com reenchimento em artéria poplítea/)
})

test('arterial: ITB calculado com o maior braço e classificado sem rótulo clínico', () => {
  const state = arterial()
  state.abi = { ...state.abi, brachial_right: '130', brachial_left: '140', right_posterior_tibial: '98', right_dorsalis_pedis: '90' }
  const text = arterialText(state)
  assert.match(text, /Índice tornozelo-braquial \(ITB\): 0,7 /)
  assert.match(conclusion(text), /Índice tornozelo-braquial reduzido à direita \(0,7\)/)
  assert.doesNotMatch(text, /claudica|Rutherford|isquemia/i)
  state.abi = { ...state.abi, brachial_left: '' }
  assert.ok(adaptarDopplerArterialMmii(state).pendencias.some(p => p.valor === 'ABI_BRACHIAL_REQUIRED'))
})

test('arterial: lado fora do exame com dados bloqueia', () => {
  const state = arterial()
  state.left_popliteal = { ...state.left_popliteal, assessment: 'evaluated', waveform: 'triphasic' }
  assert.ok(adaptarDopplerArterialMmii(state).pendencias.some(p => p.valor === 'UNREQUESTED_SIDE_HAS_RESULTS'))
})

test('fístula: em branco bloqueia; modelo normal gera fístula pérvia', () => {
  assert.ok(adaptarDopplerFistulaAv(fistula('blank')).pendencias.some(p => p.valor === 'COVERAGE_REQUIRED'))
  const state = fistula()
  state.access = { ...state.access, flow_volume_ml_min: '850' }
  const text = fistulaText(state)
  assert.match(text, /Fístula arteriovenosa radiocefálica no membro superior esquerdo\./)
  assert.match(text, /Volume de fluxo de 850 mL\/min, medido na artéria nutridora/)
  assert.match(conclusion(text), /^\nFístula arteriovenosa radiocefálica no membro superior esquerdo pérvia, sem sinais ecográficos de estenose ou trombose/)
  assert.doesNotMatch(conclusion(text), /reduzido|elevado|850/)
})

test('fístula: estenose e trombose só concluem com confirmação', () => {
  const state = fistula()
  state.juxta_anastomotic_vein = { ...state.juxta_anastomotic_vein, alteration: 'stenosis', 'alteration.stenosis.lesion_psv_cms': '480', 'alteration.stenosis.reference_psv_cms': '160', 'alteration.stenosis.min_diameter_mm': '2' }
  state.draining_vein_proximal = { ...state.draining_vein_proximal, alteration: 'thrombus', 'alteration.thrombus.extent': 'occlusive' }
  const pending = conclusion(fistulaText(state))
  assert.match(pending, /Aumento focal da velocidade de pico sistólico na veia de drenagem — segmento justa-anastomótico \(VPS de 480 cm\/s; razão de velocidades de 3; diâmetro luminal mínimo de 2 mm\), sem confirmação de estenose/)
  assert.match(pending, /Material ecogênico intraluminal na veia de drenagem — segmento proximal, sem fluxo detectável/)
  assert.doesNotMatch(pending, /Trombose|^Estenose|pérvia/m)
  state.juxta_anastomotic_vein['alteration.stenosis.confirmed'] = 'yes'
  state.draining_vein_proximal['alteration.thrombus.confirmed'] = 'yes'
  const confirmed = conclusion(fistulaText(state))
  assert.match(confirmed, /^Estenose na veia de drenagem — segmento justa-anastomótico/m)
  assert.match(confirmed, /Trombose oclusiva na veia de drenagem — segmento proximal/)
})

test('fístula: estenose confirmada sem referência e volume classificado sem confirmação bloqueiam', () => {
  const state = fistula()
  state.anastomosis = { ...state.anastomosis, alteration: 'stenosis', 'alteration.stenosis.lesion_psv_cms': '500', 'alteration.stenosis.confirmed': 'yes' }
  state.access = { ...state.access, flow_volume_ml_min: '350', flow_classification: 'low' }
  const pending = adaptarDopplerFistulaAv(state).pendencias.map(p => p.valor)
  assert.ok(pending.includes('STENOSIS_DATA_INSUFFICIENT'))
  assert.ok(pending.includes('FLOW_CLASSIFICATION_CONFIRMATION_REQUIRED'))
  state.anastomosis = { ...state.anastomosis, alteration: 'none' }
  state.access.flow_confirmed = 'yes'
  assert.match(conclusion(fistulaText(state)), /Volume de fluxo reduzido \(350 mL\/min\)/)
})

test('fístula: dilatação e fluxo retrógrado distal ficam descritivos sem confirmação', () => {
  const state = fistula()
  state.__opts.optional_segments = 'show'
  state.draining_vein_puncture = { ...state.draining_vein_puncture, alteration: 'aneurysm', 'alteration.aneurysm.max_diameter_mm': '18' }
  state.distal_artery = { ...state.distal_artery, assessment: 'evaluated', flow_direction: 'retrograde' }
  const text = conclusion(fistulaText(state))
  assert.match(text, /Calibre máximo de 18 mm na veia de drenagem — segmento de punção/)
  assert.match(text, /Fluxo retrógrado na artéria distal à anastomose/)
  assert.doesNotMatch(text, /aneurism|roubo/i)
})

console.log(`${cases} Doppler arterial/fístula AV structured web cases passed`)
