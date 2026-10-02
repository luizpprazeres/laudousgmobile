import assert from 'node:assert/strict'
import {
  HEPATIC_CONTRACT_VERSION,
  confirmHepaticModuleInterpretation,
  type HepaticAssessment,
  type HepaticModule,
} from '@laudousg/shared'
import {
  calculateHepaticIqrRatio,
  canCalculateHepaticIqrRatio,
  changeHepaticMethod,
  changeHepaticModuleStatus,
  clearHepaticMeasurement,
  editHepaticModule,
  optionalHepaticText,
  parseHepaticNumber,
  replaceHepaticAssessmentContext,
  syncHepaticNumberDraft,
  tryHepaticEdit,
  upsertHepaticMeasurement,
} from '../src/lib/hepaticAssessmentWorkspace.ts'

// Synthetic data only: it exercises the typing path, not clinical criteria.
const reference = { id: 'synthetic', version: 'test-v1', citation: 'Synthetic test reference' }
const inactive = (): HepaticModule => ({ status: 'not_performed', measurements: [], derived: [] })
const base = (): HepaticAssessment => ({
  contractVersion: HEPATIC_CONTRACT_VERSION,
  examId: 'c2c4c302-2f31-424c-92df-08265908a158',
  revision: 0,
  purpose: 'elastography',
  modules: { fat: inactive(), stiffness: inactive() },
})

/**
 * Simulates the controlled text field: each keystroke updates the local draft
 * (what the field shows) and sends only the normalized text to the contract,
 * exactly like the component handlers.
 */
function typeInto(start: HepaticAssessment, text: string, write: (value: HepaticAssessment, next: string | undefined) => HepaticAssessment, read: (value: HepaticAssessment) => string | undefined) {
  let value = start
  let draft = ''
  for (const char of text) {
    draft += char
    const next = optionalHepaticText(draft)
    if (next === read(value)) continue
    const result = tryHepaticEdit(() => write(value, next))
    assert.equal(result.ok, true, `tecla ${JSON.stringify(char)} em ${JSON.stringify(draft)} lançou`)
    if (result.ok) value = result.value
  }
  return { value, draft }
}

// 1) Indication with leading, inner and trailing spaces: nothing throws, the field keeps every space.
{
  const typed = ' Rastreio de fibrose '
  const { value, draft } = typeInto(base(), typed,
    (current, indication) => replaceHepaticAssessmentContext(current, { indication }),
    (current) => current.indication)
  assert.equal(draft, typed, 'o campo mostra exatamente o que foi digitado')
  assert.equal(value.indication, 'Rastreio de fibrose', 'o contrato recebe o texto aparado')
  // The old handler wrote raw keystrokes: the first space throws and a trailing space is lost.
  assert.throws(() => replaceHepaticAssessmentContext(base(), { indication: ' ' }))
  assert.equal(replaceHepaticAssessmentContext(base(), { indication: 'Rastreio ' }).indication, 'Rastreio')
  // Erasing everything removes the indication instead of sending an empty string.
  const cleared = tryHepaticEdit(() => replaceHepaticAssessmentContext(value, { indication: optionalHepaticText('   ') }))
  assert.equal(cleared.ok && cleared.value.indication, undefined)
}

// 2) Limitation reason on a partially limited module, same rule.
{
  const limited = changeHepaticModuleStatus(base(), 'stiffness', 'partially_limited')
  const { value, draft } = typeInto(limited, '  janela acústica limitada ',
    (current, reason) => editHepaticModule(current, 'stiffness', { reason }),
    (current) => current.modules.stiffness.reason)
  assert.equal(draft, '  janela acústica limitada ')
  assert.equal(value.modules.stiffness.reason, 'janela acústica limitada')
  assert.throws(() => editHepaticModule(limited, 'stiffness', { reason: ' ' }))
}

// 3) Decimal typing "5,2": partial "5," stays in the draft; the contract only holds complete numbers.
{
  let value = changeHepaticMethod(changeHepaticModuleStatus(base(), 'stiffness', 'performed'), 'stiffness', '2D-SWE')
  let draft = ''
  for (const char of '5,2') {
    draft += char
    const parsed = parseHepaticNumber(draft)
    if (parsed !== null) value = upsertHepaticMeasurement(value, 'stiffness', { id: 'stiffness-median', role: 'median', value: parsed, unit: 'kPa', origin: 'manual', source: reference })
    const median = value.modules.stiffness.measurements.find((item) => item.role === 'median')
    draft = syncHepaticNumberDraft(draft, median?.value)
  }
  assert.equal(draft, '5,2', 'a vírgula decimal não some durante a digitação')
  assert.equal(value.modules.stiffness.measurements[0]?.value, 5.2)
  assert.equal(parseHepaticNumber('-1'), null)
  // Status change clears the contract value: the field drops the stale number, but keeps partial typing.
  const cleared = clearHepaticMeasurement(value, 'stiffness', 'median')
  assert.equal(syncHepaticNumberDraft('5,2', cleared.modules.stiffness.measurements[0]?.value), '')
  assert.equal(syncHepaticNumberDraft(',', undefined), ',')
  assert.equal(syncHepaticNumberDraft('5,2', 5.2), '5,2')
}

// 4) Schema exceptions become a message, never an exception in the handler.
{
  let done = changeHepaticMethod(changeHepaticModuleStatus(base(), 'stiffness', 'performed'), 'stiffness', '2D-SWE')
  done = upsertHepaticMeasurement(done, 'stiffness', { id: 'stiffness-median', role: 'median', value: 5.2, unit: 'kPa', origin: 'manual', source: reference })
  done = upsertHepaticMeasurement(done, 'stiffness', { id: 'stiffness-iqr', role: 'iqr', value: 0.6, unit: 'kPa', origin: 'manual', source: reference })
  assert.equal(canCalculateHepaticIqrRatio(done.modules.stiffness), true)
  const zeroMedian = upsertHepaticMeasurement(done, 'stiffness', { id: 'stiffness-median', role: 'median', value: 0, unit: 'kPa', origin: 'manual', source: reference })
  assert.equal(canCalculateHepaticIqrRatio(zeroMedian.modules.stiffness), false, 'botão desabilitado com mediana zero')
  const cases: Array<[string, () => HepaticAssessment]> = [
    ['texto acima de 2000', () => replaceHepaticAssessmentContext(done, { indication: 'x'.repeat(2001) })],
    ['mais de 50 fatores', () => editHepaticModule(done, 'stiffness', { confounders: { reviewed: true, etiologicContext: 'contexto', items: Array.from({ length: 51 }, (_, index) => `fator ${index}`) } })],
    ['razão com mediana zero', () => calculateHepaticIqrRatio(zeroMedian, 'stiffness')],
    ['interpretação vazia', () => confirmHepaticModuleInterpretation(done, 'stiffness', { text: '   ', physicianId: 'doctor-test', confirmedAt: '2026-10-02T15:00:00Z', reference })],
  ]
  for (const [label, edit] of cases) {
    assert.throws(edit, `${label}: o contrato recusa`)
    const result = tryHepaticEdit(edit)
    assert.equal(result.ok, false, label)
    if (!result.ok) assert.match(result.message, /não é aceita/)
  }
  assert.equal(tryHepaticEdit(() => done).ok, true)
}

console.log('4 hepatic typing and schema-exception checks passed')
