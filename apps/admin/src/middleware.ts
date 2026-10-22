/**
 * Porteiro do /admin. Roda em toda requisição (menos estáticos do Next):
 *  - renova a sessão Supabase (cookies httpOnly, Path=/admin, SameSite=Strict);
 *  - rotas públicas (login, MFA, logout) passam;
 *  - o resto exige: allowlist + MFA (aal2) + profiles.role='admin'. Falhou → 404 (ou login/MFA).
 * O layout do painel e as rotas de API checam de novo (defesa em profundidade).
 */
import { NextResponse, type NextRequest } from "next/server";
import { rotaPublica, rotaSemSessao } from "./lib/auth/acesso";
import { comBase } from "./lib/base";
import { verificarSessao } from "./lib/auth/verificar";
import { configServidor } from "./lib/env";
import { clienteSessao } from "./lib/supabase/clientes";

function naoEncontrado(): NextResponse {
  return new NextResponse("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function middleware(request: NextRequest) {
  if (rotaSemSessao(request.nextUrl.pathname)) return NextResponse.next();
  const cfg = configServidor();
  if (!cfg) return naoEncontrado();

  let resposta = NextResponse.next({ request });
  const sessao = clienteSessao(cfg, {
    getAll: () => request.cookies.getAll(),
    setAll: (lista) => {
      lista.forEach(({ name, value }) => request.cookies.set(name, value));
      resposta = NextResponse.next({ request });
      lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
    },
  });

  const caminho = request.nextUrl.pathname;
  if (rotaPublica(caminho)) {
    // Mesmo nas públicas, getUser() renova o cookie expirado.
    await sessao.auth.getUser();
    return resposta;
  }

  const { decisao } = await verificarSessao(sessao, cfg);
  if (decisao === "permitir") return resposta;
  if (caminho.startsWith("/api/")) return naoEncontrado();
  if (decisao === "login" || decisao === "mfa") {
    // URL absoluta montada à mão: atrás do rewrite, o host do request é o do deploy, não o público.
    const url = new URL(comBase(decisao === "login" ? "/login" : "/mfa"), cfg.origemPublica ?? request.url);
    const r = NextResponse.redirect(url);
    resposta.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  }
  return naoEncontrado();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
