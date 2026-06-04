/**
 * Utilitários determinísticos pra reconstruir a CONCLUSÃO de um laudo.
 *
 * O writer (LLM) varia o formato da conclusão entre execuções: às vezes numera
 * limpo (1, 2, 3), às vezes deixa itens sem número, às vezes ad-liba linhas
 * (ex.: frases de Doppler próprias). Pós-processamento determinístico que
 * assume numeração limpa quebra. Estes utilitários parseiam a conclusão em uma
 * LISTA DE ITENS (numerados ou não) e renumeram do zero, pra os guards
 * (líquido, Doppler) operarem sobre dados estruturados.
 *
 * Premissa: a CONCLUSÃO é a ÚLTIMA seção do laudo (verdadeiro nos templates
 * obstétrico/morfológico). Conteúdo após ela seria absorvido como item.
 */

export interface ParsedConclusion {
  /** Tudo antes de "CONCLUSÃO:" (corpo do laudo). */
  before: string;
  /** A linha de cabeçalho ("CONCLUSÃO:"). */
  header: string;
  /** Itens da conclusão, SEM numeração. */
  items: string[];
  /** Havia uma seção CONCLUSÃO? */
  found: boolean;
}

export function parseConclusion(laudo: string): ParsedConclusion {
  const idx = laudo.search(/^CONCLUS[ÃA]O:/im);
  if (idx === -1) {
    return { before: laudo, header: "CONCLUSÃO:", items: [], found: false };
  }
  const before = laudo.slice(0, idx).trimEnd();
  const block = laudo.slice(idx).split("\n");
  const header = block[0] ?? "CONCLUSÃO:";
  const items: string[] = [];
  for (const line of block.slice(1)) {
    const t = line.trim();
    if (!t) continue;
    // Remove numeração "N)" / "N -" / "N." do início, se houver.
    items.push(t.replace(/^\d+\s*[).-]\s*/, "").trim());
  }
  return { before, header, items, found: true };
}

/** Reconstrói o laudo com a conclusão renumerada (1..N) e seção opcional. */
export function renderWithConclusion(
  p: ParsedConclusion,
  items: string[],
  sectionBeforeConclusion?: string,
): string {
  const numbered = items.map((it, i) => `${i + 1}) ${it}`).join("\n");
  const section = sectionBeforeConclusion
    ? `${sectionBeforeConclusion}\n\n`
    : "";
  return `${p.before}\n\n${section}${p.header}\n${numbered}`;
}
