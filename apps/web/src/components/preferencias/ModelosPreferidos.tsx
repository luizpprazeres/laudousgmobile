'use client'

import { useEffect, useMemo, useState } from 'react'
import { categoryDisplayLabel } from '@laudousg/shared'

type RendererPreferences = {
  show_domingos_score?: boolean
  show_conduct_recommendation?: boolean
}
type Preference = {
  category_code: string
  default_variant_id: string | null
  renderer_preferences?: RendererPreferences | null
}
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
  async function update(category: string, id: string) {
    setMessage('Salvando…')
    const r = await fetch('/api/preferencias-laudo', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category_code: category, default_variant_id: id || null }) })
    if (!r.ok) return setMessage('Não foi possível salvar esta preferência.')
    setData((current) => {
      const previous = current.preferences?.find((preference) => preference.category_code === category)
      return {
        ...current,
        preferences: [
          ...(current.preferences ?? []).filter((preference) => preference.category_code !== category),
          { ...previous, category_code: category, default_variant_id: id || null },
        ],
      }
    })
    setMessage('Preferência sincronizada com os aplicativos.')
  }

  async function updateRendererPreference(key: keyof RendererPreferences, value: boolean) {
    const category = 'TIREOIDE'
    setMessage('Salvando…')
    const r = await fetch('/api/preferencias-laudo', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category_code: category, renderer_preferences: { [key]: value } }),
    })
    if (!r.ok) return setMessage('Não foi possível salvar esta preferência.')
    setData((current) => {
      const previous = current.preferences?.find((preference) => preference.category_code === category)
      return {
        ...current,
        preferences: [
          ...(current.preferences ?? []).filter((preference) => preference.category_code !== category),
          {
            ...previous,
            category_code: category,
            default_variant_id: previous?.default_variant_id ?? null,
            renderer_preferences: { ...(previous?.renderer_preferences ?? {}), [key]: value },
          },
        ],
      }
    })
    setMessage('Preferência sincronizada com os aplicativos.')
  }

  const tireoide = data.preferences?.find((preference) => preference.category_code === 'TIREOIDE')
  const showDomingos = tireoide?.renderer_preferences?.show_domingos_score ?? true
  const showConduct = tireoide?.renderer_preferences?.show_conduct_recommendation ?? false

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-barlow text-lg font-bold text-gray-900 dark:text-gray-100">Modelo preferido por exame</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Quando uma categoria oferecer mais de uma apresentação validada, sua escolha vale também no celular.</p>
      <div className="mt-4 space-y-3">{grouped.map(([category, variants]) => <label key={category} className="block text-xs font-semibold text-gray-600 dark:text-gray-300">{categoryDisplayLabel(category)}<select value={data.preferences?.find((p) => p.category_code === category)?.default_variant_id ?? ''} onChange={(e) => void update(category, e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal dark:border-gray-700 dark:bg-gray-950"><option value="">Padrão da categoria</option>{variants?.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>)}</div>
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-950/40">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Tireoide</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">O ACR TI-RADS continua sempre disponível. Escolha os complementos que entram no laudo.</p>
        <label className="mt-3 flex cursor-pointer items-start justify-between gap-3">
          <span><span className="block text-xs font-semibold text-gray-700 dark:text-gray-200">Mostrar escore de Domingos</span><span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">Opcional e independente do ACR TI-RADS.</span></span>
          <input type="checkbox" checked={showDomingos} onChange={(event) => void updateRendererPreference('show_domingos_score', event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
        </label>
        <label className="mt-3 flex cursor-pointer items-start justify-between gap-3">
          <span><span className="block text-xs font-semibold text-gray-700 dark:text-gray-200">Incluir recomendação ACR TI-RADS</span><span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">Usa a categoria e a maior dimensão informada.</span></span>
          <input type="checkbox" checked={showConduct} onChange={(event) => void updateRendererPreference('show_conduct_recommendation', event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
        </label>
      </div>
      {message ? <p className="mt-3 text-xs text-gray-500 dark:text-gray-400" role="status">{message}</p> : null}
    </section>
  )
}
