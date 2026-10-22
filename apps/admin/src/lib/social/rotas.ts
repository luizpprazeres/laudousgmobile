/**
 * Rotas POST /admin/api/social/* (formulários HTML → redirect 303). O middleware já exige a sessão
 * de admin; aqui checamos de novo (origem + sessão + allowlist + papel) antes de tocar no banco.
 * Falhou a checagem → 404, como o resto do painel.
 */
import { NextResponse, type NextRequest } from "next/server";
import { contextoPost } from "../auth/rotas";
import { verificarSessao } from "../auth/verificar";
import { comBase } from "../base";
import type { ConfigServidor } from "../env";
import { lerCalendario } from "./calendario";
import { lerEdicao, validarImagem } from "./regras";
import { repositorioSocial, type RepositorioSocial } from "./servidor";
import { ID_POST, LIMITES } from "./tipos";

export interface Autorizado {
  cfg: ConfigServidor;
  /** Cookies renovados pela checagem da sessão, copiados para o redirect. */
  cookies: NextResponse | null;
}

export interface DependenciasSocial {
  autorizar: (req: Request) => Promise<Autorizado | null>;
  repo: (cfg: ConfigServidor) => RepositorioSocial;
}

async function autorizarAdmin(req: Request): Promise<Autorizado | null> {
  // contextoPost confere a origem do POST (além do SameSite=Strict) e monta a sessão pelos cookies.
  const ctx = contextoPost(req as NextRequest);
  if (!ctx) return null;
  const r = await verificarSessao(ctx.sessao, ctx.cfg);
  return r.decisao === "permitir" ? { cfg: ctx.cfg, cookies: ctx.carregadora } : null;
}

const padrao: DependenciasSocial = { autorizar: autorizarAdmin, repo: (cfg) => repositorioSocial(cfg) };

