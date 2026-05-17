import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sala/latest?token=<code>
 *
 * Endpoint PÚBLICO. `token` aqui é o pairing_code do médico (6 chars).
 * Valida active/revoked/expires e retorna o último laudo do médico.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("token");
  if (!raw) return json({ error: "token_missing" }, 400);

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

  if (roomErr) {
    console.error("[sala/latest] room lookup falhou", roomErr);
    return json({ tokenValid: false, report: null });
  }

  if (!room) {
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

  const { data: reports, error: reportErr } = await service
    .from("reports")
    .select("id, final_output, generated_output, category_code, created_at")
    .eq("user_id", room.user_id as string)
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  if (reportErr) {
    console.error("[sala/latest] report lookup falhou", reportErr);
    return json({ tokenValid: true, report: null, reportsToday: [] });
  }

  const list = reports ?? [];
  const latest = list[0];
  const latestOutput = latest
    ? (latest.final_output as string | null) ??
      (latest.generated_output as string | null)
    : null;

  const reportsToday = list.map((r) => ({
    id: r.id as string,
    category: r.category_code as string | null,
    createdAt: r.created_at as string,
  }));

  return json({
    tokenValid: true,
    report:
      latest && latestOutput
        ? {
            id: latest.id as string,
            outputText: latestOutput,
            category: latest.category_code as string | null,
            createdAt: latest.created_at as string,
          }
        : null,
    reportsToday,
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
