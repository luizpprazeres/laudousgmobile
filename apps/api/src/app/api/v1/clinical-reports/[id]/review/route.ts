import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import { ReviewReportInputSchema, reviewPersistedReport } from "@/server/clinicalReports/review";
import { clinicalModelsV1Enabled } from "@/server/clinicalReports/service";
import { OPTIONS } from "@/server/cors";
import { env } from "@/server/env";
import { z } from "zod";

export { OPTIONS };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "cache-control": "no-store" },
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  // Mesmo rollback conjunto da criação: `false` suspende a superfície inteira.
  if (!clinicalModelsV1Enabled(env().CLINICAL_MODELS_V1_ENABLED)) {
    return json({ error: "clinical_models_v1_unavailable" }, 404);
  }
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
