import { z } from 'zod'
import { unauthorized, verifyJwt } from '@/server/auth/verifyJwt'
import { getServiceClient } from '@/server/supabaseService'
import {
  WORKSPACE_CODE_PATTERN,
  isWorkspaceSessionActive,
  normalizeWorkspaceCode,
  publicWorkspaceSession,
  type WorkspaceSessionRow,
} from '@/server/workspace/session'
export { OPTIONS } from '@/server/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PairSchema = z.object({
  code: z.string().min(6).max(12),
  deviceLabel: z.string().trim().min(1).max(80).optional(),
})

export async function POST(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()

  const parsed = PairSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid_body' }, 400)
  const code = normalizeWorkspaceCode(parsed.data.code)
  if (!WORKSPACE_CODE_PATTERN.test(code)) return json({ error: 'invalid_code' }, 400)

  const service = getServiceClient()
  const { data, error } = await service
    .from('workspace_sessions')
    .select('id, user_id, pairing_code, expires_at, paired_at, device_label, ended_at, created_at')
    .eq('pairing_code', code)
    .maybeSingle()

  if (error) {
    console.error('[workspace/pair] lookup falhou', error)
    return json({ error: 'lookup_failed' }, 500)
  }
  const session = data as WorkspaceSessionRow | null
  if (!session || !isWorkspaceSessionActive(session)) return json({ error: 'session_unavailable' }, 404)
  // Mesmo erro de sessão inexistente: não revela a outro usuário que o código existe.
  if (session.user_id !== user.id) return json({ error: 'session_unavailable' }, 404)

  const pairedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await service
    .from('workspace_sessions')
    .update({ paired_at: pairedAt, device_label: parsed.data.deviceLabel ?? 'Celular', updated_at: pairedAt })
    .eq('id', session.id)
    .eq('user_id', user.id)
    .select('id, user_id, pairing_code, expires_at, paired_at, device_label, ended_at, created_at')
    .single()

  if (updateError || !updated) {
    console.error('[workspace/pair] update falhou', updateError)
    return json({ error: 'pair_failed' }, 500)
  }
  return json({ session: publicWorkspaceSession(updated as WorkspaceSessionRow) })
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
