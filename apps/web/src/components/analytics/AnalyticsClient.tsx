'use client'

import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import AssertivityTable from './AssertivityTable'
import CategoryBarChart from './CategoryBarChart'
import DailyCalendar from './DailyCalendar'
import PathologyList from './PathologyList'
import StatsCards from './StatsCards'
import VolumeLineChart from './VolumeLineChart'
import type { AnalyticsReport, AnalyticsTotals, PeriodFilter } from './types'

export default function AnalyticsClient({ reports, totals }: { reports: AnalyticsReport[]; totals: AnalyticsTotals }) {
  const [barPeriod, setBarPeriod] = useState<PeriodFilter>('all')
  const [linePeriod, setLinePeriod] = useState<PeriodFilter>('30d')

  if (reports.length === 0) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <h1 className="mb-6 text-lg font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
            <BarChart2 className="h-7 w-7 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum dado ainda</p>
          <p className="max-w-xs text-xs text-gray-400 dark:text-gray-500">
            Gere ou salve seu primeiro laudo para ver as métricas aparecerem aqui.
          </p>
        </div>
      </div>
    )
  }

  return (
    /*
      A LARGURA É USADA. Em `max-w-4xl` a página era uma coluna comprida: o
      médico rolava por gráfico depois de gráfico numa tela de 27 polegadas com
      dois terços vazios dos lados. Analytics é para comparar — e comparar exige
      ver duas coisas ao mesmo tempo.
    */
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Somando laudos com IA e laudos determinísticos da web.</p>
        {totals.totalReports > totals.sampleSize ? (
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Totais são exatos; gráficos usam os últimos {totals.sampleLimit} laudos por fonte.
          </p>
        ) : null}
      </div>

      <StatsCards reports={reports} totals={totals} />
      <DailyCalendar reports={reports} />

      <div className="grid gap-4 md:grid-cols-2">
        <CategoryBarChart reports={reports} period={barPeriod} onPeriodChange={setBarPeriod} />
        <VolumeLineChart reports={reports} period={linePeriod} onPeriodChange={setLinePeriod} />
      </div>

      {/*
        Assertividade e patologias lado a lado a partir de `xl`. Abaixo disso
        empilham: as duas são tabelas, e tabela espremida deixa de ser legível
        antes de deixar de caber.
      */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <AssertivityTable reports={reports} />
        <PathologyList reports={reports} />
      </div>
    </div>
  )
}
