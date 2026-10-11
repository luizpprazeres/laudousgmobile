import { getServiceClient } from "@/server/supabaseService";
import {
  bearerGrant, grantExpiryMs, roomExpiryMs, sha256,
  type IntegrationGrant, type IntegrationRoom,
} from "./integration";
import { salaDayStart, type SalaReportRow } from "./reportContract";

export type IntegrationReportRow = SalaReportRow & {
  user_id: string;
  updated_at?: string | null;
};
export const INTEGRATION_REPORT_COLUMNS =
  "id, user_id, final_output, generated_output, category_code, created_at, updated_at, content_revision, sanity_result";

export function integrationJson(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
export function integrationUnavailable(status = 401): Response {
  return integrationJson({ error: "integration_unavailable" }, status);
}

/** Revalida o grant e a sala em toda consulta, sem registrar credenciais. */
export async function validateIntegrationAccess(req: Request) {
  const grantValue = bearerGrant(req);
  if (!grantValue) return { response: integrationUnavailable() };

  const service = getServiceClient();
  const { data: grantData, error: grantError } = await service
    .from("sala_integration_grants")
    .select("id, room_token_id, expires_at, revoked_at")
    .eq("grant_hash", sha256(grantValue))
    .limit(1)
    .maybeSingle();

  if (grantError) {
    console.error("[sala/integration] grant lookup failed");
    return { response: integrationUnavailable(503) };
  }

  const grant = grantData as IntegrationGrant | null;
  const now = Date.now();
  const grantExpiresAtMs = grant ? grantExpiryMs(grant, now) : null;
  if (!grant || grantExpiresAtMs === null) return { response: integrationUnavailable() };

  const { data: roomData, error: roomError } = await service
    .from("room_tokens")
    .select("id, user_id, active, revoked_at, pairing_code_expires_at, expires_at")
    .eq("id", grant.room_token_id)
    .limit(1)
    .maybeSingle();

  if (roomError) {
    console.error("[sala/integration] room lookup failed");
    return { response: integrationUnavailable(503) };
  }

  const room = roomData as IntegrationRoom | null;
  const roomExpiresAtMs = room ? roomExpiryMs(room, now) : null;
  if (!room || roomExpiresAtMs === null) return { response: integrationUnavailable() };

  const startOfDay = salaDayStart(new Date(now));
  return {
    service, grant, room, now, startOfDay,
    expiresAtMs: Math.min(grantExpiresAtMs, roomExpiresAtMs),
  };
}
