import { renderDopplerRenalWeb } from "../renderer/categories/dopplerRenalWeb";

export type StructuredCatalogRender =
  | { ok: true; text: string }
  | { ok: false; error: string; issues: Array<{ path: string; message: string }> };

type Renderer = (input: unknown, style: string) => StructuredCatalogRender;

/** Categorias cujo formulário envia um contrato estruturado, não ids do catálogo. */
const STRUCTURED_RENDERERS: Readonly<Record<string, Renderer>> = {
  DOPPLER_RENAL: renderDopplerRenalWeb,
};

export function structuredRendererFor(category: string): Renderer | null {
  return STRUCTURED_RENDERERS[category] ?? null;
}
