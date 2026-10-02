import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getServiceClient } from "@/server/supabaseService";
import { toStoredSchemes } from "@/server/reportSchemes/storedSchemes";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/reports/:id/schemas
 * Imagens de esquema que o próprio médico enviou à Sala para este laudo
 * (`sala_schemas`, upsert por usuário × laudo × tipo). Somente leitura: o banco
 * não guarda os achados do desenho, então não há o que reabrir no editor.
 * `sala_schemas` não tem política RLS — o filtro por `user_id` é a autorização.
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const { id } = await context.params;
  if (!UUID.test(id)) return json({ error: "invalid_report_id" }, 400);

  const { data, error } = await getServiceClient()
    .from("sala_schemas")
    .select("id, exam_type, exam_label, png_base64, updated_at")
    .eq("user_id", user.id)
    .eq("report_id", id);
  if (error) {
    console.error("[reports/schemas] leitura falhou", error);
    return json({ error: "read_failed" }, 500);
  }

  return json({ schemes: toStoredSchemes(data ?? []) });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
