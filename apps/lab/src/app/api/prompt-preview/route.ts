import { getAdminAccessToken } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxy do lab → API para o prompt de uma categoria (read-only, sem gerar
 * laudo). Mesmo padrão de /api/me/report-preferences: token admin server-side.
 */
export async function GET(req: Request) {
  let accessToken: string;
  try {
    accessToken = await getAdminAccessToken();
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "auth falhou" }, { status: 500 });
  }

  const base = process.env.BACKEND_API_URL ?? "https://laudousgmobile.vercel.app";
  const qs = new URL(req.url).searchParams.toString();

  const upstream = await fetch(`${base}/api/admin/prompt-preview?${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: req.signal,
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
