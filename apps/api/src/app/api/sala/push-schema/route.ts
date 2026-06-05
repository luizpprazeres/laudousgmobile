import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sala/push-schema
 * Body: { reportId?: string, examType: string, examLabel: string,
 *         png: string (base64), pdf?: string (base64) }
 *
 * Envia um ESQUEMA VISUAL (diagrama, ex.: miomas FIGO) do app pra Sala do
 * Auxiliar. Manual (sem auto-update). Substitui o esquema anterior do mesmo
 * (report_id × exam_type) — não acumula versões.
 *
 * São diagramas ABSTRATOS (sem dado de paciente) → LGPD-safe. PNG pra exibir +
 * PDF (paisagem) pra baixar, ambos base64.
 */

// ~2 MB de base64 por blob (diagramas chapados comprimem muito; folga de sobra).
const MAX_B64 = 2_800_000;

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: {
    reportId?: unknown;
    examType?: unknown;
    examLabel?: unknown;
    png?: unknown;
    pdf?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const examType = typeof body.examType === "string" ? body.examType.trim() : "";
  const examLabel = typeof body.examLabel === "string" ? body.examLabel.trim() : "";
  const png = typeof body.png === "string" ? body.png : "";
  const pdf = typeof body.pdf === "string" ? body.pdf : null;
  const reportId =
    typeof body.reportId === "string" && /^[0-9a-f-]{8,}$/i.test(body.reportId)
      ? body.reportId
      : null;

  if (!examType || !examLabel || !png) {
    return json({ error: "missing_fields" }, 400);
  }
  if (png.length > MAX_B64 || (pdf?.length ?? 0) > MAX_B64) {
    return json({ error: "payload_too_large" }, 413);
  }

  const service = getServiceClient();

  // Se veio reportId, confirma que é do médico (não vaza esquema pra sessão alheia).
  if (reportId) {
    const { data: report } = await service
      .from("reports")
      .select("user_id")
      .eq("id", reportId)
      .maybeSingle();
    if (report && report.user_id !== user.id) {
      return json({ error: "forbidden" }, 403);
    }
  }

  // Upsert por (user_id, report_id, exam_type) — substitui a versão anterior.
  const nowIso = new Date().toISOString();
  let existing = service
    .from("sala_schemas")
    .select("id")
    .eq("user_id", user.id)
    .eq("exam_type", examType);
  existing = reportId
    ? existing.eq("report_id", reportId)
    : existing.is("report_id", null);
  const { data: found } = await existing.maybeSingle();

  if (found?.id) {
    const { error } = await service
      .from("sala_schemas")
      .update({ exam_label: examLabel, png_base64: png, pdf_base64: pdf, updated_at: nowIso })
      .eq("id", found.id);
    if (error) {
      console.error("[sala/push-schema] update falhou", error);
      return json({ error: "update_failed" }, 500);
    }
    return json({ ok: true, replaced: true });
  }

  const { error } = await service.from("sala_schemas").insert({
    user_id: user.id,
    report_id: reportId,
    exam_type: examType,
    exam_label: examLabel,
    png_base64: png,
    pdf_base64: pdf,
  });
  if (error) {
    console.error("[sala/push-schema] insert falhou", error);
    return json({ error: "insert_failed" }, 500);
  }
  return json({ ok: true, replaced: false });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
