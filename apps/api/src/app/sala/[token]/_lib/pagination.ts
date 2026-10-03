export type ReportPage = {
  text: string;
  added: boolean[];
  empty: boolean;
};

// Conservador para manter o texto legível mesmo nas duas folhas de notebooks.
const PAGE_ROWS = 31;
const CHARS_PER_ROW = 56;

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length >= 4 &&
    /^[A-ZÁÉÍÓÚÇÃÕÂÊÔÀÈÌÒÙÜ0-9 \-():.,/]+$/.test(trimmed) &&
    /[A-ZÁÉÍÓÚÇÃÕÂÊÔÀÈÌÒÙÜ]/.test(trimmed)
  );
}

function estimatedRows(line: string): number {
  const trimmed = line.trim();
  if (!trimmed) return 0.65;

  const wrappedRows = Math.max(1, Math.ceil(trimmed.length / CHARS_PER_ROW));
  const headingSpacing = isHeading(trimmed) ? 0.55 : 0;
  return wrappedRows + headingSpacing;
}

/**
 * Separa o laudo em folhas para a leitura em pares. A cópia continua usando o
 * texto original; esta função muda apenas a apresentação visual.
 */
export function paginateReport(
  text: string,
  added: boolean[] = [],
  hasHeading = false,
): ReportPage[] {
  const lines = text.split(/\r?\n/);
  const pages: ReportPage[] = [];
  let currentLines: string[] = [];
  let currentAdded: boolean[] = [];
  let usedRows = hasHeading ? 3 : 0;

  const flush = () => {
    pages.push({
      text: currentLines.join("\n"),
      added: currentAdded,
      empty: currentLines.every((line) => !line.trim()),
    });
    currentLines = [];
    currentAdded = [];
    usedRows = 0;
  };

  lines.forEach((line, index) => {
    const rows = estimatedRows(line);
    const nextRows = index + 1 < lines.length ? estimatedRows(lines[index + 1] ?? "") : 0;
    const keepHeadingWithNext = isHeading(line) && nextRows > 0;
    if (
      currentLines.length > 0 &&
      (usedRows + rows > PAGE_ROWS ||
        (keepHeadingWithNext && usedRows + rows + Math.min(nextRows, 2) > PAGE_ROWS))
    ) {
      flush();
    }
    currentLines.push(line);
    currentAdded.push(Boolean(added[index]));
    usedRows += rows;
  });

  if (currentLines.length > 0 || pages.length === 0) flush();

  // A Sala usa sempre uma abertura de duas folhas no desktop. Laudos maiores
  // seguem em novas duplas, mantendo a rolagem vertical.
  while (pages.length < 2 || pages.length % 2 !== 0) {
    pages.push({ text: "", added: [], empty: true });
  }

  return pages;
}
