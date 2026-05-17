import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAIRING_CODE_REGEX = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

/**
 * GET /api/sala/pair/redeem?code=ABC23X
 *
 * Endpoint PÚBLICO. Auxiliar digita código em /sala e este endpoint
 * resolve para o token longo. Retorna { token } ou { error }.
 *
 * Mensagem de erro propositalmente ambígua pra evitar enumeração.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("code");
  if (!raw) return json({ error: "code_missing" }, 400);

  const code = raw.replace(/[\s\-_]/g, "").toUpperCase();
  if (!PAIRING_CODE_REGEX.test(code)) {
    return json({ error: "invalid_or_expired" }, 400);
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from("room_tokens")
    .select("token")
    .eq("pairing_code", code)
    .gt("pairing_code_expires_at", new Date().toISOString())
    .eq("active", true)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return json({ error: "invalid_or_expired" }, 404);
  }

  return json({ token: data.token });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
