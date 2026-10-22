/**
 * Peças compartilhadas pelos testes do Instagram (F2 e F3): constantes, fetch simulado (nunca a rede),
 * Graph falso e repositórios em memória com a mesma semântica dos UPDATEs condicionais reais.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import type { ConfigServidor } from "../../src/lib/env";
import { cifrar } from "../../src/lib/social/cifra";
import type { ConfigInstagram } from "../../src/lib/social/config";
import type { ContaComToken, ContaPublica, NovaConta, RepositorioConta, TokenRenovado } from "../../src/lib/social/conta";
import { GRAPH_VERSAO, type Buscar } from "../../src/lib/social/instagram";
import type { ItemPublicavel, PostTravado, RepositorioPublicacao } from "../../src/lib/social/publicacao";

export const CHAVE = randomBytes(32);
export const CHAVE_B64 = CHAVE.toString("base64");
export const ADMIN = "11111111-2222-3333-4444-555555555555";
export const ORIGEM = "https://app.laudousg.com.br";
export const SECRET = "segredo-do-app-0123456789abcdef";
export const CODE = "AQBx1codigo_de_teste-0123456789";
export const TOKEN_CURTO = "IGAAcurto" + "x".repeat(60);
export const TOKEN = "IGAAlongo" + "y".repeat(120);
export const IG: ConfigInstagram = { appId: "1518730570317495", appSecret: SECRET, chave: CHAVE, redirectUri: `${ORIGEM}/admin/api/social/callback` };
export const CFG = { origemPublica: ORIGEM, supabaseUrl: "https://x.supabase.co" } as ConfigServidor;
export const T0 = Date.parse("2026-10-22T15:00:00Z");
export const IMG = "https://x.supabase.co/storage/v1/object/public/social/posts/s1-01/" + "a".repeat(32) + ".jpg";
export const IG_USER = "17841400000000000";
export const img = (post: string, n: number) => `https://x.supabase.co/storage/v1/object/public/social/posts/${post}/${String(n).repeat(32).slice(0, 32)}.jpg`;

// ---------- fetch simulado ----------

export interface Chamada {
  metodo: string;
  url: string;
  headers: Record<string, string>;
  corpo: string;
}
export type Resposta = { status?: number; json?: unknown } | "rede";
export function fetchFalso(rotas: ((c: Chamada) => Resposta | undefined)[]) {
  const chamadas: Chamada[] = [];
  const buscar: Buscar = async (url, init) => {
    const c: Chamada = { metodo: init?.method ?? "GET", url, headers: Object.fromEntries(new Headers(init?.headers).entries()), corpo: typeof init?.body === "string" ? init.body : "" };
    chamadas.push(c);
    for (const r of rotas) {
      const res = r(c);
      if (res === "rede") throw new TypeError("fetch failed");
      if (res) return new Response(JSON.stringify(res.json ?? {}), { status: res.status ?? 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`rota inesperada: ${c.metodo} ${url}`);
  };
  return { buscar, chamadas };
}
export const casa = (metodo: string, re: RegExp, r: Resposta) => (c: Chamada) => (c.metodo === metodo && re.test(c.url) ? r : undefined);
export const G = `https://graph\\.instagram\\.com/${GRAPH_VERSAO.replace(".", "\\.")}`;

/** Graph simulado da F2 (foto): limite, container, status (sequência), publish e permalink. */
export function graphFalso(o: { status?: string[]; media?: Resposta; publicar?: Resposta; limite?: unknown } = {}) {
  const fila = [...(o.status ?? ["FINISHED"])];
  return fetchFalso([
    casa("GET", new RegExp(`^${G}/${IG_USER}/content_publishing_limit\\?fields=quota_usage,config$`), { json: o.limite ?? { data: [{ quota_usage: 2, config: { quota_total: 50, quota_duration: 86400 } }] } }),
    casa("POST", new RegExp(`^${G}/${IG_USER}/media$`), o.media ?? { json: { id: "17900000000000001" } }),
    (c) => (c.metodo === "GET" && new RegExp(`^${G}/17900000000000001\\?fields=status_code,status$`).test(c.url) ? { json: { id: "17900000000000001", status_code: fila.length > 1 ? fila.shift() : fila[0] } } : undefined),
    casa("POST", new RegExp(`^${G}/${IG_USER}/media_publish$`), o.publicar ?? { json: { id: "18000000000000009" } }),
    casa("GET", new RegExp(`^${G}/18000000000000009\\?fields=permalink$`), { json: { permalink: "https://www.instagram.com/p/ABC123/", id: "18000000000000009" } }),
  ]);
}

/**
 * Graph simulado da F3: cada POST /media cria um container com id próprio (guarda o corpo); o status
 * de cada um vem de `status(corpo, consulta)`; publish e permalink configuráveis.
 */
