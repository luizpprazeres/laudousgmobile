import { createHash, createHmac, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  serializeSalaReport,
  type ReviewRow,
  type SalaReportRow,
} from "./reportContract";

export const SALA_INTEGRATION_GRANT_TTL_MS = 12 * 60 * 60 * 1000;
export const SALA_INTEGRATION_RATE_WINDOW_SECONDS = 15 * 60;
export const SALA_INTEGRATION_IP_LIMIT = 30;
export const SALA_INTEGRATION_CODE_LIMIT = 8;

const PAIRING_CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type IntegrationRoom = {
  id: string;
  user_id: string;
  active: boolean;
  revoked_at: string | null;
  pairing_code_expires_at: string | null;
  expires_at: string | null;
};

export type IntegrationGrant = {
  id: string;
  room_token_id: string;
  expires_at: string;
  revoked_at: string | null;
};

export function normalizePairingCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\s\-_]/g, "").toUpperCase();
  return PAIRING_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function rateLimitHash(value: string): string {
  const secret =
    process.env.SALA_INTEGRATION_RATE_LIMIT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("rate_limit_secret_missing");
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

export function issueOpaqueGrant(): { value: string; hash: string } {
  const value = randomBytes(32).toString("base64url");
  return { value, hash: sha256(value) };
}

export function bearerGrant(req: Request): string | null {
  const authorization = req.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  return match?.[1] ?? null;
}

export function requestSource(req: Request): string {
  const forwarded =
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip");
  const first = forwarded?.split(",", 1)[0]?.trim();
  return first && first.length <= 128 ? first : "unknown";
}

function validFutureDate(value: string | null, nowMs: number): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > nowMs ? timestamp : null;
}

export function roomExpiryMs(room: IntegrationRoom, nowMs = Date.now()): number | null {
  if (!room.active || room.revoked_at) return null;
  const pairingExpiry = validFutureDate(room.pairing_code_expires_at, nowMs);
  const roomExpiry = validFutureDate(room.expires_at, nowMs);
  if (pairingExpiry === null || roomExpiry === null) return null;
  return Math.min(pairingExpiry, roomExpiry);
}

export function grantExpiryMs(grant: IntegrationGrant, nowMs = Date.now()): number | null {
  if (grant.revoked_at) return null;
  return validFutureDate(grant.expires_at, nowMs);
}

export function integrationGrantExpiry(room: IntegrationRoom, nowMs = Date.now()): number | null {
  const roomExpiry = roomExpiryMs(room, nowMs);
  return roomExpiry === null
    ? null
    : Math.min(roomExpiry, nowMs + SALA_INTEGRATION_GRANT_TTL_MS);
}

export function validReportId(value: string | null): value is string {
  return !!value && UUID_PATTERN.test(value);
}

export function reportBelongsToRoomDay(
  report: { user_id?: string; created_at: string },
  userId: string,
  startOfDay: Date,
): boolean {
  const createdAt = new Date(report.created_at).getTime();
  return (
    report.user_id === userId &&
    Number.isFinite(createdAt) &&
    createdAt >= startOfDay.getTime()
  );
}

export function serializeIntegrationReport(row: SalaReportRow, review?: ReviewRow) {
  const serialized = serializeSalaReport(row, review);
  const revisionValid =
    Number.isInteger(serialized.contentRevision) && serialized.contentRevision > 0;
  const reviewedAtValid =
    serialized.reviewStatus !== "reviewed" ||
    (typeof serialized.reviewedAt === "string" &&
      Number.isFinite(new Date(serialized.reviewedAt).getTime()));
  if (revisionValid && reviewedAtValid) return serialized;
  return { ...serialized, reviewStatus: "pending" as const, reviewedAt: null };
}

export async function consumeIntegrationRateLimit(
  service: SupabaseClient,
  req: Request,
  code: string | null,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const sourceResult = await consumeRateBucket(
    service,
    rateLimitHash(`sala-integration:source:${requestSource(req)}`),
    SALA_INTEGRATION_IP_LIMIT,
  );
  if (!sourceResult.allowed || !code) return sourceResult;

  return consumeRateBucket(
    service,
    rateLimitHash(`sala-integration:code:${code}`),
    SALA_INTEGRATION_CODE_LIMIT,
  );
}

async function consumeRateBucket(
  service: SupabaseClient,
  key: string,
  limit: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const { data, error } = await service.rpc("consume_sala_integration_rate_limit", {
    p_key_hash: key,
    p_limit: limit,
    p_window_seconds: SALA_INTEGRATION_RATE_WINDOW_SECONDS,
  });
  if (error) throw new Error("rate_limit_unavailable");
  const result = Array.isArray(data) ? data[0] : data;
  return result?.allowed
    ? { allowed: true, retryAfter: 0 }
    : { allowed: false, retryAfter: Number(result?.retry_after_seconds) || 1 };
}
