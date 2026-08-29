/**
 * Cola entre as rotas HTTP e o store da personalização.
 *
 * Existe para que as três rotas (`/`, `/publish`, `/restore`) resolvam a chave
 * e traduzam erros do mesmo jeito — divergência aqui viraria uma rota que
 * aceita o que a outra recusa.
 */

import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import {
  categoriasComCatalogo,
  ehEstiloVivo,
  estilosComCatalogo,
  paresComCatalogo,
  resolveCatalogo,
  type EntradaCatalogo,
} from "@/server/renderer/catalog/registry";
import { contextoDeRender } from "@/server/renderer/catalog/contextoDeRender";
import type { ContextoDeRender } from "@/server/renderer/catalog/modeloNormalRegistry";
import { CustomizationError, type Chave } from "./store";
import { personalizacaoAtiva } from "./ativa";

export type Contexto = {
  chave: Chave;
  entrada: EntradaCatalogo;
  /**
   * O que o renderer precisa e não está no código — hoje só a máscara do
   * abdome. Sai junto porque quem renderiza DE NOVO precisa dele: a coluna de
   * exemplo da Biblioteca chama `laudoPadraoDe` outra vez, e sem o contexto
   * mostraria o modelo com o exemplo vazio.
   */
  contexto: ContextoDeRender;
};

/**
 * Resolve usuário + categoria + estilo, ou devolve a Response de erro pronta.
 * O caller distingue pelo `"erro" in r`.
 */
export async function resolverContexto(
  req: Request,
  category: string,
  /**
   * `publica: true` nas ações que MUDAM os laudos (publicar, restaurar).
   *
   * Enquanto a personalização é piloto, quem não está na allowlist não publica
   * (exigência do Codex, 19/08). O motivo não é cosmético: uma publicação
   * gravada hoje por quem não está liberado passaria a valer sozinha no dia em
   * que a flag mudasse — um laudo diferente, meses depois, sem ninguém ter
   * mexido em nada.
   *
   * O RASCUNHO continua livre para todos: é privado, não muda laudo nenhum, e
   * é como o médico prepara a redação antes de a categoria abrir.
   */
  opts: { publica?: boolean } = {},
): Promise<Contexto | { erro: Response }> {
  const user = await verifyJwt(req);
  if (!user) return { erro: unauthorized() };

  const estilo = new URL(req.url).searchParams.get("estilo") ?? "CLASSICO_COMPLETO";
  if (!ehEstiloVivo(estilo)) {
    return {
      erro: Response.json(
        { error: "estilo desconhecido", suportados: ["CLASSICO_COMPLETO", "OBJETIVO"] },
        { status: 400 },
      ),
    };
  }

  /**
   * A MÁSCARA, para as categorias que a exigem.
   *
   * Sem ela o ABDOMEN_TOTAL não produz modelo — `laudoDoCenario` devolve
   * `null`, a lista sai vazia, e a Biblioteca respondia 404 numa categoria que
   * já estava migrada no `/render`. O médico via a categoria funcionando ao
   * gerar e sumida ao personalizar.
   *
   * As outras doze não fazem consulta: `contextoDeRender` devolve `{}` e sai.
   */
  const contexto = await contextoDeRender(category, estilo);
  const entrada = resolveCatalogo(category, estilo, contexto);
  if (!entrada) {
    // A mensagem distingue os dois casos, porque a ação do médico é diferente:
    // categoria sem catálogo nenhum × categoria que tem catálogo noutro estilo.
    const outros = estilosComCatalogo(category);
    return {
      erro: Response.json(
        {
          error: outros.length > 0 ? "estilo sem catálogo nesta categoria" : "categoria sem catálogo",
          detalhe:
            "sem catálogo não há slot a que ancorar uma operação; gravar uma personalização que nada aplicaria seria pior que recusar",
          estilos_desta_categoria: outros,
          categorias_com_catalogo: categoriasComCatalogo(),
          pares_suportados: paresComCatalogo(),
        },
        { status: 404 },
      ),
    };
  }

  if (opts.publica) {
    const a = personalizacaoAtiva({ userId: user.id, categoria: category, estilo });
    if (!a.ativa) {
      return {
        erro: Response.json(
          {
            error: "publicação ainda não liberada",
            detalhe: a.explicacao,
            motivo: a.motivo,
          },
          { status: 403 },
        ),
      };
    }
  }

  return {
    chave: { userId: user.id, categoryCode: category, styleCode: estilo },
    entrada,
    /**
     * O contexto sai junto para quem for renderizar de novo — a coluna de
     * exemplo da Biblioteca faz isso, e sem ele o abdome mostraria o modelo
     * com o exemplo vazio.
     */
    contexto,
  };
}

const STATUS: Record<CustomizationError["code"], number> = {
  invalid_operations: 422,
  not_found: 404,
  conflict: 409,
  nothing_to_publish: 409,
};

/** Erro de domínio vira HTTP; qualquer outro sobe (500 com log do Next). */
export function respostaDeErro(e: unknown): Response {
  if (e instanceof CustomizationError) {
    return Response.json(
      { error: e.message, code: e.code, erros: e.detalhes ?? [] },
      { status: STATUS[e.code] },
    );
  }
  throw e;
}

export async function lerJson(req: Request): Promise<unknown | { erro: Response }> {
  try {
    return await req.json();
  } catch {
    return { erro: Response.json({ error: "json inválido" }, { status: 400 }) };
  }
}
