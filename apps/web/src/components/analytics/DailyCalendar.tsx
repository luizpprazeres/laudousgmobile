'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { categoryLabel, type AnalyticsReport } from './types'

type DayData = {
  total: number
  breakdown: [string, number][]
  avgMinutes: number | null
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function computeDayAvgMinutes(dayReports: AnalyticsReport[]) {
  if (dayReports.length < 2) return null
  const sorted = [...dayReports].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const intervals: number[] = []
  for (let index = 1; index < sorted.length; index += 1) {
    const diff = (new Date(sorted[index].created_at).getTime() - new Date(sorted[index - 1].created_at).getTime()) / 60000
    if (diff <= 30) intervals.push(diff)
  }
  if (intervals.length === 0) return null
  return Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length)
}

function buildMonthData(reports: AnalyticsReport[], year: number, month: number) {
  const byDay = new Map<number, AnalyticsReport[]>()
  for (const report of reports) {
    const date = new Date(report.created_at)
    if (date.getFullYear() !== year || date.getMonth() !== month) continue
    const day = date.getDate()
    byDay.set(day, [...(byDay.get(day) ?? []), report])
  }

  const result = new Map<number, DayData>()
  for (const [day, dayReports] of byDay) {
    const categoryCounts = new Map<string, number>()
    for (const report of dayReports) {
      const label = categoryLabel(report.category_code)
      categoryCounts.set(label, (categoryCounts.get(label) ?? 0) + 1)
    }
    result.set(day, {
      total: dayReports.length,
      breakdown: [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]),
      avgMinutes: computeDayAvgMinutes(dayReports),
    })
  }
  return result
}

export default function DailyCalendar({ reports }: { reports: AnalyticsReport[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const monthData = useMemo(() => buildMonthData(reports, year, month), [reports, year, month])
  const monthLabel = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const startOffset = (firstDayOfWeek + 6) % 7
  const cells: Array<number | null> = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((value) => value - 1)
      return
    }
    setMonth((value) => value - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((value) => value + 1)
      return
    }
    setMonth((value) => value + 1)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize text-gray-700 dark:text-gray-200">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} className="h-16 rounded-lg bg-gray-50 dark:bg-gray-950" />
          const data = monthData.get(day)
          if (!data) {
            return (
              <div key={day} className="flex h-16 items-start justify-end rounded-lg bg-gray-50 p-1 dark:bg-gray-950">
                <span className="text-[10px] text-gray-300 dark:text-gray-600">{day}</span>
              </div>
            )
          }
          const topCategories = data.breakdown.slice(0, 2)
          return (
            <div
              key={day}
              className="flex h-16 flex-col justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 p-1.5 dark:border-emerald-900/50 dark:bg-emerald-950/30"
            >
              <div className="flex items-start justify-between">
                <span className="text-lg font-bold leading-none text-emerald-700 dark:text-emerald-300">{data.total}</span>
                <span className="text-[10px] leading-none text-gray-400 dark:text-gray-500">{day}</span>
              </div>
              <div className="space-y-0.5">
                {topCategories.length > 0 ? (
                  <p className="truncate text-[9px] leading-tight text-gray-500 dark:text-gray-400">
                    {topCategories.map(([label, count]) => `${count} ${label}`).join(' · ')}
                  </p>
                ) : null}
                {data.avgMinutes !== null ? (
                  <p className="text-[9px] leading-tight text-gray-400 dark:text-gray-500">~{data.avgMinutes} min</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

