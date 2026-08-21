import { z } from 'zod'
import { descartarRascunho, lerCategoria, salvarRascunho, type Operation } from '@/lib/biblioteca/cliente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OperacaoSchema = z.union([
  z.object({ op: z.literal('remove_slot'), slot: z.string() }),
  z.object({ op: z.literal('replace_phrase'), slot: z.string(), variant: z.string().optional(), value: z.string() }),
  z.object({ op: z.literal('append_conclusion_item'), value: z.string() }),
  z.object({ op: z.literal('insert_phrase_after'), anchor: z.string(), value: z.string() }),
])

const Corpo = z.object({
  operations: z.array(OperacaoSchema).max(200),
  note: z.string().max(500).nullable().optional(),
})

function estiloDe(req: Request): string {
  const e = new URL(req.url).searchParams.get('estilo')
  return e === 'OBJETIVO' ? 'OBJETIVO' : 'CLASSICO_COMPLETO'
}

/** O modelo da categoria: projeção, rascunho, publicado e histórico. */
export async function GET(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params
  const r = await lerCategoria(category, estiloDe(req))
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status })
  return Response.json(r.corpo, { status: r.status })
}

/**
 * Salva o RASCUNHO — nenhum laudo muda até publicar.
 *
 * A validação aqui é de FORMA; quem valida se as operações fazem sentido
 * contra o catálogo (âncora que existe, slot que não some, termo obrigatório
 * preservado) é a API canônica, que devolve 409 com o motivo.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params
  let corpo: z.infer<typeof Corpo>
  try {
    corpo = Corpo.parse(await req.json())
  } catch {
    return Response.json({ error: 'corpo inválido' }, { status: 400 })
  }
  const r = await salvarRascunho(category, estiloDe(req), corpo.operations as Operation[], corpo.note)
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status })
  return Response.json(r.corpo, { status: r.status })
}

/** Descarta o rascunho e volta ao publicado (ou ao modelo da casa). */
export async function DELETE(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params
  const r = await descartarRascunho(category, estiloDe(req))
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status })
  return Response.json(r.corpo, { status: r.status })
}
