/**
 * Personalização de modelo de laudo — cliente da API (projeto modelos, item 6).
 *
 * O médico muda o modelo por OPERAÇÕES ancoradas em slots, não editando um
 * texto solto. É o que permite ao backend recusar uma alteração que apagaria
 * um dado obrigatório ou mascararia um achado alterado.
 *
 * Fluxo: rascunho → publicar. Só o publicado muda os laudos; o rascunho é
 * privado até a publicação. Nada aqui apaga histórico.
 */

import { z } from "zod";
import { authedFetch, readJsonOrThrow } from "./api";
import {
  EstadoSchema,
  PreviaSchema,
  VersaoSchema,
  type Operacao,
  type Previa,
  type EstadoPersonalizacao,
  type VersaoPersonalizacao,
} from "./personalizacao.schemas";

export * from "./personalizacao.schemas";

/** Erro que a interface deve MOSTRAR ao médico, com os motivos da recusa. */
export class PersonalizacaoRecusada extends Error {
  constructor(
    message: string,
    readonly erros: string[],
  ) {
    super(message);
    this.name = "PersonalizacaoRecusada";
  }
}

const BASE = "/api/me/report-customizations";

function url(categoria: string, estilo: string, sufixo = "") {
  return `${BASE}/${encodeURIComponent(categoria)}${sufixo}?estilo=${encodeURIComponent(estilo)}`;
}

/** 422 traz a lista de motivos — é ela que a tela precisa exibir, não o status. */
async function lerOuRecusar(res: Response, label: string) {
  if (res.status === 422 || res.status === 409) {
    const corpo = (await res.json().catch(() => ({}))) as { error?: string; erros?: string[] };
    throw new PersonalizacaoRecusada(corpo.error ?? label, corpo.erros ?? []);
  }
  return readJsonOrThrow(res, label);
}

export async function getPersonalizacao(
  categoria: string,
  estilo = "CLASSICO_COMPLETO",
): Promise<EstadoPersonalizacao> {
  const res = await authedFetch(url(categoria, estilo), { method: "GET" });
  return EstadoSchema.parse(await readJsonOrThrow(res, "carregar modelo"));
}

export async function salvarRascunho(
  categoria: string,
  operacoes: Operacao[],
  estilo = "CLASSICO_COMPLETO",
): Promise<{ rascunho: VersaoPersonalizacao; previa: Previa[] }> {
  const res = await authedFetch(url(categoria, estilo), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operations: operacoes }),
  });
  const json = await lerOuRecusar(res, "salvar alterações");
  return z.object({ rascunho: VersaoSchema, previa: z.array(PreviaSchema) }).parse(json);
}

export async function descartarRascunho(categoria: string, estilo = "CLASSICO_COMPLETO") {
  const res = await authedFetch(url(categoria, estilo), { method: "DELETE" });
  await readJsonOrThrow(res, "descartar alterações");
}

export async function publicar(categoria: string, estilo = "CLASSICO_COMPLETO") {
  const res = await authedFetch(url(categoria, estilo, "/publish"), { method: "POST" });
  return lerOuRecusar(res, "publicar");
}

/** Desliga: os laudos voltam ao modelo padrão. Não apaga o histórico. */
export async function desligar(categoria: string, estilo = "CLASSICO_COMPLETO") {
  const res = await authedFetch(url(categoria, estilo, "/publish"), { method: "DELETE" });
  return readJsonOrThrow(res, "desligar personalização");
}

export async function restaurarVersao(
  categoria: string,
  versao: number,
  estilo = "CLASSICO_COMPLETO",
) {
  const res = await authedFetch(url(categoria, estilo, "/restore"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ versao }),
  });
  return lerOuRecusar(res, "restaurar versão");
}

/**
 * As categorias que hoje aceitam personalização. A lista real vem do backend
 * (404 com `pares_suportados`), mas a tela precisa de algo antes da primeira
 * chamada — e uma lista curta e explícita é melhor que uma tela vazia.
 */
export const CATEGORIAS_COM_MODELO = [{ code: "OBSTETRICA", label: "Obstétrico" }];
