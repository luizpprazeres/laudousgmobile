/**
 * Cliente mínimo da "Instagram API com login do Instagram" (graph.instagram.com, sem Página do
 * Facebook). Conferido na documentação oficial em 22/10/2026 (URLs em docs/admin/entrega-instagram-f2.md):
 *  - autorização:  https://www.instagram.com/oauth/authorize (code vale 1 h, uso único; pode vir com "#_")
 *  - token curto:  POST https://api.instagram.com/oauth/access_token (form)
 *  - token longo:  GET  https://graph.instagram.com/access_token?grant_type=ig_exchange_token (60 dias)
 *  - perfil:       GET  https://graph.instagram.com/v26.0/me?fields=user_id,username
 *  - foto:         POST /<IG_ID>/media → GET /<container>?fields=status_code → POST /<IG_ID>/media_publish
 *  - limite:       GET  /<IG_ID>/content_publishing_limit (quota_usage, config.quota_total)
 * F3 (conferido em 22/10/2026, URLs em docs/admin/entrega-instagram-f3.md):
 *  - carrossel:    filhos com is_carousel_item=true (até 20, alt_text por imagem) → pai media_type=CAROUSEL
 *                  com children "id1,id2,…" e a legenda → media_publish
 *  - story:        media_type=STORIES com image_url (sem legenda nem alt_text)
 *  - renovação:    GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token
 *
 * `fetch` é injetável (os testes nunca tocam a rede). Mensagens de erro passam por `limpar`: nada de
 * token, code ou secret, e nenhuma sequência longa que pareça credencial.
 */
import type { ConfigInstagram } from "./config";

export const GRAPH_VERSAO = "v26.0";
export const URL_AUTORIZAR = "https://www.instagram.com/oauth/authorize";
export const URL_TOKEN_CURTO = "https://api.instagram.com/oauth/access_token";
export const GRAPH = "https://graph.instagram.com";
export const ESCOPOS = ["instagram_business_basic", "instagram_business_content_publish"] as const;

export type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

export type Etapa = "token" | "token_longo" | "perfil" | "renovar" | "limite" | "container" | "processamento" | "publicar";

export class ErroInstagram extends Error {
  /** `incerto`: o Instagram pode ter publicado mesmo assim (sem resposta ou 5xx no media_publish). */
  constructor(
    readonly etapa: Etapa,
    readonly resumo: string,
    readonly incerto = false,
  ) {
    super(`${etapa}: ${resumo}`);
    this.name = "ErroInstagram";
  }
}

/** Tira segredos conhecidos e qualquer sequência longa com cara de token; corta em 200 caracteres. */
export function limpar(texto: string, segredos: readonly (string | undefined)[] = []): string {
  let t = texto;
  for (const s of segredos) if (s && s.length >= 4) t = t.split(s).join("[oculto]");
  return t
    .replace(/[A-Za-z0-9_\-.|%]{32,}/g, "[oculto]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

const TEMPO_HTTP_MS = 15_000;

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
/** Algumas respostas vêm em { data: [ {...} ] } (como na documentação), outras planas. */
const primeiro = (j: Json): Json => (Array.isArray(j.data) && j.data.length ? obj(j.data[0]) : j);
const texto = (v: unknown): string | null => (typeof v === "string" && v ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : null);

function detalheErro(j: Json): string {
  const e = obj(j.error);
  const tipo = texto(e.type) ?? texto(j.error_type);
  const cod = texto(e.code) ?? texto(j.code);
  const sub = texto(e.error_subcode);
  const msg = texto(e.message) ?? texto(j.error_message);
  return [tipo, cod ? `código ${cod}${sub ? `/${sub}` : ""}` : null, msg].filter(Boolean).join(" · ");
}

async function chamar(buscar: Buscar, url: string, init: RequestInit, etapa: Etapa, segredos: readonly (string | undefined)[], incertoSemResposta = false): Promise<Json> {
  let res: Response;
  try {
    res = await buscar(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TEMPO_HTTP_MS) });
  } catch {
    throw new ErroInstagram(etapa, "sem resposta do Instagram (rede ou tempo esgotado)", incertoSemResposta);
  }
  let j: Json = {};
  try {
    j = obj(JSON.parse(await res.text()));
  } catch {
    j = {};
  }
  if (!res.ok || j.error || j.error_type) {
    const d = detalheErro(j);
    throw new ErroInstagram(etapa, limpar(`HTTP ${res.status}${d ? ` · ${d}` : ""}`, segredos), incertoSemResposta && res.status >= 500);
  }
  return j;
}

