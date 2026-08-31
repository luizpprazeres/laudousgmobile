import { z } from 'zod'
import { unauthorized, verifyJwt } from '@/server/auth/verifyJwt'
import { getServiceClient } from '@/server/supabaseService'
export { OPTIONS } from '@/server/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CategorySchema = z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/)
const PhraseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  category_code: CategorySchema.nullable().optional(),
})
const UpdateSchema = PhraseSchema.extend({ id: z.string().uuid() })

export async function GET(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const { data, error } = await getServiceClient().from('user_phrases')
    .select('id,user_id,title,body,category_code,category_codes,position,created_at,updated_at')
    .eq('user_id', user.id).order('position', { ascending: true })
  if (error) return json({ error: 'phrases_read_failed' }, 502)
  return json({ phrases: data ?? [] })
}

export async function POST(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const parsed = PhraseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid_phrase' }, 400)
  const service = getServiceClient()
  const { data: last } = await service.from('user_phrases').select('position').eq('user_id', user.id).order('position', { ascending: false }).limit(1).maybeSingle()
  const category = parsed.data.category_code ?? null
  const { data, error } = await service.from('user_phrases').insert({
    user_id: user.id, title: parsed.data.title, body: parsed.data.body,
    category_code: category, category_codes: category ? [category] : [],
    position: (last?.position ?? -1) + 1,
  }).select('id,user_id,title,body,category_code,category_codes,position,created_at,updated_at').single()
  if (error) return json({ error: 'phrase_create_failed' }, 502)
  return json({ phrase: data }, 201)
}

export async function PATCH(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid_phrase' }, 400)
  const category = parsed.data.category_code ?? null
  const { data, error } = await getServiceClient().from('user_phrases').update({
    title: parsed.data.title, body: parsed.data.body,
    category_code: category, category_codes: category ? [category] : [],
    updated_at: new Date().toISOString(),
  }).eq('id', parsed.data.id).eq('user_id', user.id)
    .select('id,user_id,title,body,category_code,category_codes,position,created_at,updated_at').maybeSingle()
  if (error) return json({ error: 'phrase_update_failed' }, 502)
  if (!data) return json({ error: 'phrase_not_found' }, 404)
  return json({ phrase: data })
}

export async function DELETE(req: Request) {
  const user = await verifyJwt(req)
  if (!user) return unauthorized()
  const id = new URL(req.url).searchParams.get('id')
  if (!id || !z.string().uuid().safeParse(id).success) return json({ error: 'invalid_phrase' }, 400)
  const { data, error } = await getServiceClient().from('user_phrases').delete().eq('id', id).eq('user_id', user.id).select('id').maybeSingle()
  if (error) return json({ error: 'phrase_delete_failed' }, 502)
  if (!data) return json({ error: 'phrase_not_found' }, 404)
  return json({ ok: true })
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}
