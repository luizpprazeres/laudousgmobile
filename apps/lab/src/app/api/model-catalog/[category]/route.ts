import { getAdminAccessToken } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxy do lab → API mobile para o catálogo de modelo (projeto
 * docs/projeto-modelos/). Mesmo padrão de /api/me/report-preferences: o token
 * admin fica server-side.
 *
 * Somente leitura e prévia — o endpoint upstream não persiste nada.
 */
function backendUrl(): string {
  return process.env.BACKEND_API_URL ?? "https://laudousgmobile.vercel.app";
}

async function proxy(
  method: "GET" | "POST",
  category: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<Response> {
  let accessToken: string;
  try {
    accessToken = await getAdminAccessToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "auth falhou";
    return Response.json({ error: msg }, { status: 500 });
  }

  const upstream = await fetch(
    `${backendUrl()}/api/admin/model-catalog/${encodeURIComponent(category)}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal,
    },
  );

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  return proxy("GET", category, req.signal);
}

export async function POST(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "json inválido" }, { status: 400 });
  }
  return proxy("POST", category, req.signal, body);
}
