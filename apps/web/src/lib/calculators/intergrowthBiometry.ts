/**
 * PRÉVIA INTERGROWTH-21st 2020 a partir da biometria — somente leitura.
 *
 * Peso Hadlock de 3 parâmetros (CC/CA/CF), a fórmula sobre a qual a curva
 * INTERGROWTH-21st 2020 foi construída. Conferida na planilha oficial
 * https://intergrowth21.com/sites/default/files/2025-05/intergrowth_hadlock_efw_calculator_1.xlsx
 * (sheet1, célula AI6), com medidas em cm:
 *   peso g = 10^(1,326 + 0,0107·CC + 0,0438·CA + 0,158·CF − 0,00326·CA·CF)
 *
 * Os campos da biometria web são mm, então a conversão é sempre ÷10, pelo
 * mesmo `parseMedidaMm` do Hadlock 1985; sem heurística de unidade. O peso cru
 * (não arredondado) vai para o motor intergrowth2020.ts; arredondamento só na
 * exibição. Não associa peso informado, Hadlock 4, sexo fetal nem classificação.
 */

import { arredondarPesoGramas, parseMedidaMm, type ChaveFemur } from './fetalWeight'
import {
  INTERGROWTH2020_EFW_MAX_GA_DAYS,
  INTERGROWTH2020_EFW_MIN_GA_DAYS,
  INTERGROWTH2020_EFW_VERSION,
  intergrowth2020EfwPercentile,
  intergrowth2020EfwQuantile,
  intergrowth2020EfwZScore,
  isIntergrowth2020EfwGaDays,
} from './intergrowth2020'

export const HADLOCK3_FORMULA_LABEL = 'Hadlock CC/CA/CF (3 parâmetros)' as const

export type Hadlock3MedidasMm = {
  ccMm: number
  caMm: number
  cfMm: number
}

/** Peso Hadlock 3 em gramas, sem arredondamento. `null` se alguma medida ou o resultado for inválido. */
export function calcularPesoHadlock3(medidas: Hadlock3MedidasMm): number | null {
  const valores = [medidas.ccMm, medidas.caMm, medidas.cfMm]
  if (!valores.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)) return null
  const cc = medidas.ccMm / 10
  const ca = medidas.caMm / 10
  const cf = medidas.cfMm / 10
  const log10Peso = 1.326 + 0.0107 * cc + 0.0438 * ca + 0.158 * cf - 0.00326 * ca * cf
  const gramas = 10 ** log10Peso
  return Number.isFinite(gramas) && gramas > 0 ? gramas : null
}

/** Inteiro não negativo só com dígitos ASCII (espaços nas bordas tolerados); vazio não vira zero. */
function parseInteiroEstrito(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const texto = raw.trim()
  if (!/^\d{1,3}$/.test(texto)) return null
  return Number(texto)
}

export type IgBiometria = {
  semanas: number
  dias: number
  gaDays: number
}

/** IG de `bio_sem`/`bio_dias`: inteiros estritos, dias 0..6, total 126..280. `null` caso contrário. */
export function parseIgBiometria(igState: Readonly<Record<string, unknown>>): IgBiometria | null {
  const semanas = parseInteiroEstrito(igState.bio_sem)
  const dias = parseInteiroEstrito(igState.bio_dias)
  if (semanas === null || dias === null || dias > 6) return null
  const gaDays = semanas * 7 + dias
  return isIntergrowth2020EfwGaDays(gaDays) ? { semanas, dias, gaDays } : null
}

export type IntergrowthBiometryPreviewResult = {
  version: typeof INTERGROWTH2020_EFW_VERSION
  formula: typeof HADLOCK3_FORMULA_LABEL
  medidasMm: Hadlock3MedidasMm
  ig: IgBiometria
  /** Peso Hadlock 3 cru, usado no Z/percentil. */
  weightG: number
  /** Gramas inteiros, só para exibição. */
  weightRounded: string
  zScore: number
  /** 0..100 sem arredondamento. */
  percentile: number
}

