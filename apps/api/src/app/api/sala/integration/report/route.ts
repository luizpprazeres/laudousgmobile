import {
  reportBelongsToRoomDay, serializeIntegrationReport, validReportId,
} from "@/server/sala/integration";
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
  const id = new URL(req.url).searchParams.get("id");
  if (!validReportId(id)) return integrationUnavailable();
  const { service, room, startOfDay } = access;
  const { data, error } = await service.from("reports")
    .select(INTEGRATION_REPORT_COLUMNS)
    .eq("id", id)
    .eq("user_id", room.user_id)
    .gte("created_at", startOfDay.toISOString())
    .limit(1)
    .maybeSingle();
  if (error) return integrationUnavailable(503);
  const row = data as IntegrationReportRow | null;
  if (!row || !reportBelongsToRoomDay(row, room.user_id, startOfDay)) {
    return integrationUnavailable();
  }
  const reviews = await loadMedicalReviews(service, [row.id]);
  return integrationJson(serializeIntegrationReport(row, reviews.get(row.id)));
}
