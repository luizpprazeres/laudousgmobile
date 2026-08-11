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
import { CustomizationError, type Chave } from "./store";

export type Contexto = {
  chave: Chave;
  entrada: EntradaCatalogo;
};

/**
 * Resolve usuário + categoria + estilo, ou devolve a Response de erro pronta.
 * O caller distingue pelo `"erro" in r`.
 */
export async function resolverContexto(
  req: Request,
  category: string,
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

  const entrada = resolveCatalogo(category, estilo);
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

  return {
    chave: { userId: user.id, categoryCode: category, styleCode: estilo },
    entrada,
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
