import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sala/revoke
 *
 * Médico revoga a sala ativa. Marca todas suas room_tokens ativas como
 * revoked_at=now() e active=false. Próxima geração de código cria nova sala.
 *
 * Retorna: { revoked: <count> }
 */
export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const service = getServiceClient();

  const { data, error } = await service
    .from("room_tokens")
    .update({ revoked_at: new Date().toISOString(), active: false })
    .eq("user_id", user.id)
    .eq("active", true)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    console.error("[sala/revoke] falha", error);
    return json({ error: "revoke_failed" }, 500);
  }

  return json({ revoked: data?.length ?? 0 });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
