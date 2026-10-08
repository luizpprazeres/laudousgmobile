import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { categoriaDeRender, categoriaMigrada, renderizar } from "@/lib/catalog/cliente";
import { estiloDaConta } from '@/lib/perfil/estiloDaConta'
import { chamarPreferencias } from '@/lib/preferencias/relatorios'

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Corpo = z.object({
  alteracoes: z.array(z.string()).max(20).default([]),
  dados: z.record(z.string(), z.unknown()).optional(),
});

type RendererPreferences = {
  show_domingos_score?: boolean
  show_conduct_recommendation?: boolean
}

/** Extrai somente os dois toggles clínicos conhecidos; o restante é ignorado. */
function preferenciasDeTireoide(body: unknown): RendererPreferences | undefined {
  if (!body || typeof body !== 'object') return undefined
  const preferences = (body as { preferences?: unknown }).preferences
  if (!Array.isArray(preferences)) return undefined
  const row = preferences.find((item) => (
    item && typeof item === 'object' && (item as { category_code?: unknown }).category_code === 'TIREOIDE'
  )) as { renderer_preferences?: unknown } | undefined
  const raw = row?.renderer_preferences
  if (!raw || typeof raw !== 'object') return undefined
  const candidate = raw as Record<string, unknown>
  const out: RendererPreferences = {}
  if (typeof candidate.show_domingos_score === 'boolean') out.show_domingos_score = candidate.show_domingos_score
  if (typeof candidate.show_conduct_recommendation === 'boolean') out.show_conduct_recommendation = candidate.show_conduct_recommendation
  return Object.keys(out).length > 0 ? out : undefined
}

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

  // Derivada (ex.: PELVICO_TRANSVAGINAL) é montada pelo renderer da categoria-mãe.
  const categoriaRender = categoriaDeRender(category)
  const [estilo, preferencias] = await Promise.all([
    estiloDaConta(data.user.id),
    categoriaRender === 'TIREOIDE' ? chamarPreferencias() : Promise.resolve(null),
  ])
  const rendererPreferences = preferencias?.ok ? preferenciasDeTireoide(preferencias.body) : undefined
  const r = await renderizar(categoriaRender, {
    ...corpo,
    estilo,
    ...(rendererPreferences ? { renderer_preferences: rendererPreferences } : {}),
  });
  if (!r.ok) return Response.json({ error: r.erro }, { status: r.status });
  /**
   * O status do upstream atravessa — inclusive o 409 com os conflitos
   * nomeados, que é o que a tela mostra quando duas escolhas não se combinam ou
   * quando o que foi digitado apagaria um achado selecionado.
   */
  return Response.json(r.corpo, { status: r.status });
}
