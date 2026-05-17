import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAIRING_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — paridade com laudousg.com

/**
 * POST /api/sala/pair/generate
 *
 * Médico autenticado (app iOS) gera um código curto de pareamento da Sala.
 * - Se há sala ativa, reusa.
 * - Gera código via RPC SECURITY DEFINER `generate_pairing_code()` (alfabeto sem 0/O/1/I/L).
 * - Atualiza pairing_code + pairing_code_expires_at em room_tokens.
 *
 * Retorna: { code, token, expiresAt, salaUrl }
 */
export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const service = getServiceClient();

  const { data: existing, error: lookupErr } = await service
    .from("room_tokens")
    .select("id, token")
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

  let tokenRowId: string;
  let tokenValue: string;

  if (existing) {
    tokenRowId = existing.id as string;
    tokenValue = existing.token as string;
  } else {
    const { data: created, error: createErr } = await service
      .from("room_tokens")
      .insert({ user_id: user.id })
      .select("id, token")
      .single();
    if (createErr || !created) {
      console.error("[sala/pair/generate] insert falhou", createErr);
      return json({ error: "create_failed" }, 500);
    }
    tokenRowId = created.id as string;
    tokenValue = created.token as string;
  }

  const { data: codeData, error: codeErr } = await service.rpc(
    "generate_pairing_code",
  );
  if (codeErr || !codeData) {
    console.error("[sala/pair/generate] RPC falhou", codeErr);
    return json({ error: "code_generation_failed" }, 500);
  }

  const code = codeData as string;
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString();

  const { error: updateErr } = await service
    .from("room_tokens")
    .update({ pairing_code: code, pairing_code_expires_at: expiresAt })
    .eq("id", tokenRowId);

  if (updateErr) {
    console.error("[sala/pair/generate] update falhou", updateErr);
    return json({ error: "save_failed" }, 500);
  }

  return json({
    code,
    token: tokenValue,
    expires_at: expiresAt,
    sala_url: `https://laudousgmobile.vercel.app/sala/${tokenValue}`,
    sala_short_url: "https://laudousgmobile.vercel.app/sala",
  });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
