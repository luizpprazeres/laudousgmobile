import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { categoriaMigrada, renderizar } from "@/lib/catalog/cliente";
import { estiloDaConta } from '@/lib/perfil/estiloDaConta'

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Corpo = z.object({
  alteracoes: z.array(z.string()).max(20).default([]),
  dados: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/catalog/[category]/render — o LAUDO, montado pelo renderer.
 *
 * A tela manda os ids do que foi clicado e o que o médico digitou; quem
 * recompõe corpo, conclusão e **classificação** é o renderer de produção. O
 * navegador não concatena frase clínica: se concatenasse, haveria duas
 * autoridades sobre o mesmo laudo, e a segunda erraria exatamente onde o
 * cálculo importa.
 *
 * O `estilo` NÃO vem do navegador — o servidor lê o estilo salvo na conta do
 * médico antes de chamar o renderer.
 */
export async function POST(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "não autorizado" }, { status: 401 });

  const { category } = await ctx.params;
  if (!categoriaMigrada(category)) {
    return Response.json({ error: "categoria ainda não migrada para o catálogo" }, { status: 404 });
  }

  let corpo: z.infer<typeof Corpo>;
  try {
    corpo = Corpo.parse(await req.json());
  } catch {
    return Response.json({ error: "corpo inválido" }, { status: 400 });
  }

  const r = await renderizar(category, { ...corpo, estilo: await estiloDaConta(data.user.id) });
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status });
  /**
   * O status do upstream atravessa — inclusive o 409 com os conflitos
   * nomeados, que é o que a tela mostra quando duas escolhas não se combinam ou
   * quando o que foi digitado apagaria um achado selecionado.
   */
  return Response.json(r.corpo, { status: r.status });
}
