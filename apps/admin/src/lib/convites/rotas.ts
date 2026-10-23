/**
 * Rotas POST /admin/api/convites/*. Mesma porta das rotas do Instagram: origem do POST + sessão +
 * allowlist + papel admin; falhou → 404 sem tocar em nada.
 *
 *  criar     JSON (o formulário chama por fetch) → JSON. A senha provisória volta UMA vez nesta
 *            resposta (no-store) e não é gravada, logada nem devolvida de novo. E-mail que já tem
 *            conta: não mexe na senha, só libera o Pro.
 *  estender  formulário (id, dias) → 303 para /convites
 *  revogar   formulário (id) → 303 para /convites
 */
import type { NextRequest } from "next/server";
import { contextoPost } from "../auth/rotas";
import { verificarSessao } from "../auth/verificar";
import type { ConfigServidor } from "../env";
import { campo, formulario, naoEncontrado, respostaJson, voltar, type Autorizado } from "../social/rotas";
import { DIAS_PADRAO, gerarSenha, lerConvite } from "./regras";
import { repositorioConvites, type RepositorioConvites } from "./servidor";

export interface AutorizadoComId extends Autorizado {
  userId: string;
}

export interface DependenciasConvites {
  autorizar: (req: Request) => Promise<AutorizadoComId | null>;
  repo: (cfg: ConfigServidor) => RepositorioConvites;
  senha: () => string;
}

export async function autorizarAdminComId(req: Request): Promise<AutorizadoComId | null> {
  const ctx = contextoPost(req as NextRequest);
  if (!ctx) return null;
  const r = await verificarSessao(ctx.sessao, ctx.cfg);
  return r.decisao === "permitir" && r.userId ? { cfg: ctx.cfg, cookies: ctx.carregadora, userId: r.userId } : null;
}

const padrao: DependenciasConvites = { autorizar: autorizarAdminComId, repo: (cfg) => repositorioConvites(cfg), senha: () => gerarSenha() };

export const LIMITE_CORPO_CONVITE = 4 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function lerCorpo(req: Request): Promise<Record<string, unknown> | null> {
  const tipo = (req.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (tipo !== "application/json") return null;
  let txt: string;
  try {
    txt = await req.text();
  } catch {
    return null;
  }
  if (txt.length > LIMITE_CORPO_CONVITE) return null;
  try {
    const v = JSON.parse(txt) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function criarRotasConvites(deps: Partial<DependenciasConvites> = {}) {
  const d: DependenciasConvites = { ...padrao, ...deps };
  const comAdmin = (h: (req: Request, a: AutorizadoComId) => Promise<Response>) => async (req: Request): Promise<Response> => {
    const a = await d.autorizar(req);
    if (!a) return naoEncontrado();
    return h(req, a);
  };

  return {
    criar: comAdmin(async (req, a) => {
      const corpo = await lerCorpo(req);
      if (!corpo) return respostaJson({ erro: "pedido" }, a, 400);
      const lido = lerConvite(corpo);
      if (!lido.ok) return respostaJson({ erro: lido.erro }, a, 400);
      const { nome, email, crm, uf, dias } = lido.dados;
      const repo = d.repo(a.cfg);
      try {
        let userId = await repo.usuarioPorEmail(email);
        let senha: string | null = null;
        let criado = false;
        if (!userId) {
          senha = d.senha();
          const r = await repo.criarUsuario({ email, senha, nome, crm, uf });
          if (r === "falha") return respostaJson({ erro: "conta" }, a, 502);
          if (r === "existe") {
            senha = null; // outra criação ganhou a corrida: a senha dela vale, a nossa não
            userId = await repo.usuarioPorEmail(email);
            if (!userId) return respostaJson({ erro: "conta" }, a, 502);
          } else {
            userId = r.id;
            criado = true;
          }
        }
        const c = await repo.conceder(userId, dias, a.userId);
        if (c.resultado !== "ok") {
          // Sem o Pro a conta nova não serve ao convite: desfaz, para a próxima tentativa começar limpa.
          if (criado) await repo.apagarUsuario(userId);
          return respostaJson({ erro: c.resultado === "dias" ? "dias" : "banco" }, a, c.resultado === "dias" ? 400 : 503);
        }
        return respostaJson({ resultado: criado ? "criada" : "existente", nome, email, fim: c.fim, ...(senha ? { senha } : {}) }, a);
      } catch {
        return respostaJson({ erro: "banco" }, a, 503);
      }
    }),

    estender: comAdmin(async (req, a) => {
      const f = await formulario(req);
      const id = f ? campo(f, "id") : "";
      const dias = f && campo(f, "dias") ? Number(campo(f, "dias")) : DIAS_PADRAO;
      if (!UUID.test(id) || !Number.isInteger(dias) || dias < 1 || dias > 365) return voltar(req, a, "/convites", { erro: "pedido" });
      const r = await d.repo(a.cfg).estender(id, dias).catch(() => "falha" as const);
      return voltar(req, a, "/convites", r === "ok" ? { ok: "estendida" } : { erro: r });
    }),

    revogar: comAdmin(async (req, a) => {
      const f = await formulario(req);
      const id = f ? campo(f, "id") : "";
      if (!UUID.test(id)) return voltar(req, a, "/convites", { erro: "pedido" });
      const r = await d.repo(a.cfg).revogar(id).catch(() => "falha" as const);
      return voltar(req, a, "/convites", r === "ok" ? { ok: "revogada" } : { erro: r });
    }),
  };
}

export const rotasConvites = criarRotasConvites();
