import { z } from 'zod'
import { restaurar } from '@/lib/biblioteca/cliente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Restaura uma versão do histórico COMO RASCUNHO — nunca publica direto. */
export async function POST(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params
  const estilo = new URL(req.url).searchParams.get('estilo') === 'OBJETIVO' ? 'OBJETIVO' : 'CLASSICO_COMPLETO'
  let versao: number
  try {
    versao = z.object({ versao: z.number().int().positive() }).parse(await req.json()).versao
  } catch {
    return Response.json({ error: 'corpo inválido' }, { status: 400 })
  }
  const r = await restaurar(category, estilo, versao)
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status })
  return Response.json(r.corpo, { status: r.status })
}
