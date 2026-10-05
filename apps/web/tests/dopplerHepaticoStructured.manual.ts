import assert from 'node:assert/strict'
import { renderDopplerHepaticoReport, validateClinicalModelInput } from '@laudousg/shared'
import { adaptarDopplerHepatico } from '../src/lib/catalog/dopplerHepaticoParaCatalogo'
import { initialExamState, composeReport } from '../src/lib/deterministic/compose'
import { dopplerHepatico } from '../src/lib/deterministic/organs/dopplerHepatico'
import { categoriaMigrada } from '../src/lib/catalog/migradas'
import { isWriterCategory, STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

function normalState() {
  const state = initialExamState(dopplerHepatico)
  state.portal_vein = {
    ...state.portal_vein,
    assessment: 'evaluated',
    patency: 'patent',
    caliber_cm: '1,1',
    velocity_cms: '24',
    flow: 'hepatopetal',
  }
  state.portal_finding = {
    ...state.portal_finding,
    status: 'absent',
    normal_hemodynamics_confirmed: 'yes',
  }
  return state
}

test('a categoria usa formulário e renderer remoto, sem compositor local', () => {
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(dopplerHepatico.id))
  assert.equal(isWriterCategory(dopplerHepatico.id), false)
  assert.equal(categoriaMigrada(dopplerHepatico.id), true)
  assert.throws(() => composeReport(dopplerHepatico, initialExamState(dopplerHepatico)))
})

test('abrir o formulário não presume avaliação ou normalidade', () => {
  const state = initialExamState(dopplerHepatico)
  assert.equal(state.portal_vein.assessment, 'not_assessed')
  assert.equal(state.portal_finding.status, 'not_assessed')
  assert.equal(state.hepatic_veins.assessment, 'not_assessed')
  const adapted = adaptarDopplerHepatico(state)
  assert.ok(adapted.pendencias.some((item) => item.bloqueia))
  assert.equal(adapted.dados.normalHemodynamicsConfirmed, false)
  assert.deepEqual(adapted.dados.hepaticVeins, { evaluated: false })
})

test('veia porta explícita e confirmação médica liberam o modelo normal', () => {
  const adapted = adaptarDopplerHepatico(normalState())
  assert.deepEqual(adapted.pendencias, [])
  assert.equal(validateClinicalModelInput(adapted.dados, { requirePhysicianReview: false }).success, true)
  const report = renderDopplerHepaticoReport(adapted.dados, { requirePhysicianReview: false })
  assert.match(report, /Veia porta pérvia/)
  assert.match(report, /sem alterações hemodinâmicas significativas/)
  assert.doesNotMatch(report, /TIPS|transplante/i)
})

test('vaso opcional só entra quando marcado e completamente medido', () => {
  const state = normalState()
  state.common_hepatic_artery = {
    ...state.common_hepatic_artery,
    assessment: 'evaluated',
    patency: 'patent',
    caliber_cm: '0,5',
    flow: 'hepatopetal',
    psv_cms: '85',
    edv_cms: '25',
    resistance_index: '0,70',
    spectral_pattern: 'preserved',
  }
  const adapted = adaptarDopplerHepatico(state)
  assert.deepEqual(adapted.pendencias, [])
  assert.equal(adapted.dados.commonHepaticArtery.evaluated, true)
  if (adapted.dados.commonHepaticArtery.evaluated) {
    assert.equal(adapted.dados.commonHepaticArtery.peakSystolicVelocityCms, 85)
    assert.equal(adapted.dados.commonHepaticArtery.endDiastolicVelocityCms, 25)
    assert.equal(adapted.dados.commonHepaticArtery.resistanceIndex, 0.7)
  }
  assert.match(renderDopplerHepaticoReport(adapted.dados, { requirePhysicianReview: false }), /velocidade de pico sistólico de 85 cm\/s/)
})

test('campo preenchido em vaso não avaliado bloqueia perda silenciosa', () => {
  const state = normalState()
  state.splenic_vein = { ...state.splenic_vein, caliber_cm: '0,8' }
  assert.ok(adaptarDopplerHepatico(state).pendencias.some((item) => item.onde === 'Veia esplênica' && item.bloqueia))
})

test('alteração portal exige tipo, evidência e confirmação', () => {
  const state = normalState()
  state.portal_finding = {
    ...state.portal_finding,
    status: 'suspected',
    normal_hemodynamics_confirmed: 'no',
  }
  let adapted = adaptarDopplerHepatico(state)
  assert.ok(adapted.pendencias.some((item) => item.valor === 'PORTAL_CONCLUSION_INCOMPLETE'))
  state.portal_finding = {
    ...state.portal_finding,
    kind: 'portal_hypertension',
    evidence: 'Fluxo portal hepatofugal documentado durante o exame',
    physician_confirmed: 'yes',
  }
  state.portal_vein.flow = 'hepatofugal'
  adapted = adaptarDopplerHepatico(state)
  assert.deepEqual(adapted.pendencias, [])
  assert.match(renderDopplerHepaticoReport(adapted.dados, { requirePhysicianReview: false }), /Achados suspeitos de hipertensão portal/)
})

console.log(`${cases} Doppler hepático structured Web cases passed`)
