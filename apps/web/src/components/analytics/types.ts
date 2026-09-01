export type ReportOrigin = 'ia' | 'web'
export type PeriodFilter = '7d' | '30d' | '90d' | 'all'
export type FeedbackValue = 'positive' | 'negative'

export type AnalyticsReport = {
  id: string
  origin: ReportOrigin
  category_code: string
  created_at: string
  output_text: string
  title?: string | null
  feedback?: FeedbackValue | null
  generation_ms?: number | null
}

export type AnalyticsTotals = {
  totalReports: number
  totalIa: number
  totalWeb: number
  thisMonthReports: number
  sampleSize: number
  sampleLimit: number
}

export function canonicalCategory(code: string) {
  if (code === 'MUSCULOESQUELETICO_V2') return 'MUSCULOESQUELETICO'
  return code
}

export const CATEGORY_LABELS: Record<string, string> = {
  ABDOMEN_TOTAL: 'Abdome total',
  ABDOME_SUPERIOR: 'Abdome superior',
  PROSTATA_SUPRAPUBICA: 'Próstata',
  PROSTATA_TRANSRETAL: 'Próstata transretal',
  VIAS_URINARIAS: 'Vias urinárias',
  MAMARIA: 'Mamas e axilas',
  PELVE_FEMININA: 'Pelve feminina',
  CERVICAL: 'Cervical',
  PARTES_MOLES: 'Partes moles',
  TIREOIDE: 'Tireoide',
  MUSCULOESQUELETICO: 'Musculoesquelético',
  MUSCULOESQUELETICO_V2: 'Musculoesquelético',
  OBSTETRICA: 'Obstétrica',
  MORFOLOGICO: 'Morfológica',
  DOPPLER: 'Doppler',
  DOPPLER_OBSTETRICO: 'Doppler obstétrico',
  DOPPLER_CAROTIDAS: 'Doppler carótidas',
  DOPPLER_FISTULA_AV: 'Doppler fístula AV',
}

export const SHORT_CATEGORY_LABELS: Record<string, string> = {
  ABDOMEN_TOTAL: 'Abdome',
  ABDOME_SUPERIOR: 'Abd. sup.',
  PROSTATA_SUPRAPUBICA: 'Próstata',
  PROSTATA_TRANSRETAL: 'Próst. TR',
  VIAS_URINARIAS: 'Vias Ur.',
  MAMARIA: 'Mamas e axilas',
  PELVE_FEMININA: 'Pelve',
  CERVICAL: 'Cervical',
  PARTES_MOLES: 'Partes',
  TIREOIDE: 'Tireoide',
  MUSCULOESQUELETICO: 'Musc.',
  MUSCULOESQUELETICO_V2: 'Musc.',
  OBSTETRICA: 'Obstet.',
  MORFOLOGICO: 'Morfol.',
  DOPPLER: 'Doppler',
  DOPPLER_OBSTETRICO: 'Dopp. Obs.',
  DOPPLER_CAROTIDAS: 'Carótidas',
  DOPPLER_FISTULA_AV: 'Fístula AV',
}

export const PERIODS: { label: string; value: PeriodFilter }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
  { label: 'Total', value: 'all' },
]

export function categoryLabel(code: string) {
  return CATEGORY_LABELS[code] ?? code
}

export function shortCategoryLabel(code: string) {
  return SHORT_CATEGORY_LABELS[code] ?? CATEGORY_LABELS[code] ?? code
}

export function filterByPeriod(reports: AnalyticsReport[], period: PeriodFilter) {
  if (period === 'all') return reports
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return reports.filter((report) => new Date(report.created_at) >= cutoff)
}
