'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ArrowLeft, Check, Moon, Sun } from 'lucide-react'

/** Chave de localStorage das iniciais (lida pelo gerador). */
export const INITIALS_KEY = 'laudousg.initials'

export default function PreferenciasPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [initials, setInitials] = useState('')
  const [savedInitials, setSavedInitials] = useState(false)

  useEffect(() => {
    setMounted(true)
    setInitials((localStorage.getItem(INITIALS_KEY) ?? 'ha').toLowerCase())
  }, [])

  const saveInitials = () => {
    const clean = initials.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 4)
    localStorage.setItem(INITIALS_KEY, clean)
    setInitials(clean)
    setSavedInitials(true)
    setTimeout(() => setSavedInitials(false), 1800)
  }

  const dark = mounted && theme === 'dark'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-2xl">
        <Link href="/app" className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="mb-6 font-barlow text-2xl font-bold text-gray-900 dark:text-gray-100">Preferências</h1>

        <div className="space-y-4">
          {/* Tema */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Tema</h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Aparência da interface.</p>
            <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${!dark ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <Sun className="h-4 w-4" /> Claro
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${dark ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <Moon className="h-4 w-4" /> Escuro
              </button>
            </div>
          </section>

          {/* Iniciais */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Iniciais da digitadora</h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Aparecem discretamente no fim do laudo (ex.: <span className="font-mono">/ha</span>). Use o toggle “iniciais” no preview para ligar/desligar por laudo.</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-gray-400">/</span>
              <input
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                maxLength={4}
                placeholder="ha"
                className="w-24 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm lowercase text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={saveInitials}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900"
              >
                {savedInitials ? <Check className="h-4 w-4" /> : null}
                {savedInitials ? 'Salvo' : 'Salvar'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
