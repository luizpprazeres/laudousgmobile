import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sala/latest?token=<long-token>
 *
 * Endpoint PÚBLICO (sem auth). Segurança via opacidade do token (UUID) +
 * RPC SECURITY DEFINER que valida revogação/TTL.
 *
 * Retorna o último laudo do médico dono do token, ou tokenValid:false.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return json({ error: "token_missing" }, 400);

  const service = getServiceClient();
  const { data, error } = await service.rpc("get_report_by_sala_token", {
    p_token: token,
  });

  if (error || !data || data.length === 0) {
    return json({ tokenValid: false, report: null });
  }

  const row = data[0];
  if (!row.token_valid) {
    return json({ tokenValid: false, report: null });
  }

  return json({
    tokenValid: true,
    report: row.report_output_text
      ? {
          outputText: row.report_output_text,
          category: row.report_category,
          createdAt: row.report_created_at,
        }
      : null,
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
