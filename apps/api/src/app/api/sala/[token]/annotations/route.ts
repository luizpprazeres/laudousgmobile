import { getServiceClient } from "@/server/supabaseService";
import {
  ANNOTATION_LIMITS,
  checkAnnotationPostLimit,
} from "@/server/sala/rateLimit";
import { validateSalaToken } from "@/server/sala/validateToken";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Placement = "after-title" | "in-conclusion" | "footer";
const VALID_PLACEMENTS: Placement[] = [
  "after-title",
  "in-conclusion",
  "footer",
];

/**
 * GET /api/sala/[token]/annotations?reportId=<uuid>
 *
 * Lista anotações persistidas pra esse sala_token, opcionalmente filtradas
 * por report_id. Ordem: created_at ASC, id ASC (id como tiebreaker pra
 * ordenação estável quando timestamps coincidem em ms — sugestão dex1 round 5.1).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const validation = await validateSalaToken(token);
  if (!validation.ok) return json({ error: validation.reason }, 404);

  const url = new URL(req.url);
  const reportId = url.searchParams.get("reportId");

  const service = getServiceClient();
  let query = service
    .from("sala_annotations")
    .select("id, report_id, text, placement, created_at")
    .eq("sala_token", validation.code)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (reportId) {
    query = query.eq("report_id", reportId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[sala/annotations GET] falhou", error);
    return json({ annotations: [] });
  }

  const annotations = (data ?? []).map((row) => ({
    id: row.id as string,
    reportId: row.report_id as string | null,
    text: row.text as string,
    placement: (row.placement as Placement) ?? "in-conclusion",
    createdAt: row.created_at as string,
  }));

  return json({ annotations });
}

/**
 * POST /api/sala/[token]/annotations
 *
 * Body: { text: string, reportId?: string, placement?: Placement }
 * Default placement: 'in-conclusion'
 *
 * Validações (round 5.1):
 * - Rate limit: 10 POSTs/minuto por token
 * - Ownership: se reportId presente, valida que report.user_id === token.user_id
 * - Limite por report: max 30 anotações por (sala_token, report_id)
 * - Placement enum strict: rejeita inválido com 400
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const validation = await validateSalaToken(token);
  if (!validation.ok) return json({ error: validation.reason }, 404);

  const rateCheck = checkAnnotationPostLimit(validation.code);
  if (!rateCheck.ok) {
    return new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        retryAfter: rateCheck.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(rateCheck.retryAfter),
          "cache-control": "no-store",
        },
      },
    );
  }

  let body: { text?: unknown; reportId?: unknown; placement?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 4000) {
    return json({ error: "invalid_text" }, 400);
  }
  const reportId =
    typeof body.reportId === "string" && body.reportId.length > 0
      ? body.reportId
      : null;
  if (!reportId) {
    return json({ error: "missing_report_id" }, 400);
  }

  let placement: Placement = "in-conclusion";
  if (body.placement !== undefined && body.placement !== null) {
    if (
      typeof body.placement !== "string" ||
      !VALID_PLACEMENTS.includes(body.placement as Placement)
    ) {
      return json(
        {
          error: "invalid_placement",
          accepted: VALID_PLACEMENTS,
        },
        400,
      );
    }
    placement = body.placement as Placement;
  }

  const service = getServiceClient();

  const { data: report, error: ownErr } = await service
    .from("reports")
    .select("id")
    .eq("id", reportId)
    .eq("user_id", validation.userId)
    .maybeSingle();

  if (ownErr) {
    console.error("[sala/annotations POST] ownership lookup falhou", ownErr);
    return json({ error: "ownership_check_failed" }, 500);
  }
  if (!report) {
    return json({ error: "report_not_owned" }, 403);
  }

  const { count, error: countErr } = await service
    .from("sala_annotations")
    .select("id", { count: "exact", head: true })
    .eq("sala_token", validation.code)
    .eq("report_id", reportId);

  if (countErr) {
    console.error("[sala/annotations POST] count falhou", countErr);
  } else if ((count ?? 0) >= ANNOTATION_LIMITS.maxPerReport) {
    return json(
      {
        error: "annotation_limit_reached",
        limit: ANNOTATION_LIMITS.maxPerReport,
      },
      422,
    );
  }

  const { data, error } = await service
    .from("sala_annotations")
    .insert({
      sala_token: validation.code,
      report_id: reportId,
      text,
      placement,
    })
    .select("id, report_id, text, placement, created_at")
    .single();

  if (error || !data) {
    console.error("[sala/annotations POST] insert falhou", error);
    return json({ error: "insert_failed" }, 500);
  }

  return json({
    annotation: {
      id: data.id as string,
      reportId: data.report_id as string | null,
      text: data.text as string,
      placement: (data.placement as Placement) ?? "in-conclusion",
      createdAt: data.created_at as string,
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
