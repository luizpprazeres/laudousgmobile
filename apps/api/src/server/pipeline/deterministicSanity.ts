import type { StructuredFindings } from "@laudousg/shared";

export type DeterministicIssue = {
  type:
    | "medida_divergente"
    | "lateralidade_divergente"
    | "data_divergente"
    | "comando_ignorado"
    | "placeholder_vazado";
  severity: "critical" | "warning";
  detail: string;
  trecho_laudo?: string;
  campo_achado?: string;
};

export type DeterministicSanityResult = {
  issues: DeterministicIssue[];
  hardBlocked: boolean;
};

type FlatFinding = {
  path: string;
  value: unknown;
};

type Measurement = {
  normalized: string;
  raw: string;
  path?: string;
};

const MEASURE_RE =
  /(?<![\w])(\d+(?:[,.]\d+)?)\s*(cm³|cm3|mm³|mm3|ml|mL|mm|cm)\b/giu;
const DATE_RE = /\b([0-3]?\d\/[01]?\d\/(?:\d{2}|\d{4}))\b/g;
const PLACEHOLDER_RE =
  /{LINHA_LIQUIDO_AMNIOTICO}|{CONCLUSAO_LIQUIDO_AMNIOTICO}|____\b/g;

const STOPWORDS = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "por",
  "que",
  "um",
  "uma",
]);

export function runDeterministicSanity(args: {
  findings: StructuredFindings;
  finalText: string;
}): DeterministicSanityResult {
  const issues: DeterministicIssue[] = [
    ...checkMeasurements(args.findings, args.finalText),
    ...checkLaterality(args.findings, args.finalText),
    ...checkDates(args.findings, args.finalText),
    ...checkCommands(args.findings, args.finalText),
    ...checkPlaceholders(args.finalText),
  ];

  return {
    issues,
    hardBlocked: issues.some((issue) => issue.severity === "critical"),
  };
}

function checkMeasurements(
  findings: StructuredFindings,
  finalText: string,
): DeterministicIssue[] {
  const issues: DeterministicIssue[] = [];
  const findingMeasures = flatten(findings.achados).flatMap((entry) =>
    extractMeasurements(String(entry.value), entry.path),
  );
  const textMeasures = extractMeasurements(finalText);
  const textMeasureSet = new Set(textMeasures.map((m) => m.normalized));
  const findingMeasureSet = new Set(findingMeasures.map((m) => m.normalized));

  for (const measure of uniqueBy(findingMeasures, (m) => `${m.path}:${m.normalized}`)) {
    if (!textMeasureSet.has(measure.normalized)) {
      issues.push({
        type: "medida_divergente",
        severity: "critical",
        detail: `Medida dos achados não apareceu igual no laudo: ${measure.raw}.`,
        campo_achado: measure.path,
      });
    }
  }

  for (const measure of uniqueBy(textMeasures, (m) => m.normalized)) {
    if (!findingMeasureSet.has(measure.normalized)) {
      issues.push({
        type: "medida_divergente",
        severity: "warning",
        detail: `Medida apareceu no laudo, mas não foi encontrada nos achados estruturados: ${measure.raw}.`,
        trecho_laudo: measure.raw,
      });
    }
  }

  return issues;
}

function checkLaterality(
  findings: StructuredFindings,
  finalText: string,
): DeterministicIssue[] {
  const mentioned = new Set(findings.lateralidades_mencionadas ?? []);
  const normalizedText = normalize(finalText);
  const hasRight = /\bdireit\w*/i.test(normalizedText);
  const hasLeft = /\besquerd\w*/i.test(normalizedText);
  const issues: DeterministicIssue[] = [];

  if (mentioned.has("direito") && !hasRight) {
    issues.push({
      type: "lateralidade_divergente",
      severity: "warning",
      detail: "Achados mencionam lado direito, mas o laudo não contém 'direit*'.",
      campo_achado: "lateralidades_mencionadas",
    });
  }

  if (mentioned.has("esquerdo") && !hasLeft) {
    issues.push({
      type: "lateralidade_divergente",
      severity: "warning",
      detail: "Achados mencionam lado esquerdo, mas o laudo não contém 'esquerd*'.",
      campo_achado: "lateralidades_mencionadas",
    });
  }

  if (mentioned.has("bilateral") && (!hasRight || !hasLeft)) {
    issues.push({
      type: "lateralidade_divergente",
      severity: "warning",
      detail: "Achados mencionam bilateralidade, mas o laudo não explicita ambos os lados.",
      campo_achado: "lateralidades_mencionadas",
    });
  }

  return issues;
}

