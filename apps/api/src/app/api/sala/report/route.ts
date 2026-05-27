import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sala/report?token=<code>&id=<reportId>
 *
 * Endpoint PÚBLICO. Retorna um laudo específico (do dia) do médico dono do token.
 * Usado quando o auxiliar clica em um item da timeline para revisitar exames anteriores.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("token");
  const reportId = url.searchParams.get("id");
  if (!raw || !reportId) return json({ error: "params_missing" }, 400);

  const code = raw.replace(/[\s\-_]/g, "").toUpperCase();
  if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(code)) {
    return json({ tokenValid: false, report: null, reason: "invalid_format" });
  }

  const service = getServiceClient();

  const { data: room, error: roomErr } = await service
    .from("room_tokens")
    .select("user_id, active, revoked_at, pairing_code_expires_at")
    .eq("pairing_code", code)
    .maybeSingle();

  if (roomErr || !room) {
    return json({ tokenValid: false, report: null, reason: "not_found" });
  }

  const expiresAt = room.pairing_code_expires_at
    ? new Date(room.pairing_code_expires_at as string).getTime()
    : 0;
  if (!room.active || room.revoked_at) {
    return json({ tokenValid: false, report: null, reason: "revoked" });
  }
  if (expiresAt < Date.now()) {
    return json({ tokenValid: false, report: null, reason: "expired" });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: report, error: reportErr } = await service
    .from("reports")
    .select("id, final_output, generated_output, category_code, created_at")
    .eq("user_id", room.user_id as string)
    .eq("id", reportId)
    .gte("created_at", startOfDay.toISOString())
    .maybeSingle();

  if (reportErr || !report) {
    return json({ tokenValid: true, report: null });
  }

  const outputText =
    (report.final_output as string | null) ??
    (report.generated_output as string | null);

  if (!outputText) {
    return json({ tokenValid: true, report: null });
  }

  return json({
    tokenValid: true,
    report: {
      id: report.id as string,
      outputText,
      category: report.category_code as string | null,
      createdAt: report.created_at as string,
    },
  });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
