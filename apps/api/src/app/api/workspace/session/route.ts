import { randomInt } from 'crypto'
import { unauthorized, verifyJwt } from '@/server/auth/verifyJwt'
import { getServiceClient } from '@/server/supabaseService'
import {
  WORKSPACE_SESSION_TTL_MS,
  isWorkspaceSessionActive,
  publicWorkspaceSession,
  type WorkspaceSessionRow,
} from '@/server/workspace/session'
export { OPTIONS } from '@/server/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateCode() {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
}

async function latestSession(userId: string) {
  const service = getServiceClient()
  const { data, error } = await service
    .from('workspace_sessions')
    .select('id, user_id, pairing_code, expires_at, paired_at, device_label, ended_at, created_at')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as WorkspaceSessionRow | null
}

export async function GET(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()

  try {
    const session = await latestSession(user.id)
    return json({ session: session && isWorkspaceSessionActive(session) ? publicWorkspaceSession(session) : null })
  } catch (error) {
    console.error('[workspace/session] lookup falhou', error)
    return json({ error: 'lookup_failed' }, 500)
  }
}

export async function POST(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const service = getServiceClient()

  try {
    const current = await latestSession(user.id)
    if (current && isWorkspaceSessionActive(current)) {
      return json({ session: publicWorkspaceSession(current) })
    }

    await service
      .from('workspace_sessions')
      .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('ended_at', null)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const expiresAt = new Date(Date.now() + WORKSPACE_SESSION_TTL_MS).toISOString()
      const { data, error } = await service
        .from('workspace_sessions')
        .insert({ user_id: user.id, pairing_code: generateCode(), expires_at: expiresAt })
        .select('id, user_id, pairing_code, expires_at, paired_at, device_label, ended_at, created_at')
        .single()

      if (!error && data) return json({ session: publicWorkspaceSession(data as WorkspaceSessionRow) }, 201)
      if (error?.code !== '23505') throw error
    }

    return json({ error: 'code_generation_failed' }, 500)
  } catch (error) {
    console.error('[workspace/session] create falhou', error)
    return json({ error: 'create_failed' }, 500)
  }
}

export async function DELETE(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const service = getServiceClient()
  const now = new Date().toISOString()
  const { error } = await service
    .from('workspace_sessions')
    .update({ ended_at: now, updated_at: now })
    .eq('user_id', user.id)
    .is('ended_at', null)
  if (error) {
    console.error('[workspace/session] end falhou', error)
    return json({ error: 'end_failed' }, 500)
  }
  return json({ ok: true })
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
