/**
 * O perfil do médico, para o navegador — leitura e gravação.
 *
 * Repassa para a rota canônica com o JWT dele. O que ele pode mudar é decidido
 * em três camadas independentes, e é de propósito: aqui (só três campos saem do
 * corpo), no `apps/api` (Zod, com `plan` recusado explicitamente) e no banco
 * (o GRANT de coluna do `0024`, que nem menciona `plan`, `role` ou `email`).
 */

import { NextResponse } from 'next/server'
import { lerPerfil, salvarPerfil } from '@/lib/perfil/cliente'

export const dynamic = 'force-dynamic'

export async function GET() {
  const r = await lerPerfil()
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status })
  return NextResponse.json(r.corpo, { status: r.status })
}

export async function PATCH(req: Request) {
  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 })
  }
  const c = (corpo ?? {}) as Record<string, unknown>

  /**
   * A LISTA É BRANCA, não negra. Repassar o corpo inteiro faria esta rota
   * herdar todo campo que a rota canônica venha a aceitar no futuro — inclusive
   * um que não deveria vir da web.
   */
  const patch: { name?: string | null; crm?: string | null; uf?: string | null } = {}
  if ('name' in c) patch.name = (c.name as string | null) ?? null
  if ('crm' in c) patch.crm = (c.crm as string | null) ?? null
  if ('uf' in c) patch.uf = (c.uf as string | null) ?? null

  const r = await salvarPerfil(patch)
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status })
  return NextResponse.json(r.corpo, { status: r.status })
}
