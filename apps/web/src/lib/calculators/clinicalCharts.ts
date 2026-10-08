import {
  calcularDopplerParcial, calcularPreEclampsiaFmf, calcularTrissomias,
  DOPPLER_BARCELONA_ENGINE_VERSION, PE_VERSAO_PARAMETROS,
  FMF_TRISOMY_MODEL_VERSION, FMF_TRISOMY_PARAMETER_FINGERPRINT,
  referenciaDopplerBarcelona,
  type DopplerPartialInput, type DopplerChartVessel,
  type PeGestante, type PeMedidas, type FmfInput,
} from '@laudousg/shared'
import type { PeWebCalculo } from './preEclampsia'
import type { TrisomyWebCalculation } from './trisomyFmf'

export const CLINICAL_CHART_FORMAT = 'obstetric-clinical-charts/v1' as const
export const DOPPLER_CHART_VESSELS: DopplerChartVessel[] = [
  'arteriasUterinas', 'arteriaUmbilical', 'arteriaCerebralMedia', 'ratioCerebroplacentario',
]
export type ChartDopplerInput = DopplerPartialInput & { suppressRcp?: true }
export type ClinicalCharts = {
  doppler?: ChartDopplerInput
  pe?: PeWebCalculo
  trisomy?: TrisomyWebCalculation
}
export type StoredClinicalCharts = {
  format: typeof CLINICAL_CHART_FORMAT
  doppler?: { version: string; input: ChartDopplerInput }
  pe?: { version: string; gestante: PeGestante; medidas: PeMedidas }
  trisomy?: { version: string; fingerprint: string; input: FmfInput }
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const strictNumber = (value: unknown): number | undefined => {
  const text = String(value ?? '').trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) return undefined
  const number = Number(text.replace(',', '.'))
  return Number.isFinite(number) ? number : undefined
}
const validIp = (value: unknown) => {
  const number = strictNumber(value)
  return number !== undefined && number > 0.1 && number <= 10 ? number : undefined
}

/** A página usa o mesmo estado visível; um add-on desligado não fornece medidas. */
export function dopplerChartInput(category: string, examState: unknown): ChartDopplerInput | undefined {
  if (!['MORFOLOGICO', 'MORFOLOGICO_1T', 'MORFOLOGICO_2T', 'MORFOLOGICO_3T', 'DOPPLER_OBSTETRICO'].includes(category)) return undefined
  const state = record(examState), d = record(state.doppler), ig = record(state.ig)
  const standalone = category === 'DOPPLER_OBSTETRICO'
  if (!standalone && d.realizado !== 'sim') return undefined
  const weeks = strictNumber(ig.bio_sem), days = strictNumber(ig.bio_dias)
  // Dias ausentes não significam zero para a figura.
  if (weeks === undefined || days === undefined || !Number.isInteger(weeks) || !Number.isInteger(days) || days > 6) return undefined
  const key = (name: string) => standalone ? name : `realizado.sim.${name}`
  const right = validIp(d[key('ip_ut_dir')]), left = validIp(d[key('ip_ut_esq')])
  // Uma medida inválida não pode ser disfarçada pela média das duas.
  const mean = right !== undefined && left !== undefined
    ? Math.round((right + left) / 2 * 1000) / 1000
    : right === undefined && left === undefined && !String(d[key('ip_ut_dir')] ?? '').trim() && !String(d[key('ip_ut_esq')] ?? '').trim()
      ? validIp(d[key('ip_ut_medio')]) : undefined
  const input: ChartDopplerInput = {
    weeks, days, ipMedioUterinas: mean,
    ipUmbilical: validIp(d[key('ip_umb')]), ipMCA: validIp(d[key('ip_acm')]),
  }
  // RCP digitada prevalece no laudo. Não desenhar outro valor como se fosse o mesmo.
  // Compatibilidade numérica de duas casas decimais; não é um corte clínico.
  const manualRcp = String(d[key('rcp')] ?? '').trim()
  if (manualRcp) {
    const computed = calcularDopplerParcial(input).ratioCerebroplacentario?.ip
    const manual = strictNumber(manualRcp)
    if (manual === undefined || computed === undefined || Math.abs(manual - computed) > 0.005) {
      // Os IP individuais continuam válidos; apenas o gráfico RCP fica indisponível.
      input.suppressRcp = true
      return hasDoppler(input) ? input : undefined
    }
  }
  return hasDoppler(input) ? input : undefined
}
export function hasDoppler(input: ChartDopplerInput): boolean {
  for (const key of ['ipMedioUterinas', 'ipUmbilical', 'ipMCA', 'ipUterinaDireita', 'ipUterinaEsquerda'] as const) {
    const value = input[key]
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0.1 || value > 10)) return false
  }
  if (input.suppressRcp !== undefined && input.suppressRcp !== true) return false
  if (!Number.isInteger(input.weeks) || !Number.isInteger(input.days) || input.days < 0 || input.days > 6) return false
  const result = calcularDopplerParcial(input)
  return DOPPLER_CHART_VESSELS.some(v => result[v] && Number.isFinite(result[v]!.zscore))
}

/** Amostras por semana; limites definidos no shared, sem extrapolação. */
export function dopplerReferenceCurve(vessel: DopplerChartVessel) {
  const start = vessel === 'arteriasUterinas' ? 11 : 20
  return Array.from({ length: (44 - start) * 7 + 7 }, (_, offset) => {
    const gaDays = start * 7 + offset
    const ref = referenciaDopplerBarcelona(vessel, Math.floor(gaDays / 7), gaDays % 7)
    return ref ? { ga: gaDays / 7, ...ref } : null
  }).filter((point): point is NonNullable<typeof point> => point !== null)
}