function checkDates(
  findings: StructuredFindings,
  finalText: string,
): DeterministicIssue[] {
  const expectedDates = new Set(
    (findings.datas_referidas ?? []).map(normalizeDate).filter(Boolean),
  );
  if (expectedDates.size === 0) return [];

  const textDates = new Set(extractDates(finalText).map(normalizeDate));
  const issues: DeterministicIssue[] = [];

  for (const date of expectedDates) {
    if (!textDates.has(date)) {
      issues.push({
        type: "data_divergente",
        severity: "critical",
        detail: `Data referida nos achados não apareceu igual no laudo: ${date}.`,
        campo_achado: "datas_referidas",
      });
    }
  }

  return issues;
}

function checkCommands(
  findings: StructuredFindings,
  finalText: string,
): DeterministicIssue[] {
  const normalizedText = normalize(finalText);
  const issues: DeterministicIssue[] = [];

  for (const command of findings.comandos_do_medico) {
    const keywords = keywordsFrom(command.texto);
    if (keywords.length === 0) continue;
    const matched = keywords.some((keyword) => normalizedText.includes(keyword));
    if (!matched) {
      issues.push({
        type: "comando_ignorado",
        severity: "critical",
        detail: `Nenhuma palavra-chave do comando apareceu no laudo: "${command.texto}".`,
        campo_achado: "comandos_do_medico",
      });
    }
  }

  return issues;
}

function checkPlaceholders(finalText: string): DeterministicIssue[] {
  const matches = Array.from(finalText.matchAll(PLACEHOLDER_RE));
  return matches.map((match) => ({
    type: "placeholder_vazado",
    severity: "critical",
    detail: `Placeholder não expandido apareceu no laudo: ${match[0]}.`,
    trecho_laudo: match[0],
  }));
}

function flatten(value: unknown, path = "achados"): FlatFinding[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") return [{ path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flatten(item, `${path}[${index}]`));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    flatten(item, `${path}.${key}`),
  );
}

function extractMeasurements(text: string, path?: string): Measurement[] {
  const measures: Measurement[] = [];
  for (const match of text.matchAll(MEASURE_RE)) {
    const raw = match[0];
    const value = normalizeNumber(match[1]);
    const unit = normalizeUnit(match[2]);
    measures.push({
      normalized: `${value} ${unit}`,
      raw,
      path,
    });
  }
  return measures;
}

function normalizeNumber(value = ""): string {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return value.replace(".", ",");
  return Number.isInteger(n) ? String(n) : String(n).replace(/0+$/, "").replace(/\.$/, "");
}

function normalizeUnit(value = ""): string {
  const unit = value.toLowerCase().replace("³", "3");
  if (unit === "ml") return "ml";
  return unit;
}

function extractDates(text: string): string[] {
  return Array.from(text.matchAll(DATE_RE), (match) => match[1]).filter(
    (value): value is string => Boolean(value),
  );
}

function normalizeDate(value = ""): string {
  const match = value.match(/\b([0-3]?\d)\/([01]?\d)\/(\d{2}|\d{4})\b/);
  if (!match) return value;
  const [, rawDay = "", rawMonth = "", rawYear = ""] = match;
  const day = rawDay.padStart(2, "0");
  const month = rawMonth.padStart(2, "0");
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${day}/${month}/${year}`;
}

function keywordsFrom(text: string): string[] {
  return uniqueBy(
    normalize(text)
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}_-]/gu, ""))
      .filter((word) => word.length >= 4 && !STOPWORDS.has(word)),
    (word) => word,
  );
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}
