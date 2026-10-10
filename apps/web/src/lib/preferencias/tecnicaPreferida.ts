'use client'

import { useEffect, useState } from 'react'

/**
 * W15 — frase de técnica (COMENTÁRIOS) preferida do usuário, por categoria (decisão do Luiz, 10/10).
 * Fica em `renderer_preferences.tecnica_padrao` da preferência da conta: a mesma vale no celular
 * (o /api/generate aplica) e aqui na tela (`aplicarTecnicaPreferida` sobre o laudo montado).
 */

/** Código da categoria no banco a partir do id da tela (o MSK da web é MUSCULOESQUELETICO). */
export function codigoDaPreferencia(categoria: string): string {
  return categoria === 'MUSCULOESQUELETICO' ? 'MUSCULOESQUELETICO_V2' : categoria
}

type Preferencia = { category_code?: unknown; renderer_preferences?: { tecnica_padrao?: unknown } | null }

export function tecnicasDoCorpo(body: unknown): Record<string, string> {
  const lista = (body as { preferences?: unknown } | null)?.preferences
  if (!Array.isArray(lista)) return {}
  const out: Record<string, string> = {}
  for (const p of lista as Preferencia[]) {
    const t = p?.renderer_preferences?.tecnica_padrao
    if (typeof p?.category_code === 'string' && typeof t === 'string' && t.trim()) out[p.category_code] = t
  }
  return out
}

/** Mapa categoria (código do banco) → frase preferida. Falha de rede = sem preferência (laudo da casa). */
export function useTecnicasPreferidas(): Record<string, string> {
  const [mapa, setMapa] = useState<Record<string, string>>({})
  useEffect(() => {
    let vivo = true
    fetch('/api/preferencias-laudo', { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((body) => { if (vivo) setMapa(tecnicasDoCorpo(body)) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  return mapa
}
