import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import {
  ClinicalReportError,
  CreateClinicalReportRequestSchema,
  clinicalModelsV1Enabled,
  createClinicalReport,
} from "@/server/clinicalReports/service";
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

  // Rollout conjunto: a rota só abre quando os cinco códigos estiverem na
  // allowlist do backend. O default vazio mantém o recurso integralmente OFF.
  if (!clinicalModelsV1Enabled(env().RENDERER_CATEGORIES)) {
    return json({ error: "clinical_models_v1_unavailable" }, 404);
  }

  const input = CreateClinicalReportRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!input.success) {
    return json({ error: "invalid_clinical_contract", issues: input.error.issues }, 400);
  }

  try {
    return json(await createClinicalReport({ userId: user.id, input: input.data }), 201);
  } catch (error) {
    if (error instanceof ClinicalReportError) {
      return json({ error: error.code, issues: error.issues ?? [] }, error.status);
    }
    console.error("clinical report persistence failed", error);
    return json({ error: "clinical_report_unavailable" }, 503);
  }
}
