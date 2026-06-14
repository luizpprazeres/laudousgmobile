import { getAdminAccessToken } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxy do lab → API mobile para as preferências de renderer da conta (toggles
 * do DET-5 ONDA 2: Domingos/conduta na tireoide, conduta na mamária). Usa o
 * admin token server-side (mesmo padrão de /api/testbench/run) — os toggles são
 * gravados na conta admin, e o testbench (mesma conta) reflete o efeito.
 */
function backendUrl(): string {
  return process.env.BACKEND_API_URL ?? "https://laudousgmobile.vercel.app";
}

async function proxy(
  method: "GET" | "PATCH",
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

  const upstream = await fetch(`${backendUrl()}/api/me/report-preferences`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal,
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: Request) {
  return proxy("GET", req.signal);
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "json invalido" }, { status: 400 });
  }
  return proxy("PATCH", req.signal, body);
}
