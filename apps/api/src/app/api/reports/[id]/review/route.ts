import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import { getServiceClient } from "@/server/supabaseService";
import { z } from "zod";
export { OPTIONS } from "@/server/cors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Input = z.object({ expectedRevision: z.number().int().positive(), expectedText: z.string().min(1).max(200000) }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return json({ error: "invalid_report_id" }, 400);
  const input = Input.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({ error: "invalid_review_payload" }, 400);
  // Only the verified JWT supplies the actor. This RPC is service-role-only.
  const { data, error } = await getServiceClient().rpc("review_report_content", {
    p_report_id: id, p_actor_id: user.id,
    p_expected_revision: input.data.expectedRevision, p_expected_text: input.data.expectedText,
  });
  if (error) return json({ error: "review_unavailable" }, 503);
  if (!data?.ok) return json(data ?? { error: "review_unavailable" }, data?.error === "not_found" ? 404 : 409);
  return json(data);
}
