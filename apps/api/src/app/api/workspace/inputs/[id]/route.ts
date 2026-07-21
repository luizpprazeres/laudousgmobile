import { z } from 'zod'
import { unauthorized, verifyJwt } from '@/server/auth/verifyJwt'
import { getServiceClient } from '@/server/supabaseService'
export { OPTIONS } from '@/server/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ResolveSchema = z.object({ status: z.enum(['applied', 'dismissed']) })

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) return json({ error: 'input_id_invalid' }, 400)
  const parsed = ResolveSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid_body' }, 400)

  const service = getServiceClient()
  const { data, error } = await service
    .from('workspace_inputs')
    .update({ status: parsed.data.status, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[workspace/inputs] resolve falhou', error)
    return json({ error: 'resolve_failed' }, 500)
  }
  if (!data) return json({ error: 'input_not_pending' }, 409)
  return json({ ok: true })
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