/** Lê CC/CA/fêmur (mm) e IG, calcula Hadlock 3 e o percentil; `null` se algo faltar ou for inválido. */
export function intergrowthBiometryPreview(
  biometryState: Readonly<Record<string, unknown>>,
  chaveFemur: ChaveFemur | null,
  igState: Readonly<Record<string, unknown>>,
): IntergrowthBiometryPreviewResult | null {
  if (chaveFemur !== 'cf' && chaveFemur !== 'femur') return null
  const ccMm = parseMedidaMm(biometryState.cc)
  const caMm = parseMedidaMm(biometryState.ca)
  const cfMm = parseMedidaMm(biometryState[chaveFemur])
  if (ccMm === null || caMm === null || cfMm === null) return null
  const ig = parseIgBiometria(igState)
  if (!ig) return null
  const medidasMm = { ccMm, caMm, cfMm }
  const weightG = calcularPesoHadlock3(medidasMm)
  if (weightG === null) return null
  const weightRounded = arredondarPesoGramas(weightG)
  const zScore = intergrowth2020EfwZScore(weightG, ig.gaDays)
  const percentile = intergrowth2020EfwPercentile(weightG, ig.gaDays)
  if (weightRounded === null || zScore === null || percentile === null) return null
  return {
    version: INTERGROWTH2020_EFW_VERSION,
    formula: HADLOCK3_FORMULA_LABEL,
    medidasMm,
    ig,
    weightG,
    weightRounded,
    zScore,
    percentile,
  }
}

/** z da normal padrão para cada centil (qnorm); conferíveis por `standardNormalCdf`. */
export const INTERGROWTH_PREVIEW_CENTILES = [
  { label: 'P3', centile: 3, z: -1.8807936081512509 },
  { label: 'P10', centile: 10, z: -1.2815515655446004 },
  { label: 'P50', centile: 50, z: 0 },
  { label: 'P90', centile: 90, z: 1.2815515655446004 },
  { label: 'P97', centile: 97, z: 1.8807936081512509 },
] as const

export type IntergrowthCurvePoint = { gaDays: number; weightG: number }

export type IntergrowthCurve = {
  label: (typeof INTERGROWTH_PREVIEW_CENTILES)[number]['label']
  centile: number
  z: number
  points: IntergrowthCurvePoint[]
}

/** Curvas P3..P97 de 126 a 280 dias pelo quantil do motor; o último dia é sempre incluído. */
export function intergrowthPreviewCurves(stepDays = 1): IntergrowthCurve[] {
  if (!Number.isInteger(stepDays) || stepDays < 1) return []
  const dias: number[] = []
  for (let d = INTERGROWTH2020_EFW_MIN_GA_DAYS; d <= INTERGROWTH2020_EFW_MAX_GA_DAYS; d += stepDays) dias.push(d)
  if (dias[dias.length - 1] !== INTERGROWTH2020_EFW_MAX_GA_DAYS) dias.push(INTERGROWTH2020_EFW_MAX_GA_DAYS)
  return INTERGROWTH_PREVIEW_CENTILES.map(({ label, centile, z }) => {
    const points: IntergrowthCurvePoint[] = []
    for (const gaDays of dias) {
      const weightG = intergrowth2020EfwQuantile(z, gaDays)
      if (weightG !== null) points.push({ gaDays, weightG })
    }
    return { label, centile, z, points }
  })
}

/** Percentil com 1 decimal (vírgula); extremos viram "< 0,1" / "> 99,9", nunca 0 ou 100. */
export function formatarPercentilIntergrowth(percentile: number): string | null {
  if (typeof percentile !== 'number' || !Number.isFinite(percentile) || percentile < 0 || percentile > 100) return null
  if (percentile < 0.1) return '< 0,1'
  if (percentile > 99.9) return '> 99,9'
  return percentile.toFixed(1).replace('.', ',')
}

/** "24+3 semanas (171 dias)". */
export function formatarIgBiometria(ig: IgBiometria): string {
  return `${ig.semanas}+${ig.dias} semanas (${ig.gaDays} dias)`
}
