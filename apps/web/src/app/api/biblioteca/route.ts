import { listarCategorias } from '@/lib/biblioteca/cliente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/biblioteca — as categorias e o estado da personalização em cada uma. */
export async function GET() {
  const r = await listarCategorias()
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status })
  return Response.json(r.corpo, { status: r.status })
}
