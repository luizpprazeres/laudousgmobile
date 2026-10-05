import { DopplerHepaticoSchema, renderClinicalModelReport, validateClinicalModelInput } from "@laudousg/shared";
import type { StructuredCatalogRender } from "../../catalog-api/structuredRenderers";

/** Prévia por contrato; revisão confiável continua sendo uma ação autenticada posterior. */
export function renderDopplerHepaticoWeb(input: unknown, style: string): StructuredCatalogRender {
  const parsed = DopplerHepaticoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false, error: "dados estruturados do Doppler hepático estão incompletos ou conflitantes",
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
  }
  const contract = { ...parsed.data, physicianReviewed: false };
  const validation = validateClinicalModelInput(contract, { requirePhysicianReview: false });
  if (!validation.success) {
    return {
      ok: false, error: "dados estruturados do Doppler hepático estão incompletos ou conflitantes",
      issues: validation.issues.map(({ path, message }) => ({ path, message })),
    };
  }
  const text = renderClinicalModelReport(validation.data);
  return {
    ok: true,
    text: style === "OBJETIVO" ? text
      .replace(/^COMENTÁRIOS:$/m, "TÉCNICA:")
      .replace(/^OS SEGUINTES ASPECTOS FORAM OBSERVADOS:$/m, "ACHADOS:")
      .replace(/^CONCLUSÃO:$/m, "IMPRESSÃO:") : text,
  };
}