const naoEncontrado = () => new NextResponse("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

function voltar(req: Request, a: Autorizado, caminho: string, busca: Record<string, string>): NextResponse {
  const url = new URL(comBase(caminho), a.cfg.origemPublica ?? req.url);
  for (const [k, v] of Object.entries(busca)) url.searchParams.set(k, v);
  const r = NextResponse.redirect(url, 303);
  a.cookies?.cookies.getAll().forEach((c) => r.cookies.set(c));
  return r;
}

/** Corpo grande demais nem é lido (Content-Length declarado pelo navegador). */
function corpoGrande(req: Request, limite: number): boolean {
  const n = Number(req.headers.get("content-length") ?? "0");
  return Number.isFinite(n) && n > limite + 64 * 1024;
}

async function formulario(req: Request): Promise<FormData | null> {
  try {
    return await req.formData();
  } catch {
    return null;
  }
}

const campo = (f: FormData, n: string) => {
  const v = f.get(n);
  return typeof v === "string" ? v.trim() : "";
};
const idValido = (f: FormData) => {
  const id = campo(f, "id");
  return ID_POST.test(id) ? id : null;
};
const posicao = (f: FormData, n = "posicao") => {
  const p = Number(campo(f, n));
  return Number.isInteger(p) && p >= 1 && p <= LIMITES.slides ? p : null;
};
const editor = (id: string) => `/instagram/${id}`;

export function criarRotasSocial(deps: Partial<DependenciasSocial> = {}) {
  const d = { ...padrao, ...deps };
  const comAdmin = (h: (req: Request, a: Autorizado) => Promise<NextResponse>) => async (req: Request): Promise<Response> => {
    const a = await d.autorizar(req);
    if (!a) return naoEncontrado();
    return h(req, a);
  };

  return {
    /** Upload do calendário (JSON) → rascunhos. Tudo ou nada. */
    importar: comAdmin(async (req, a) => {
      if (corpoGrande(req, LIMITES.calendarioBytes)) return voltar(req, a, "/instagram", { erro: "arquivo_grande" });
      const f = await formulario(req);
      const arq = f?.get("arquivo");
      if (!arq || typeof arq === "string") return voltar(req, a, "/instagram", { erro: "arquivo" });
      if (arq.size > LIMITES.calendarioBytes) return voltar(req, a, "/instagram", { erro: "arquivo_grande" });
      let json: unknown;
      try {
        json = JSON.parse(await arq.text());
      } catch {
        return voltar(req, a, "/instagram", { erro: "json" });
      }
      const { posts, erros } = lerCalendario(json);
      if (erros.length) return voltar(req, a, "/instagram", { erro: "calendario", msg: erros.slice(0, 3).join(" · ").slice(0, 300) });
      try {
        const r = await d.repo(a.cfg).importar(posts);
        const primeiro = posts.map((p) => p.scheduled_at).sort()[0];
        return voltar(req, a, "/instagram", { importado: `${r.criados}-${r.atualizados}-${r.preservados}`, ...(primeiro ? { em: primeiro } : {}) });
      } catch {
        return voltar(req, a, "/instagram", { erro: "banco" });
      }
    }),

    salvar: comAdmin(async (req, a) => {
      const f = await formulario(req);
      const id = f && idValido(f);
      if (!f || !id) return naoEncontrado();
      const posicoes = campo(f, "posicoes").split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= LIMITES.slides);
      const e = lerEdicao(f, posicoes);
      if (!e.ok) return voltar(req, a, editor(id), { erro: e.erro });
      const r = await d.repo(a.cfg).salvar(id, e.edicao);
      return voltar(req, a, editor(id), r === "ok" ? { ok: "salvo" } : { erro: r });
    }),

    ordem: comAdmin(async (req, a) => {
      const f = await formulario(req);
      const id = f && idValido(f);
      const p = f && posicao(f);
      const dir = f ? campo(f, "direcao") : "";
      if (!f || !id || !p || (dir !== "cima" && dir !== "baixo")) return naoEncontrado();
      const r = await d.repo(a.cfg).mover(id, p, dir === "cima" ? -1 : 1);
      return voltar(req, a, editor(id), r === "ok" ? { ok: "ordem" } : { erro: r });
    }),

    status: comAdmin(async (req, a) => {
      const f = await formulario(req);
      const id = f && idValido(f);
      const para = f ? campo(f, "para") : "";
      if (!f || !id || (para !== "approved" && para !== "draft")) return naoEncontrado();
      const r = await d.repo(a.cfg).mudarStatus(id, para);
      return voltar(req, a, editor(id), r === "ok" ? { ok: para === "approved" ? "aprovado" : "rascunho" } : { erro: r });
    }),

    /** Imagem de um slide: só JPEG, até 8 MB, 1080×1350 (feed) ou 1080×1920 (story). */
    midia: comAdmin(async (req, a) => {
      if (corpoGrande(req, LIMITES.imagemBytes)) return voltar(req, a, "/instagram", { erro: "grande" });
      const f = await formulario(req);
      const id = f && idValido(f);
      const p = f && posicao(f);
      if (!f || !id || !p) return naoEncontrado();
      const repo = d.repo(a.cfg);
      // O formato vem do banco, nunca do formulário.
      const formato = await repo.formato(id);
      if (!formato) return voltar(req, a, editor(id), { erro: "nao_encontrado" });
      const arq = f.get("arquivo");
      if (!arq || typeof arq === "string") return voltar(req, a, editor(id), { erro: "vazio" });
      if (arq.size > LIMITES.imagemBytes) return voltar(req, a, editor(id), { erro: "grande" });
      const bytes = new Uint8Array(await arq.arrayBuffer());
      const v = validarImagem(bytes, arq.type, formato);
      if (!v.ok) return voltar(req, a, editor(id), { erro: v.erro });
      const r = await repo.enviarImagem(id, p, bytes);
      return voltar(req, a, editor(id), r === "ok" ? { ok: "imagem" } : { erro: r });
    }),
  };
}
