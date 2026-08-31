'use client'

import { useEffect, useMemo, useState } from 'react'

type Preference = { category_code: string; default_variant_id: string | null }
type Variant = { id: string; category_code: string; variant_key: string; name: string }
type Payload = { preferences?: Preference[]; available_variants?: Variant[] }

export function ModelosPreferidos() {
  const [data, setData] = useState<Payload>({})
  const [message, setMessage] = useState('')
  useEffect(() => { void fetch('/api/preferencias-laudo', { cache: 'no-store' }).then(async (r) => { const b = await r.json(); if (r.ok) setData(b); else setMessage(b.error ?? 'Preferências indisponíveis.') }) }, [])
  const grouped = useMemo(() => {
    const byCategory = (data.available_variants ?? []).reduce<Record<string, Variant[]>>((result, item) => {
      ;(result[item.category_code] ??= []).push(item)
      return result
    }, {})
    return Object.entries(byCategory)
  }, [data.available_variants])
  if (!grouped.length && !message) return null

  async function update(category: string, id: string) {
    setMessage('Salvando…')
    const r = await fetch('/api/preferencias-laudo', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category_code: category, default_variant_id: id || null }) })
    if (!r.ok) return setMessage('Não foi possível salvar esta preferência.')
    setData((current) => ({ ...current, preferences: [...(current.preferences ?? []).filter((p) => p.category_code !== category), { category_code: category, default_variant_id: id || null }] }))
    setMessage('Preferência sincronizada com os aplicativos.')
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-barlow text-lg font-bold text-gray-900 dark:text-gray-100">Modelo preferido por exame</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Quando uma categoria oferecer mais de uma apresentação validada, sua escolha vale também no celular.</p>
      <div className="mt-4 space-y-3">{grouped.map(([category, variants]) => <label key={category} className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{category.replaceAll('_', ' ')}<select value={data.preferences?.find((p) => p.category_code === category)?.default_variant_id ?? ''} onChange={(e) => void update(category, e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal dark:border-gray-700 dark:bg-gray-950"><option value="">Padrão da categoria</option>{variants?.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>)}</div>
      {message ? <p className="mt-3 text-xs text-gray-500 dark:text-gray-400" role="status">{message}</p> : null}
    </section>
  )
}
