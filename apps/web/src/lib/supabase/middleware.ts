import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refresca a sessão Supabase a cada request e propaga os cookies atualizados.
 * Padrão recomendado pelo @supabase/ssr para Next App Router.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { pathname } = request.nextUrl;

  // Sem config de Supabase: protege /app mesmo assim (redireciona ao login).
  if (!url || !key) {
    if (pathname.startsWith("/app")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANTE: não rodar lógica entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * O HUB `/app` DEIXOU DE EXISTIR — e a URL não pode morrer com ele.
   *
   * Ele era uma tela de atalhos para gerar, histórico, preferências e preços;
   * o menu lateral já leva a todos, e a tela sobrava entre o login e o
   * trabalho. Mas era o destino pós-login desde o começo: está em favoritos e
   * no histórico dos navegadores. Apagar o arquivo sem isto entregaria 404 a
   * quem já usava.
   *
   * Só o caminho EXATO redireciona: `/app/gerar` e os demais seguem.
   */
  if (pathname === "/app" || pathname === "/app/") {
    const paraOTrabalho = request.nextUrl.clone();
    paraOTrabalho.pathname = "/app/gerar";
    return NextResponse.redirect(paraOTrabalho);
  }

  // Protege a área logada.
  if (!user && pathname.startsWith("/app")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = `?redirect=${pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  // Usuário logado não vê login/signup — manda para o destino ou direto ao trabalho.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = request.nextUrl.searchParams.get("redirect") || "/app/gerar";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
