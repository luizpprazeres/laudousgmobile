import { getServiceClient } from "@/server/supabaseService";
import {
  consumeIntegrationRateLimit,
  integrationGrantExpiry,
  issueOpaqueGrant,
  normalizePairingCode,
  roomExpiryMs,
  type IntegrationRoom,
} from "@/server/sala/integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;

export async function POST(req: Request): Promise<Response> {
  const service = getServiceClient();
  const contentLength = Number(req.headers.get("content-length") ?? "0");

  let body: unknown = null;
  if (Number.isFinite(contentLength) && contentLength <= MAX_BODY_BYTES) {
    const raw = await req.text().catch(() => "");
    if (new TextEncoder().encode(raw).byteLength <= MAX_BODY_BYTES) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
    }
  }

  const candidate =
    body && typeof body === "object" && "code" in body
      ? (body as { code?: unknown }).code
      : null;
  const code = normalizePairingCode(candidate);

  let rateLimit: { allowed: boolean; retryAfter: number };
  try {
    rateLimit = await consumeIntegrationRateLimit(service, req, code);
  } catch {
    return json({ error: "integration_unavailable" }, 503);
  }
  if (!rateLimit.allowed) {
    return json(
      { error: "too_many_attempts", retryAfter: rateLimit.retryAfter },
      429,
      { "retry-after": String(rateLimit.retryAfter) },
    );
  }

  if (!code) return invalidCode();

  const { data, error } = await service
    .from("room_tokens")
    .select("id, user_id, active, revoked_at, pairing_code_expires_at, expires_at")
    .eq("pairing_code", code)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[sala/integration/connect] room lookup failed");
    return json({ error: "integration_unavailable" }, 503);
  }

  const room = data as IntegrationRoom | null;
  const now = Date.now();
  const grantExpiresAtMs = room ? integrationGrantExpiry(room, now) : null;
  const roomExpiresAtMs = room ? roomExpiryMs(room, now) : null;
  if (!room || grantExpiresAtMs === null || roomExpiresAtMs === null) {
    return invalidCode();
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const grant = issueOpaqueGrant();
    const grantExpiresAt = new Date(grantExpiresAtMs).toISOString();
    const { error: insertError } = await service.from("sala_integration_grants").insert({
      room_token_id: room.id,
      grant_hash: grant.hash,
      expires_at: grantExpiresAt,
    });
    if (!insertError) {
      return json({
        grant: grant.value,
        grantExpiresAt,
        roomExpiresAt: new Date(roomExpiresAtMs).toISOString(),
      });
    }
    if (insertError.code !== "23505") break;
  }

  console.error("[sala/integration/connect] grant persistence failed");
  return json({ error: "integration_unavailable" }, 503);
}

function invalidCode(): Response {
  return json({ error: "invalid_or_expired" }, 401);
}

function json(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...extraHeaders },
  });
}
