/**
 * Rotas da F2: conectar a conta do Instagram e publicar uma foto sob comando.
 *
 *  GET  /admin/api/social/conectar     sessão → state assinado → redirect para o Instagram
 *  GET  /admin/api/social/callback     SEM sessão (rotaSemSessao): o cookie SameSite=Strict não chega
 *                                      na volta do Instagram. Não lê cookie; valida só o formato e
 *                                      devolve uma ponte HTML (meta refresh) para /concluir.
 *  GET  /admin/api/social/concluir     sessão → confere o state → troca o code → grava o token cifrado
 *  POST /admin/api/social/desconectar  sessão + origem → apaga a conta
 *  POST /admin/api/social/publicar     sessão + origem → confirmação digitada → publica
 *
 * Sem config completa (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, SOCIAL_TOKEN_KEY, ADMIN_PUBLIC_ORIGIN)
 * → 404, como o resto do painel. Token, code e secret nunca vão para log, erro ou URL de retorno.
 */
import { NextResponse, type NextRequest } from "next/server";
import { contextoPost } from "../auth/rotas";
import { verificarSessao } from "../auth/verificar";
import { comBase } from "../base";
import { configServidor, type ConfigServidor } from "../env";
import { clienteSessao } from "../supabase/clientes";
import { cifrar } from "./cifra";
import { configInstagram, type ConfigInstagram } from "./config";
import { repositorioConta, type RepositorioConta } from "./conta";
import { conferirState, criarState, FORMATO_STATE } from "./estado";
import { conectarConta, ErroInstagram, FORMATO_CODIGO, limparCodigo, urlAutorizacao, type Buscar, type OpcoesPublicacao } from "./instagram";
import { publicarPost, repositorioPublicacao, type RepositorioPublicacao, type ResultadoPublicacao } from "./publicacao";
import { campo, editor, formulario, idValido, naoEncontrado, voltar } from "./rotas";

export interface AdminAutorizado {
  cfg: ConfigServidor;
  userId: string;
  cookies: NextResponse | null;
}

export interface DependenciasInstagram {
  /** POST confere a origem; GET (navegação) depende do SameSite=Strict do cookie. */
  autorizar: (req: Request, metodo: "GET" | "POST") => Promise<AdminAutorizado | null>;
  /** Config do servidor sem sessão (só para a ponte do callback). */
  servidor: () => ConfigServidor | null;
  instagram: (cfg: ConfigServidor) => ConfigInstagram | null;
  conta: (cfg: ConfigServidor) => RepositorioConta;
  publicacao: (cfg: ConfigServidor) => RepositorioPublicacao;
  buscar: Buscar;
  opcoes?: Omit<OpcoesPublicacao, "buscar">;
  agora: () => number;
}

async function autorizarAdmin(req: Request, metodo: "GET" | "POST"): Promise<AdminAutorizado | null> {
  if (metodo === "POST") {
    const ctx = contextoPost(req as NextRequest);
    if (!ctx) return null;
    const r = await verificarSessao(ctx.sessao, ctx.cfg);
    return r.decisao === "permitir" && r.userId ? { cfg: ctx.cfg, userId: r.userId, cookies: ctx.carregadora } : null;
  }
  const cfg = configServidor();
  if (!cfg) return null;
  const carregadora = new NextResponse(null);
  const nreq = req as NextRequest;
  const sessao = clienteSessao(cfg, {
    getAll: () => nreq.cookies.getAll(),
    setAll: (lista) => lista.forEach(({ name, value, options }) => carregadora.cookies.set(name, value, options)),
  });
  const r = await verificarSessao(sessao, cfg);
  return r.decisao === "permitir" && r.userId ? { cfg, userId: r.userId, cookies: carregadora } : null;
}

const padrao: DependenciasInstagram = {
  autorizar: autorizarAdmin,
  servidor: () => configServidor(),
  instagram: (cfg) => configInstagram(cfg.origemPublica),
  conta: (cfg) => repositorioConta(cfg),
  publicacao: (cfg) => repositorioPublicacao(cfg),
  buscar: (url, init) => fetch(url, init),
  agora: Date.now,
};

