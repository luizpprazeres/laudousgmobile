import { renderDopplerRenalWeb } from "../renderer/categories/dopplerRenalWeb";
import { renderDopplerVenosoMmiiWeb } from "../renderer/categories/dopplerVenosoMmiiWeb";
import type { MapaVenoso } from "@laudousg/schemes/vascular";
import { renderDopplerHepaticoWeb } from "../renderer/categories/dopplerHepaticoWeb";
import { renderDopplerCarotidasWebRoute } from "../renderer/categories/dopplerCarotidasWeb";
import { renderDopplerArterialMmiiWeb, renderDopplerArteriasTemporaisWeb, renderDopplerFistulaAvWeb } from "../renderer/categories/dopplerArterialFistulaWeb";

export type StructuredCatalogRender =
  | { ok: true; text: string; venousMap?: MapaVenoso; assetVersion?: "venous-4view-1" }
  | { ok: false; error: string; issues: Array<{ path: string; message: string }> };

type Renderer = (input: unknown, style: string) => StructuredCatalogRender;

/** Categorias cujo formulário envia um contrato estruturado, não ids do catálogo. */
const STRUCTURED_RENDERERS: Readonly<Record<string, Renderer>> = {
  DOPPLER_RENAL: renderDopplerRenalWeb,
  DOPPLER_HEPATICO: renderDopplerHepaticoWeb,
  DOPPLER_VENOSO_MMII: (input, style) => renderDopplerVenosoMmiiWeb(input, style, "DOPPLER_VENOSO_MMII"),
  DOPPLER_VENOSO_MMII_MEDIDAS: (input, style) => renderDopplerVenosoMmiiWeb(input, style, "DOPPLER_VENOSO_MMII_MEDIDAS"),
  DOPPLER_ARTERIAL_MMII: renderDopplerArterialMmiiWeb,
  DOPPLER_FISTULA_AV: renderDopplerFistulaAvWeb,
  DOPPLER_ARTERIAS_TEMPORAIS: renderDopplerArteriasTemporaisWeb,
  DOPPLER_CAROTIDAS: renderDopplerCarotidasWebRoute,
};

export function structuredRendererFor(category: string): Renderer | null {
  return STRUCTURED_RENDERERS[category] ?? null;
}
