export type ReportPage = {
  text: string;
  added: boolean[];
  empty: boolean;
};

export type PaginationMetrics = {
  rowsPerPage: number;
  charsPerRow: number;
  headingRows: number;
};

export type PaginationGeometry = {
  contentWidthPx: number;
  contentHeightPx: number;
  lineHeightPx: number;
  averageCharWidthPx: number;
  headingTextWidthPx?: number;
  headingMarginBottomPx?: number;
};

// Primeiro render e ambientes sem medição (SSR/mobile). No desktop, a Sala
// substitui estes valores pela geometria real da folha A4 exibida.
export const DEFAULT_PAGINATION_METRICS: PaginationMetrics = {
  rowsPerPage: 31,
  charsPerRow: 56,
  headingRows: 3,
};

/**
 * Converte a geometria útil da folha A4 em capacidade de texto. A pequena
 * reserva horizontal absorve quebra por palavras; uma linha vertical fica de
 * segurança para não encostar o conteúdo no rodapé.
 */
export function paginationMetricsFromGeometry({
  contentWidthPx,
  contentHeightPx,
  lineHeightPx,
  averageCharWidthPx,
  headingTextWidthPx = 0,
  headingMarginBottomPx = 0,
}: PaginationGeometry): PaginationMetrics {
  const safeLineHeight = lineHeightPx > 0 ? lineHeightPx : 1;
  const safeCharWidth = averageCharWidthPx > 0 ? averageCharWidthPx : 1;
  const safeContentWidth = contentWidthPx > 0 ? contentWidthPx : 1;
  const headingTextRows = headingTextWidthPx > 0
    ? Math.max(1, Math.ceil(headingTextWidthPx / safeContentWidth))
    : 0;

  return {
    rowsPerPage: Math.max(12, Math.floor(contentHeightPx / safeLineHeight) - 1),
    charsPerRow: Math.max(28, Math.floor((safeContentWidth / safeCharWidth) * 0.9)),
    headingRows: headingTextRows + headingMarginBottomPx / safeLineHeight,
  };
}

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length >= 4 &&
    /^[A-ZÁÉÍÓÚÇÃÕÂÊÔÀÈÌÒÙÜ0-9 \-():.,/]+$/.test(trimmed) &&
    /[A-ZÁÉÍÓÚÇÃÕÂÊÔÀÈÌÒÙÜ]/.test(trimmed)
  );
}

function estimatedRows(line: string, charsPerRow: number): number {
  const trimmed = line.trim();
  if (!trimmed) return 0.65;

  const wrappedRows = Math.max(1, Math.ceil(trimmed.length / charsPerRow));
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
  metrics: PaginationMetrics = DEFAULT_PAGINATION_METRICS,
): ReportPage[] {
  const lines = text.split(/\r?\n/);
  const pages: ReportPage[] = [];
  let currentLines: string[] = [];
  let currentAdded: boolean[] = [];
  let usedRows = hasHeading ? metrics.headingRows : 0;

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
    const rows = estimatedRows(line, metrics.charsPerRow);
    const nextRows = index + 1 < lines.length
      ? estimatedRows(lines[index + 1] ?? "", metrics.charsPerRow)
      : 0;
    const keepHeadingWithNext = isHeading(line) && nextRows > 0;
    if (
      currentLines.length > 0 &&
      (usedRows + rows > metrics.rowsPerPage ||
        (keepHeadingWithNext && usedRows + rows + Math.min(nextRows, 2) > metrics.rowsPerPage))
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
