import { getAdminAccessToken } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxy do lab → API mobile para a LISTA de categorias da bancada.
 *
 * Irmã de `[category]/route.ts`, e pelo mesmo motivo do token server-side. A
 * bancada tinha a categoria cravada (`const CATEGORIA = "OBSTETRICA"`) e por
 * isso mostrava só o modelo obstétrico depois que o backend passou a servir as
 * treze.
 */
export async function GET(req: Request): Promise<Response> {
  let accessToken: string;
  try {
    accessToken = await getAdminAccessToken();
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "auth falhou" },
      { status: 500 },
    );
  }

  const upstream = await fetch(
    `${process.env.BACKEND_API_URL ?? "https://laudousgmobile.vercel.app"}/api/admin/model-catalog`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: req.signal,
    },
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