const SEM_CACHE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const invalido = () => new NextResponse("Pedido inválido", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8", ...SEM_CACHE } });

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Página mínima que reabre /concluir no mesmo site (aí o cookie Strict vai junto). Sem script. */
export function paginaPonte(destino: string): NextResponse {
  const u = escapar(destino);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=${u}"><title>Conectando o Instagram</title></head><body><p>Conectando o Instagram… <a href="${u}">Continuar</a></p></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...SEM_CACHE,
      "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

const ERRO_IG = /^[a-z_]{1,64}$/;

const MENSAGEM_RESULTADO: Record<ResultadoPublicacao, Record<string, string>> = {
  publicado: { ok: "publicado" },
  status: { erro: "pub_status" },
  sem_conta: { erro: "pub_sem_conta" },
  token_vencido: { erro: "pub_token_vencido" },
  token_invalido: { erro: "pub_token_invalido" },
  falhou: { erro: "pub_falhou" },
  incerto: { erro: "pub_incerto" },
  registro: { erro: "pub_registro" },
};

export function criarRotasInstagram(deps: Partial<DependenciasInstagram> = {}) {
  const d: DependenciasInstagram = { ...padrao, ...deps };

  return {
    conectar: async (req: Request): Promise<Response> => {
      const a = await d.autorizar(req, "GET");
      if (!a) return naoEncontrado();
      const ig = d.instagram(a.cfg);
      if (!ig) return naoEncontrado();
      const r = NextResponse.redirect(urlAutorizacao(ig, criarState(a.userId, ig.chave, d.agora())), 303);
      r.headers.set("Cache-Control", "no-store");
      a.cookies?.cookies.getAll().forEach((c) => r.cookies.set(c));
      return r;
    },

    /** Não lê cookie nem sessão: só a URL. Nada além da própria ponte recebe o code. */
    callback: async (req: Request): Promise<Response> => {
      const cfg = d.servidor();
      if (!cfg || !d.instagram(cfg)) return naoEncontrado();
      const q = new URL(req.url).searchParams;
      const destino = new URLSearchParams();
      const erro = q.get("error");
      const state = q.get("state") ?? "";
      if (erro !== null) {
        if (!ERRO_IG.test(erro)) return invalido();
        destino.set("error", erro);
        const motivo = q.get("error_reason");
        if (motivo && ERRO_IG.test(motivo)) destino.set("error_reason", motivo);
      } else {
        const code = limparCodigo(q.get("code") ?? "");
        if (!FORMATO_CODIGO.test(code) || !FORMATO_STATE.test(state)) return invalido();
        destino.set("code", code);
        destino.set("state", state);
      }
      return paginaPonte(`${comBase("/api/social/concluir")}?${destino}`);
    },

    concluir: async (req: Request): Promise<Response> => {
      const a = await d.autorizar(req, "GET");
      if (!a) return naoEncontrado();
      const ig = d.instagram(a.cfg);
      if (!ig) return naoEncontrado();
      const ir = (busca: Record<string, string>) => {
        const r = voltar(req, a, "/instagram", busca);
        r.headers.set("Cache-Control", "no-store");
        return r;
      };
      const q = new URL(req.url).searchParams;
      const erro = q.get("error");
      if (erro !== null) return ir({ erro: erro === "access_denied" ? "ig_negado" : "ig_erro" });
      const code = limparCodigo(q.get("code") ?? "");
      const state = q.get("state") ?? "";
      if (!FORMATO_CODIGO.test(code)) return ir({ erro: "ig_erro" });
      const st = conferirState(state, a.userId, ig.chave, d.agora());
      if (!st.ok) return ir({ erro: st.motivo === "vencido" ? "state_vencido" : "state" });
      let conexao;
      try {
        conexao = await conectarConta(ig, code, d.buscar, d.agora());
      } catch (e) {
        const etapa = e instanceof ErroInstagram ? e.etapa : "token";
        console.warn("[social] conexao_falhou", etapa);
        return ir({ erro: "conexao", etapa });
      }
      try {
        await d.conta(a.cfg).salvar({ igUserId: conexao.igUserId, username: conexao.username, tokenCifrado: cifrar(conexao.token, ig.chave), expiraEm: conexao.expiraEm });
      } catch {
        console.warn("[social] conta_nao_gravou");
        return ir({ erro: "conta_banco" });
      }
      return ir({ ok: "conectado" });
    },

    desconectar: async (req: Request): Promise<Response> => {
      const a = await d.autorizar(req, "POST");
      if (!a) return naoEncontrado();
      try {
        await d.conta(a.cfg).apagar();
      } catch {
        return voltar(req, a, "/instagram", { erro: "conta_banco" });
      }
      return voltar(req, a, "/instagram", { ok: "desconectado" });
    },

    publicar: async (req: Request): Promise<Response> => {
      const a = await d.autorizar(req, "POST");
      if (!a) return naoEncontrado();
      const ig = d.instagram(a.cfg);
      if (!ig) return naoEncontrado();
      const f = await formulario(req);
      const id = f && idValido(f);
      if (!f || !id) return naoEncontrado();
      if (campo(f, "confirmacao") !== id) return voltar(req, a, editor(id), { erro: "confirmacao" });
      let r: Awaited<ReturnType<typeof publicarPost>>;
      try {
        r = await publicarPost(id, { repo: d.publicacao(a.cfg), conta: d.conta(a.cfg), chave: ig.chave, opcoes: { ...d.opcoes, buscar: d.buscar }, agora: d.agora });
      } catch {
        // Falha do banco antes da trava (conta ilegível ou trava indisponível): nada mudou.
        return voltar(req, a, editor(id), { erro: "falha" });
      }
      return voltar(req, a, editor(id), MENSAGEM_RESULTADO[r.resultado]);
    },
  };
}
