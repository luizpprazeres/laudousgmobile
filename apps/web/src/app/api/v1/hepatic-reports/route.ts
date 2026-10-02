import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function apiBase() {
  return [process.env.CATALOG_API_URL, process.env.NEXT_PUBLIC_API_URL].map((value) => value?.trim().replace(/\/+$/, '')).find(Boolean)
}
export async function POST(request: Request) {
  const supabase = await createClient()
  const [{ data: userData }, { data: sessionData }] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()])
  const token = sessionData.session?.access_token
  if (!userData.user || !token) return Response.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 })
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return Response.json({ error: 'Envie o pedido em JSON.' }, { status: 415 })
  const raw = await request.text().catch(() => '')
  if (Buffer.byteLength(raw, 'utf8') > 500_000) return Response.json({ error: 'Pedido grande demais.' }, { status: 413 })
  try { JSON.parse(raw) } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  const base = apiBase()
  if (!base) return Response.json({ error: 'Serviço clínico não configurado.' }, { status: 503 })
  try {
    const upstream = await fetch(`${base}/api/v1/hepatic-reports`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: raw,
      cache: 'no-store', signal: request.signal,
    })
    return new Response(await upstream.text(), { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } })
  } catch { return Response.json({ error: 'Serviço clínico indisponível.' }, { status: 503 }) }
}
