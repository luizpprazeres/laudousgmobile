'use client'

import {
  BarChart3,
  BookOpen,
  FileText,
  HelpCircle,
  History,
  LogOut,
  Moon,
  PanelLeft,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'

const ITEMS = [
  { label: 'Laudar', icon: FileText, active: true },
  { label: 'Modelos', icon: PanelLeft },
  { label: 'Histórico', icon: History, badge: '927' },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Biblioteca', icon: BookOpen },
  { label: 'Segurança', icon: ShieldCheck },
  { label: 'Preferências', icon: SlidersHorizontal },
]

const FOOTER_ITEMS = [
  { label: 'Guia rápido', icon: HelpCircle },
  { label: 'Tema', icon: Moon },
  { label: 'Sair', icon: LogOut },
]

export function LaudarRail() {
  const renderItem = ({ label, icon: Icon, active, badge }: typeof ITEMS[number]) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      className={`grid h-11 w-[220px] grid-cols-[64px_1fr_auto] items-center border-l-4 text-sm transition ${
        active
          ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-800'
          : 'border-transparent text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="flex h-11 w-16 items-center justify-center">
        <Icon className={`h-[18px] w-[18px] ${active ? 'text-emerald-700' : 'text-gray-400'}`} />
      </span>
      <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">{label}</span>
      {badge ? (
        <span className="mr-3 rounded-full border border-gray-200 bg-white px-2 py-0.5 font-mono text-[10px] text-gray-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {badge}
        </span>
      ) : null}
    </button>
  )

  return (
    <aside className="group absolute inset-y-0 left-0 z-30 flex w-16 flex-col overflow-hidden border-r border-gray-200 bg-gray-50 py-3 shadow-none transition-[width,box-shadow] duration-300 hover:w-[220px] hover:shadow-2xl">
      <div className="mb-2 flex h-12 w-16 items-center justify-center">
        <Sparkles className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="flex-1">{ITEMS.map(renderItem)}</div>
      <div className="border-t border-gray-200 pt-3">{FOOTER_ITEMS.map(renderItem)}</div>
    </aside>
  )
}
