import { NextResponse } from 'next/server'
import { chamarPreferencias } from '@/lib/preferencias/relatorios'

export const dynamic = 'force-dynamic'

export async function GET() {
  const r = await chamarPreferencias()
  return NextResponse.json(r.body, { status: r.status })
}

export async function PATCH(req: Request) {
  const raw = await req.json().catch(() => null)
  if (!raw || typeof raw !== 'object') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const body = raw as Record<string, unknown>
  const clean = {
    category_code: body.category_code,
    default_variant_id: body.default_variant_id,
  }
  const r = await chamarPreferencias({ method: 'PATCH', body: JSON.stringify(clean) })
  return NextResponse.json(r.body, { status: r.status })
}
