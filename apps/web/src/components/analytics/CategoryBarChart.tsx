'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { filterByPeriod, shortCategoryLabel, type AnalyticsReport, type PeriodFilter } from './types'
import { PeriodTabs } from './PeriodTabs'

export default function CategoryBarChart({
  reports,
  period,
  onPeriodChange,
}: {
  reports: AnalyticsReport[]
  period: PeriodFilter
  onPeriodChange: (period: PeriodFilter) => void
}) {
  const filtered = filterByPeriod(reports, period)
  const seenCategories = [...new Set(reports.map((report) => report.category_code))]
  const data = seenCategories
    .map((category) => {
      const categoryReports = filtered.filter((report) => report.category_code === category)
      return {
        category,
        name: shortCategoryLabel(category),
        ia: categoryReports.filter((report) => report.origin === 'ia').length,
        web: categoryReports.filter((report) => report.origin === 'web').length,
      }
    })
    .map((row) => ({ ...row, total: row.ia + row.web }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Laudos por categoria</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">IA + determinístico</p>
        </div>
        <PeriodTabs period={period} onPeriodChange={onPeriodChange} />
      </div>

      {data.every((row) => row.total === 0) ? (
        <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">Nenhum laudo no período selecionado.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36 + 20)}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={76}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => [value, name === 'ia' ? 'IA' : 'Determinístico']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="ia" stackId="reports" fill="#7c3aed" radius={[0, 0, 0, 0]} />
            <Bar dataKey="web" stackId="reports" fill="#059669" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

