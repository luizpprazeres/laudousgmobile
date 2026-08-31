import { createClient } from '@/lib/supabase/client'

export type CompanionSession = {
  id: string
  pairing_code: string | null
  pairing_expires_at: string
  connected_at: string | null
  expires_at: string
  revoked_at: string | null
}

export type CompanionEvent = {
  id: string
  kind: string
  payload: {
    text?: string
    category?: 'OBSTETRICA' | 'DOPPLER_OBSTETRICO' | 'MORFOLOGICO' | 'TIREOIDE' | 'MAMARIA'
    data?: Record<string, unknown>
    summary?: string
  }
  status: 'pending' | 'applied' | 'dismissed'
  created_at: string
}

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
function randomCode() {
  const values = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join('')
}

export async function latestCompanionSession(): Promise<CompanionSession | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('companion_sessions')
    .select('id, pairing_code, pairing_expires_at, connected_at, expires_at, revoked_at')
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as CompanionSession | null
}

export async function createCompanionSession(): Promise<CompanionSession> {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sessão expirada. Faça login novamente.')

  await supabase
    .from('companion_sessions')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .is('revoked_at', null)

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const now = Date.now()
    const { data, error } = await supabase
      .from('companion_sessions')
      .insert({
        user_id: auth.user.id,
        pairing_code: randomCode(),
        pairing_expires_at: new Date(now + 10 * 60_000).toISOString(),
        expires_at: new Date(now + 10 * 60 * 60_000).toISOString(),
      })
      .select('id, pairing_code, pairing_expires_at, connected_at, expires_at, revoked_at')
      .single()
    if (!error && data) return data as CompanionSession
    if (error?.code !== '23505') throw new Error(error?.message ?? 'Não foi possível criar a sessão.')
  }
  throw new Error('Não foi possível gerar um código único. Tente novamente.')
}

export async function listPendingCompanionEvents(sessionId: string): Promise<CompanionEvent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('companion_events')
    .select('id, kind, payload, status, created_at')
    .eq('session_id', sessionId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CompanionEvent[]
}

export async function resolveCompanionEvent(id: string, status: 'applied' | 'dismissed') {
  const supabase = createClient()
  const { error } = await supabase
    .from('companion_events')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
}

export async function revokeCompanionSession(id: string) {
  const supabase = createClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('companion_sessions')
    .update({ revoked_at: now, updated_at: now })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
