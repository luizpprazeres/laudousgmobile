import assert from 'node:assert/strict'
import * as importedModule from './trisomyFmf.ts'

const runtimeModule = importedModule as typeof importedModule & { default?: typeof importedModule }
const { calculateTrisomyWeb } = runtimeModule.default ?? runtimeModule

const base = {
  maternalAge: '39', crl: '72,4', nt: '3,1', fhr: '165', ethnicity: 'white' as const,
  weight: '', smoking: false, previousT21: false, previousT18: false, previousT13: false,
  freeBetaHcgMoM: '', pappaMoM: '', isMoMCorrected: false,
  dvPI: '', tricuspid: '' as const, nasalBone: '' as const,
}

const fhrOnly = calculateTrisomyWeb(base)
assert.equal(fhrOnly.input.crl, 72.4)
assert.equal(fhrOnly.input.nt, 3.1)
assert.deepEqual(fhrOnly.result.markersUsed, ['Idade materna', 'TN', 'FCF'])
assert.equal(fhrOnly.result.t21.ratio, 16)
assert.match(fhrOnly.block, /validação clínica externa pendente/i)

assert.throws(
  () => calculateTrisomyWeb({ ...base, freeBetaHcgMoM: '1,5' }),
  /MoM já corrigido/,
)

const biochemistry = calculateTrisomyWeb({
  ...base,
  freeBetaHcgMoM: '1,5',
  pappaMoM: '0,7',
  isMoMCorrected: true,
})
assert.equal(biochemistry.input.freeBetaHcgMoM, 1.5)
assert.equal(biochemistry.input.pappaMoM, 0.7)

console.log('3/3 integração web de trissomias: PASS')
