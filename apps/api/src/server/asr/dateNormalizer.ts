const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const UNITS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  três: 3,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
};

const TEENS: Record<string, number> = {
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezassete: 17,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
};

const TENS: Record<string, number> = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
};

const SMALL_NUMBER =
  "(?:zero\\s+)?(?:um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezassete|dezessete|dezoito|dezenove|vinte(?:\\s+e\\s+(?:um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove))?|trinta(?:\\s+e\\s+(?:um|uma))?)";
const YEAR =
  "(?:20\\d{2}|dois\\s+mil(?:\\s+e)?(?:\\s+(?:vinte(?:\\s+e\\s+(?:um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove))?|trinta(?:\\s+e\\s+(?:um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove))?|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezassete|dezessete|dezoito|dezenove|[1-9]|um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove))?)";
const MONTH_NAME = Object.keys(MONTHS).join("|");

function normalizeWords(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseSmallNumber(value: string): number | null {
  if (/^\d{1,2}$/.test(value)) return Number(value);
  const words = normalizeWords(value)
    .split(/\s+/)
    .filter((word) => word !== "e" && word !== "zero");
  if (words.length === 0) return 0;
  const first = words[0];
  if (first === undefined) return null;
  if (words.length === 1) {
    return UNITS[first] ?? TEENS[first] ?? TENS[first] ?? null;
  }
  const second = words[1];
  if (words.length === 2 && second !== undefined && TENS[first] !== undefined) {
    const unit = UNITS[second];
    return unit === undefined ? null : TENS[first] + unit;
  }
  return null;
}

function parseYear(value: string): number | null {
  if (/^20\d{2}$/.test(value)) return Number(value);
  const normalized = normalizeWords(value);
  if (!normalized.startsWith("dois mil")) return null;
  const remainder = normalized.replace(/^dois mil(?: e)?\s*/, "");
  if (!remainder) return 2000;
  const suffix = parseSmallNumber(remainder);
  return suffix === null || suffix > 99 ? null : 2000 + suffix;
}

function validDate(day: number, month: number, year: number): boolean {
  if (year < 2000 || year > 2099) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatOrReview(
  original: string,
  day: number | null,
  month: number | null,
  year: number | null,
): string {
  if (
    day === null ||
    month === null ||
    year === null ||
    !validDate(day, month, year)
  ) {
    return `${original} [REVISAR]`;
  }
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function appendReview(original: string): string {
  return /\[REVISAR\]$/i.test(original)
    ? original
    : `${original} [REVISAR]`;
}

export function normalizeSpokenDates(text: string): string {
  let out = text;

  // Datas numéricas já recuperadas pelo ASR: apenas completa zeros à esquerda.
  out = out.replace(
    /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(20\d{2})\b(\s*\[REVISAR\])?/g,
    (original, day: string, month: string, year: string, review?: string) =>
      review
        ? original
        : formatOrReview(original, Number(day), Number(month), Number(year)),
  );

  // "zero dois barra zero três barra dois mil e vinte e seis".
  out = out.replace(
    new RegExp(`\\b(${SMALL_NUMBER})\\s+barra\\s+(${SMALL_NUMBER})\\s+barra\\s+(${YEAR})\\b(?!\\s+e\\s+\\d)(\\s*\\[REVISAR\\])?`, "gi"),
    (original, day: string, month: string, year: string, review?: string) =>
      review
        ? original
        : formatOrReview(
            original,
            parseSmallNumber(day),
            parseSmallNumber(month),
            parseYear(year),
          ),
  );

  // "dois de março de dois mil e vinte e seis".
  out = out.replace(
    new RegExp(`\\b(${SMALL_NUMBER}|\\d{1,2})\\s+de\\s+(${MONTH_NAME})\\s+de\\s+(${YEAR})\\b(?!\\s+e\\s+\\d)(\\s*\\[REVISAR\\])?`, "gi"),
    (original, day: string, month: string, year: string, review?: string) =>
      review
        ? original
        : formatOrReview(
            original,
            parseSmallNumber(day),
            MONTHS[normalizeWords(month)] ?? null,
            parseYear(year),
          ),
  );

  // Garble típico "2 do 3 de 2020 e 6": há mais de uma reconstrução possível.
  // Preserva todos os números e apenas pede revisão; nunca inventa 2026.
  out = out.replace(
    /\b\d{1,2}\s+(?:do|de)\s+\d{1,2}\s+de\s+20\d{2}\s+e\s+\d{1,2}\b(?!\s*\[REVISAR\])/gi,
    appendReview,
  );
  out = out.replace(
    new RegExp(`\\b(?:${SMALL_NUMBER}|\\d{1,2})\\s+de\\s+(?:${MONTH_NAME})\\s+de\\s+20\\d{2}\\s+e\\s+\\d{1,2}\\b(?!\\s*\\[REVISAR\\])`, "gi"),
    appendReview,
  );

  return out;
}