const bearer = (token: string): HeadersInit => ({ Authorization: `Bearer ${token}` });
const graph = (caminho: string) => `${GRAPH}/${GRAPH_VERSAO}/${caminho}`;

// ---------- OAuth ----------

export function urlAutorizacao(cfg: Pick<ConfigInstagram, "appId" | "redirectUri">, state: string): string {
  const u = new URL(URL_AUTORIZAR);
  u.searchParams.set("client_id", cfg.appId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", ESCOPOS.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

/** O redirect do Instagram pode acrescentar "#_" ao code; não faz parte dele. */
export const limparCodigo = (code: string) => code.replace(/#_$/, "");
export const FORMATO_CODIGO = /^[A-Za-z0-9_\-.]{8,2048}$/;

export interface Conexao {
  igUserId: string;
  username: string;
  token: string;
  /** ISO; null se a resposta não trouxe expires_in. */
  expiraEm: string | null;
}

/** code → token curto → token longo → perfil. Nunca devolve o token curto. */
export async function conectarConta(cfg: ConfigInstagram, code: string, buscar: Buscar, agora = Date.now()): Promise<Conexao> {
  const segredos = [cfg.appSecret, code];
  const form = new URLSearchParams({ client_id: cfg.appId, client_secret: cfg.appSecret, grant_type: "authorization_code", redirect_uri: cfg.redirectUri, code });
  const t = primeiro(await chamar(buscar, URL_TOKEN_CURTO, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() }, "token", segredos));
  const curto = texto(t.access_token);
  if (!curto) throw new ErroInstagram("token", "resposta sem access_token");
  const permissoes = texto(t.permissions);
  if (permissoes && !permissoes.split(/[,\s]+/).includes("instagram_business_content_publish")) {
    throw new ErroInstagram("token", "a permissão de publicação (instagram_business_content_publish) não foi concedida");
  }

  const ql = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: cfg.appSecret, access_token: curto });
  const l = await chamar(buscar, `${GRAPH}/access_token?${ql}`, { method: "GET" }, "token_longo", [...segredos, curto]);
  const token = texto(l.access_token);
  if (!token) throw new ErroInstagram("token_longo", "resposta sem access_token");
  const exp = Number(l.expires_in);
  const expiraEm = Number.isFinite(exp) && exp > 0 ? new Date(agora + exp * 1000).toISOString() : null;

  const p = await perfil(token, buscar, [...segredos, curto]);
  return { ...p, token, expiraEm };
}

export async function perfil(token: string, buscar: Buscar, segredos: readonly string[] = []): Promise<{ igUserId: string; username: string }> {
  const j = primeiro(await chamar(buscar, graph("me?fields=user_id,username"), { method: "GET", headers: bearer(token) }, "perfil", [...segredos, token]));
  const igUserId = texto(j.user_id);
  const username = texto(j.username) ?? "";
  if (!igUserId || !/^[0-9A-Za-z_-]{1,64}$/.test(igUserId)) throw new ErroInstagram("perfil", "resposta sem user_id válido");
  if (!/^[A-Za-z0-9._]{0,30}$/.test(username)) throw new ErroInstagram("perfil", "username fora do formato");
  return { igUserId, username };
}

// ---------- renovação do token longo ----------

/** Idade mínima do token para a Meta aceitar a renovação. */
export const IDADE_MINIMA_RENOVACAO_MS = 24 * 3600_000;

/**
 * GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=…
 * (sem versão no caminho, token na query como a documentação define). Só vale para token longo,
 * válido e com 24 h ou mais; o novo vale 60 dias a partir da renovação.
 */
export async function renovarToken(token: string, buscar: Buscar, agora = Date.now()): Promise<{ token: string; expiraEm: string | null }> {
  const q = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token });
  const j = await chamar(buscar, `${GRAPH}/refresh_access_token?${q}`, { method: "GET" }, "renovar", [token]);
  const novo = texto(j.access_token);
  if (!novo || novo.length < 16) throw new ErroInstagram("renovar", "resposta sem access_token");
  const exp = Number(j.expires_in);
  const expiraEm = Number.isFinite(exp) && exp > 0 ? new Date(agora + exp * 1000).toISOString() : null;
  return { token: novo, expiraEm };
}

// ---------- publicação: foto, carrossel e story ----------

export type FormatoMidia = "image" | "carousel" | "story";
export const MAX_ITENS_CARROSSEL = 20;

export interface ItemMidia {
  /** URL pública do JPEG (bucket `social`). */
  imageUrl: string;
  /** Texto alternativo; a Meta não aceita em story (é ignorado aqui). */
  alt: string;
}

