import { reportBelongsToRoomDay, serializeIntegrationReport } from "@/server/sala/integration";
import {
  validateIntegrationAccess, integrationJson, integrationUnavailable,
  INTEGRATION_REPORT_COLUMNS, type IntegrationReportRow,
} from "@/server/sala/integrationAccess";
import { loadMedicalReviews } from "@/server/sala/reportContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const access = await validateIntegrationAccess(req);
  if (access.response) return access.response;
  const { service, room, startOfDay, expiresAtMs } = access;
  const { data, error } = await service.from("reports")
    .select(INTEGRATION_REPORT_COLUMNS)
    .eq("user_id", room.user_id)
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);
  if (error) return integrationUnavailable(503);

  const rows = ((data ?? []) as IntegrationReportRow[]).filter((row) =>
    reportBelongsToRoomDay(row, room.user_id, startOfDay),
  );
  const reviews = await loadMedicalReviews(service, rows.map((row) => row.id));
  const reports = rows.map((row) => {
    const report = serializeIntegrationReport(row, reviews.get(row.id));
    return {
      id: report.id, createdAt: report.createdAt, category: report.category,
      contentRevision: report.contentRevision, reviewStatus: report.reviewStatus,
      reviewedAt: report.reviewedAt,
      preview: report.outputText.slice(0, 160),
      reviewSignalsCount: report.reviewSignals.highlights.length + report.reviewSignals.notices.length,
    };
  });
  return integrationJson({ expiresAt: new Date(expiresAtMs).toISOString(), reports });
}
