'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function Tema() {
  const { theme, setTheme } = useTheme()
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])
  const escuro = montado && theme === 'dark'

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Tema</h2>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Aparência da interface.</p>
      <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${!escuro ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}
        >
          <Sun className="h-4 w-4" /> Claro
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${escuro ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}
        >
          <Moon className="h-4 w-4" /> Escuro
        </button>
      </div>
    </section>
  )
}
