export { OPTIONS } from "@/server/cors";
import { autorizarServico } from "@/server/catalog-api/auth";
import { describeCatalog } from "@/server/renderer/catalog/describe";
import { resolveCatalogo, flagsDeProducao, ehEstiloVivo } from "@/server/renderer/catalog/registry";
import { laudoPadraoDe, cenariosDe, laudoDoCenario } from "@/server/renderer/catalog/modeloNormalRegistry";
import { previaDaAlteracao } from "@/server/renderer/catalog/alteracoes";
import { alteracoesDe } from "@/server/renderer/catalog/alteracoes/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/[category]?estilo=CLASSICO_COMPLETO
 *
 * O MODELO DE LAUDO de uma categoria — o padrão, os cenários e as alterações.
 *
 * Existe para a web construir laudo por CLIQUES sem uma segunda cópia da
 * redação clínica. Hoje a web tem o próprio motor determinístico, com o próprio
 * texto: é a terceira cópia das mesmas frases, e a que diverge primeiro. Esta
 * rota entrega o modelo canônico, derivado dos renderers de produção.
 *
 * Não recebe identidade de usuário e não toca o banco: é função pura de
 * (categoria, estilo). A personalização do médico NÃO passa por aqui — ela é
 * dado de usuário e depende de contas unificadas.
 *
 * Auth: `Authorization: Bearer <CATALOG_SERVICE_TOKEN>` — ver `catalog-api/auth`.
 */
export async function GET(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const auth = autorizarServico(req);
  if (!auth.ok) return Response.json({ error: auth.erro }, { status: auth.status });

  const { category } = await ctx.params;
  const estilo = new URL(req.url).searchParams.get("estilo") ?? "CLASSICO_COMPLETO";
  if (!ehEstiloVivo(estilo)) {
    return Response.json(
      { error: "estilo desconhecido", suportados: ["CLASSICO_COMPLETO", "OBJETIVO"] },
      { status: 400 },
    );
  }

  const entrada = resolveCatalogo(category, estilo);
  if (!entrada) return Response.json({ error: "categoria sem modelo" }, { status: 404 });

  const padrao = laudoPadraoDe(category, estilo);
  if (!padrao) return Response.json({ error: "o modelo não pôde ser derivado" }, { status: 404 });

  /**
   * A projeção do catálogo é o que descreve as FRASES e o que é editável. Ela
   * é a mesma que a Biblioteca dos apps consome — uma fonte só para as três
   * superfícies.
   */
  const descricao = describeCatalog(
    entrada.catalog,
    [
      {
        nome: "Modelo padrão",
        ctx: {
          findings: entrada.samples[0]!.findings as never,
          fetoIndex: 0,
          gemelar: false,
          flags: flagsDeProducao(),
        },
      },
    ],
    entrada.renderizarExemplo,
  );

  /**
   * As ALTERAÇÕES, com a prévia do que cada uma muda. `previaDaAlteracao`
   * devolve `null` quando o cenário não renderiza — e some da lista, em vez de
   * aparecer vazia e ser clicada.
   */
  const alteracoes = alteracoesDe(category)
    .map((s) => previaDaAlteracao(category, estilo, s))
    .filter((p) => p !== null);

  const cenarios = cenariosDe(category)
    .map((c) => ({ nome: c.nome, laudo: laudoDoCenario(category, estilo, c.seed) }))
    .filter((c): c is { nome: string; laudo: string } => c.laudo !== null);

  return Response.json({
    categoria: category,
    estilo,
    catalog_id: entrada.catalog.id,
    versao: entrada.catalog.versao,
    /** O laudo normal, com os dados já como lacuna. */
    modelo_padrao: padrao,
    /** As variantes de exame da categoria (trimestres, por exemplo). */
    cenarios,
    /** Frases, variantes, obrigatoriedade e o que é editável. */
    catalogo: descricao,
    alteracoes,
  });
}
