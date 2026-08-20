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
  /**
   * O que ele DIGITOU — medidas, lados, localização. Entra por último e vence
   * os números do cenário, que existem só para o renderer ter o que calcular.
   *
   * O schema Zod da categoria valida: campo que a categoria não tem é
   * descartado no `safeParse`, e um valor fora de forma derruba o render — que
   * vira 409, não laudo torto.
   */
  dados: z.record(z.string(), z.unknown()).optional(),
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

  /**
   * Preset usado como alteração, e alteração pedida num estilo em que ela não
   * existe, são recusados por `renderizarSelecao` — no NÚCLEO, não aqui.
   *
   * A regra morava nesta rota, e "só na rota" é meia proteção: qualquer
   * consumidor interno novo reabriria o caminho sem tocar no arquivo que
   * documenta a regra. O que sobra aqui é traduzir a recusa para HTTP.
   */
  const r = renderizarSelecao(
    category,
    corpo.estilo,
    escolhidas.filter((s) => s !== undefined),
    corpo.dados,
  );

  if (!r.ok) {
    if (!("conflitos" in r)) return Response.json({ error: r.erro }, { status: 409 });

    /**
     * 400 × 409, e a diferença não é cosmética.
     *
     * **400** — a seleção é inválida por natureza: preset mandado como
     * alteração, ou alteração pedida num estilo em que ela não existe. O
     * cliente pediu algo que nunca poderia valer, e a correção é dele.
     *
     * **409** — a seleção é legítima e apenas não se combina, ou o que foi
     * digitado apagaria um achado. Aqui quem escolhe é o médico; nada está
     * errado no cliente, e a tela precisa distinguir isso de "deu erro".
     */
    const invalida = r.conflitos.some(
      (c) => c.motivo.includes("modelo de preenchimento") || c.motivo.includes("não existe no estilo"),
    );
    return Response.json(
      invalida
        ? {
            error: "esta seleção não é possível",
            conflitos: r.conflitos,
            comoUsar: "preset: use `template` do GET e mande o resultado em `dados`",
          }
        : { error: "estas alterações não se combinam", conflitos: r.conflitos },
      { status: invalida ? 400 : 409 },
    );
  }

  return Response.json({
    categoria: category,
    estilo: corpo.estilo,
    alteracoes: corpo.alteracoes,
    laudo: r.texto,
  });
}
