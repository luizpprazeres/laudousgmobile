import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Candidato = { texto: string; data: string; origem: 'web' | 'ia' }

/**
 * GET /api/biblioteca/[category]/exemplo — UM LAUDO DE VERDADE do médico.
 *
 * A coluna de exemplo mostra como o modelo se lê preenchido. A tentação era
 * gerar valores ilustrativos, e ela foi recusada: seria inventar medida clínica
 * de novo — o defeito que passamos o dia 20/08 removendo dos cenários do
 * catálogo. E os rótulos que o modelo derivado conhece são fracos ("medida em
 * cm", "dado do exame"): leem pior que a própria lacuna.
 *
 * O exemplo honesto é um laudo que o médico já assinou. É real por definição, é
 * dele, e mostra o modelo com os números do mundo.
 *
 * Sem laudo naquela categoria não há exemplo, e a tela diz isso — melhor que
 * mostrar um laudo inventado.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autorizado' }, { status: 401 })

  /** As duas gavetas, como no histórico: montado por cliques e ditado com IA. */
  const [web, ia] = await Promise.all([
    supabase
      .from('web_reports')
      .select('laudo_text, created_at')
      .eq('category_code', category)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('reports')
      .select('final_output, generated_output, created_at')
      .eq('category_code', category)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const doWeb = web.data?.[0]
  const daIa = ia.data?.[0]
  /** `final_output` é a versão que o médico corrigiu; sem ela, a que a IA gerou. */
  const textoIa = (daIa?.final_output as string | null) ?? (daIa?.generated_output as string | null) ?? null

  const candidatos: Candidato[] = []
  if (doWeb?.laudo_text) {
    candidatos.push({ texto: doWeb.laudo_text as string, data: doWeb.created_at as string, origem: 'web' })
  }
  if (textoIa?.trim() && daIa) {
    candidatos.push({ texto: textoIa, data: daIa.created_at as string, origem: 'ia' })
  }
  if (candidatos.length === 0) return Response.json({ exemplo: null })

  candidatos.sort((a, b) => b.data.localeCompare(a.data))
  return Response.json({ exemplo: candidatos[0] })
}
