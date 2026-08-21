import { despublicar, publicar } from '@/lib/biblioteca/cliente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function estiloDe(req: Request): string {
  const e = new URL(req.url).searchParams.get('estilo')
  return e === 'OBJETIVO' ? 'OBJETIVO' : 'CLASSICO_COMPLETO'
}

/**
 * PUBLICA — é aqui que a redação passa a valer nos laudos.
 *
 * O 403 atravessa de propósito: quem está fora da allowlist precisa ler que é
 * decisão de produto, não erro da tela.
 */
export async function POST(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params
  const r = await publicar(category, estiloDe(req))
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status })
  return Response.json(r.corpo, { status: r.status })
}

/** Despublica. Nunca é barrado — sair da personalização é sempre possível. */
export async function DELETE(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params
  const r = await despublicar(category, estiloDe(req))
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status })
  return Response.json(r.corpo, { status: r.status })
}
