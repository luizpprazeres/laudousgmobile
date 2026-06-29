'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { extractPathologies } from '@/lib/analytics/pathologyExtractor'
import { categoryLabel, type AnalyticsReport } from './types'

export default function PathologyList({ reports }: { reports: AnalyticsReport[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const categoryCounts: Record<string, number> = {}
  for (const report of reports) {
    categoryCounts[report.category_code] = (categoryCounts[report.category_code] ?? 0) + 1
  }

  const eligibleCategories = Object.entries(categoryCounts)
    .filter(([, count]) => count >= 10)
    .map(([category]) => category)
  const eligibleReports = reports.filter((report) => eligibleCategories.includes(report.category_code))
  const pathologies = extractPathologies(eligibleReports)
  const categories = Object.keys(pathologies)

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Patologias mais frequentes</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">IA + determinístico</p>
        <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Disponível após 10 laudos por categoria.
        </p>
      </div>
    )
  }

  const toggle = (category: string) => {
    setExpanded((previous) => {
      const next = new Set(previous)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Patologias mais frequentes</p>
      <p className="mb-3 text-[10px] text-gray-400 dark:text-gray-500">IA + determinístico</p>
      <div className="space-y-1">
        {categories.map((category) => {
          const items = pathologies[category] ?? []
          const isOpen = expanded.has(category)
          const total = categoryCounts[category] ?? 0

          return (
            <div key={category} className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => toggle(category)}
                className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  )}
                  <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{categoryLabel(category)}</span>
                </div>
                <span className="ml-2 flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">{total} laudos</span>
              </button>

              {isOpen ? (
                <div className="space-y-1.5 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum padrão detectado ainda.</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-300">{item.name}</span>
                        <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, (item.count / total) * 100 * 3)}%` }}
                            />
                          </div>
                          <span className="w-4 text-right text-[10px] text-gray-400 dark:text-gray-500">{item.count}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

