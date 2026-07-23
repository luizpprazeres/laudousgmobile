import { getServiceClient } from "@/server/supabaseService";
import { validateSalaToken } from "@/server/sala/validateToken";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sala/[token]/schemas
 * Lista os esquemas visuais (diagramas) enviados pro médico-dono desse token.
 * Retorna o PNG (pra exibir) + metadados; o PDF é baixado sob demanda noutro
 * endpoint (mantém a lista leve).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const validation = await validateSalaToken(token);
  if (!validation.ok) {
    return json({ error: "invalid_token" }, 401);
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from("sala_schemas")
    .select("id, report_id, exam_type, exam_label, png_base64, pdf_base64, created_at, updated_at")
    .eq("user_id", validation.userId)
    .order("updated_at", { ascending: false })
    .limit(24);

  if (error) {
    console.error("[sala/schemas] list falhou", error);
    return json({ error: "list_failed" }, 500);
  }

  const schemas = (data ?? []).map((s) => ({
    id: s.id as string,
    reportId: (s.report_id as string | null) ?? null,
    examType: s.exam_type as string,
    examLabel: s.exam_label as string,
    png: s.png_base64 as string,
    hasPdf: !!s.pdf_base64,
    createdAt: s.created_at as string,
    updatedAt: s.updated_at as string,
  }));

  return json({ schemas });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
