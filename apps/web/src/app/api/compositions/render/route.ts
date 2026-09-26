import { createClient } from '@/lib/supabase/server'
import { estiloDaConta } from '@/lib/perfil/estiloDaConta'
import { comporNoServico } from '@/lib/composition/servidor'
import { ClinicalCompositionRequestV1Schema } from '@/lib/composition/contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/compositions/render — o LAUDO COMPOSTO de exames associados.
 *
 * O estilo de redação NÃO vem do navegador: é lido da conta do médico, como na
 * rota simples de catálogo. Pedido que traga `writingStyle` é recusado.
 *
 * A Web valida com o MESMO schema compartilhado do `apps/api` (forma, par da
 * associação, bexiga compartilhada). A validação clínica estrita por categoria
 * — chaves desconhecidas, limites, bexiga divergente — continua lá.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return Response.json({ error: 'não autorizado' }, { status: 401 })

  const corpo = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo) || 'writingStyle' in corpo) {
    return Response.json({ error: 'pedido de composição inválido' }, { status: 400 })
  }
  const pedido = ClinicalCompositionRequestV1Schema.safeParse({ ...corpo, writingStyle: await estiloDaConta(data.user.id) })
  if (!pedido.success) return Response.json({ error: 'pedido de composição inválido' }, { status: 400 })

  const r = await comporNoServico(pedido.data)
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status })
  return Response.json(r.corpo, { status: r.status })
}
