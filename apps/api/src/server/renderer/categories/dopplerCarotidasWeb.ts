import { renderDopplerCarotidasWeb, validateDopplerCarotidasWeb } from "@laudousg/shared";
import type { StructuredCatalogRender } from "../../catalog-api/structuredRenderers";

/**
 * Formulário Web de Doppler de carótidas e vertebrais: o texto sai só do contrato
 * compartilhado, fail-closed. O renderer de DOPPLER_CAROTIDAS do pipeline mobile e da
 * Biblioteca (`DOPPLER_CAROTIDAS.ts`) não é usado nesta rota.
 */
export function renderDopplerCarotidasWebRoute(input: unknown, style: string): StructuredCatalogRender {
  const validation = validateDopplerCarotidasWeb(input);
  if (!validation.success || !validation.data) {
    return {
      ok: false,
      error: "dados estruturados do Doppler de carótidas estão incompletos ou conflitantes",
      issues: validation.issues.map(({ path, message }) => ({ path, message })),
    };
  }
  return { ok: true, text: renderDopplerCarotidasWeb(validation.data, style === "OBJETIVO" ? "OBJETIVO" : "CLASSICO_COMPLETO") };
}
