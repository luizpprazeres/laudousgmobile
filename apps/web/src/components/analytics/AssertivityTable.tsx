'use client'

import { categoryLabel, type AnalyticsReport } from './types'

export default function AssertivityTable({ reports }: { reports: AnalyticsReport[] }) {
  const iaReports = reports.filter((report) => report.origin === 'ia')
  const evaluated = iaReports.filter((report) => report.feedback != null)

  if (evaluated.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Assertividade por categoria</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">somente laudos com IA</p>
        <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Avalie seus laudos com IA para ver esta métrica.
        </p>
      </div>
    )
  }

  const byCategory: Record<string, { positive: number; total: number }> = {}
  for (const report of evaluated) {
    byCategory[report.category_code] ??= { positive: 0, total: 0 }
    byCategory[report.category_code].total += 1
    if (report.feedback === 'positive') byCategory[report.category_code].positive += 1
  }

  const rows = Object.entries(byCategory)
    .map(([category, stats]) => ({
      category,
      label: categoryLabel(category),
      total: stats.total,
      positive: stats.positive,
      negative: stats.total - stats.positive,
      pct: Math.round((stats.positive / stats.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Assertividade por categoria</p>
      <p className="mb-3 text-[10px] text-gray-400 dark:text-gray-500">somente laudos com IA</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 dark:border-gray-800 dark:text-gray-500">
              <th className="py-1.5 text-left font-medium">Categoria</th>
              <th className="w-16 py-1.5 text-right font-medium">Aval.</th>
              <th className="w-12 py-1.5 text-right font-medium">Pos.</th>
              <th className="w-12 py-1.5 text-right font-medium">Neg.</th>
              <th className="w-20 py-1.5 text-right font-medium">% acerto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category} className="border-b border-gray-50 last:border-0 dark:border-gray-800">
                <td className="max-w-[160px] truncate py-2 text-gray-700 dark:text-gray-300" title={row.label}>
                  {row.label}
                </td>
                <td className="py-2 text-right text-gray-500 dark:text-gray-400">{row.total}</td>
                <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">{row.positive}</td>
                <td className="py-2 text-right text-red-400 dark:text-red-300">{row.negative}</td>
                <td className="py-2 text-right">
                  {row.total < 5 ? (
                    <span className="text-amber-500 dark:text-amber-400">poucas</span>
                  ) : (
                    <span
                      className={
                        row.pct >= 80
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : row.pct >= 60
                            ? 'font-semibold text-amber-600 dark:text-amber-400'
                            : 'font-semibold text-red-500 dark:text-red-400'
                      }
                    >
                      {row.pct}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

