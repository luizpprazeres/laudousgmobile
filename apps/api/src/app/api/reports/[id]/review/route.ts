import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import { ReviewReportInputSchema, reviewPersistedReport } from "@/server/clinicalReports/review";
import { z } from "zod";
export { OPTIONS } from "@/server/cors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return json({ error: "invalid_report_id" }, 400);
  const input = ReviewReportInputSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({ error: "invalid_review_payload" }, 400);
  const result = await reviewPersistedReport({
    reportId: id,
    actorId: user.id,
    expectedRevision: input.data.expectedRevision,
    expectedText: input.data.expectedText,
  });
  return json(result.body, result.status);
}
