'use client'

import { PERIODS, type PeriodFilter } from './types'

export function PeriodTabs({
  period,
  onPeriodChange,
}: {
  period: PeriodFilter
  onPeriodChange: (period: PeriodFilter) => void
}) {
  return (
    <div className="flex gap-1">
      {PERIODS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onPeriodChange(item.value)}
          className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
            period === item.value
              ? 'bg-emerald-600 text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

