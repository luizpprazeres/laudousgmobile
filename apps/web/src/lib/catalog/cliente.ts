/**
 * O CLIENTE DO CATÁLOGO — como a web fala com o renderer canônico.
 *
 * Este módulo é **só de servidor**. Ele existe para que a web monte laudo sem
 * ter uma segunda cópia da redação clínica: em vez de compor o texto no
 * navegador, ela manda o que o médico clicou e digitou para
 * `GET/POST /api/catalog/...` do `apps/api`, que responde com o laudo montado
 * pelo mesmo renderer que serve o iOS e o Android.
 *
 * ## Duas autenticações, e as duas são necessárias
 *
 * 1. **O médico** — quem chama as rotas desta web precisa ter sessão. O
 *    catálogo é a redação clínica proprietária da casa, inteira; uma rota
 *    aberta convida raspagem. Quem confere isso são os route handlers.
 * 2. **O serviço** — o `apps/api` exige `CATALOG_SERVICE_TOKEN`. Ele vive só
 *    aqui, no servidor, e **nunca** chega ao navegador. É por isso que existe
 *    este proxy em vez de o cliente chamar a API diretamente.
 *
 * ## Fail-closed
 *
 * Sem `CATALOG_API_URL` ou sem `CATALOG_SERVICE_TOKEN`, o catálogo responde
 * indisponível. Não há degradação para o motor local: cair de volta na
 * composição do navegador seria voltar em silêncio à segunda fonte de texto
 * clínico, que é justamente o que esta migração tira do caminho.
 */

import "server-only";

export type RespostaCatalogo =
  | { ok: true; status: number; corpo: unknown }
  | { ok: false; status: number; erro: string };

function configuracao(): { base: string; token: string } | null {
  const base = process.env.CATALOG_API_URL?.trim();
  const token = process.env.CATALOG_SERVICE_TOKEN?.trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/+$/, ""), token };
}

/**
 * As categorias que a web já pede ao catálogo.
 *
 * Uma allowlist, e não um passe-livre para qualquer string do cliente: o
 * `category` vai para dentro de uma URL, e a migração é feita **uma categoria
 * por vez** (§3.2 do plano). Uma categoria que ainda não foi provada contra o
 * caminho canônico não deve ser alcançável só porque alguém digitou o nome dela
 * na barra de endereços.
 */
/**
 * A lista vive em `./migradas` — este módulo é `server-only`, e o compositor
 * local (no cliente) precisa consultá-la para se recusar a rodar no que já
 * migrou.
 */
export { CATEGORIAS_MIGRADAS, categoriaMigrada } from "./migradas";

/**
 * O estilo do piloto.
 *
 * Travado no servidor, não escondido na tela. O estilo objetivo tem três
 * defeitos que não são deste piloto — o título não identifica o Doppler, o
 * TI-RADS ditado não vence o cálculo, e ele afirma "Não há evidência de
 * linfonodomegalias" mesmo quando a cadeia não foi avaliada. Esconder o seletor
 * deixaria a rota aceitar `OBJETIVO` de qualquer jeito.
 */
export const ESTILO_DO_PILOTO = "CLASSICO_COMPLETO";

async function chamar(caminho: string, init?: RequestInit): Promise<RespostaCatalogo> {
  const cfg = configuracao();
  if (!cfg) {
    return { ok: false, status: 503, erro: "catálogo indisponível: serviço não configurado" };
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${cfg.base}${caminho}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch {
    /**
     * A API fora do ar não pode virar laudo. Ver o comentário de fail-closed no
     * topo: o silêncio aqui reintroduziria a segunda fonte de texto.
     */
    return { ok: false, status: 503, erro: "catálogo indisponível: sem resposta do serviço" };
  }

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    /**
     * O erro do upstream ATRAVESSA com o corpo original. O 409 de combinação
     * impossível traz os conflitos nomeados, e a tela precisa deles para dizer
     * ao médico o que não combina — trocar por "erro ao gerar" apagaria a única
     * informação útil da resposta.
     */
    return { ok: true, status: resposta.status, corpo };
  }

  return { ok: true, status: resposta.status, corpo };
}

/** O modelo da categoria: padrão, cenários, projeção e alterações com lacunas. */
export function buscarCatalogo(categoria: string, estilo = ESTILO_DO_PILOTO) {
  return chamar(`/api/catalog/${encodeURIComponent(categoria)}?estilo=${encodeURIComponent(estilo)}`);
}

/** O LAUDO das alterações escolhidas e do que o médico digitou. */
export function renderizar(
  categoria: string,
  corpo: { estilo?: string; alteracoes?: string[]; dados?: Record<string, unknown> },
) {
  return chamar(`/api/catalog/${encodeURIComponent(categoria)}/render`, {
    method: "POST",
    body: JSON.stringify({ ...corpo, estilo: ESTILO_DO_PILOTO }),
  });
}
