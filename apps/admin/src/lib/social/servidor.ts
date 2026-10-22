/**
 * Acesso ao banco e ao Storage do agendador — só no servidor, com service role, sempre DEPOIS da
 * checagem de admin. Leitura pela allowlist de colunas; escrita só pelas funções da migração.
 */
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { colunas } from "../data/colunas";
import type { ConfigServidor } from "../env";
import { clienteServico } from "../supabase/clientes";
import { BUCKET_SOCIAL, urlPublicaSocial } from "./csp";
import type { Edicao } from "./regras";
import type { Formato, LinhaItem, LinhaPost, PostImportado, ResultadoImportacao } from "./tipos";

export type ResultadoAcao = "ok" | "nao_encontrado" | "status" | "slide" | "limite" | "sem_imagem" | "slides" | "passado" | "falha";

export interface RepositorioSocial {
  formato(id: string): Promise<Formato | null>;
  importar(posts: PostImportado[]): Promise<ResultadoImportacao>;
  salvar(id: string, e: Edicao): Promise<ResultadoAcao>;
  mover(id: string, posicao: number, delta: -1 | 1): Promise<ResultadoAcao>;
  mudarStatus(id: string, status: "approved" | "draft"): Promise<ResultadoAcao>;
  /** Envia o JPEG (já validado) e liga ao slide; apaga o arquivo anterior ou o novo, se não ligou. */
  enviarImagem(id: string, posicao: number, bytes: Uint8Array): Promise<ResultadoAcao>;
}

const ACOES = new Set<ResultadoAcao>(["ok", "nao_encontrado", "status", "slide", "limite", "sem_imagem", "slides", "passado"]);
const acao = (v: unknown): ResultadoAcao => (typeof v === "string" && ACOES.has(v as ResultadoAcao) ? (v as ResultadoAcao) : "falha");

async function apagar(sb: SupabaseClient, caminhos: string[]): Promise<void> {
  if (!caminhos.length) return;
  const { error } = await sb.storage.from(BUCKET_SOCIAL).remove(caminhos);
  if (error) console.warn("[social] storage_remove_failed");
}

export function repositorioSocial(cfg: ConfigServidor, sb: SupabaseClient = clienteServico(cfg)): RepositorioSocial {
  return {
    async formato(id) {
      const { data, error } = await sb.from("social_posts").select(colunas("social_posts")).eq("id", id).maybeSingle();
      return error || !data ? null : (data as unknown as LinhaPost).format;
    },
    async importar(posts) {
      const { data, error } = await sb.rpc("social_import", { p_posts: posts });
      if (error) throw new Error("social_import falhou");
      const r = data as ResultadoImportacao;
      await apagar(sb, r.orfaos ?? []);
      return { criados: r.criados, atualizados: r.atualizados, preservados: r.preservados, orfaos: r.orfaos ?? [] };
    },
    async salvar(id, e) {
      const { data, error } = await sb.rpc("social_save_post", {
        p_id: id, p_scheduled_at: e.scheduled_at, p_caption: e.caption, p_hashtags: e.hashtags, p_alt_text: e.alt_text, p_slide_alts: e.slide_alts,
      });
      return error ? "falha" : acao(data);
    },
    async mover(id, posicao, delta) {
      const { data, error } = await sb.rpc("social_move_item", { p_id: id, p_position: posicao, p_delta: delta });
      return error ? "falha" : acao(data);
    },
    async mudarStatus(id, status) {
      const { data, error } = await sb.rpc("social_set_status", { p_id: id, p_status: status });
      return error ? "falha" : acao(data);
    },
    async enviarImagem(id, posicao, bytes) {
      const caminho = `posts/${id}/${randomBytes(16).toString("hex")}.jpg`;
      const url = urlPublicaSocial(cfg.supabaseUrl, caminho);
      if (!url) return "falha";
      const up = await sb.storage.from(BUCKET_SOCIAL).upload(caminho, bytes, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (up.error) return "falha";
      const { data, error } = await sb.rpc("social_set_media", { p_id: id, p_position: posicao, p_storage_path: caminho, p_public_url: url });
      const r = (data ?? {}) as { resultado?: string; anterior?: string | null };
      if (error || r.resultado !== "ok") {
        await apagar(sb, [caminho]);
        return error ? "falha" : acao(r.resultado);
      }
      if (r.anterior) await apagar(sb, [r.anterior]);
      return "ok";
    },
  };
}

/** Leituras das telas. */
export async function listarPosts(cfg: ConfigServidor, inicio: string, fim: string): Promise<{ posts: LinhaPost[]; itens: LinhaItem[] }> {
  const sb = clienteServico(cfg);
  const { data, error } = await sb.from("social_posts").select(colunas("social_posts")).gte("scheduled_at", inicio).lt("scheduled_at", fim).order("scheduled_at").limit(1000);
  if (error) throw new Error("social_posts indisponível");
  const posts = (data ?? []) as unknown as LinhaPost[];
  if (!posts.length) return { posts, itens: [] };
  const r = await sb.from("social_media_items").select(colunas("social_media_items")).in("post_id", posts.map((p) => p.id)).order("position").limit(5000);
  if (r.error) throw new Error("social_media_items indisponível");
  return { posts, itens: (r.data ?? []) as unknown as LinhaItem[] };
}

export async function lerPost(cfg: ConfigServidor, id: string): Promise<{ post: LinhaPost; itens: LinhaItem[] } | null> {
  const sb = clienteServico(cfg);
  const { data, error } = await sb.from("social_posts").select(colunas("social_posts")).eq("id", id).maybeSingle();
  if (error) throw new Error("social_posts indisponível");
  if (!data) return null;
  const r = await sb.from("social_media_items").select(colunas("social_media_items")).eq("post_id", id).order("position");
  if (r.error) throw new Error("social_media_items indisponível");
  return { post: data as unknown as LinhaPost, itens: (r.data ?? []) as unknown as LinhaItem[] };
}

/** Primeiro post a partir de um instante (para sugerir a semana certa quando a atual está vazia). */
export async function proximoPost(cfg: ConfigServidor, desde: string): Promise<string | null> {
  const { data, error } = await clienteServico(cfg).from("social_posts").select(colunas("social_posts")).gte("scheduled_at", desde).order("scheduled_at").limit(1);
  if (error || !data?.length) return null;
  return (data[0] as unknown as LinhaPost).scheduled_at;
}

/** Faixa "Para publicar à mão agora": manuais aprovados com horário entre `desde` e `ate`. */
export async function listarManuaisAgora(cfg: ConfigServidor, desde: string, ate: string): Promise<{ posts: LinhaPost[]; itens: LinhaItem[] }> {
  const sb = clienteServico(cfg);
  const { data, error } = await sb
    .from("social_posts")
    .select(colunas("social_posts"))
    .eq("status", "approved")
    .eq("manual", true)
    .gte("scheduled_at", desde)
    .lte("scheduled_at", ate)
    .order("scheduled_at")
    .limit(20);
  if (error) throw new Error("social_posts indisponível");
  const posts = (data ?? []) as unknown as LinhaPost[];
  if (!posts.length) return { posts, itens: [] };
  const r = await sb.from("social_media_items").select(colunas("social_media_items")).in("post_id", posts.map((p) => p.id)).order("position").limit(100);
  if (r.error) throw new Error("social_media_items indisponível");
  return { posts, itens: (r.data ?? []) as unknown as LinhaItem[] };
}