export function hasClinicalCharts(charts: ClinicalCharts): boolean {
  return Boolean(charts.doppler && hasDoppler(charts.doppler) || charts.pe || charts.trisomy)
}

/** Só dados numéricos de cálculo, sem nome/data de nascimento; versões congeladas. */
export function storeClinicalCharts(charts: ClinicalCharts): StoredClinicalCharts | null {
  if (!hasClinicalCharts(charts)) return null
  return {
    format: CLINICAL_CHART_FORMAT,
    ...(charts.doppler && hasDoppler(charts.doppler) ? { doppler: { version: DOPPLER_BARCELONA_ENGINE_VERSION, input: charts.doppler } } : {}),
    ...(charts.pe ? { pe: { version: PE_VERSAO_PARAMETROS, gestante: charts.pe.gestante, medidas: charts.pe.medidas } } : {}),
    ...(charts.trisomy ? { trisomy: { version: FMF_TRISOMY_MODEL_VERSION, fingerprint: FMF_TRISOMY_PARAMETER_FINGERPRINT, input: charts.trisomy.input } } : {}),
  }
}

function validPeSource(g: PeGestante, m: PeMedidas): boolean {
  if (!g || !m || !Number.isInteger(g.gaDias) ||
      !['branca', 'afro', 'sul-asiatica', 'leste-asiatica', 'mista'].includes(g.etnia) ||
      !['nulipara', 'multipara-sem-pe', 'multipara-com-pe'].includes(g.paridade)) return false
  for (const key of ['histFamiliarPE', 'fiv', 'hipertensaoCronica', 'diabetes', 'lesSaf', 'fumante'] as const) {
    if (typeof g[key] !== 'boolean') return false
  }
  if (g.diabetesTipo1 !== undefined && typeof g.diabetesTipo1 !== 'boolean') return false
  if (m.pamMmHg != null && (!Number.isInteger(m.afericoesPam) || m.afericoesPam! < 1 || m.afericoesPam! > 4)) return false
  return true
}
function validTrisomySource(input: FmfInput): boolean {
  if (!input) return false
  for (const key of ['maternalAge', 'crl', 'nt', 'fhr', 'gaDaysDated', 'freeBetaHcgMoM', 'pappaMoM', 'dvPI', 'weight'] as const) {
    const value = input[key]
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) return false
  }
  for (const key of ['tricuspidRegurgitation', 'nasalBoneAbsent', 'smoking', 'previousT21', 'previousT18', 'previousT13'] as const) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') return false
  }
  if (input.ethnicity !== undefined && !['white', 'black', 'south_asian', 'east_asian', 'mixed'].includes(input.ethnicity)) return false
  return input.isMoMCorrected === undefined || input.isMoMCorrected === true
}

/** Cada bloco falha fechado de forma independente, sem apagar os outros. */
export function restoreClinicalCharts(value: unknown): ClinicalCharts {
  const stored = record(value)
  if (stored.format !== CLINICAL_CHART_FORMAT) return {}
  const charts: ClinicalCharts = {}
  const doppler = record(stored.doppler), pe = record(stored.pe), trisomy = record(stored.trisomy)
  if (doppler.version === DOPPLER_BARCELONA_ENGINE_VERSION) {
    const input = record(doppler.input) as unknown as ChartDopplerInput
    if (hasDoppler(input)) charts.doppler = input
  }
  if (pe.version === PE_VERSAO_PARAMETROS) {
    try {
      const gestante = pe.gestante as PeGestante, medidas = pe.medidas as PeMedidas
      if (!validPeSource(gestante, medidas)) throw new Error('Invalid PE source')
      const resultado = calcularPreEclampsiaFmf(gestante, medidas)
      if (Object.values(resultado.riscos).every(p => Number.isFinite(p) && p >= 0 && p <= 1)) charts.pe = { gestante, medidas, resultado }
    } catch { /* Invalid saved data is not a figure. */ }
  }
  if (trisomy.version === FMF_TRISOMY_MODEL_VERSION && trisomy.fingerprint === FMF_TRISOMY_PARAMETER_FINGERPRINT) {
    try {
      const input = trisomy.input as FmfInput
      if (!validTrisomySource(input)) throw new Error('Invalid trisomy source')
      const result = calcularTrissomias(input)
      charts.trisomy = { input, result, block: '' }
    } catch { /* Invalid saved data is not a figure. */ }
  }
  return charts
}
export function extractClinicalCharts(examState: unknown): ClinicalCharts {
  const state = record(examState), chart = record(state.__clinical_charts)
  return chart.incluir === 'sim' ? restoreClinicalCharts(chart.figure) : {}
}

/** Um descritor salvo perde validade ao mudar a origem, inclusive por reset/companion. */
export function invalidateClinicalCharts<T extends Record<string, unknown>>(previous: T | undefined, next: T): T {
  const source = (state: Record<string, unknown> | undefined) => JSON.stringify([
    state?.ig, state?.doppler, state?.primeiro_trimestre, state?.__opts,
  ])
  if (source(previous) === source(next)) return next
  return clearClinicalChartFigure(next)
}
export function clearClinicalChartFigure<T extends Record<string, unknown>>(state: T): T {
  const chart = record(state.__clinical_charts)
  if (!Object.prototype.hasOwnProperty.call(chart, 'figure')) return state
  const { figure: _figure, ...rest } = chart
  return { ...state, __clinical_charts: rest }
}
export function attachClinicalCharts(examState: Record<string, unknown>, charts: ClinicalCharts): Record<string, unknown> {
  const chart = record(examState.__clinical_charts)
  const figure = chart.incluir === 'sim' ? storeClinicalCharts(charts) : null
  const { figure: _figure, ...rest } = chart
  return { ...examState, __clinical_charts: { ...rest, ...(figure ? { figure } : {}) } }
}
