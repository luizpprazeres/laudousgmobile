import {
  renderDopplerVenosoMmii,
  validateDopplerVenosoMmii,
} from "@laudousg/shared";
import type { StructuredCatalogRender } from "../../catalog-api/structuredRenderers";
import { projectStructuredVenousMap } from "../../vascular/structuredVenousMap";

type Presentation = "DOPPLER_VENOSO_MMII" | "DOPPLER_VENOSO_MMII_MEDIDAS";

/** As duas apresentações usam as mesmas regras clínicas no pacote compartilhado. */
export function renderDopplerVenosoMmiiWeb(
  input: unknown,
  style: string,
  presentation: Presentation = "DOPPLER_VENOSO_MMII",
): StructuredCatalogRender {
  const validation = validateDopplerVenosoMmii(input);
  if (!validation.success || !validation.canGenerateFinalText || !validation.data) {
    return {
      ok: false,
      error: "dados estruturados do Doppler venoso estão incompletos ou conflitantes",
      issues: validation.issues.map(({ path, message }) => ({ path, message })),
    };
  }
  if (validation.data.categoryCode !== presentation) {
    return {
      ok: false,
      error: "categoria do contrato difere da categoria solicitada",
      issues: [{ path: "categoryCode", message: "selecione a mesma categoria do formulário" }],
    };
  }
  const text = renderDopplerVenosoMmii(validation.data, style === "CLASSICO_COMPLETO" ? "CLASSICO_COMPLETO" : "OBJETIVO");
  const venousMap = projectStructuredVenousMap(validation.data);
  return {
    ok: true,
    text,
    ...(venousMap ? { venousMap, assetVersion: "venous-4view-1" as const } : {}),
  };
}
