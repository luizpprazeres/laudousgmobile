import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(), supabase.auth.getSession(),
  ])
  const token = sessionData.session?.access_token
  if (!userData.user || !token) return Response.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 })
  const { id } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: 'Identificador de laudo inválido.' }, { status: 400 })
  }
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return Response.json({ error: 'Envie o pedido em JSON.' }, { status: 415 })
  }
  const raw = await request.text().catch(() => '')
  if (Buffer.byteLength(raw, 'utf8') > 220_000) return Response.json({ error: 'Pedido grande demais.' }, { status: 413 })
  try { JSON.parse(raw) } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  const base = [process.env.CATALOG_API_URL, process.env.NEXT_PUBLIC_API_URL]
    .map((value) => value?.trim().replace(/\/+$/, ''))
    .find(Boolean)
  if (!base) return Response.json({ error: 'Serviço clínico não configurado.' }, { status: 503 })

  try {
    const upstream = await fetch(`${base}/api/v1/clinical-reports/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: raw,
      cache: 'no-store',
      signal: request.signal,
    })
    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' },
    })
  } catch {
    return Response.json({ error: 'Serviço clínico indisponível.' }, { status: 503 })
  }
}
