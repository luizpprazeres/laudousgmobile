import { z } from 'zod'
import { unauthorized, verifyJwt } from '@/server/auth/verifyJwt'
import { getServiceClient } from '@/server/supabaseService'
import { findWorkspaceSessionById, isWorkspaceSessionActive } from '@/server/workspace/session'
export { OPTIONS } from '@/server/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SendInputSchema = z.object({
  sessionId: z.string().uuid(),
  clientEventId: z.string().min(8).max(100),
  kind: z.enum(['text', 'measurements']),
  text: z.string().trim().min(1).max(20_000),
  categoryCode: z.string().trim().min(1).max(80).nullable().optional(),
})

export async function GET(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('sessionId')
  if (!sessionId || !z.string().uuid().safeParse(sessionId).success) {
    return json({ error: 'session_id_invalid' }, 400)
  }

  try {
    const session = await findWorkspaceSessionById(sessionId)
    if (!session || session.user_id !== user.id) return json({ error: 'session_not_found' }, 404)
    const service = getServiceClient()
    const { data, error } = await service
      .from('workspace_inputs')
      .select('id, session_id, kind, category_code, payload, status, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) throw error

    const inputs = (data ?? []).map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      kind: row.kind,
      categoryCode: row.category_code,
      text: typeof row.payload?.text === 'string' ? row.payload.text : '',
      status: row.status,
      createdAt: row.created_at,
    }))
    return json({ inputs })
  } catch (error) {
    console.error('[workspace/inputs] list falhou', error)
    return json({ error: 'list_failed' }, 500)
  }
}

export async function POST(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const parsed = SendInputSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid_body' }, 400)

  try {
    const session = await findWorkspaceSessionById(parsed.data.sessionId)
    if (!session || session.user_id !== user.id) return json({ error: 'session_not_found' }, 404)
    if (!isWorkspaceSessionActive(session) || !session.paired_at) {
      return json({ error: 'session_unavailable' }, 409)
    }

    const service = getServiceClient()
    const { data, error } = await service
      .from('workspace_inputs')
      .upsert({
        session_id: session.id,
        user_id: user.id,
        client_event_id: parsed.data.clientEventId,
        kind: parsed.data.kind,
        category_code: parsed.data.categoryCode ?? null,
        payload: { text: parsed.data.text },
      }, { onConflict: 'session_id,client_event_id', ignoreDuplicates: true })
      .select('id')
      .maybeSingle()
    if (error) throw error
    return json({ ok: true, inputId: data?.id ?? null }, 201)
  } catch (error) {
    console.error('[workspace/inputs] send falhou', error)
    return json({ error: 'send_failed' }, 500)
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