export function graphSimulado(
  o: {
    status?: (corpo: Record<string, unknown>, consulta: number) => string;
    limite?: unknown;
    media?: (corpo: Record<string, unknown>, n: number) => Resposta | undefined;
    publicar?: Resposta;
    permalink?: Resposta;
  } = {},
) {
  const containers: { id: string; corpo: Record<string, unknown>; consultas: number }[] = [];
  let publicados = 0;
  const f = fetchFalso([
    casa("GET", new RegExp(`^${G}/${IG_USER}/content_publishing_limit\\?fields=quota_usage,config$`), { json: o.limite ?? { data: [{ quota_usage: 2, config: { quota_total: 50, quota_duration: 86400 } }] } }),
    (c) => {
      if (c.metodo !== "POST" || !new RegExp(`^${G}/${IG_USER}/media$`).test(c.url)) return undefined;
      const corpo = JSON.parse(c.corpo) as Record<string, unknown>;
      const r = o.media?.(corpo, containers.length + 1);
      if (r) return r;
      const id = `1790000000000${String(containers.length + 1).padStart(4, "0")}`;
      containers.push({ id, corpo, consultas: 0 });
      return { json: { id } };
    },
    (c) => {
      const m = new RegExp(`^${G}/(179\\d+)\\?fields=status_code,status$`).exec(c.url);
      if (c.metodo !== "GET" || !m) return undefined;
      const k = containers.find((x) => x.id === m[1]);
      if (!k) return { status: 400, json: { error: { message: "container desconhecido" } } };
      k.consultas++;
      return { json: { id: k.id, status_code: o.status ? o.status(k.corpo, k.consultas) : "FINISHED" } };
    },
    (c) => {
      if (c.metodo !== "POST" || !new RegExp(`^${G}/${IG_USER}/media_publish$`).test(c.url)) return undefined;
      if (o.publicar) return o.publicar;
      publicados++;
      return { json: { id: `1800000000000${String(publicados).padStart(4, "0")}` } };
    },
    (c) => {
      const m = new RegExp(`^${G}/(180\\d+)\\?fields=permalink$`).exec(c.url);
      if (c.metodo !== "GET" || !m) return undefined;
      return o.permalink ?? { json: { id: m[1], permalink: `https://www.instagram.com/p/X${m[1]}/` } };
    },
  ]);
  return { ...f, containers, publishes: () => f.chamadas.filter((c) => c.url.endsWith("/media_publish")).length };
}

export function relogio(inicio = T0) {
  let t = inicio;
  const esperas: number[] = [];
  return { agora: () => t, avancar: (ms: number) => void (t += ms), esperar: async (ms: number) => void (esperas.push(ms), (t += ms)), esperas };
}

export const semToken = (s: string | null | undefined) => {
  for (const seg of [TOKEN, TOKEN_CURTO, SECRET, CODE, CHAVE_B64]) assert.ok(!(s ?? "").includes(seg), `vazou segredo em: ${s}`);
};

// ---------- repositórios em memória ----------

export interface LinhaContaMem extends NovaConta {
  connectedAt: string;
  emitidoEm: string | null;
  renovadoEm: string | null;
  falhaEm: string | null;
  falha: string | null;
}

export function contaMemoria(inicial: (ContaComToken & { username?: string }) | null = null) {
  let linha: LinhaContaMem | null = inicial
    ? {
        igUserId: inicial.igUserId,
        username: inicial.username ?? "laudousg",
        tokenCifrado: inicial.tokenCifrado,
        expiraEm: inicial.expiraEm,
        connectedAt: new Date(T0).toISOString(),
        emitidoEm: inicial.emitidoEm ?? new Date(T0).toISOString(),
        renovadoEm: null,
        falhaEm: null,
        falha: null,
      }
    : null;
  const log: string[] = [];
  const repo: RepositorioConta = {
    ler: async () =>
      linha
        ? ({
            ig_user_id: linha.igUserId,
            username: linha.username,
            token_expires_at: linha.expiraEm,
            connected_at: linha.connectedAt,
            token_issued_at: linha.emitidoEm,
            token_refreshed_at: linha.renovadoEm,
            token_refresh_failed_at: linha.falhaEm,
            token_refresh_error: linha.falha,
          } satisfies ContaPublica)
        : null,
    lerComToken: async () => (linha ? { igUserId: linha.igUserId, tokenCifrado: linha.tokenCifrado, expiraEm: linha.expiraEm, emitidoEm: linha.emitidoEm ?? linha.connectedAt } : null),
    salvar: async (c) => {
      log.push(`salvar:${c.igUserId}`);
      const agora = new Date().toISOString();
      linha = { ...c, connectedAt: agora, emitidoEm: agora, renovadoEm: null, falhaEm: null, falha: null };
    },
    apagar: async () => {
      log.push("apagar");
      linha = null;
    },
    renovado: async (r: TokenRenovado) => {
      log.push(`renovado:${r.igUserId}`);
      if (!linha || linha.igUserId !== r.igUserId || linha.tokenCifrado !== r.anterior) return false;
      Object.assign(linha, { tokenCifrado: r.tokenCifrado, expiraEm: r.expiraEm, emitidoEm: r.quando, renovadoEm: r.quando, falhaEm: null, falha: null });
      return true;
    },
    falhaRenovacao: async (igUserId, erro, quando) => {
      log.push(`falha:${igUserId}`);
      if (linha && linha.igUserId === igUserId) Object.assign(linha, { falhaEm: quando, falha: erro });
    },
  };
  return { repo, log, linha: () => linha };
}

