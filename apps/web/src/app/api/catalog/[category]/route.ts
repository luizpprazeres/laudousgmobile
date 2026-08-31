import { createClient } from "@/lib/supabase/server";
import { buscarCatalogo, categoriaMigrada } from "@/lib/catalog/cliente";
import { estiloDaConta } from '@/lib/perfil/estiloDaConta'

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/[category] — o modelo da categoria, para a tela montar.
 *
 * Proxy autenticado sobre o catálogo canônico do `apps/api`. Existe por dois
 * motivos, e os dois importam:
 *
 * - o `CATALOG_SERVICE_TOKEN` fica no servidor e **nunca** chega ao navegador;
 * - o médico precisa estar logado. O catálogo é a redação clínica da casa,
 *   inteira, e uma rota aberta convida raspagem.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ category: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "não autorizado" }, { status: 401 });

  const { category } = await ctx.params;
  if (!categoriaMigrada(category)) {
    /**
     * 404, e não 400: para quem chama, uma categoria ainda não migrada
     * simplesmente não existe neste caminho. A migração é uma categoria por
     * vez, provada contra o canônico antes de ser alcançável.
     */
    return Response.json({ error: "categoria ainda não migrada para o catálogo" }, { status: 404 });
  }

  const r = await buscarCatalogo(category, await estiloDaConta(data.user.id));
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status });
  return Response.json(r.corpo, { status: r.status });
}
