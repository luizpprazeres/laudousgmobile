export { OPTIONS } from "@/server/cors";
import { z } from "zod";
import { autorizarServico } from "@/server/catalog-api/auth";
import { ehEstiloVivo } from "@/server/renderer/catalog/registry";
import { renderizarSelecao } from "@/server/renderer/catalog/alteracoes";
import { alteracoesDe } from "@/server/renderer/catalog/alteracoes/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Corpo = z.object({
  estilo: z.string().default("CLASSICO_COMPLETO"),
  /** Os ids que o médico clicou. Vazio = o modelo normal. */
  alteracoes: z.array(z.string()).max(20).default([]),
});

/**
 * POST /api/catalog/[category]/render
 *
 * O LAUDO das alterações escolhidas — montado pelo RENDERER.
 *
 * É o ponto central do desenho (Codex, 19/08): **a web não concatena frase
 * patológica por conta própria.** Ela manda os ids do que foi clicado; quem
 * recompõe corpo e conclusão é o renderer de produção, que sabe a ordem, a
 * concordância, a numeração e a classificação calculada — o TI-RADS de um
 * nódulo sai da combinação dos eixos, não de um texto guardado.
 *
 * Se a tela montasse o texto, teríamos duas autoridades sobre o mesmo laudo, e
 * a segunda erraria exatamente onde o cálculo importa.
 *
 * Combinação impossível é RECUSADA com o motivo, não remendada: duas alterações
 * que escrevem a mesma chave apagariam uma à outra, e o médico veria o laudo sem
 * o achado que clicou.
 */
export async function POST(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const auth = autorizarServico(req);
  if (!auth.ok) return Response.json({ error: auth.erro }, { status: auth.status });

  const { category } = await ctx.params;

  let corpo: z.infer<typeof Corpo>;
  try {
    corpo = Corpo.parse(await req.json());
  } catch {
    return Response.json({ error: "corpo inválido" }, { status: 400 });
  }

  if (!ehEstiloVivo(corpo.estilo)) {
    return Response.json(
      { error: "estilo desconhecido", suportados: ["CLASSICO_COMPLETO", "OBJETIVO"] },
      { status: 400 },
    );
  }

  const disponiveis = alteracoesDe(category);
  const escolhidas = corpo.alteracoes.map((id) => disponiveis.find((s) => s.id === id));
  const desconhecidas = corpo.alteracoes.filter((_, i) => escolhidas[i] === undefined);
  if (desconhecidas.length > 0) {
    return Response.json(
      { error: "alteração desconhecida nesta categoria", desconhecidas },
      { status: 400 },
    );
  }

  const r = renderizarSelecao(category, corpo.estilo, escolhidas.filter((s) => s !== undefined));

  if (!r.ok) {
    // 409: não é erro do cliente nem do servidor — é combinação que não existe
    // clinicamente. A tela precisa distinguir isso de "deu erro".
    return Response.json(
      "conflitos" in r
        ? { error: "estas alterações não se combinam", conflitos: r.conflitos }
        : { error: r.erro },
      { status: 409 },
    );
  }

  return Response.json({
    categoria: category,
    estilo: corpo.estilo,
    alteracoes: corpo.alteracoes,
    laudo: r.texto,
  });
}
