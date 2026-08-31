import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  calcularTrissomias,
  computeFmfNtLikelihoodRatios,
  FmfTrisomyDomainError,
  FMF_TRISOMY_MODEL_VERSION,
  formatarBlocoTrissomias,
  type FmfInput,
} from '../../packages/shared/src/calculators/index'

type Golden = {
  modelVersion: string
  cases: Array<{
    name: string
    input: FmfInput
    expected: {
      t21: number
      t18: number
      t13: number
      ratios: [number, number, number]
      markers: string[]
    }
  }>
}

const goldenPath = fileURLToPath(new URL('./golden.json', import.meta.url))
const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as Golden
assert.equal(golden.modelVersion, FMF_TRISOMY_MODEL_VERSION)

// Wright et al., UOG 2008;31:376–383, apêndice: CCN 60 mm e TN 2,5 mm
// produzem LR T21 = 2,653. Este vetor é externo ao protótipo histórico.
const publishedNt = computeFmfNtLikelihoodRatios(2.5, 60)
assert.ok(Math.abs(publishedNt.t21 - 2.653) < 0.002, `Wright 2008: LR T21 ${publishedNt.t21}`)
console.log('✓ exemplo publicado Wright 2008 — LR da TN')

for (const testCase of golden.cases) {
  const result = calcularTrissomias(testCase.input)
  const relative = (actual: number, expected: number) => Math.abs(actual - expected) / Math.max(expected, 1e-15)
  assert.ok(relative(result.t21.probability, testCase.expected.t21) < 1e-12, `${testCase.name}: T21 divergiu`)
  assert.ok(relative(result.t18.probability, testCase.expected.t18) < 1e-12, `${testCase.name}: T18 divergiu`)
  assert.ok(relative(result.t13.probability, testCase.expected.t13) < 1e-12, `${testCase.name}: T13 divergiu`)
  assert.deepEqual([result.t21.ratio, result.t18.ratio, result.t13.ratio], testCase.expected.ratios)
  assert.deepEqual(result.markersUsed, testCase.expected.markers)
  assert.equal(result.clinicalStatus, 'validation-pending')
  assert.match(formatarBlocoTrissomias(testCase.input, result), /risco basal.*risco corrigido/s)
  console.log(`✓ ${testCase.name}`)
}

const invalidCases: Array<[string, FmfInput]> = [
  ['CCN fora da janela', { maternalAge: 30, crl: 44.9, nt: 1.5 }],
  ['TN inválida', { maternalAge: 30, crl: 64, nt: 0 }],
  ['bioquímica sem confirmação de MoM corrigido', { maternalAge: 30, crl: 64, nt: 1.5, pappaMoM: 1 }],
  ['tricúspide sem peso', { maternalAge: 30, crl: 64, nt: 1.5, tricuspidRegurgitation: false }],
]

for (const [name, input] of invalidCases) {
  assert.throws(() => calcularTrissomias(input), FmfTrisomyDomainError, name)
  console.log(`✓ bloqueia ${name}`)
}

console.log(`\n${golden.cases.length} golden + ${invalidCases.length} domínios: PASS`)
