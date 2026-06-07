import { parseConclusion, renderWithConclusion } from "./conclusionUtils";

function isPlaceholderOnly(item: string): boolean {
  const stripped = item.replace(/[\s_.()[\]-]/g, "");
  return stripped.length === 0;
}

/**
 * Remove itens de CONCLUSÃO cujo conteúdo inteiro é placeholder/vazio
 * ("____", "____.", etc.) e renumera os itens restantes.
 *
 * Não remove placeholders internos a um item real, como:
 * "Gestação em torno de ____ semanas".
 */
export function removeEmptyConclusionItems(laudo: string): string {
  const parsed = parseConclusion(laudo);
  if (!parsed.found) return laudo;

  const kept = parsed.items.filter((item) => !isPlaceholderOnly(item));
  if (kept.length === parsed.items.length) return laudo;

  return renderWithConclusion(parsed, kept);
}
