import type { StructuredFindings } from "@laudousg/shared";
import { checkAbdomenTotal } from "./deterministicSanity/abdomenTotal";
import { checkDopplerObstetrico } from "./deterministicSanity/dopplerObstetrico";
import { extractValues } from "./deterministicSanity/extractor";
import { checkMamaria } from "./deterministicSanity/mamaria";
import { checkObstetrica } from "./deterministicSanity/obstetrica";
import { checkPelveFeminina } from "./deterministicSanity/pelveFeminina";
import { checkTireoide } from "./deterministicSanity/tireoide";
import type { ExtractedValues, SanityFlag } from "./deterministicSanity/types";

export type DeterministicIssue = {
  type:
    | "medida_divergente"
    | "lateralidade_divergente"
    | "data_divergente"
    | "comando_ignorado"
    | "placeholder_vazado"
    | "rads_divergente"
    | "categoria_especifica";
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

type CategorySpecificCheck = (
  extracted: ExtractedValues,
  finalText: string,
) => SanityFlag[];

const CATEGORY_SPECIFIC_CHECKS: Partial<Record<string, CategorySpecificCheck>> = {
  OBSTETRICA: (extracted) => checkObstetrica(extracted),
  DOPPLER_OBSTETRICO: (extracted) => checkDopplerObstetrico(extracted),
  TIREOIDE: (extracted) => checkTireoide(extracted),
  MAMARIA: (extracted) => checkMamaria(extracted),
  ABDOMEN_TOTAL: (extracted) => checkAbdomenTotal(extracted),
  PELVE_FEMININA: (extracted, finalText) => checkPelveFeminina(extracted, finalText),
};

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
  const extracted = extractValues(args.finalText);
  const categorySpecific = runCategorySpecificSanity(
    args.findings.categoria_detectada,
    extracted,
    args.finalText,
  );
  const issues: DeterministicIssue[] = [
    ...checkMeasurements(args.findings, args.finalText),
    ...checkLaterality(args.findings, args.finalText),
    ...checkDates(args.findings, args.finalText),
    ...checkCommands(args.findings, args.finalText),
    ...checkPlaceholders(args.finalText),
    ...checkRadsClassifications(args.findings, args.finalText),
    ...categorySpecific,
  ];

  return {
    issues,
    hardBlocked: issues.some((issue) => issue.severity === "critical"),
  };
}

function runCategorySpecificSanity(
  category: string,
  extracted: ExtractedValues,
  finalText: string,
): DeterministicIssue[] {
  const check = CATEGORY_SPECIFIC_CHECKS[category];
  if (!check) return [];
  return check(extracted, finalText).map(sanityFlagToDeterministicIssue);
}

function sanityFlagToDeterministicIssue(flag: SanityFlag): DeterministicIssue {
  return {
    type: "categoria_especifica",
    severity: flag.severity,
    detail: flag.suggestion ? `${flag.message} Sugestão: ${flag.suggestion}` : flag.message,
    campo_achado: flag.code,
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

/**
 * Detecta classificações de imagem (BI-RADS, TI-RADS, O-RADS, Domingos, FIGO)
 * ditadas pelo médico (em comandos OU achados) e verifica que aparecem
 * IDÊNTICAS no laudo final. Divergência = CRITICAL (laudo médico errado
 * pode levar a conduta clínica errada).
 *
 * Captura também o caso "médico não disse nada e laudo inventou" e
 * "médico disse N e laudo virou M" — ambos hard block.
 */
function checkRadsClassifications(
  findings: StructuredFindings,
  finalText: string,
): DeterministicIssue[] {
  const issues: DeterministicIssue[] = [];

  const inputSources: string[] = [];
  for (const cmd of findings.comandos_do_medico) {
    inputSources.push(cmd.texto);
    if (cmd.trecho_original) inputSources.push(cmd.trecho_original);
  }
  for (const entry of flatten(findings.achados)) {
    inputSources.push(String(entry.value));
  }
  const inputText = inputSources.join(" \n ");

  const inputRads = extractRads(inputText);
  const outputRads = extractRads(finalText);

  // Map por sistema (BI-RADS, TI-RADS, etc.) — comparar valores.
  const inputBySystem = groupBySystem(inputRads);
  const outputBySystem = groupBySystem(outputRads);

  for (const [system, inputValues] of inputBySystem) {
    const outputValues = outputBySystem.get(system) ?? new Set<string>();
    for (const value of inputValues) {
      if (!outputValues.has(value)) {
        const outputList = [...outputValues].join(", ");
        issues.push({
          type: "rads_divergente",
          severity: "critical",
          detail: outputValues.size === 0
            ? `Médico ditou ${system} ${value}, mas o laudo não menciona essa classificação.`
            : `Médico ditou ${system} ${value}, mas laudo gerou ${system} ${outputList}. Classificações NUNCA podem ser recalculadas.`,
          campo_achado: "rads_classifications",
        });
      }
    }
  }

  // Inverso: laudo tem RADS que médico não ditou. Crítico (invenção).
  for (const [system, outputValues] of outputBySystem) {
    if (!inputBySystem.has(system)) {
      const outputList = [...outputValues].join(", ");
      issues.push({
        type: "rads_divergente",
        severity: "critical",
        detail: `Laudo contém ${system} ${outputList} mas médico não mencionou essa classificação. NUNCA inferir.`,
        trecho_laudo: `${system} ${outputList}`,
      });
    }
  }

  return issues;
}

type RadsHit = { system: string; value: string };

// Regex captura BI-RADS, TI-RADS, O-RADS (números 0-6, com sub-letra A/B/C
// opcional — ex: 4A), Domingos (1-6) e FIGO (algarismos romanos I-IV com
// sub-letra A/B/C opcional — ex: IIIB).
const RADS_RE =
  /\b(BI[- ]?RADS|TI[- ]?RADS|O[- ]?RADS|Domingos|FIGO)\s*[:\-]?\s*([0-6][ABC]?|IV[ABC]?|III[ABC]?|II[ABC]?|I[ABC]?|V)\b/giu;

function extractRads(text: string): RadsHit[] {
  const hits: RadsHit[] = [];
  for (const match of text.matchAll(RADS_RE)) {
    const rawSystem = (match[1] ?? "").replace(/\s+/g, "").replace(/-/g, "");
    const value = (match[2] ?? "").toUpperCase();
    const system = normalizeRadsSystem(rawSystem);
    if (system && value) hits.push({ system, value });
  }
  return hits;
}

function normalizeRadsSystem(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper === "BIRADS") return "BI-RADS";
  if (upper === "TIRADS") return "TI-RADS";
  if (upper === "ORADS") return "O-RADS";
  if (upper === "DOMINGOS") return "Domingos";
  if (upper === "FIGO") return "FIGO";
  return "";
}

function groupBySystem(hits: RadsHit[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const hit of hits) {
    const set = map.get(hit.system) ?? new Set<string>();
    set.add(hit.value);
    map.set(hit.system, set);
  }
  return map;
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
