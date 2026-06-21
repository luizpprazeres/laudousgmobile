'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { filterByPeriod, type AnalyticsReport, type PeriodFilter } from './types'
import { PeriodTabs } from './PeriodTabs'

function bucketStart(date: Date, granularity: 'day' | 'week' | 'month') {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  if (granularity === 'week') {
    value.setDate(value.getDate() - value.getDay())
  }
  if (granularity === 'month') {
    value.setDate(1)
  }
  return value
}

function bucketLabel(date: Date, granularity: 'day' | 'week' | 'month') {
  if (granularity === 'month') return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function buildChartData(reports: AnalyticsReport[], period: PeriodFilter) {
  const granularity = period === 'all' ? 'month' : period === '90d' ? 'week' : 'day'
  const buckets = new Map<number, { date: string; ia: number; web: number }>()

  for (const report of filterByPeriod(reports, period)) {
    const date = bucketStart(new Date(report.created_at), granularity)
    const key = date.getTime()
    const entry = buckets.get(key) ?? { date: bucketLabel(date, granularity), ia: 0, web: 0 }
    entry[report.origin] += 1
    buckets.set(key, entry)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, value]) => ({ ...value, total: value.ia + value.web }))
}

export default function VolumeLineChart({
  reports,
  period,
  onPeriodChange,
}: {
  reports: AnalyticsReport[]
  period: PeriodFilter
  onPeriodChange: (period: PeriodFilter) => void
}) {
  const data = buildChartData(reports, period)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Evolução temporal</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">IA + determinístico</p>
        </div>
        <PeriodTabs period={period} onPeriodChange={onPeriodChange} />
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">Nenhum laudo no período selecionado.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={24} />
            <Tooltip
              formatter={(value, name) => [
                value,
                name === 'ia' ? 'IA' : name === 'web' ? 'Determinístico' : 'Total',
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="ia" stroke="#7c3aed" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="web" stroke="#10b981" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

