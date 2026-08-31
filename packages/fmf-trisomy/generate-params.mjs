import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(root, 'source')
const output = join(root, '../shared/src/calculators/fmfTrisomyParams.ts')
const csvFiles = readdirSync(sourceDir).filter(name => name.endsWith('.csv')).sort()
const fingerprint = createHash('sha256')
for (const file of csvFiles) fingerprint.update(readFileSync(join(sourceDir, file)))
const sourceFingerprint = fingerprint.digest('hex')

const rows = file => readFileSync(join(sourceDir, file), 'utf8')
  .trim().split(/\r?\n/)
  .map(line => line.split(',').map(value => value.replace(/^"|"$/g, '').trim()))

const pairs = file => Object.fromEntries(rows(file).slice(1).map(([key, value]) => [key, Number(value)]))
const vector = (file, names) => {
  const data = Object.fromEntries(rows(file).map(([key, value]) => [key, Number(value)]))
  return names.map(name => data[name])
}
const means = file => {
  const data = Object.fromEntries(rows(file).slice(1).map(([key, b0, b1, b2]) => [key, { b0: Number(b0), b1: Number(b1), b2: Number(b2) }]))
  return { fbhcgT1: data.fbhcgT1, pappa: data.pappa, fhr: data.fhr }
}
const correlations = file => {
  const data = Object.fromEntries(rows(file).map(row => [row[0], row.slice(1)]))
  const indices = { fbhcgT1: 2, pappa: 5, fhr: 11 }
  const names = ['fbhcgT1', 'pappa', 'fhr']
  return names.map(row => names.map(column => Number(data[row][indices[column]])))
}
const ntLimits = rows('NT_parameters_trisomies_tlimits_t21.csv').slice(1)
  .map(([, crl, nt]) => [Math.round(Number(crl) * 10), Number(nt)])
const dvLimits = rows('DVPI_parameters_trisomies_tlimits_dvpi.csv').slice(1)

const nt = pairs('NT_parameters_trisomies_param_nt_mix.csv')
const dv = Object.fromEntries(rows('DVPI_parameters_trisomies_param_dvpi_mix.csv').map(([key, value]) => [key, Number(value)]))
const tricuspid = pairs('tricuspid_param.csv')
const nasal = Object.fromEntries(rows('NB_parameters_param_nb_logistic.csv').map(([key, value]) => [key, Number(value)]))
const markerNames = ['fbhcgT1', 'pappa', 'fhr']
const truncation = Object.fromEntries(rows('gauss_parameters_trisomies_tl_fmf.csv').slice(1).map(([key, lower, upper]) => [key, { lower: Number(lower), upper: Number(upper) }]))

const generated = `// GERADO por packages/fmf-trisomy/generate-params.mjs. Não editar à mão.
// Fonte congelada: packages/fmf-trisomy/source/*.csv
export const FMF_TRISOMY_SOURCE_FINGERPRINT = 'sha256:${sourceFingerprint}'

export const NT_MIX = ${JSON.stringify({ a0: nt.a0, a1: nt.a1, b0: nt.b0, b1: nt.b1, b2: nt.b2, m1: nt.m1, m13: nt.m13, m18: nt.m18, m21: nt.m21, p21: nt.p21, p13: nt.p13, p18: nt.p18, sd: nt.sd, sdB: nt['sd.b'], sdOp: nt['sd.op'], sdT18: nt['sd.t18'], sdT13: nt['sd.t13'], sdT21: nt['sd.t21'] }, null, 2)} as const

export const DVPI_MIX = ${JSON.stringify({ a0: dv.a0, a1: dv.a1, a2: dv.a2, b0: dv.b0, b1: dv.b1, b2: dv.b2, b3: dv.b3, mc: dv.mc, m13: dv.m13, m18: dv.m18, m21: dv.m21, p21: dv.p21, p13: dv.p13, p18: dv.p18, sd: dv.sd, sdOp: dv['sd.op'], sdB: dv['sd.b'], sdT13: dv['sd.t13'], sdT18: dv['sd.t18'], sdT21: dv['sd.t21'] }, null, 2)} as const

export const TRICUSPID = ${JSON.stringify({ intercept: tricuspid.Intercept, nt: tricuspid.NT, smoker: tricuspid.Smoker, weight: tricuspid.Weight, t21: tricuspid.T21, t13: tricuspid.T13, t18: tricuspid.T18 }, null, 2)} as const
export const NASAL_BONE = ${JSON.stringify({ constant: nasal.constant, sm: nasal.sm, nt: nasal.nt, crl: nasal.crl, pLmom: nasal.p_lmom, fLmom: nasal.f_lmom, black: nasal.black, asian: nasal.asian, mixed: nasal.mixed, oriental: nasal.oriental, t21: nasal.t21, t18: nasal.t18, t13: nasal.t13 }, null, 2)} as const

export const GAUSS_MEAN_T21 = ${JSON.stringify(means('gauss_parameters_trisomies_mean_fmf_t21.csv'), null, 2)} as const
export const GAUSS_MEAN_T18 = ${JSON.stringify(means('gauss_parameters_trisomies_mean_fmf_t18.csv'), null, 2)} as const
export const GAUSS_MEAN_T13 = ${JSON.stringify(means('gauss_parameters_trisomies_mean_fmf_t13.csv'), null, 2)} as const
export const GAUSS_SD = ${JSON.stringify({ un: vector('gauss_parameters_trisomies_sd_fmf_un.csv', markerNames), t21: vector('gauss_parameters_trisomies_sd_fmf_t21.csv', markerNames), t18: vector('gauss_parameters_trisomies_sd_fmf_t18.csv', markerNames), t13: vector('gauss_parameters_trisomies_sd_fmf_t13.csv', markerNames) }, null, 2)} as const
export const GAUSS_COR = ${JSON.stringify({ un: correlations('gauss_parameters_trisomies_cor_fmf_un.csv'), t21: correlations('gauss_parameters_trisomies_cor_fmf_t21.csv'), t18: correlations('gauss_parameters_trisomies_cor_fmf_t18.csv'), t13: correlations('gauss_parameters_trisomies_cor_fmf_t13.csv') }, null, 2)} as const
export const GAUSS_TRUNCATION = ${JSON.stringify({ fbhcgT1: truncation.fbhcgT1, pappa: truncation.pappa, fhr: truncation.fhr }, null, 2)} as const

export const LR_MIN = 0.0001
export const LR_MAX = 10000
export const NT_TLIMITS = new Map<number, number>(${JSON.stringify(ntLimits)})
export const DVPI_TLIMITS_T21 = new Map<number, number>(${JSON.stringify(dvLimits.map(([crl, t21]) => [Math.round(Number(crl) * 10), Number(t21)]))})
export const DVPI_TLIMITS_T18 = new Map<number, number>(${JSON.stringify(dvLimits.map(([crl, , t18]) => [Math.round(Number(crl) * 10), Number(t18)]))})
export const DVPI_TLIMITS_T13 = new Map<number, number>(${JSON.stringify(dvLimits.map(([crl, , , t13]) => [Math.round(Number(crl) * 10), Number(t13)]))})
`

writeFileSync(output, generated)
console.log(`Parâmetros gerados: ${sourceFingerprint}`)
