import 'server-only'
import { createClient } from '@/lib/supabase/server'

function apiBase() {
  return process.env.CATALOG_API_URL?.trim().replace(/\/+$/, '') ?? null
}

export async function chamarPreferencias(init?: RequestInit, path = '/api/me/report-preferences') {
  const base = apiBase()
  if (!base) return { ok: false as const, status: 503, body: { error: 'Serviço não configurado.' } }
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  if (!data.session) return { ok: false as const, status: 401, body: { error: 'Sessão expirada.' } }
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}`, ...(init?.headers ?? {}) },
    })
    const body = await response.json().catch(() => ({ error: 'Resposta inválida.' }))
    return { ok: response.ok, status: response.status, body }
  } catch {
    return { ok: false as const, status: 503, body: { error: 'Serviço indisponível.' } }
  }
}
