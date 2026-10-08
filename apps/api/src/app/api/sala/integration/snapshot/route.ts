import { createHash } from "node:crypto";
import { getServiceClient } from "@/server/supabaseService";
import {
  bearerGrant,
  grantExpiryMs,
  reportBelongsToRoomDay,
  roomExpiryMs,
  serializeIntegrationReport,
  sha256,
  validReportId,
  type IntegrationGrant,
  type IntegrationRoom,
} from "@/server/sala/integration";
import {
  loadMedicalReviews,
  salaDayStart,
  type SalaReportRow,
} from "@/server/sala/reportContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportRow = SalaReportRow & {
  user_id: string;
  updated_at?: string | null;
};

const REPORT_COLUMNS =
  "id, user_id, final_output, generated_output, category_code, created_at, updated_at, content_revision, sanity_result";

export async function GET(req: Request): Promise<Response> {
  const grantValue = bearerGrant(req);
  if (!grantValue) return unavailable();

  const service = getServiceClient();
  const { data: grantData, error: grantError } = await service
    .from("sala_integration_grants")
    .select("id, room_token_id, expires_at, revoked_at")
    .eq("grant_hash", sha256(grantValue))
    .limit(1)
    .maybeSingle();

  if (grantError) {
    console.error("[sala/integration/snapshot] grant lookup failed");
    return json({ error: "integration_unavailable" }, 503);
  }

  const grant = grantData as IntegrationGrant | null;
  const now = Date.now();
  const grantExpiresAtMs = grant ? grantExpiryMs(grant, now) : null;
  if (!grant || grantExpiresAtMs === null) return unavailable();

  const { data: roomData, error: roomError } = await service
    .from("room_tokens")
    .select("id, user_id, active, revoked_at, pairing_code_expires_at, expires_at")
    .eq("id", grant.room_token_id)
    .limit(1)
    .maybeSingle();

  if (roomError) {
    console.error("[sala/integration/snapshot] room lookup failed");
    return json({ error: "integration_unavailable" }, 503);
  }

  const room = roomData as IntegrationRoom | null;
  if (!room || roomExpiryMs(room, now) === null) return unavailable();

  const startOfDay = salaDayStart(new Date(now));
  const boundReportId = new URL(req.url).searchParams.get("boundReportId");

  const reportsPromise = service
    .from("reports")
    .select(REPORT_COLUMNS)
    .eq("user_id", room.user_id)
    .gte("created_at", startOfDay.toISOString())
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  const boundPromise = validReportId(boundReportId)
    ? service
        .from("reports")
        .select(REPORT_COLUMNS)
        .eq("id", boundReportId)
        .eq("user_id", room.user_id)
        .gte("created_at", startOfDay.toISOString())
        .limit(1)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [reportsResult, boundResult] = await Promise.all([reportsPromise, boundPromise]);
  if (reportsResult.error || boundResult.error) {
    console.error("[sala/integration/snapshot] report lookup failed");
    return json({ error: "integration_unavailable" }, 503);
  }

  const reportRows = (reportsResult.data ?? []) as ReportRow[];
  const rawBound = boundResult.data as ReportRow | null;
  const boundRow =
    rawBound && reportBelongsToRoomDay(rawBound, room.user_id, startOfDay)
      ? rawBound
      : null;
  const reviewIds = Array.from(
    new Set([...reportRows.map((entry) => entry.id), ...(boundRow ? [boundRow.id] : [])]),
  );
  const reviews = await loadMedicalReviews(service, reviewIds);
  const serialized = reportRows.map((entry) => ({
    report: serializeIntegrationReport(entry, reviews.get(entry.id)),
    updatedAt: entry.updated_at ?? null,
  }));
  const latestEntry = serialized.find((entry) => entry.report.outputText.trim());
  const latest = latestEntry?.report ?? null;
  const bound = boundRow
    ? serializeIntegrationReport(boundRow, reviews.get(boundRow.id))
    : null;
  const cursor = createHash("sha256")
    .update(
      JSON.stringify({
        latest,
        latestUpdatedAt: latestEntry?.updatedAt ?? null,
        bound,
        boundUpdatedAt: boundRow?.updated_at ?? null,
      }),
    )
    .digest("hex");

  // Uso recente e apenas telemetria de credencial. Uma falha aqui nao invalida
  // um snapshot que ja foi validado e lido com sucesso.
  await service
    .from("sala_integration_grants")
    .update({ last_used_at: new Date(now).toISOString() })
    .eq("id", grant.id);

  return json({
    roomStatus: "active",
    grantExpiresAt: new Date(grantExpiresAtMs).toISOString(),
    cursor,
    latest,
    bound,
  });
}

function unavailable(): Response {
  return json({ error: "integration_unavailable" }, 401);
}

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
