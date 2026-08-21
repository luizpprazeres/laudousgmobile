/**
 * A BIBLIOTECA — o cliente de servidor que fala com as rotas do médico.
 *
 * Diferente do catálogo (`lib/catalog/cliente.ts`), que usa um token de SISTEMA
 * porque serve texto igual para todo mundo, aqui tudo é do médico: o modelo que
 * ele vê, o rascunho que ele salva, o que ele publica. As rotas do `apps/api`
 * autenticam com o JWT dele (`verifyJwt`), e é esse JWT que este módulo
 * repassa.
 *
 * O proxy existe pelo mesmo motivo do outro: a URL da API e a sessão ficam no
 * servidor, e o navegador conversa só com o próprio domínio.
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";

export type {
  CategoriaDaBiblioteca,
  LinhaDoModelo,
  ModeloProjetado,
  Operation,
  VersaoPersonalizacao,
} from "./tipos";
import type { Operation } from "./tipos";

export type Resposta =
  | { ok: true; status: number; corpo: unknown }
  | { ok: false; status: number; erro: string };

function baseDaApi(): string | null {
  const b = process.env.CATALOG_API_URL?.trim();
  return b ? b.replace(/\/+$/, "") : null;
}

/**
 * O token do médico, do lado do servidor.
 *
 * `getSession()` e não `getUser()`: o primeiro traz o `access_token`, que é o
 * que a API espera no Authorization. O segundo só confirma quem é.
 */
async function tokenDoMedico(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function chamar(caminho: string, init?: RequestInit): Promise<Resposta> {
  const base = baseDaApi();
  if (!base) {
    /**
     * FAIL-CLOSED, e sem cair para nada. A Biblioteca sem a API não tem meio
     * modelo para mostrar — mostrar o modelo errado seria pior que não mostrar.
     */
    return { ok: false, status: 503, erro: "Biblioteca indisponível: serviço não configurado." };
  }
  const jwt = await tokenDoMedico();
  if (!jwt) return { ok: false, status: 401, erro: "Sessão expirada. Entre de novo." };

  let resposta: Response;
  try {
    resposta = await fetch(`${base}${caminho}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, erro: "Biblioteca indisponível: sem resposta do serviço." };
  }

  const corpo = await resposta.json().catch(() => null);
  /**
   * O status do upstream ATRAVESSA. O 403 de quem está fora da allowlist de
   * publicação e o 409 de conflito de versão trazem informação que a tela
   * precisa mostrar — trocar por "erro ao salvar" apagaria justamente o que o
   * médico tem de ler.
   */
  return { ok: true, status: resposta.status, corpo };
}

/** As 13 categorias, com o estado da personalização em cada uma. */
export function listarCategorias() {
  return chamar("/api/me/report-customizations");
}

/** O modelo de uma categoria: projeção, rascunho, publicado e histórico. */
export function lerCategoria(categoria: string, estilo: string) {
  return chamar(
    `/api/me/report-customizations/${encodeURIComponent(categoria)}?estilo=${encodeURIComponent(estilo)}`,
  );
}

/** Salva o RASCUNHO. Não muda laudo nenhum até publicar. */
export function salvarRascunho(
  categoria: string,
  estilo: string,
  operations: Operation[],
  note?: string | null,
) {
  return chamar(
    `/api/me/report-customizations/${encodeURIComponent(categoria)}?estilo=${encodeURIComponent(estilo)}`,
    { method: "PUT", body: JSON.stringify({ operations, note: note ?? null }) },
  );
}

/** Descarta o rascunho e volta ao publicado (ou ao modelo-base). */
export function descartarRascunho(categoria: string, estilo: string) {
  return chamar(
    `/api/me/report-customizations/${encodeURIComponent(categoria)}?estilo=${encodeURIComponent(estilo)}`,
    { method: "DELETE" },
  );
}

/**
 * PUBLICA — é aqui que a redação passa a valer nos laudos.
 *
 * Responde 403 para quem está fora da allowlist. Não é erro da tela: é a
 * decisão de produto de que a personalização vale para um médico por vez,
 * enquanto o recurso amadurece.
 */
export function publicar(categoria: string, estilo: string) {
  return chamar(
    `/api/me/report-customizations/${encodeURIComponent(categoria)}/publish?estilo=${encodeURIComponent(estilo)}`,
    { method: "POST" },
  );
}

/**
 * DESPUBLICA — o laudo volta ao modelo da casa, byte a byte.
 *
 * Nunca é barrado, mesmo para quem não pode publicar: sair da personalização
 * tem de ser sempre possível. Se ligar exige allowlist e desligar também, um
 * médico ficaria preso a uma redação que não quer mais.
 */
export function despublicar(categoria: string, estilo: string) {
  return chamar(
    `/api/me/report-customizations/${encodeURIComponent(categoria)}/publish?estilo=${encodeURIComponent(estilo)}`,
    { method: "DELETE" },
  );
}

/** Volta a uma versão anterior do histórico. */
export function restaurar(categoria: string, estilo: string, versao: number) {
  return chamar(
    `/api/me/report-customizations/${encodeURIComponent(categoria)}/restore?estilo=${encodeURIComponent(estilo)}`,
    { method: "POST", body: JSON.stringify({ versao }) },
  );
}
