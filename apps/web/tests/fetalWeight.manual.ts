import assert from 'node:assert/strict'
import { obstetrica, morfologico, dopplerObstetrico } from '../src/lib/deterministic'
import {
  arredondarPesoGramas,
  calcularPesoHadlock1985,
  chaveFemurDoSchema,
  parseMedidaMm,
  pesoHadlock1985DaBiometria,
  pesoJaAplicado,
} from '../src/lib/calculators/fetalWeight'

let cases = 0

/** Forma LOINC 11732-5, escrita à parte e em cm, para conferir o helper em mm. */
const loincCm = (dbp: number, cc: number, ca: number, cf: number) =>
  10 ** (1.3596 - 0.00386 * ca * cf + 0.0064 * cc + 0.00061 * dbp * ca + 0.174 * cf + 0.0424 * ca)

// Numéricos: mm → cm sempre ÷10; arredondamento só no valor exibido/aplicado.
for (const [mm, esperadoAprox, valor] of [
  [[48, 175, 152, 33], 347.67, '348'],
  [[90, 320, 320, 70], 2819.94, '2820'],
] as const) {
  const [dbpMm, ccMm, caMm, cfMm] = mm
  const gramas = calcularPesoHadlock1985({ dbpMm, ccMm, caMm, cfMm })
  assert.ok(gramas !== null)
  assert.ok(Math.abs(gramas - loincCm(dbpMm / 10, ccMm / 10, caMm / 10, cfMm / 10)) < 1e-9)
  assert.ok(Math.abs(gramas - esperadoAprox) < 0.05, `${gramas} ≈ ${esperadoAprox}`)
  assert.notEqual(gramas, Math.round(gramas))
  assert.equal(arredondarPesoGramas(gramas), valor)
  cases++
}

// Unidade explícita: valor em "cm" digitado no campo mm não é reinterpretado.
{
  const mm = calcularPesoHadlock1985({ dbpMm: 48, ccMm: 175, caMm: 152, cfMm: 33 })!
  const pequeno = calcularPesoHadlock1985({ dbpMm: 4.8, ccMm: 17.5, caMm: 15.2, cfMm: 3.3 })!
  assert.ok(Math.abs(pequeno - loincCm(0.48, 1.75, 1.52, 0.33)) < 1e-9)
  assert.ok(Math.abs(pequeno - mm) > 100)
  // Medida > 20 mm continua mm (sem normalizeCm).
  const grande = calcularPesoHadlock1985({ dbpMm: 21, ccMm: 21, caMm: 21, cfMm: 21 })!
  assert.ok(Math.abs(grande - loincCm(2.1, 2.1, 2.1, 2.1)) < 1e-9)
  cases++
}

// Parser estrito.
for (const [raw, esperado] of [
  ['48', 48], ['48,5', 48.5], ['48.5', 48.5], [' 33 ', 33], ['0,1', 0.1], ['007', 7],
] as const) {
  assert.equal(parseMedidaMm(raw), esperado)
  cases++
}
const invalidos: unknown[] = [
  undefined, null, 48, '', '   ', '0', '0,0', '0.00', '-1', '-48', '+48', '48mm', '48 mm', '4,8cm',
  '48,', ',5', '.5', '48,5,1', '48.5.1', '4 8', '1e2', '1E2', 'NaN', 'Infinity', '-Infinity',
  '0x10', '٤٨', '1'.repeat(400), ['48'],
]
for (const raw of invalidos) {
  assert.equal(parseMedidaMm(raw), null, `rejeita ${String(raw).slice(0, 20)}`)
  cases++
}

// Calculadora direta rejeita não finitos, zero, negativo e overflow do resultado.
for (const medidas of [
  { dbpMm: 0, ccMm: 175, caMm: 152, cfMm: 33 },
  { dbpMm: 48, ccMm: -175, caMm: 152, cfMm: 33 },
  { dbpMm: 48, ccMm: 175, caMm: Number.NaN, cfMm: 33 },
  { dbpMm: 48, ccMm: 175, caMm: 152, cfMm: Number.POSITIVE_INFINITY },
  { dbpMm: 48, ccMm: 1e6, caMm: 152, cfMm: 33 },
]) {
  assert.equal(calcularPesoHadlock1985(medidas), null)
  cases++
}
for (const g of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.4, 1e300]) {
  assert.equal(arredondarPesoGramas(g), null)
  cases++
}

// Schemas reais: chave do fêmur e rótulos em mm.
const biometriaDe = (sections: ReadonlyArray<{ id: string; module?: { schema: { fields: ReadonlyArray<{ key: string; label: string }> } } }>) =>
  sections.find((s) => s.id === 'biometria')!.module!.schema
for (const [sections, chave] of [
  [obstetrica.sections, 'cf'],
  [dopplerObstetrico.resolveSections?.({}) ?? dopplerObstetrico.sections, 'cf'],
  [morfologico.resolveSections?.({ trimestre: '2t' }) ?? morfologico.sections, 'femur'],
  [morfologico.resolveSections?.({ trimestre: '3t' }) ?? morfologico.sections, 'femur'],
] as const) {
  const schema = biometriaDe(sections)
  assert.equal(chaveFemurDoSchema(schema.fields), chave)
  for (const key of ['dbp', 'cc', 'ca', chave]) {
    assert.match(schema.fields.find((f) => f.key === key)!.label, /\(mm\)/)
  }
  assert.ok(schema.fields.some((f) => f.key === 'peso'))
  cases++
}
assert.equal(chaveFemurDoSchema([{ key: 'dbp' }]), null)

// Estado: completo, incompleto, inválido e sem mutação.
{
  const state = { dbp: '48', cc: '175', ca: '152,0', cf: ' 33 ', peso: '300' }
  const snapshot = JSON.stringify(state)
  const r = pesoHadlock1985DaBiometria(state, 'cf')
  assert.equal(r?.valor, '348')
  assert.equal(JSON.stringify(state), snapshot)
  assert.equal(pesoHadlock1985DaBiometria({ ...state, cf: '' }, 'cf'), null)
  assert.equal(pesoHadlock1985DaBiometria(state, 'femur'), null)
  assert.equal(pesoHadlock1985DaBiometria(state, null), null)
  assert.equal(pesoHadlock1985DaBiometria({ dbp: '48', cc: '175', ca: '152', femur: '33' }, 'femur')?.valor, '348')
  for (const bad of ['0', '-33', '33mm', 'NaN', '1e1', '']) {
    assert.equal(pesoHadlock1985DaBiometria({ ...state, dbp: bad }, 'cf'), null)
  }
  cases++
}

// Peso manual só é considerado aplicado quando equivale ao arredondado.
assert.equal(pesoJaAplicado('348', '348'), true)
assert.equal(pesoJaAplicado(' 348,0 ', '348'), true)
assert.equal(pesoJaAplicado('347', '348'), false)
assert.equal(pesoJaAplicado('', '348'), false)
assert.equal(pesoJaAplicado('348g', '348'), false)
cases++

console.log(`Hadlock 1985 fetal weight: ${cases} cases passed (numeric, invalid, units mm, real schemas)`)
