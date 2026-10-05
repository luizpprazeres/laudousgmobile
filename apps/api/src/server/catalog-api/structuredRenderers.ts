import { renderDopplerRenalWeb } from "../renderer/categories/dopplerRenalWeb";
import { renderDopplerVenosoMmiiWeb } from "../renderer/categories/dopplerVenosoMmiiWeb";

export type StructuredCatalogRender =
  | { ok: true; text: string }
  | { ok: false; error: string; issues: Array<{ path: string; message: string }> };

type Renderer = (input: unknown, style: string) => StructuredCatalogRender;

/** Categorias cujo formulário envia um contrato estruturado, não ids do catálogo. */
const STRUCTURED_RENDERERS: Readonly<Record<string, Renderer>> = {
  DOPPLER_RENAL: renderDopplerRenalWeb,
  DOPPLER_VENOSO_MMII: (input, style) => renderDopplerVenosoMmiiWeb(input, style, "DOPPLER_VENOSO_MMII"),
  DOPPLER_VENOSO_MMII_MEDIDAS: (input, style) => renderDopplerVenosoMmiiWeb(input, style, "DOPPLER_VENOSO_MMII_MEDIDAS"),
};

export function structuredRendererFor(category: string): Renderer | null {
  return STRUCTURED_RENDERERS[category] ?? null;
}
