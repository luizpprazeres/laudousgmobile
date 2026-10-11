import { createHash } from "node:crypto";
import {
  reportBelongsToRoomDay,
  serializeIntegrationReport,
  validReportId,
} from "@/server/sala/integration";
import { loadMedicalReviews } from "@/server/sala/reportContract";

import {
  validateIntegrationAccess,
  integrationJson as json,
  INTEGRATION_REPORT_COLUMNS as REPORT_COLUMNS,
  type IntegrationReportRow as ReportRow,
} from "@/server/sala/integrationAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const access = await validateIntegrationAccess(req);
  if (access.response) return access.response;
  const { service, grant, room, now, startOfDay, expiresAtMs } = access;
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
    grantExpiresAt: new Date(expiresAtMs).toISOString(),
    cursor,
    latest,
    bound,
  });
}