export interface MidiaParaPublicar {
  igUserId: string;
  token: string;
  formato: FormatoMidia;
  /** Foto e story: 1 item; carrossel: 2 a 20, na ordem dos slides. */
  itens: ItemMidia[];
  /** Legenda final (caption + "\n\n" + hashtags). Story não tem legenda. No carrossel vai só no pai. */
  legenda: string;
  /**
   * Chamado imediatamente antes do media_publish (o repositório grava que o publish foi pedido).
   * Se lançar, nada é publicado e o erro sobe como falha ANTES do publish.
   */
  antesDePublicar?: () => Promise<void>;
}

export interface OpcoesPublicacao {
  buscar: Buscar;
  esperar?: (ms: number) => Promise<void>;
  agora?: () => number;
  /** Tempo máximo esperando os containers saírem de IN_PROGRESS (filhos + pai). */
  limiteMs?: number;
  intervaloMs?: number;
}

export const ESPERA_PADRAO = { limiteMs: 40_000, intervaloMs: 3_000 } as const;

export interface Publicado {
  mediaId: string;
  permalink: string | null;
}

/** Limite de publicações em 24 h atingido: não é falha do post (volta para a fila sem contar tentativa). */
export class LimiteAtingido extends ErroInstagram {
  constructor(resumo: string) {
    super("limite", resumo);
    this.name = "LimiteAtingido";
  }
}

const ID_GRAPH = /^[0-9A-Za-z_-]{1,64}$/;

/**
 * Espera todos os containers ficarem FINISHED (status_code), com um prazo absoluto. Qualquer ERROR ou
 * EXPIRED falha na hora, com o rótulo do container (ex.: "item 3 do carrossel").
 */
async function esperarProntos(
  ids: { id: string; rotulo: string }[],
  prazo: number,
  ctx: { buscar: Buscar; token: string; esperar: (ms: number) => Promise<void>; agora: () => number; intervaloMs: number; limiteMs: number },
): Promise<void> {
  const pendentes = new Map(ids.map((c) => [c.id, c.rotulo]));
  const s = [ctx.token];
  for (;;) {
    for (const [id, rotulo] of [...pendentes]) {
      const st = await chamar(ctx.buscar, graph(`${id}?fields=status_code,status`), { method: "GET", headers: bearer(ctx.token) }, "processamento", s);
      const codigo = texto(st.status_code);
      if (codigo === "FINISHED") {
        pendentes.delete(id);
        continue;
      }
      if (codigo === "ERROR" || codigo === "EXPIRED") {
        const det = texto(st.status);
        throw new ErroInstagram("processamento", limpar(`${rotulo}: container ${codigo}${det ? ` (${det})` : ""}`, s));
      }
      if (codigo === "PUBLISHED") throw new ErroInstagram("processamento", `${rotulo}: container já consta como publicado; confira no Instagram`, true);
      if (codigo !== "IN_PROGRESS") throw new ErroInstagram("processamento", `${rotulo}: status do container desconhecido`);
    }
    if (pendentes.size === 0) return;
    if (ctx.agora() + ctx.intervaloMs > prazo) {
      throw new ErroInstagram("processamento", `tempo esgotado esperando o processamento (${Math.round(ctx.limiteMs / 1000)} s)`);
    }
    await ctx.esperar(ctx.intervaloMs);
  }
}

/** `rotulo` só entra na mensagem de erro quando há vários containers (carrossel). */
async function criarContainer(buscar: Buscar, igUserId: string, token: string, corpo: Record<string, string | boolean>, rotulo: string | null): Promise<string> {
  const h = { ...bearer(token), "Content-Type": "application/json" };
  const c = await chamar(buscar, graph(`${igUserId}/media`), { method: "POST", headers: h, body: JSON.stringify(corpo) }, "container", [token]).catch((e: unknown) => {
    if (e instanceof ErroInstagram && rotulo) throw new ErroInstagram(e.etapa, limpar(`${rotulo}: ${e.resumo}`, [token]), e.incerto);
    throw e;
  });
  const id = texto(c.id);
  if (!id || !ID_GRAPH.test(id)) throw new ErroInstagram("container", `${rotulo ? `${rotulo}: ` : ""}resposta sem id do container`);
  return id;
}

