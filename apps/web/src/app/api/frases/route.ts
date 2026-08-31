import { NextResponse } from 'next/server'
import { z } from 'zod'
import { chamarPreferencias } from '@/lib/preferencias/relatorios'

export const dynamic = 'force-dynamic'

const PhraseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  category_code: z.string().trim().min(1).max(60).nullable().optional(),
})

export async function GET() {
  const r = await chamarPreferencias(undefined, '/api/me/user-phrases')
  return NextResponse.json(r.body, { status: r.status })
}

export async function POST(req: Request) {
  const parsed = PhraseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Preencha o título e a frase.' }, { status: 400 })
  const r = await chamarPreferencias({ method: 'POST', body: JSON.stringify(parsed.data) }, '/api/me/user-phrases')
  return NextResponse.json(r.body, { status: r.status })
}

export async function PATCH(req: Request) {
  const raw = await req.json().catch(() => null)
  const parsed = PhraseSchema.extend({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Frase inválida.' }, { status: 400 })
  const r = await chamarPreferencias({ method: 'PATCH', body: JSON.stringify(parsed.data) }, '/api/me/user-phrases')
  return NextResponse.json(r.body, { status: r.status })
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Frase inválida.' }, { status: 400 })
  const r = await chamarPreferencias({ method: 'DELETE' }, `/api/me/user-phrases?id=${encodeURIComponent(id)}`)
  return NextResponse.json(r.body, { status: r.status })
}
