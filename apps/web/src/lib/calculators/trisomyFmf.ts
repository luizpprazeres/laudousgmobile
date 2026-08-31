import {
  calcularTrissomias,
  formatarBlocoTrissomias,
  type Ethnicity,
  type FmfInput,
  type FmfResult,
} from '@laudousg/shared'

export type TrisomyWebForm = {
  maternalAge: string
  crl: string
  nt: string
  fhr: string
  ethnicity: Ethnicity
  weight: string
  smoking: boolean
  previousT21: boolean
  previousT18: boolean
  previousT13: boolean
  freeBetaHcgMoM: string
  pappaMoM: string
  isMoMCorrected: boolean
  dvPI: string
  tricuspid: '' | 'normal' | 'regurgitation'
  nasalBone: '' | 'present' | 'absent'
}

export type TrisomyWebCalculation = {
  input: FmfInput
  result: FmfResult
  block: string
}

const NUMBER = /^\d+(?:[.,]\d+)?$/

function required(value: string, field: string): number {
  const normalized = value.trim()
  if (!NUMBER.test(normalized)) throw new Error(`${field}: valor ausente ou inválido.`)
  return Number(normalized.replace(',', '.'))
}

function optional(value: string, field: string): number | undefined {
  return value.trim() ? required(value, field) : undefined
}

export function calculateTrisomyWeb(form: TrisomyWebForm): TrisomyWebCalculation {
  const input: FmfInput = {
    maternalAge: required(form.maternalAge, 'idade materna'),
    crl: required(form.crl, 'CCN'),
    nt: required(form.nt, 'translucência nucal'),
    fhr: optional(form.fhr, 'FCF'),
    ethnicity: form.ethnicity,
    weight: optional(form.weight, 'peso materno'),
    smoking: form.smoking,
    previousT21: form.previousT21,
    previousT18: form.previousT18,
    previousT13: form.previousT13,
    freeBetaHcgMoM: optional(form.freeBetaHcgMoM, 'Free β-hCG'),
    pappaMoM: optional(form.pappaMoM, 'PAPP-A'),
    isMoMCorrected: form.isMoMCorrected ? true : undefined,
    dvPI: optional(form.dvPI, 'IP do ducto venoso'),
    tricuspidRegurgitation: form.tricuspid === '' ? undefined : form.tricuspid === 'regurgitation',
    nasalBoneAbsent: form.nasalBone === '' ? undefined : form.nasalBone === 'absent',
  }
  const result = calcularTrissomias(input)
  return { input, result, block: formatarBlocoTrissomias(input, result) }
}
