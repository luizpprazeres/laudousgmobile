import { supabase } from '@/lib/supabase'

export type CompanionConnection = {
  sessionId: string
  expiresAt: string
}

const normalizeCode = (value: string) => value.replace(/[\s\-_]/g, '').toUpperCase()

export async function connectCompanion(codeInput: string): Promise<CompanionConnection> {
  const code = normalizeCode(codeInput)
  if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(code)) {
    throw new Error('Digite os 6 caracteres mostrados na web.')
  }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sessão expirada. Entre novamente.')

  const now = new Date().toISOString()
  const { data: session, error: lookupError } = await supabase
    .from('companion_sessions')
    .select('id, expires_at')
    .eq('user_id', auth.user.id)
    .eq('pairing_code', code)
    .is('revoked_at', null)
    .gt('pairing_expires_at', now)
    .maybeSingle()

  if (lookupError || !session) throw new Error('Código inválido, expirado ou de outra conta.')

  const { data: connected, error: updateError } = await supabase
    .from('companion_sessions')
    .update({ connected_at: now, pairing_code: null, updated_at: now })
    .eq('id', session.id)
    .eq('user_id', auth.user.id)
    .is('connected_at', null)
    .select('id, expires_at')
    .maybeSingle()

  if (updateError || !connected) throw new Error('Este código já foi utilizado. Gere outro na web.')
  return { sessionId: connected.id as string, expiresAt: connected.expires_at as string }
}

export async function restoreCompanionConnection(): Promise<CompanionConnection | null> {
  const { data, error } = await supabase
    .from('companion_sessions')
    .select('id, expires_at')
    .not('connected_at', 'is', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('Não foi possível recuperar a conexão com a web.')
  return data ? { sessionId: data.id as string, expiresAt: data.expires_at as string } : null
}

export async function sendCompanionText(connection: CompanionConnection, text: string): Promise<void> {
  const content = text.trim()
  if (!content) throw new Error('Digite uma mensagem para a auxiliar.')
  if (content.length > 2000) throw new Error('A mensagem deve ter no máximo 2.000 caracteres.')
  if (Date.parse(connection.expiresAt) <= Date.now()) throw new Error('O turno expirou. Pareie novamente.')

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sessão expirada. Entre novamente.')
  const { error } = await supabase.from('companion_events').insert({
    session_id: connection.sessionId,
    user_id: auth.user.id,
    kind: 'text',
    payload: { text: content },
  })
  if (error) throw new Error('Não foi possível enviar. Confirme se a sessão ainda está aberta.')
}
