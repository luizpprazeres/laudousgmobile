import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * POST /api/sala/pair/generate
 *
 * Modelo "código fixo": o pairing_code É o token. Cada médico tem 1 código
 * por vez, válido por 365 dias, regenerável a qualquer momento via revoke.
 * Se já existe row ativa com código não expirado, reusa.
 */
export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const service = getServiceClient();

  const { data: existing, error: lookupErr } = await service
    .from("room_tokens")
    .select("id, pairing_code, pairing_code_expires_at")
    .eq("user_id", user.id)
    .eq("active", true)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupErr) {
    console.error("[sala/pair/generate] lookup falhou", lookupErr);
    return json({ error: "lookup_failed" }, 500);
  }

  let code: string;
  let expiresAt: string;
  const now = Date.now();

  if (
    existing?.pairing_code &&
    existing.pairing_code_expires_at &&
    new Date(existing.pairing_code_expires_at).getTime() > now
  ) {
    code = existing.pairing_code as string;
    expiresAt = existing.pairing_code_expires_at as string;
  } else {
    const { data: codeData, error: codeErr } = await service.rpc(
      "generate_pairing_code",
    );
    if (codeErr || !codeData) {
      console.error("[sala/pair/generate] RPC falhou", codeErr);
      return json({ error: "code_generation_failed" }, 500);
    }
    code = codeData as string;
    expiresAt = new Date(now + CODE_TTL_MS).toISOString();

    if (existing) {
      const { error: updateErr } = await service
        .from("room_tokens")
        .update({ pairing_code: code, pairing_code_expires_at: expiresAt })
        .eq("id", existing.id);
      if (updateErr) {
        console.error("[sala/pair/generate] update falhou", updateErr);
        return json({ error: "save_failed" }, 500);
      }
    } else {
      const { error: insertErr } = await service
        .from("room_tokens")
        .insert({
          user_id: user.id,
          pairing_code: code,
          pairing_code_expires_at: expiresAt,
        });
      if (insertErr) {
        console.error("[sala/pair/generate] insert falhou", insertErr);
        return json({ error: "create_failed" }, 500);
      }
    }
  }

  return json({
    code,
    token: code,
    expires_at: expiresAt,
    sala_url: `https://laudousgmobile.vercel.app/sala/${code}`,
    sala_short_url: "https://laudousgmobile.vercel.app/sala",
  });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
