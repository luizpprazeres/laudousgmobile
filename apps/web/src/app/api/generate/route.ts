import { GenerateRequestSchema } from '@laudousg/shared'
import { createClient } from '@/lib/supabase/server'
import { WRITING_STYLE_IDS, idDeEstiloValido } from '@/lib/perfil/estilos'
import { parseWriterCategoryRequest } from '@/lib/writerContract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(), supabase.auth.getSession(),
  ])
  if (!userData.user || !sessionData.session?.access_token) {
    return Response.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 })
  }

  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return Response.json({ error: 'Envie o pedido em JSON.' }, { status: 415 })
  }
  const rawBody = await request.text().catch(() => '')
  if (Buffer.byteLength(rawBody, 'utf8') > 100_000) return Response.json({ error: 'Pedido grande demais.' }, { status: 413 })
  let json: unknown
  try { json = JSON.parse(rawBody) } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  const body = parseWriterCategoryRequest(json)
  if (!body) {
    return Response.json({ error: 'Pedido inválido ou categoria indisponível.' }, { status: 400 })
  }
  const parsed = GenerateRequestSchema.safeParse({
    ...body,
    writing_style_id: WRITING_STYLE_IDS.CLASSICO_COMPLETO,
    source: 'web',
  })
  if (!parsed.success) return Response.json({ error: 'Pedido de geração inválido.' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('default_writing_style_id').eq('id', userData.user.id).maybeSingle()
  const selectedStyle = profile?.default_writing_style_id
  const writingStyleId = idDeEstiloValido(selectedStyle) ? selectedStyle : WRITING_STYLE_IDS.CLASSICO_COMPLETO
  const base = process.env.CATALOG_API_URL?.trim().replace(/\/+$/, '')
  if (!base) return Response.json({ error: 'Gerador indisponível: serviço não configurado.' }, { status: 503 })

  let upstream: Response
  try {
    upstream = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${sessionData.session.access_token}`,
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...parsed.data, writing_style_id: writingStyleId, source: 'web' }),
      signal: request.signal,
      cache: 'no-store',
    })
  } catch {
    return Response.json({ error: 'Gerador indisponível no momento.' }, { status: 503 })
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.json().catch(() => null) as { error?: string } | null
    return Response.json({ error: detail?.error ?? 'O gerador recusou o pedido.' }, { status: upstream.status || 502 })
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}
