import { getCorrecao } from "@/lib/supabase/correcoes-queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const d = await getCorrecao(id);
  if (!d) return Response.json({ error: "não encontrado" }, { status: 404 });
  return Response.json(d);
}
