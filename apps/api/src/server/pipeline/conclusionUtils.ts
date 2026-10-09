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
 * A lista de itens PARA no rodapé (nota de referência com "*", "Breast Imaging
 * Reporting…", "ACR -", "[REVISAR…") e no título do próximo laudo
 * ("ULTRASSONOGRAFIA…" em caixa alta): isso vai em `after` e volta intacto depois
 * da lista renumerada. Antes, o rodapé virava item numerado e, num ditado com
 * vários exames, o 2º, 3º e 4º laudo viravam itens da conclusão do 1º (MK-1 da
 * revisão do W4, visto em produção em 4 laudos de MSK).
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
  /** O que vem depois dos itens (rodapé, próximo laudo) — preservado como está. */
  after: string;
}

/** Título de laudo (abre um novo laudo num ditado com vários exames). */
export const REPORT_TITLE_RE = /^\s*(?:ULTRASSONOGRAFIA|ULTRA-SONOGRAFIA|ECOGRAFIA)\b[^\n]*$/;

export function isReportTitle(line: string): boolean {
  const t = line.trim();
  return REPORT_TITLE_RE.test(t) && t === t.toUpperCase();
}

/** Rodapé de referência / marcação que não é item de conclusão. */
const FOOTER_RE = /^\s*(?:\*|Breast Imaging Reporting|ACR\s*[-–]|\[REVISAR|FIGO\s*:)/i;

export function parseConclusion(laudo: string): ParsedConclusion {
  const idx = laudo.search(/^CONCLUS[ÃA]O:/im);
  if (idx === -1) {
    return { before: laudo, header: "CONCLUSÃO:", items: [], found: false, after: "" };
  }
  const before = laudo.slice(0, idx).trimEnd();
  const block = laudo.slice(idx).split("\n");
  const header = block[0] ?? "CONCLUSÃO:";
  const items: string[] = [];
  let i = 1;
  for (; i < block.length; i += 1) {
    const line = block[i]!;
    const t = line.trim();
    if (!t) continue;
    if (FOOTER_RE.test(t) || isReportTitle(t)) break;
    // Remove numeração "N)" / "N -" / "N." do início, se houver.
    items.push(t.replace(/^\d+\s*[).-]\s*/, "").trim());
  }
  const after = block.slice(i).join("\n").trim();
  return { before, header, items, found: true, after };
}

/**
 * Divide um texto com vários laudos (um por título "ULTRASSONOGRAFIA…") — o
 * prefixo antes do 1º título, se houver, fica com o 1º laudo. Um laudo só →
 * `[texto]`.
 */
export function splitReports(text: string): string[] {
  const lines = text.split("\n");
  const starts = lines.map((l, i) => (isReportTitle(l) ? i : -1)).filter((i) => i >= 0);
  if (starts.length <= 1) return [text];
  const parts: string[] = [];
  for (let k = 0; k < starts.length; k += 1) {
    const from = k === 0 ? 0 : starts[k]!;
    const to = k + 1 < starts.length ? starts[k + 1]! : lines.length;
    parts.push(lines.slice(from, to).join("\n").trim());
  }
  return parts;
}

/** Aplica `fn` a cada laudo do texto e junta de volta (separados por linha em branco). */
export function mapReports(text: string, fn: (report: string, index: number, total: number) => string): string {
  const parts = splitReports(text);
  if (parts.length === 1) return fn(text, 0, 1);
  return parts.map((p, i) => fn(p, i, parts.length)).join("\n\n");
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
  const after = p.after ? `\n\n${p.after}` : "";
  return `${p.before}\n\n${section}${p.header}\n${numbered}${after}`;
}
