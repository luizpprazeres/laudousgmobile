import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BASE64 = 2_800_000

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return Response.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 })
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return Response.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 })

  const base = process.env.CATALOG_API_URL?.trim().replace(/\/+$/, '')
  if (!base) return Response.json({ error: 'Envio para a Sala não está configurado.' }, { status: 503 })

  let body: { examType?: unknown; examLabel?: unknown; png?: unknown; pdf?: unknown }
  try { body = await request.json() } catch { return Response.json({ error: 'Dados do esquema inválidos.' }, { status: 400 }) }
  const examType = typeof body.examType === 'string' ? body.examType : ''
  const examLabel = typeof body.examLabel === 'string' ? body.examLabel : ''
  const png = typeof body.png === 'string' ? body.png : ''
  const pdf = typeof body.pdf === 'string' ? body.pdf : undefined
  if (!['MAMA', 'TIREOIDE', 'FETAL_POSITION'].includes(examType) || !examLabel || !png) return Response.json({ error: 'Esquema incompleto.' }, { status: 400 })
  if (png.length > MAX_BASE64 || (pdf?.length ?? 0) > MAX_BASE64) return Response.json({ error: 'O esquema ficou grande demais para envio.' }, { status: 413 })

  try {
    const response = await fetch(`${base}/api/sala/push-schema`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ examType, examLabel, png, pdf }),
      cache: 'no-store',
    })
    const result = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok) return Response.json({ error: result?.error || 'A Sala não recebeu o esquema.' }, { status: response.status })
    return Response.json(result ?? { ok: true })
  } catch {
    return Response.json({ error: 'Não foi possível comunicar com a Sala.' }, { status: 503 })
  }
}
