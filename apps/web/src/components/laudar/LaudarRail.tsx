'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  BarChart3,
  BookOpen,
  FileText,
  HelpCircle,
  History,
  LogOut,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from 'lucide-react'

type IconType = React.ComponentType<{ className?: string }>
type NavItem = { label: string; icon: IconType; href?: string; soon?: boolean }

// Itens com `href` navegam; com `soon` ficam desabilitados ("em breve") até a
// feature existir. Tema e Sair são tratados à parte (toggle de tema / signout).
const ITEMS: NavItem[] = [
  { label: 'Laudar', icon: FileText, href: '/app/gerar' },
  { label: 'Histórico', icon: History, href: '/app/historico' },
  { label: 'Analytics', icon: BarChart3, href: '/app/analytics' },
  { label: 'Biblioteca', icon: BookOpen, soon: true },
  { label: 'Segurança', icon: ShieldCheck, href: '/app/seguranca' },
  { label: 'Preferências', icon: SlidersHorizontal, href: '/app/preferencias' },
]

function rowClass(active: boolean, disabled: boolean) {
  const base = 'grid h-11 w-[220px] grid-cols-[64px_1fr_auto] items-center border-l-4 text-sm transition'
  if (active) return `${base} border-emerald-600 bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300`
  if (disabled) return `${base} cursor-default border-transparent text-gray-400 dark:text-gray-600`
  return `${base} border-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800`
}

function Row({ icon: Icon, label, active, disabled, soon }: { icon: IconType; label: string; active?: boolean; disabled?: boolean; soon?: boolean }) {
  const iconColor = active
    ? 'text-emerald-700 dark:text-emerald-400'
    : disabled
      ? 'text-gray-300 dark:text-gray-600'
      : 'text-gray-500 dark:text-gray-400'
  return (
    <>
      <span className="flex h-11 w-16 items-center justify-center">
        <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
      </span>
      <span className="truncate text-left opacity-0 transition-opacity duration-150 group-hover:opacity-100">{label}</span>
      {soon ? (
        <span className="mr-3 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-gray-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-800 dark:text-gray-500">
          em breve
        </span>
      ) : null}
    </>
  )
}

export function LaudarRail() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && theme === 'dark'

  const renderNav = (item: NavItem) => {
    if (item.soon) {
      return (
        <button key={item.label} type="button" disabled aria-label={`${item.label} (em breve)`} className={rowClass(false, true)}>
          <Row icon={item.icon} label={item.label} soon />
        </button>
      )
    }
    const active = pathname === item.href
    return (
      <Link key={item.label} href={item.href!} aria-label={item.label} className={rowClass(active, false)}>
        <Row icon={item.icon} label={item.label} active={active} />
      </Link>
    )
  }

  return (
    <aside className="group absolute inset-y-0 left-0 z-30 flex w-16 flex-col overflow-hidden border-r border-gray-200 bg-gray-50 py-3 shadow-none transition-[width,box-shadow] duration-300 hover:w-[220px] hover:shadow-2xl dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex h-12 w-16 items-center justify-center">
        <Sparkles className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="flex-1">{ITEMS.map(renderNav)}</div>
      <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
        <button type="button" disabled aria-label="Guia rápido (em breve)" className={rowClass(false, true)}>
          <Row icon={HelpCircle} label="Guia rápido" soon />
        </button>
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          className={rowClass(false, false)}
        >
          <Row icon={isDark ? Sun : Moon} label={isDark ? 'Tema claro' : 'Tema escuro'} />
        </button>
        <form action="/auth/signout" method="post">
          <button type="submit" aria-label="Sair" className={rowClass(false, false)}>
            <Row icon={LogOut} label="Sair" />
          </button>
        </form>
      </div>
    </aside>
  )
}
