'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { idDeEstiloValido, WRITING_STYLE_IDS, type WritingStyleId } from '@/lib/perfil/estilos'

const OPTIONS = [
  { id: WRITING_STYLE_IDS.CLASSICO_COMPLETO, title: 'Clássico', description: 'Redação mais detalhada, no estilo tradicional do LaudoUSG.' },
  { id: WRITING_STYLE_IDS.OBJETIVO, title: 'Objetivo', description: 'Texto mais direto, com estrutura enxuta e leitura rápida.' },
] as const

export function EstiloDeEscrita({ initial }: { initial: string | null }) {
  const [selected, setSelected] = useState(
    idDeEstiloValido(initial) ? initial : WRITING_STYLE_IDS.CLASSICO_COMPLETO,
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function choose(id: WritingStyleId) {
    if (saving || id === selected) return
    const previous = selected
    setSelected(id)
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ default_writing_style_id: id }),
      })
      if (!response.ok) throw new Error('falha ao salvar estilo')
      setMessage('Estilo sincronizado. Novos laudos usarão esta redação.')
    } catch {
      setSelected(previous)
      setMessage('Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-barlow text-lg font-bold text-gray-900 dark:text-gray-100">Estilo de escrita</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">A escolha fica sincronizada entre a web, o iPhone e o Android.</p>
      <div className="mt-4 grid gap-2">
        {OPTIONS.map((option) => {
          const active = selected === option.id
          return (
            <button key={option.id} type="button" disabled={saving} onClick={() => void choose(option.id)} className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${active ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/25' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}>
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>{active ? <Check className="h-3 w-3" /> : null}</span>
              <span><strong className="block text-sm text-gray-800 dark:text-gray-200">{option.title}</strong><span className="mt-0.5 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">{option.description}</span></span>
            </button>
          )
        })}
      </div>
      {saving ? <p className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</p> : message ? <p className={`mt-3 text-xs ${message.startsWith('Não') ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`} role="status">{message}</p> : null}
    </section>
  )
}
