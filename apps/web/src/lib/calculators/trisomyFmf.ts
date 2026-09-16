import {
  calcularTrissomias,
  formatarBlocoTrissomias,
  formatarRazaoTrissomia,
  arredondarDoisAlgarismos as arredondarDoisAlgarismosShared,
  basalRatioT18T13 as basalRatioT18T13Shared,
  type Ethnicity,
  type FmfInput,
  type FmfResult,
  type TrisomyRisk,
} from '@laudousg/shared'
import { hojeComoDataUtc, idadeDecimalEntreDatas, parseDataBr } from './preEclampsia'

export type TrisomyWebForm = {
  /** compatibilidade com telas antigas: idade materna em anos, direto. Preferir `dataNascimento`. */
  maternalAge?: string
  /** dd/mm/aaaa — usada para calcular a idade decimal na data do exame, como o app oficial da FMF */
  dataNascimento?: string
  /** dd/mm/aaaa — data do exame; vazia usa a data de hoje */
  dataExame?: string
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

/** Faixa validada pelo motor (`packages/shared/src/calculators/fmfTrisomy.ts`). */
const IDADE_MATERNA_MIN = 15
const IDADE_MATERNA_MAX = 50

function validarIdadeMaterna(idade: number): number {
  if (!Number.isFinite(idade) || idade < IDADE_MATERNA_MIN || idade > IDADE_MATERNA_MAX) {
    throw new Error(`idade materna: informe um valor entre ${IDADE_MATERNA_MIN} e ${IDADE_MATERNA_MAX} anos.`)
  }
  return idade
}

/**
 * Idade materna para o motor de trissomias: idade DECIMAL da gestante na
 * DATA DO EXAME — (exame − nascimento)/365,25 — que o motor converte
 * internamente para a idade na DPP, como o app da FMF. Preferimos a data de
 * nascimento; se o formulário só trouxer `maternalAge` numérica — telas
 * antigas —, usamos o valor direto por compatibilidade.
 */
function idadeMaternaParaMotor(form: TrisomyWebForm): number {
  const nascimentoStr = form.dataNascimento?.trim()
  if (nascimentoStr) {
    const nascimento = parseDataBr(nascimentoStr, 'data de nascimento')
    const exameStr = form.dataExame?.trim()
    const dataExame = exameStr ? parseDataBr(exameStr, 'data do exame') : hojeComoDataUtc()
    return validarIdadeMaterna(idadeDecimalEntreDatas(nascimento, dataExame))
  }
  const idadeStr = form.maternalAge?.trim()
  if (idadeStr) return validarIdadeMaterna(required(idadeStr, 'idade materna'))
  throw new Error('informe a data de nascimento materna (ou a idade materna, compatibilidade)')
}

/**
 * Prévia não destrutiva da idade decimal na data do exame, para o médico
 * conferir na tela antes de calcular o risco. `null` quando os dados ainda
 * não permitem calcular (não lança erro — é só uma prévia).
 */
export function idadeNaDataExamePreview(form: TrisomyWebForm): number | null {
  if (!form.dataNascimento?.trim()) return null
  try {
    const nascimento = parseDataBr(form.dataNascimento.trim(), 'data de nascimento')
    const exameStr = form.dataExame?.trim()
    const dataExame = exameStr ? parseDataBr(exameStr, 'data do exame') : hojeComoDataUtc()
    return idadeDecimalEntreDatas(nascimento, dataExame)
  } catch {
    return null
  }
}

/**
 * Arredonda para 2 algarismos significativos, como o app oficial da FMF
 * exibe o denominador N de "1 in N" (ex.: 3.287 → 3.300, 549 → 550, 63 → 63).
 * Reexporta a implementação do shared (mesma lógica do iOS/Android).
 */
export function arredondarDoisAlgarismos(n: number): number {
  return arredondarDoisAlgarismosShared(n)
}

/**
 * Formata um risco como "1 em N", aplicando o teto/piso de exibição do app
 * da FMF (`displayCapRatio`/`displayFloorRatio`) e arredondando N para 2
 * algarismos significativos. Delega para `formatarRazaoTrissomia` do shared.
 */
export function formatarRiscoExibicao(
  risco: TrisomyRisk,
  limites: Pick<FmfResult, 'displayCapRatio' | 'displayFloorRatio'>,
): string {
  return formatarRazaoTrissomia(risco.ratio, limites.displayCapRatio, limites.displayFloorRatio)
}

/**
 * Risco BASAL combinado T13/18 (soma das probabilidades basais de T13 e
 * T18), para exibir ao lado do basal de T21 — o motor só expõe a combinação
 * pós-marcadores em `result.t18t13`. Reexporta a implementação do shared.
 */
export function basalRatioT18T13(result: FmfResult): number {
  return basalRatioT18T13Shared(result)
}

export function calculateTrisomyWeb(form: TrisomyWebForm): TrisomyWebCalculation {
  const input: FmfInput = {
    maternalAge: idadeMaternaParaMotor(form),
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
