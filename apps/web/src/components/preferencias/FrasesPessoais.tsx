'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'

type Phrase = { id: string; title: string; body: string; category_code: string | null; position: number }
type Draft = { title: string; body: string; category_code: string }

const EMPTY: Draft = { title: '', body: '', category_code: '' }
const CATEGORIES = [
  ['ABDOMEN_TOTAL', 'Abdome total'], ['OBSTETRICA', 'Obstétrica'], ['DOPPLER_OBSTETRICO', 'Doppler obstétrico'],
  ['MORFOLOGICO', 'Morfológica'], ['TIREOIDE', 'Tireoide'], ['MAMARIA', 'Mamas'], ['PELVE_FEMININA', 'Pelve feminina'],
  ['ABDOMEN_SUPERIOR', 'Abdome superior'], ['VIAS_URINARIAS', 'Vias urinárias'], ['PROSTATA_SUPRAPUBICA', 'Próstata'],
  ['CERVICAL', 'Cervical'], ['CERVICOMETRIA', 'Cervicometria'], ['PARTES_MOLES', 'Partes moles'], ['MUSCULOESQUELETICO', 'Musculoesquelético'],
] as const

export function FrasesPessoais() {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/frases', { cache: 'no-store' })
    const body = await r.json().catch(() => null)
    if (r.ok) setPhrases(body?.phrases ?? [])
    else setMessage(body?.error ?? 'Não foi possível carregar suas frases.')
  }, [])

  useEffect(() => { void load() }, [load])

  function start(phrase?: Phrase) {
    setEditing(phrase?.id ?? null)
    setDraft(phrase ? { title: phrase.title, body: phrase.body, category_code: phrase.category_code ?? '' } : EMPTY)
    setMessage('')
    setOpen(true)
  }

  async function save() {
    if (!draft.title.trim() || !draft.body.trim()) return setMessage('Preencha o título e a frase.')
    setBusy(true)
    const r = await fetch('/api/frases', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...(editing ? { id: editing } : {}), ...draft, category_code: draft.category_code || null }),
    })
    const body = await r.json().catch(() => null)
    setBusy(false)
    if (!r.ok) return setMessage(body?.error ?? 'Não foi possível salvar.')
    setOpen(false)
    setMessage('Frase salva. Ela já está disponível no celular e na Sala.')
    await load()
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir esta frase pessoal?')) return
    const r = await fetch(`/api/frases?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!r.ok) return setMessage('Não foi possível excluir a frase.')
    setMessage('Frase excluída.')
    await load()
  }

  const categoryName = (code: string | null) => CATEGORIES.find(([value]) => value === code)?.[1] ?? 'Todas as categorias'

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-barlow text-lg font-bold text-gray-900 dark:text-gray-100">Minhas frases</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Textos rápidos sincronizados com o iPhone, Android e a Sala.</p>
        </div>
        <button type="button" onClick={() => start()} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
          <Plus className="h-3.5 w-3.5" /> Nova frase
        </button>
      </div>

      {open ? (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/15">
          <div className="mb-3 flex items-center justify-between"><strong className="text-sm text-gray-800 dark:text-gray-200">{editing ? 'Editar frase' : 'Nova frase'}</strong><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X className="h-4 w-4 text-gray-400" /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Título<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-950" /></label>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Onde usar<select value={draft.category_code} onChange={(e) => setDraft({ ...draft, category_code: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-950"><option value="">Todas as categorias</option>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-gray-600 dark:text-gray-300">Texto<textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={4} maxLength={4000} className="mt-1 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal leading-relaxed outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-950" /></label>
          <button type="button" disabled={busy} onClick={() => void save()} className="mt-3 rounded-lg bg-gray-950 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-gray-950">{busy ? 'Salvando…' : 'Salvar frase'}</button>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {phrases.length === 0 ? <p className="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center text-xs text-gray-400 dark:border-gray-700">Você ainda não criou frases pessoais.</p> : phrases.map((phrase) => (
          <div key={phrase.id} className="group flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-3 dark:border-gray-800">
            <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{phrase.title}</div><div className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-gray-500 dark:text-gray-400">{phrase.body}</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{categoryName(phrase.category_code)}</div></div>
            <button type="button" aria-label="Editar frase" onClick={() => start(phrase)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"><Pencil className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Excluir frase" onClick={() => void remove(phrase.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      {message ? <p className="mt-3 text-xs text-gray-500 dark:text-gray-400" role="status">{message}</p> : null}
    </section>
  )
}
