'use client'

import { BarChart2, Clock, FileText, TrendingUp } from 'lucide-react'
import type { AnalyticsReport, AnalyticsTotals } from './types'

const MANUAL_MIN_PER_REPORT = 8

export default function StatsCards({ reports, totals }: { reports: AnalyticsReport[]; totals: AnalyticsTotals }) {
  const now = new Date()
  const iaReports = reports.filter((report) => report.origin === 'ia')

  const evaluated = iaReports.filter((report) => report.feedback != null)
  const positive = evaluated.filter((report) => report.feedback === 'positive')
  const assertivity = evaluated.length >= 5 ? Math.round((positive.length / evaluated.length) * 100) : null

  const estimatedSavedMinutes = totals.totalReports * MANUAL_MIN_PER_REPORT
  const savedHours = Math.floor(estimatedSavedMinutes / 60)
  const savedMins = Math.round(estimatedSavedMinutes % 60)

  const cards = [
    {
      label: 'Total de laudos',
      value: totals.totalReports.toString(),
      sub: `${totals.totalIa} IA + ${totals.totalWeb} determinísticos`,
      icon: FileText,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'Este mês',
      value: totals.thisMonthReports.toString(),
      sub: now.toLocaleString('pt-BR', { month: 'long' }),
      icon: BarChart2,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Assertividade',
      value: assertivity != null ? `${assertivity}%` : '-',
      sub:
        assertivity != null
          ? `${evaluated.length} laudos IA avaliados`
          : evaluated.length > 0
            ? `${evaluated.length} IA avaliados (mín. 5)`
            : 'somente laudos com IA',
      icon: TrendingUp,
      color:
        assertivity != null
          ? assertivity >= 80
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400'
          : 'text-gray-400 dark:text-gray-500',
      bg:
        assertivity != null
          ? assertivity >= 80
            ? 'bg-emerald-50 dark:bg-emerald-950/40'
            : 'bg-amber-50 dark:bg-amber-950/40'
          : 'bg-gray-50 dark:bg-gray-800',
    },
    {
      label: 'Tempo economizado (estimado)',
      value: savedHours > 0 ? `${savedHours}h ${savedMins}min` : `${Math.round(estimatedSavedMinutes)}min`,
      sub: `${MANUAL_MIN_PER_REPORT}min/laudo manual; sem cronometria`,
      icon: Clock,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <p className="mb-1 text-2xl font-bold leading-none text-gray-900 dark:text-gray-100">{card.value}</p>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{card.label}</p>
          <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
