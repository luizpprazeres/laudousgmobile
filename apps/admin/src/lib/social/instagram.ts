/**
 * Cliente mínimo da "Instagram API com login do Instagram" (graph.instagram.com, sem Página do
 * Facebook). Conferido na documentação oficial em 22/10/2026 (URLs em docs/admin/entrega-instagram-f2.md):
 *  - autorização:  https://www.instagram.com/oauth/authorize (code vale 1 h, uso único; pode vir com "#_")
 *  - token curto:  POST https://api.instagram.com/oauth/access_token (form)
 *  - token longo:  GET  https://graph.instagram.com/access_token?grant_type=ig_exchange_token (60 dias)
 *  - perfil:       GET  https://graph.instagram.com/v26.0/me?fields=user_id,username
 *  - foto:         POST /<IG_ID>/media → GET /<container>?fields=status_code → POST /<IG_ID>/media_publish
 *  - limite:       GET  /<IG_ID>/content_publishing_limit (quota_usage, config.quota_total)
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

export type Etapa = "token" | "token_longo" | "perfil" | "limite" | "container" | "processamento" | "publicar";

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

// ---------- publicação de uma foto ----------

export interface FotoParaPublicar {
  igUserId: string;
  token: string;
  /** URL pública do JPEG (bucket `social`). */
  imageUrl: string;
  /** Legenda final (caption + "\n\n" + hashtags). */
  legenda: string;
  alt: string;
}

export interface OpcoesPublicacao {
  buscar: Buscar;
  esperar?: (ms: number) => Promise<void>;
  agora?: () => number;
  /** Tempo máximo esperando o container sair de IN_PROGRESS. */
  limiteMs?: number;
  intervaloMs?: number;
}

export const ESPERA_PADRAO = { limiteMs: 40_000, intervaloMs: 3_000 } as const;

export interface Publicado {
  mediaId: string;
  permalink: string | null;
}

export async function publicarFoto(f: FotoParaPublicar, o: OpcoesPublicacao): Promise<Publicado> {
  const esperar = o.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const agora = o.agora ?? Date.now;
  const limiteMs = o.limiteMs ?? ESPERA_PADRAO.limiteMs;
  const intervaloMs = o.intervaloMs ?? ESPERA_PADRAO.intervaloMs;
  const s = [f.token];
  const h = { ...bearer(f.token), "Content-Type": "application/json" };

  // 1. Limite de publicação (50 containers em 24 h na referência atual).
  const lim = primeiro(await chamar(o.buscar, graph(`${f.igUserId}/content_publishing_limit?fields=quota_usage,config`), { method: "GET", headers: bearer(f.token) }, "limite", s));
  const uso = Number(lim.quota_usage);
  const total = Number(obj(lim.config).quota_total);
  if (Number.isFinite(uso) && Number.isFinite(total) && total > 0 && uso >= total) {
    throw new ErroInstagram("limite", `limite de publicações em 24 h atingido (${uso}/${total})`);
  }

  // 2. Container da foto.
  const corpo: Record<string, string> = { image_url: f.imageUrl };
  if (f.legenda) corpo.caption = f.legenda;
  if (f.alt) corpo.alt_text = f.alt;
  const c = await chamar(o.buscar, graph(`${f.igUserId}/media`), { method: "POST", headers: h, body: JSON.stringify(corpo) }, "container", s);
  const container = texto(c.id);
  if (!container || !/^[0-9A-Za-z_-]{1,64}$/.test(container)) throw new ErroInstagram("container", "resposta sem id do container");

  // 3. Espera o processamento (status_code), com limite de tempo.
  const inicio = agora();
  for (;;) {
    const st = await chamar(o.buscar, graph(`${container}?fields=status_code,status`), { method: "GET", headers: bearer(f.token) }, "processamento", s);
    const codigo = texto(st.status_code);
    if (codigo === "FINISHED") break;
    if (codigo === "ERROR" || codigo === "EXPIRED") {
      const det = texto(st.status);
      throw new ErroInstagram("processamento", limpar(`container ${codigo}${det ? ` (${det})` : ""}`, s));
    }
    if (codigo === "PUBLISHED") throw new ErroInstagram("processamento", "container já consta como publicado; confira no Instagram", true);
    if (codigo !== "IN_PROGRESS") throw new ErroInstagram("processamento", "status do container desconhecido");
    if (agora() - inicio + intervaloMs > limiteMs) {
      throw new ErroInstagram("processamento", `tempo esgotado esperando o processamento (${Math.round(limiteMs / 1000)} s)`);
    }
    await esperar(intervaloMs);
  }

  // 4. Publica. Sem resposta ou 5xx aqui = resultado incerto (pode ter saído).
  const p = await chamar(o.buscar, graph(`${f.igUserId}/media_publish`), { method: "POST", headers: h, body: JSON.stringify({ creation_id: container }) }, "publicar", s, true);
  const mediaId = texto(p.id);
  if (!mediaId || !/^[0-9A-Za-z_-]{1,64}$/.test(mediaId)) throw new ErroInstagram("publicar", "resposta sem id da mídia; confira no Instagram", true);

  // 5. Link do post: se falhar, o post já saiu — segue sem permalink.
  let permalink: string | null = null;
  try {
    const m = await chamar(o.buscar, graph(`${mediaId}?fields=permalink`), { method: "GET", headers: bearer(f.token) }, "publicar", s);
    const l = texto(m.permalink);
    permalink = l && /^https:\/\/[^\s]{1,500}$/.test(l) ? l : null;
  } catch {
    permalink = null;
  }
  return { mediaId, permalink };
}
