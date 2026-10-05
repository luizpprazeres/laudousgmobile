import {
  renderDopplerArterialMmii,
  renderDopplerFistulaAv,
  validateDopplerArterialMmii,
  validateDopplerFistulaAv,
} from "@laudousg/shared";
import type { StructuredCatalogRender } from "../../catalog-api/structuredRenderers";

type Validation = { success: boolean; data: unknown; issues: Array<{ path: string; message: string }> };

/** Formulários Web vasculares (MVP): o texto sai só do contrato compartilhado, fail-closed. */
function renderStructured(
  input: unknown,
  style: string,
  name: string,
  validate: (value: unknown) => Validation,
  render: (value: unknown, style: "CLASSICO_COMPLETO" | "OBJETIVO") => string,
): StructuredCatalogRender {
  const validation = validate(input);
  if (!validation.success || !validation.data) {
    return {
      ok: false,
      error: `dados estruturados do ${name} estão incompletos ou conflitantes`,
      issues: validation.issues.map(({ path, message }) => ({ path, message })),
    };
  }
  return { ok: true, text: render(validation.data, style === "OBJETIVO" ? "OBJETIVO" : "CLASSICO_COMPLETO") };
}

export const renderDopplerArterialMmiiWeb = (input: unknown, style: string) =>
  renderStructured(input, style, "Doppler arterial", validateDopplerArterialMmii, renderDopplerArterialMmii);
export const renderDopplerFistulaAvWeb = (input: unknown, style: string) =>
  renderStructured(input, style, "Doppler de fístula AV", validateDopplerFistulaAv, renderDopplerFistulaAv);
