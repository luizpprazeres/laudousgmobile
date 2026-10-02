import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import {
  CreateHepaticReportRequestSchema,
  HepaticReportError,
  createHepaticReport,
  hepaticReportsV1Enabled,
} from "@/server/hepaticReports/service";
import { OPTIONS } from "@/server/cors";
import { env } from "@/server/env";

export { OPTIONS };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "cache-control": "no-store" },
});

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (!hepaticReportsV1Enabled(env().HEPATIC_REPORTS_V1_ENABLED)) {
    return json({ error: "hepatic_reports_v1_unavailable" }, 404);
  }

  const input = CreateHepaticReportRequestSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return json({ error: "invalid_hepatic_contract", issues: input.error.issues }, 400);
  }
  try {
    return json(await createHepaticReport({ userId: user.id, input: input.data }), 201);
  } catch (error) {
    if (error instanceof HepaticReportError) {
      return json({ error: error.code, issues: error.issues }, error.status);
    }
    console.error("hepatic report persistence failed", error);
    return json({ error: "hepatic_report_unavailable" }, 503);
  }
}
