/**
 * Publicação de um post aprovado (foto, carrossel ou story), pelo "Publicar agora" (modo manual) ou
 * pelo cron (modo cron). Sequência:
 *   conta + token válido → trava approved → publishing (UPDATE condicional, atômico)
 *   → containers → espera FINISHED → marca publish_requested_at → media_publish → permalink → published.
 *
 * Política de falha (F3):
 *  - limite de 24 h atingido → volta para approved SEM contar tentativa (nos dois modos);
 *  - falha ANTES do media_publish → cron: approved com attempts + 1 (na 3ª, failed); manual: failed;
 *  - depois que o media_publish foi pedido (publish_requested_at gravado) → nunca volta para approved:
 *    sem resposta/5xx → failed com "Resultado incerto"; outro erro → failed. A volta para approved
 *    exige publish_requested_at IS NULL também no banco.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { colunas } from "../data/colunas";
import type { ConfigServidor } from "../env";
import { clienteServico } from "../supabase/clientes";
import { decifrar } from "./cifra";
import type { RepositorioConta } from "./conta";
import { fonteImagensSocial } from "./csp";
import { ErroInstagram, LimiteAtingido, limpar, publicarMidia, type OpcoesPublicacao, type Publicado } from "./instagram";
import { MAX_TENTATIVAS } from "./politica";
import { legendaFinal } from "./regras";
import type { Formato } from "./tipos";

export interface PostTravado {
  id: string;
  format: Formato;
  caption: string;
  hashtags: string;
  alt_text: string;
  attempts: number;
}

export interface ItemPublicavel {
  position: number;
  public_url: string;
  alt_text: string;
}

/** Só no cron: a trava também exige o horário dentro da janela automática. */
export interface FiltroTrava {
  /** scheduled_at <= ate (ISO). */
  ate: string;
  /** scheduled_at >= desde (ISO). */
  desde: string;
}

export interface RepositorioPublicacao {
  /** approved + manual=false → publishing (zera publish_requested_at). null = não estava apto. */
  travar(id: string, filtro?: FiltroTrava): Promise<PostTravado | null>;
  /** Imagens na ordem dos slides; null se faltar alguma ou alguma não for do bucket `social`. */
  itens(id: string): Promise<ItemPublicavel[] | null>;
  /** publishing + publish_requested_at null → grava o instante. false = não gravou (não publicar). */
  marcarPublish(id: string, quando: string): Promise<boolean>;
  /** publishing → published. false = a linha não estava mais em publishing. */
  concluir(id: string, r: Publicado & { publishedAt: string }): Promise<boolean>;
  /** publishing → failed. */
  falhar(id: string, erro: string, tentativas: number): Promise<void>;
  /** publishing → approved, só se o media_publish não foi pedido (publish_requested_at null). */
  devolver(id: string, erro: string, tentativas: number): Promise<void>;
  /** Fila do cron: approved, manual=false, desde <= scheduled_at <= ate, por horário. */
  fila(ate: string, desde: string, limite: number): Promise<string[]>;
}

export type ResultadoPublicacao =
  | "publicado"
  | "status"
  | "sem_conta"
  | "token_vencido"
  | "token_invalido"
  | "limite"
  | "nova_tentativa"
  | "falhou"
  | "incerto"
  | "registro";

export type ModoPublicacao = "manual" | "cron";

export interface DependenciasPublicacao {
  repo: RepositorioPublicacao;
  conta: RepositorioConta;
  chave: Buffer;
  opcoes: OpcoesPublicacao;
  agora?: () => number;
  modo?: ModoPublicacao;
  filtro?: FiltroTrava;
}

const LIMITE_ERRO = 300;
const INCERTO = "Resultado incerto, confira no Instagram antes de tentar de novo.";