export interface PostMem {
  id: string;
  format: "image" | "carousel" | "story";
  status: "draft" | "approved" | "publishing" | "published" | "failed";
  manual: boolean;
  scheduled_at: string;
  caption: string;
  hashtags: string;
  alt_text: string;
  attempts: number;
  last_error: string | null;
  ig_media_id: string | null;
  permalink: string | null;
  published_at: string | null;
  publish_requested_at: string | null;
  updated_at: string;
  /** Slides; ausente = uma imagem (IMG). null em public_url = slide sem imagem do bucket. */
  itens?: { public_url: string | null; alt_text: string }[];
}

/** Mesma semântica dos UPDATEs condicionais de repositorioPublicacao. */
export function publicacaoMemoria(posts: PostMem[], o: { agora?: () => number; marcarFalha?: boolean } = {}) {
  const transicoes: string[] = [];
  const agora = () => new Date((o.agora ?? Date.now)()).toISOString();
  const toque = (p: PostMem) => (p.updated_at = agora());
  const repo: RepositorioPublicacao = {
    travar: async (id, filtro) => {
      const p = posts.find(
        (x) =>
          x.id === id &&
          x.status === "approved" &&
          !x.manual &&
          (!filtro || (Date.parse(x.scheduled_at) <= Date.parse(filtro.ate) && Date.parse(x.scheduled_at) >= Date.parse(filtro.desde))),
      );
      if (!p) return null;
      p.status = "publishing";
      p.publish_requested_at = null;
      toque(p);
      transicoes.push(`${id}:publishing`);
      return { id: p.id, format: p.format, caption: p.caption, hashtags: p.hashtags, alt_text: p.alt_text, attempts: p.attempts } satisfies PostTravado;
    },
    itens: async (id) => {
      const p = posts.find((x) => x.id === id);
      const its = p?.itens ?? [{ public_url: IMG, alt_text: "" }];
      if (its.some((i) => !i.public_url)) return null;
      return its.map((i, n) => ({ position: n + 1, public_url: i.public_url!, alt_text: i.alt_text }) satisfies ItemPublicavel);
    },
    marcarPublish: async (id, quando) => {
      if (o.marcarFalha) throw new Error("banco fora");
      const p = posts.find((x) => x.id === id && x.status === "publishing" && x.publish_requested_at === null);
      if (!p) return false;
      p.publish_requested_at = quando;
      toque(p);
      transicoes.push(`${id}:publish_pedido`);
      return true;
    },
    concluir: async (id, r) => {
      const p = posts.find((x) => x.id === id && x.status === "publishing");
      if (!p) return false;
      Object.assign(p, { status: "published", ig_media_id: r.mediaId, permalink: r.permalink, published_at: r.publishedAt, last_error: null });
      toque(p);
      transicoes.push(`${id}:published`);
      return true;
    },
    falhar: async (id, erro, n) => {
      const p = posts.find((x) => x.id === id && x.status === "publishing");
      if (!p) return;
      Object.assign(p, { status: "failed", last_error: erro, attempts: n });
      toque(p);
      transicoes.push(`${id}:failed`);
    },
    devolver: async (id, erro, n) => {
      const p = posts.find((x) => x.id === id && x.status === "publishing" && x.publish_requested_at === null);
      if (!p) return;
      Object.assign(p, { status: "approved", last_error: erro, attempts: n });
      toque(p);
      transicoes.push(`${id}:approved`);
    },
    fila: async (ate, desde, limite) =>
      posts
        .filter((x) => x.status === "approved" && !x.manual && Date.parse(x.scheduled_at) <= Date.parse(ate) && Date.parse(x.scheduled_at) >= Date.parse(desde))
        .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
        .slice(0, limite)
        .map((x) => x.id),
  };
  return { repo, transicoes };
}

export const postAprovado = (o: Partial<PostMem> = {}): PostMem => ({
  id: "s1-01",
  format: "image",
  status: "approved",
  manual: false,
  scheduled_at: new Date(T0 - 60_000).toISOString(),
  caption: "Laudo pela voz.",
  hashtags: "#ultrassom #laudo",
  alt_text: "Tela do app",
  attempts: 0,
  last_error: null,
  ig_media_id: null,
  permalink: null,
  published_at: null,
  publish_requested_at: null,
  updated_at: new Date(T0 - 86400_000).toISOString(),
  ...o,
});

export const contaValida = (o: Partial<ContaComToken> = {}) =>
  contaMemoria({ igUserId: IG_USER, tokenCifrado: cifrar(TOKEN, CHAVE), expiraEm: new Date(T0 + 50 * 86400_000).toISOString(), ...o });
