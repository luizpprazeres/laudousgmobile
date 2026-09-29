import { NextResponse, type NextRequest } from "next/server";
import { SALA_CANONICAL_HOST, SALA_LEGACY_HOST, salaRouting } from "./server/sala/domain";

export function middleware(request: NextRequest) {
  const input = new URL(request.url);
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (host === SALA_CANONICAL_HOST || host === SALA_LEGACY_HOST) input.hostname = host;
  const route = salaRouting(input, request.method);
  if (route.kind === "redirect") {
    const response = NextResponse.redirect(route.url, 307);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (route.kind === "rewrite") {
    const internal = request.nextUrl.clone();
    internal.pathname = route.url.pathname;
    return NextResponse.rewrite(internal);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|.*\\.[^/]+$).*)"],
};
