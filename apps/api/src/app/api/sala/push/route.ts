import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sala/push
 * Body: { reportId: string }
 *
 * Re-broadcast de um laudo específico do médico pra sala do auxiliar.
 * Funciona via touch no updated_at — /api/sala/latest ordena por updated_at
 * desc com fallback pra created_at, então o laudo "puxado" volta pro topo.
 *
 * Use case: médico fez 3 laudos; auxiliar perdeu o do meio; médico clica
 * "Enviar à sala" no histórico → o laudo é re-emitido sem precisar regerar.
 */
export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: { reportId?: unknown };
  try {
    body = (await req.json()) as { reportId?: unknown };
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const reportId = typeof body.reportId === "string" ? body.reportId : null;
  if (!reportId || !/^[0-9a-f-]{8,}$/i.test(reportId)) {
    return json({ error: "report_id_invalid" }, 400);
  }

  const service = getServiceClient();

  const { data: report, error: lookupErr } = await service
    .from("reports")
    .select("id, user_id")
    .eq("id", reportId)
    .maybeSingle();

  if (lookupErr) {
    console.error("[sala/push] lookup falhou", lookupErr);
    return json({ error: "lookup_failed" }, 500);
  }

  if (!report) return json({ error: "report_not_found" }, 404);
  if (report.user_id !== user.id) return json({ error: "forbidden" }, 403);

  const { error: updateErr } = await service
    .from("reports")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", reportId);

  if (updateErr) {
    console.error("[sala/push] update falhou", updateErr);
    return json({ error: "update_failed" }, 500);
  }

  return json({ ok: true });
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
