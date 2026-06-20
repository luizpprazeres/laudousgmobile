import { parseConclusion, renderWithConclusion } from "./conclusionUtils";

function isPlaceholderOnly(item: string): boolean {
  const stripped = item.replace(/[\s_.()[\]-]/g, "");
  return stripped.length === 0;
}

/**
 * Itens cujo VALOR clínico é só um placeholder → não afirmam nada e NÃO podem
 * ser publicados (boletim 2026-06-19, P0 placeholders). Diferente da IG
 * ("Gestação em torno de ____ semanas"), que é obrigatória e fica como prompt:
 * estes são afirmações vazias (líquido/peso/percentil sem valor) — melhor
 * remover do que publicar "____".
 */
function isVoidAssertion(item: string): boolean {
  return (
    /l[íi]quido\s+amni[óo]tico\s+(?:de|em)\s+quantidade\s+_{2,}/i.test(item) ||
    /peso\s+(?:fetal\s+)?(?:aproximado\s+|estimado\s+)?(?:em|de)\s+_{2,}/i.test(item) ||
    /percentil\s+_{2,}/i.test(item)
  );
}

/**
 * Remove itens de CONCLUSÃO cujo conteúdo inteiro é placeholder/vazio
 * ("____", "____.", etc.) OU cujo valor clínico é só placeholder ("Líquido
 * amniótico de quantidade ____"), e renumera os restantes.
 *
 * Preserva placeholders em itens OBRIGATÓRIOS (IG: "Gestação em torno de ____
 * semanas") — esses ficam como lembrete pro médico completar.
 */
export function removeEmptyConclusionItems(laudo: string): string {
  const parsed = parseConclusion(laudo);
  if (!parsed.found) return laudo;

  const kept = parsed.items.filter(
    (item) => !isPlaceholderOnly(item) && !isVoidAssertion(item),
  );
  if (kept.length === parsed.items.length) return laudo;

  return renderWithConclusion(parsed, kept);
}