/**
 * Sequência (documentação de Content Publishing, conferida em 22/10/2026):
 *   limite → container(s) → espera FINISHED → antesDePublicar → media_publish → permalink.
 *  - foto:      POST /media {image_url, caption, alt_text}
 *  - story:     POST /media {image_url, media_type: STORIES} (sem legenda nem alt_text)
 *  - carrossel: um POST /media {image_url, is_carousel_item: true, alt_text} por slide → espera todos
 *               → POST /media {media_type: CAROUSEL, children: "id1,id2,…", caption} → espera o pai
 */
export async function publicarMidia(m: MidiaParaPublicar, o: OpcoesPublicacao): Promise<Publicado> {
  const esperar = o.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const agora = o.agora ?? Date.now;
  const limiteMs = o.limiteMs ?? ESPERA_PADRAO.limiteMs;
  const intervaloMs = o.intervaloMs ?? ESPERA_PADRAO.intervaloMs;
  const s = [m.token];
  const n = m.itens.length;
  if (m.formato === "carousel" ? n < 2 || n > MAX_ITENS_CARROSSEL : n !== 1) {
    throw new ErroInstagram("container", `quantidade de imagens não combina com o formato (${n})`);
  }

  // 1. Limite de publicação (a referência do endpoint diz 50 em 24 h; carrossel conta como um post).
  const lim = primeiro(await chamar(o.buscar, graph(`${m.igUserId}/content_publishing_limit?fields=quota_usage,config`), { method: "GET", headers: bearer(m.token) }, "limite", s));
  const uso = Number(lim.quota_usage);
  const total = Number(obj(lim.config).quota_total);
  if (Number.isFinite(uso) && Number.isFinite(total) && total > 0 && uso >= total) {
    throw new LimiteAtingido(`limite de publicações em 24 h atingido (${uso}/${total})`);
  }

  // 2 e 3. Containers e espera do processamento, com um prazo único.
  const ctx = { buscar: o.buscar, token: m.token, esperar, agora, intervaloMs, limiteMs };
  let criacao: string;
  if (m.formato === "carousel") {
    const filhos: { id: string; rotulo: string }[] = [];
    for (const [i, it] of m.itens.entries()) {
      const rotulo = `item ${i + 1} do carrossel`;
      const corpo: Record<string, string | boolean> = { image_url: it.imageUrl, is_carousel_item: true };
      if (it.alt) corpo.alt_text = it.alt;
      filhos.push({ id: await criarContainer(o.buscar, m.igUserId, m.token, corpo, rotulo), rotulo });
    }
    const prazo = agora() + limiteMs;
    await esperarProntos(filhos, prazo, ctx);
    const pai: Record<string, string> = { media_type: "CAROUSEL", children: filhos.map((f) => f.id).join(",") };
    if (m.legenda) pai.caption = m.legenda;
    criacao = await criarContainer(o.buscar, m.igUserId, m.token, pai, "carrossel");
    await esperarProntos([{ id: criacao, rotulo: "carrossel" }], prazo, ctx);
  } else {
    const it = m.itens[0]!;
    const corpo: Record<string, string> = { image_url: it.imageUrl };
    if (m.formato === "story") corpo.media_type = "STORIES";
    else {
      if (m.legenda) corpo.caption = m.legenda;
      if (it.alt) corpo.alt_text = it.alt;
    }
    const rotulo = m.formato === "story" ? "story" : "foto";
    criacao = await criarContainer(o.buscar, m.igUserId, m.token, corpo, null);
    await esperarProntos([{ id: criacao, rotulo }], agora() + limiteMs, ctx);
  }

  // 4. Marca que o publish vai ser pedido (se não gravar, não publica) e publica.
  //    Daqui em diante, sem resposta ou 5xx = resultado incerto (pode ter saído).
  if (m.antesDePublicar) await m.antesDePublicar();
  const h = { ...bearer(m.token), "Content-Type": "application/json" };
  const p = await chamar(o.buscar, graph(`${m.igUserId}/media_publish`), { method: "POST", headers: h, body: JSON.stringify({ creation_id: criacao }) }, "publicar", s, true);
  const mediaId = texto(p.id);
  if (!mediaId || !ID_GRAPH.test(mediaId)) throw new ErroInstagram("publicar", "resposta sem id da mídia; confira no Instagram", true);

  // 5. Link do post: se falhar, o post já saiu — segue sem permalink.
  let permalink: string | null = null;
  try {
    const r = await chamar(o.buscar, graph(`${mediaId}?fields=permalink`), { method: "GET", headers: bearer(m.token) }, "publicar", s);
    const l = texto(r.permalink);
    permalink = l && /^https:\/\/[^\s]{1,500}$/.test(l) ? l : null;
  } catch {
    permalink = null;
  }
  return { mediaId, permalink };
}
