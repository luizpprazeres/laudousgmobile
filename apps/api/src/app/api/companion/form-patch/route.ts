import {
  CompanionFormPatchRequestSchema,
  type CompanionFormPatchWarning,
} from "@laudousg/shared";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import {
  CompanionFormPatchNoFindingsError,
  companionFormPatchCategoryEnabled,
  extractCompanionCarotidFormPatch,
} from "@/server/companion/carotidFormPatch";
import { companionFormPatchRateAllowed } from "@/server/companion/formPatchRateLimit";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 16 * 1024;
function json(
  body: { error: string; warnings?: CompanionFormPatchWarning[] } | object,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  if (!companionFormPatchCategoryEnabled("DOPPLER_CAROTIDAS")) {
    return json({ error: "feature_unavailable" }, 404);
  }

  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ error: "unsupported_media_type" }, 415);
  }

  const raw = await req.text().catch(() => "");
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = CompanionFormPatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_companion_form_patch" }, 400);
  }

  if (!companionFormPatchRateAllowed(user.id)) {
    return json({ error: "rate_limit_exceeded" }, 429);
  }

  try {
    return json(await extractCompanionCarotidFormPatch({
      request: parsed.data,
      signal: req.signal,
    }));
  } catch (error) {
    if (error instanceof CompanionFormPatchNoFindingsError) {
      return json({ error: "no_applicable_findings", warnings: error.warnings }, 422);
    }
    // Não registre o erro do provedor: ele pode incorporar trechos do ditado.
    console.error("[companion-form-patch] extraction failed");
    return json({ error: "companion_form_patch_unavailable" }, 503);
  }
}
