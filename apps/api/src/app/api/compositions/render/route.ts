export { OPTIONS } from "@/server/cors";
import {
  CLINICAL_COMPOSITION_CONTRACT_VERSION,
  ClinicalCompositionAssociationCodeSchema,
  ClinicalCompositionRequestV1Schema,
  ClinicalCompositionResponseV1Schema,
  type ClinicalCompositionErrorV1,
} from "@laudousg/shared";
import { z } from "zod";
import { autorizarServico } from "@/server/catalog-api/auth";
import { renderClinicalComposition } from "@/server/renderer/composition/renderClinicalComposition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

const IdentitySchema = z
  .object({
    contractVersion: z.literal(CLINICAL_COMPOSITION_CONTRACT_VERSION),
    requestId: z.string().uuid(),
    compositionId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    associationCode: ClinicalCompositionAssociationCodeSchema,
  })
  .passthrough();

function invalidRequest(
  identity: z.infer<typeof IdentitySchema>,
  message: string,
): ClinicalCompositionErrorV1 {
  return {
    contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
    requestId: identity.requestId,
    compositionId: identity.compositionId,
    revision: identity.revision,
    associationCode: identity.associationCode,
    status: "error",
    error: { code: "INVALID_REQUEST", message },
  };
}

function statusFor(error: ClinicalCompositionErrorV1): number {
  if (
    error.error.code === "SHARED_STRUCTURE_CONFLICT" ||
    error.error.code === "SHARED_STRUCTURE_REQUIRED"
  ) {
    return 409;
  }
  if (error.error.code === "UNKNOWN_ALTERATION") return 400;
  return 422;
}

/**
 * POST /api/compositions/render
 *
 * Compõe somente associações explicitamente suportadas. Cada componente passa
 * pelo mesmo catálogo e renderer do endpoint simples; o assembler só organiza
 * as seções e a proveniência. Qualquer falha elimina o documento inteiro.
 */
export async function POST(req: Request) {
  const auth = autorizarServico(req);
  if (!auth.ok) return Response.json({ error: auth.erro }, { status: auth.status });

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    try {
      const identity = IdentitySchema.safeParse(JSON.parse(raw));
      if (identity.success) {
        const response: ClinicalCompositionErrorV1 = {
          contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
          requestId: identity.data.requestId,
          compositionId: identity.data.compositionId,
          revision: identity.data.revision,
          associationCode: identity.data.associationCode,
          status: "error",
          error: {
            code: "PAYLOAD_LIMIT_EXCEEDED",
            message: "corpo excede 256 KiB",
          },
        };
        return Response.json(response, { status: 413 });
      }
    } catch {
      // Sem identidade validável não há como ecoar o guard do cliente.
    }
    return Response.json({ error: "corpo excede 256 KiB" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "corpo inválido" }, { status: 400 });
  }

  const identity = IdentitySchema.safeParse(json);
  const parsed = ClinicalCompositionRequestV1Schema.safeParse(json);
  if (!parsed.success) {
    if (!identity.success) {
      return Response.json({ error: "contrato de composição inválido" }, { status: 400 });
    }
    const first = parsed.error.issues[0];
    const path = first?.path.length ? ` em ${first.path.join(".")}` : "";
    const response = invalidRequest(
      identity.data,
      `contrato de composição inválido${path}: ${first?.message ?? "schema recusado"}`,
    );
    return Response.json(response, { status: 400 });
  }

  let response: ReturnType<typeof ClinicalCompositionResponseV1Schema.parse>;
  try {
    response = ClinicalCompositionResponseV1Schema.parse(
      await renderClinicalComposition(parsed.data),
    );
  } catch {
    const failed: ClinicalCompositionErrorV1 = {
      contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
      requestId: parsed.data.requestId,
      compositionId: parsed.data.compositionId,
      revision: parsed.data.revision,
      associationCode: parsed.data.associationCode,
      status: "error",
      error: {
        code: "COMPONENT_RENDER_FAILED",
        message: "composição não pôde ser concluída",
      },
      components: parsed.data.components.map((component) => ({
        componentId: component.componentId,
        categoryCode: component.categoryCode,
        status: "blocked",
      })),
    };
    return Response.json(failed, { status: 500 });
  }
  return Response.json(response, {
    status: response.status === "complete" ? 200 : statusFor(response),
  });
}