export async function publicarPost(id: string, d: DependenciasPublicacao): Promise<{ resultado: ResultadoPublicacao; permalink?: string | null }> {
  const agora = d.agora ?? Date.now;
  const modo = d.modo ?? "manual";
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

  const post = await d.repo.travar(id, d.filtro);
  if (!post) return { resultado: "status" };

  let publishPedido = false;
  let publicado: Publicado;
  try {
    const itens = await d.repo.itens(id);
    if (!itens || itens.length === 0) throw new ErroInstagram("container", "falta imagem pública do bucket social em algum slide");
    const unico = itens.length === 1;
    publicado = await publicarMidia(
      {
        igUserId: conta.igUserId,
        token,
        formato: post.format,
        itens: itens.map((i) => ({ imageUrl: i.public_url, alt: i.alt_text || (unico ? post.alt_text : "") })),
        legenda: post.format === "story" ? "" : legendaFinal(post.caption, post.hashtags),
        antesDePublicar: async () => {
          let ok = false;
          try {
            ok = await d.repo.marcarPublish(id, new Date(agora()).toISOString());
          } catch {
            ok = false;
          }
          if (!ok) throw new ErroInstagram("publicar", "o banco não registrou o pedido de publicação; nada foi publicado");
          publishPedido = true;
        },
      },
      { ...d.opcoes, agora },
    );
  } catch (e) {
    const base = e instanceof ErroInstagram ? e.message : "erro interno ao preparar a publicação";
    const curto = (t: string) => limpar(t, [token]).slice(0, LIMITE_ERRO);
    const tentativas = post.attempts + 1;
    const gravar = async (f: () => Promise<void>) => {
      try {
        await f();
      } catch {
        console.warn("[social] publicar_estado_nao_gravou");
      }
    };
    // Limite: não é falha do post. Volta para a fila sem contar tentativa.
    if (e instanceof LimiteAtingido && !publishPedido) {
      await gravar(() => d.repo.devolver(id, curto(`Aguardando: ${base}`), post.attempts));
      return { resultado: "limite" };
    }
    // Depois do pedido de publish (ou se a própria API sinalizou incerteza): nunca volta para approved.
    const incerto = e instanceof ErroInstagram && e.incerto;
    if (publishPedido || incerto) {
      await gravar(() => d.repo.falhar(id, curto(`${incerto ? `${INCERTO} ` : ""}${base}`), tentativas));
      return { resultado: incerto ? "incerto" : "falhou" };
    }
    if (modo === "cron" && tentativas < MAX_TENTATIVAS) {
      await gravar(() => d.repo.devolver(id, curto(`Tentativa ${tentativas}/${MAX_TENTATIVAS} falhou: ${base}`), tentativas));
      return { resultado: "nova_tentativa" };
    }
    await gravar(() => d.repo.falhar(id, curto(modo === "cron" ? `Tentativa ${tentativas}/${MAX_TENTATIVAS} falhou: ${base}` : base), tentativas));
    return { resultado: "falhou" };
  }

  try {
    const ok = await d.repo.concluir(id, { ...publicado, publishedAt: new Date(agora()).toISOString() });
    if (!ok) return { resultado: "registro", permalink: publicado.permalink };
  } catch {
    // Já saiu no Instagram: o post fica em "publishing" com publish_requested_at (nunca volta para a fila).
    console.warn("[social] publicar_registro_falhou");
    return { resultado: "registro", permalink: publicado.permalink };
  }
  return { resultado: "publicado", permalink: publicado.permalink };
}

export const FORMATOS_API = ["image", "carousel", "story"] as const;

export function repositorioPublicacao(cfg: ConfigServidor, sb: SupabaseClient = clienteServico(cfg)): RepositorioPublicacao {
  const prefixo = fonteImagensSocial(cfg.supabaseUrl);
  return {
    async travar(id, filtro) {
      // UPDATE ... WHERE status = 'approved' AND manual = false AND format IN (...) RETURNING: só um vence.
      let q = sb
        .from("social_posts")
        .update({ status: "publishing", publish_requested_at: null })
        .eq("id", id)
        .eq("status", "approved")
        .eq("manual", false)
        .in("format", [...FORMATOS_API]);
      if (filtro) q = q.lte("scheduled_at", filtro.ate).gte("scheduled_at", filtro.desde);
      const { data, error } = await q.select(colunas("social_posts"));
      if (error) throw new Error("social_posts: trava falhou");
      const r = (data ?? [])[0] as unknown as PostTravado | undefined;
      return r ? { id: r.id, format: r.format, caption: r.caption, hashtags: r.hashtags, alt_text: r.alt_text, attempts: r.attempts } : null;
    },
    async itens(id) {
      const { data, error } = await sb.from("social_media_items").select(colunas("social_media_items")).eq("post_id", id).order("position");
      if (error) throw new Error("social_media_items indisponível");
      const linhas = (data ?? []) as unknown as { position: number; public_url: string | null; alt_text: string }[];
      // Só publica imagem do nosso bucket público, e todas precisam estar lá.
      if (!prefixo || linhas.some((r) => !r.public_url || !r.public_url.startsWith(prefixo))) return null;
      return linhas.map((r) => ({ position: r.position, public_url: r.public_url!, alt_text: r.alt_text ?? "" }));
    },
    async marcarPublish(id, quando) {
      const { data, error } = await sb
        .from("social_posts")
        .update({ publish_requested_at: quando })
        .eq("id", id)
        .eq("status", "publishing")
        .is("publish_requested_at", null)
        .select(colunas("social_posts"));
      if (error) throw new Error("social_posts: marcador do publish não gravou");
      return (data ?? []).length === 1;
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
    async devolver(id, erro, tentativas) {
      const { error } = await sb
        .from("social_posts")
        .update({ status: "approved", last_error: erro, attempts: tentativas })
        .eq("id", id)
        .eq("status", "publishing")
        .is("publish_requested_at", null);
      if (error) throw new Error("social_posts: devolução para a fila não gravou");
    },
    async fila(ate, desde, limite) {
      const { data, error } = await sb
        .from("social_posts")
        .select(colunas("social_posts"))
        .eq("status", "approved")
        .eq("manual", false)
        .in("format", [...FORMATOS_API])
        .lte("scheduled_at", ate)
        .gte("scheduled_at", desde)
        .order("scheduled_at", { ascending: true })
        .limit(limite);
      if (error) throw new Error("social_posts: fila indisponível");
      return ((data ?? []) as unknown as { id: string }[]).map((r) => r.id);
    },
  };
}
