import assert from 'node:assert/strict'
import {
  HEPATIC_CONTRACT_VERSION,
  confirmHepaticModuleInterpretation,
  evaluateHepaticConclusion,
  type HepaticAssessment,
  type HepaticModule,
} from '@laudousg/shared'
import {
  buildHepaticCorrelation,
  buildHepaticTechniquePatch,
  changeHepaticMethod,
  changeHepaticModuleStatus,
  changeHepaticUnit,
  replaceHepaticAssessmentContext,
  upsertHepaticMeasurement,
} from '../src/lib/hepaticAssessmentWorkspace.ts'

const reference = { id: 'synthetic', version: 'test-v1', citation: 'Synthetic test reference' }
const review = { text: 'Revisado', physicianId: 'doctor-test', confirmedAt: '2026-10-02T15:00:00Z', reference }
const inactive = (): HepaticModule => ({ status: 'not_performed', measurements: [], derived: [] })
const assessment = (): HepaticAssessment => ({
  contractVersion: HEPATIC_CONTRACT_VERSION,
  examId: 'c2c4c302-2f31-424c-92df-08265908a158',
  revision: 0,
  purpose: 'elastography',
  indication: 'Synthetic indication',
  modules: { fat: inactive(), stiffness: inactive() },
})

{
  const typed = {
    manufacturer: '', model: '', probe: '', count: '', lobe: 'right' as const,
    depthCm: '', roi: '', position: '',
  }
  assert.equal(buildHepaticTechniquePatch(typed, reference), null)
  typed.manufacturer = 'Synthetic'
  assert.equal(buildHepaticTechniquePatch(typed, reference), null)
  typed.model = 'Test'; typed.count = '5'; typed.depthCm = '3'; typed.roi = 'ROI'; typed.position = 'Supine'
  assert.deepEqual(buildHepaticTechniquePatch(typed, reference)?.acquisition.count, 5)
  assert.equal(buildHepaticTechniquePatch({ ...typed, count: '5.5' }, reference), null)
  assert.equal(buildHepaticTechniquePatch({ ...typed, depthCm: 'abc' }, reference), null)

  const correlation = { modeB: '', doppler: '', concordance: 'not_assessed' as const, physicianResolution: '' }
  assert.equal(buildHepaticCorrelation(correlation), null)
  assert.equal(buildHepaticCorrelation({ ...correlation, modeB: 'Normal', doppler: 'Normal', concordance: 'discordant' }), null)
  assert.equal(buildHepaticCorrelation({ ...correlation, modeB: 'Normal', doppler: 'Normal', concordance: 'concordant' })?.concordance, 'concordant')
}

{
  let value = assessment()
  value = changeHepaticModuleStatus(value, 'stiffness', 'performed')
  value = changeHepaticMethod(value, 'stiffness', '2D-SWE')
  value = upsertHepaticMeasurement(value, 'stiffness', { id: 'median', role: 'median', value: 7.2, unit: 'kPa', origin: 'manual', source: reference })
  assert.equal(value.modules.stiffness.method, '2D-SWE')
  assert.deepEqual(value.modules.stiffness.measurements.map((item) => item.value), [7.2])
  assert.equal(value.modules.stiffness.derived.length, 0)
  const changedUnit = changeHepaticUnit(value, 'stiffness')
  assert.deepEqual(changedUnit.modules.stiffness.measurements, [], 'trocar unidade remove a medida em vez de relabelar o número')
  assert.equal(changedUnit.modules.stiffness.quality, undefined)
}

{
  let value = assessment()
  value.modules.stiffness = {
    status: 'performed', method: '2D-SWE',
    equipment: { manufacturer: 'Synthetic', model: 'Test' },
    acquisition: { count: 5, lobe: 'right', depthCm: 3, roi: 'ROI', position: 'Supine', protocol: reference },
    fasting: { status: 'fasting', hours: 4 },
    confounders: { reviewed: true, items: [], etiologicContext: 'Synthetic' },
    quality: { assessment: 'adequate', physicianId: 'doctor-test', assessedAt: review.confirmedAt,
      criterion: { reference, method: '2D-SWE', manufacturer: 'Synthetic', equipmentModel: 'Test', unit: 'kPa', minimumAcquisitions: 5, requiredMetrics: [] }, metrics: [] },
    measurements: [{ id: 'median', role: 'median', value: 7.2, unit: 'kPa', origin: 'manual', source: reference }], derived: [],
  }
  value = confirmHepaticModuleInterpretation(value, 'stiffness', review)
  assert.equal(evaluateHepaticConclusion(value).canConclude, true)
  const edited = replaceHepaticAssessmentContext(value, { indication: 'Changed indication' })
  assert.equal(edited.revision, value.revision + 1)
  assert.equal(edited.modules.stiffness.interpretation, undefined)
  assert.equal(evaluateHepaticConclusion(edited).canConclude, false)
}

{
  let value = assessment()
  value = changeHepaticModuleStatus(value, 'stiffness', 'not_feasible')
  assert.equal(value.modules.stiffness.status, 'not_feasible')
  assert.deepEqual(value.modules.stiffness.measurements, [])
}

console.log('4 hepatic workspace adapter checks passed')
