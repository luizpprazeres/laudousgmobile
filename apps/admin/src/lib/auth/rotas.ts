/** Utilidades das rotas de autenticação (POST de formulário → redirect 303). */
import { NextResponse, type NextRequest } from "next/server";
import { origemConfere } from "./acesso";
import { comBase } from "../base";
import { configServidor, type ConfigServidor } from "../env";
import { clienteSessao } from "../supabase/clientes";

/** Em Route Handler o req.nextUrl não aplica o basePath no redirect; por isso o prefixo explícito. */
export function irPara(req: NextRequest, caminho: string, base?: NextResponse): NextResponse {
  const url = new URL(comBase(caminho), configServidor()?.origemPublica ?? req.url);
  const r = NextResponse.redirect(url, 303);
  base?.cookies.getAll().forEach((c) => r.cookies.set(c));
  return r;
}

/** Prepara cliente de sessão que grava cookies numa resposta "carregadora". */
export function contextoPost(req: NextRequest): { cfg: ConfigServidor; carregadora: NextResponse; sessao: ReturnType<typeof clienteSessao> } | null {
  const cfg = configServidor();
  if (!cfg) return null;
  if (!origemConfere(req.headers.get("origin"), req.headers.get("host"), cfg.origemPublica)) return null;
  const carregadora = new NextResponse(null);
  const sessao = clienteSessao(cfg, {
    getAll: () => req.cookies.getAll(),
    setAll: (lista) => lista.forEach(({ name, value, options }) => carregadora.cookies.set(name, value, options)),
  });
  return { cfg, carregadora, sessao };
}

export const naoEncontrado = () => new NextResponse("Not Found", { status: 404 });
