import { z } from "zod";
export { OPTIONS } from "@/server/cors";
import { lerJson, resolverContexto, respostaDeErro } from "@/server/customization/http";
import { restaurar } from "@/server/customization/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/me/report-customizations/[category]/restore?estilo=classico
 *
 * POST { versao } → traz uma versão do histórico de volta COMO RASCUNHO.
 *
 * Não publica direto, e isso é deliberado: o catálogo-base pode ter mudado
 * desde então, e uma operação que valia na v1 pode apontar para um slot que
 * não existe mais. Restaurar como rascunho faz a validação aparecer ANTES de o
 * laudo mudar. Se algo não vale mais, vem em `avisos` — e o rascunho é gravado
 * assim mesmo, para o médico ver o que tinha e consertar, em vez de receber
 * uma recusa seca e perder o conteúdo.
 */

const RestoreSchema = z.object({ versao: z.number().int().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  const raw = await lerJson(req);
  if (raw !== null && typeof raw === "object" && "erro" in raw) return (raw as { erro: Response }).erro;

  const parsed = RestoreSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "body inválido", detalhes: parsed.error.issues }, { status: 400 });
  }

  try {
    const { rascunho, avisos } = await restaurar(r.chave, r.entrada, parsed.data.versao);
    return Response.json({
      rascunho,
      avisos,
      publicavel: avisos.length === 0,
      detalhe:
        avisos.length === 0
          ? "restaurado como rascunho; revise e publique"
          : "restaurado como rascunho, mas há operações que não valem mais no modelo-base atual",
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}
