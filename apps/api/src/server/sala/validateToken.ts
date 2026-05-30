import { getServiceClient } from "@/server/supabaseService";

export type TokenValidation =
  | { ok: true; userId: string; code: string }
  | {
      ok: false;
      reason: "invalid_format" | "not_found" | "revoked" | "expired";
    };

/**
 * Valida pairing_code (6 chars) e retorna user_id do médico-dono.
 * Reusa lógica do /api/sala/latest (mesmo formato base32 reduzido).
 */
export async function validateSalaToken(
  raw: string | null,
): Promise<TokenValidation> {
  if (!raw) return { ok: false, reason: "invalid_format" };
  const code = raw.replace(/[\s\-_]/g, "").toUpperCase();
  if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(code)) {
    return { ok: false, reason: "invalid_format" };
  }

  const service = getServiceClient();
  const { data: room, error } = await service
    .from("room_tokens")
    .select("user_id, active, revoked_at, pairing_code_expires_at")
    .eq("pairing_code", code)
    .maybeSingle();

  if (error || !room) return { ok: false, reason: "not_found" };

  const expiresAt = room.pairing_code_expires_at
    ? new Date(room.pairing_code_expires_at as string).getTime()
    : 0;
  if (!room.active || room.revoked_at) {
    return { ok: false, reason: "revoked" };
  }
  if (expiresAt < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, userId: room.user_id as string, code };
}
