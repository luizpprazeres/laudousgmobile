/**
 * "Publicar agora" (F2: só foto, só sob comando do admin). Sequência:
 *   conta + token válido → trava approved → publishing (UPDATE condicional, atômico)
 *   → container → espera FINISHED → media_publish → permalink → published.
 * Erro → failed com last_error curto (sem token) e attempts + 1. Depois que o media_publish
 * respondeu com o id, o post nunca volta para failed (evita publicar duas vezes).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { colunas } from "../data/colunas";
import type { ConfigServidor } from "../env";
import { clienteServico } from "../supabase/clientes";
import { decifrar } from "./cifra";
import type { RepositorioConta } from "./conta";
import { fonteImagensSocial } from "./csp";
import { ErroInstagram, limpar, publicarFoto, type OpcoesPublicacao, type Publicado } from "./instagram";
import { legendaFinal } from "./regras";

export interface PostTravado {
  id: string;
  caption: string;
  hashtags: string;
  alt_text: string;
  attempts: number;
}

export interface RepositorioPublicacao {
  /** approved + image → publishing. null = não estava aprovado (ou já está sendo publicado). */
  travar(id: string): Promise<PostTravado | null>;
  /** Imagem do slide 1 (URL pública do bucket `social`). */
  imagem(id: string): Promise<{ public_url: string; alt_text: string } | null>;
  /** publishing → published. false = a linha não estava mais em publishing. */
  concluir(id: string, r: Publicado & { publishedAt: string }): Promise<boolean>;
  /** publishing → failed. */
  falhar(id: string, erro: string, tentativas: number): Promise<void>;
}

export type ResultadoPublicacao = "publicado" | "status" | "sem_conta" | "token_vencido" | "token_invalido" | "falhou" | "incerto" | "registro";

export interface DependenciasPublicacao {
  repo: RepositorioPublicacao;
  conta: RepositorioConta;
  chave: Buffer;
  opcoes: OpcoesPublicacao;
  agora?: () => number;
}

const LIMITE_ERRO = 300;

export async function publicarPost(id: string, d: DependenciasPublicacao): Promise<{ resultado: ResultadoPublicacao; permalink?: string | null }> {
  const agora = d.agora ?? Date.now;
  // Conta e token ANTES da trava: sem conta o post continua aprovado, sem virar falha.
  const conta = await d.conta.lerComToken();
  if (!conta) return { resultado: "sem_conta" };
  if (conta.expiraEm && Date.parse(conta.expiraEm) <= agora()) return { resultado: "token_vencido" };
  let token: string;
  try {
    token = decifrar(conta.tokenCifrado, d.chave);
  } catch {
    return { resultado: "token_invalido" };
  }

  const post = await d.repo.travar(id);
  if (!post) return { resultado: "status" };

  let publicado: Publicado;
  try {
    const img = await d.repo.imagem(id);
    if (!img) throw new ErroInstagram("container", "o slide 1 não tem imagem pública do bucket social");
    publicado = await publicarFoto(
      { igUserId: conta.igUserId, token, imageUrl: img.public_url, legenda: legendaFinal(post.caption, post.hashtags), alt: img.alt_text || post.alt_text },
      { ...d.opcoes, agora },
    );
  } catch (e) {
    const incerto = e instanceof ErroInstagram && e.incerto;
    const base = e instanceof ErroInstagram ? e.message : "erro interno ao preparar a publicação";
    const msg = limpar(`${incerto ? "Resultado incerto, confira no Instagram antes de tentar de novo. " : ""}${base}`, [token]).slice(0, LIMITE_ERRO);
    try {
      await d.repo.falhar(id, msg, post.attempts + 1);
    } catch {
      console.warn("[social] publicar_falhar_nao_gravou");
    }
    return { resultado: incerto ? "incerto" : "falhou" };
  }

  try {
    const ok = await d.repo.concluir(id, { ...publicado, publishedAt: new Date(agora()).toISOString() });
    if (!ok) return { resultado: "registro", permalink: publicado.permalink };
  } catch {
    // Já saiu no Instagram: o post fica travado em "publishing" (nunca volta para failed).
    console.warn("[social] publicar_registro_falhou");
    return { resultado: "registro", permalink: publicado.permalink };
  }
  return { resultado: "publicado", permalink: publicado.permalink };
}

export function repositorioPublicacao(cfg: ConfigServidor, sb: SupabaseClient = clienteServico(cfg)): RepositorioPublicacao {
  const prefixo = fonteImagensSocial(cfg.supabaseUrl);
  return {
    async travar(id) {
      // UPDATE ... WHERE status = 'approved' AND format = 'image' RETURNING: só uma requisição vence.
      const { data, error } = await sb
        .from("social_posts")
        .update({ status: "publishing" })
        .eq("id", id)
        .eq("status", "approved")
        .eq("format", "image")
        .select(colunas("social_posts"));
      if (error) throw new Error("social_posts: trava falhou");
      const r = (data ?? [])[0] as unknown as PostTravado | undefined;
      return r ? { id: r.id, caption: r.caption, hashtags: r.hashtags, alt_text: r.alt_text, attempts: r.attempts } : null;
    },
    async imagem(id) {
      const { data, error } = await sb.from("social_media_items").select(colunas("social_media_items")).eq("post_id", id).eq("position", 1).maybeSingle();
      if (error) throw new Error("social_media_items indisponível");
      const r = data as { public_url: string | null; alt_text: string } | null;
      // Só publica imagem do nosso bucket público.
      if (!r?.public_url || !prefixo || !r.public_url.startsWith(prefixo)) return null;
      return { public_url: r.public_url, alt_text: r.alt_text ?? "" };
    },
    async concluir(id, r) {
      const { data, error } = await sb
        .from("social_posts")
        .update({ status: "published", ig_media_id: r.mediaId, permalink: r.permalink, published_at: r.publishedAt, last_error: null })
        .eq("id", id)
        .eq("status", "publishing")
        .select(colunas("social_posts"));
      if (error) throw new Error("social_posts: conclusão falhou");
      return (data ?? []).length === 1;
    },
    async falhar(id, erro, tentativas) {
      const { error } = await sb.from("social_posts").update({ status: "failed", last_error: erro, attempts: tentativas }).eq("id", id).eq("status", "publishing");
      if (error) throw new Error("social_posts: registro da falha não gravou");
    },
  };
}
