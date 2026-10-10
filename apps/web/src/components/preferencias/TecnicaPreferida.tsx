'use client'

import { useEffect, useState } from 'react'
import { categoryDisplayLabel } from '@laudousg/shared'
import { TECNICA_PREFERIDA_MAX, fraseTecnica } from '@laudousg/schemes'
import { tecnicasDoCorpo } from '@/lib/preferencias/tecnicaPreferida'

/** Categorias com frase de técnica na tabela única (códigos do banco). */
const CATEGORIAS = [
  'OBSTETRICA', 'DOPPLER_OBSTETRICO', 'MORFOLOGICO', 'PELVE_FEMININA', 'CERVICOMETRIA', 'ABDOMEN_TOTAL',
  'ABDOMEN_SUPERIOR', 'VIAS_URINARIAS', 'PROSTATA_SUPRAPUBICA', 'TIREOIDE', 'MAMARIA', 'ESCROTAL', 'CERVICAL',
  'PAREDE_ABDOMINAL', 'MUSCULOESQUELETICO_V2',
] as const

/**
 * W15 — frase de técnica (COMENTÁRIOS) por exame, editável pelo médico (decisão do Luiz, 10/10).
 * Vale para a via padrão do exame; via ditada ou escolhida, complementos e documentação seguem a casa.
 */
export function TecnicaPreferida() {
  const [categoria, setCategoria] = useState<string>(CATEGORIAS[0])
  const [salvas, setSalvas] = useState<Record<string, string>>({})
  const [texto, setTexto] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void fetch('/api/preferencias-laudo', { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((body) => setSalvas(tecnicasDoCorpo(body)))
      .catch(() => setMessage('Preferências indisponíveis.'))
  }, [])
  useEffect(() => { setTexto(salvas[categoria] ?? fraseTecnica(categoria) ?? '') }, [categoria, salvas])

  const padrao = fraseTecnica(categoria) ?? ''
  const personalizada = Boolean(salvas[categoria])

  async function salvar(valor: string | null) {
    setMessage('Salvando…')
    const r = await fetch('/api/preferencias-laudo', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ category_code: categoria, renderer_preferences: { tecnica_padrao: valor } }),
    })
    if (!r.ok) return setMessage('Não foi possível salvar esta preferência.')
    setSalvas((atual) => {
      const proximo = { ...atual }
      if (valor) proximo[categoria] = valor
      else delete proximo[categoria]
      return proximo
    })
    setMessage(valor ? 'Frase salva; vale também no celular.' : 'Voltou à frase padrão.')
  }

  const limpo = texto.replace(/\s+/g, ' ').trim()
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-barlow text-lg font-bold text-gray-900 dark:text-gray-100">Frase de técnica por exame</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        A frase dos COMENTÁRIOS na via padrão do exame. Via ditada ou escolhida, Doppler, cervicometria e documentação fotográfica continuam automáticos.
      </p>
      <label className="mt-4 block text-xs font-semibold text-gray-600 dark:text-gray-300">
        Exame
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal dark:border-gray-700 dark:bg-gray-950">
          {CATEGORIAS.map((c) => <option key={c} value={c}>{categoryDisplayLabel(c)}{salvas[c] ? ' (personalizada)' : ''}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-xs font-semibold text-gray-600 dark:text-gray-300">
        Frase
        <textarea value={texto} maxLength={TECNICA_PREFERIDA_MAX} rows={4} onChange={(e) => setTexto(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal leading-relaxed dark:border-gray-700 dark:bg-gray-950" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!limpo || limpo === (salvas[categoria] ?? padrao)} onClick={() => void salvar(limpo === padrao ? null : limpo)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Salvar</button>
        <button type="button" disabled={!personalizada} onClick={() => void salvar(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">Voltar à padrão</button>
      </div>
      {message ? <p className="mt-3 text-xs text-gray-500 dark:text-gray-400" role="status">{message}</p> : null}
    </section>
  )
}
