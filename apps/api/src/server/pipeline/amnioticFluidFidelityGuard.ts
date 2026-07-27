import type { DeterministicIssue } from "./deterministicSanity";

export type AmnioticFluidMethod = "ILA" | "MBV";
export type ExplicitAmnioticClass = "normal" | "reduzida" | "aumentada";

export interface AmnioticFluidObservation {
  method: AmnioticFluidMethod;
  value: number;
  unit: "cm";
  explicitClass?: ExplicitAmnioticClass;
  raw: string;
}

const VALUE = String.raw`([0-9]{1,3}(?:[.,][0-9]+)?)`;

const METHOD_PATTERNS: Array<{
  method: AmnioticFluidMethod;
  pattern: RegExp;
}> = [
  {
    method: "ILA",
    pattern: new RegExp(
      String.raw`(?<![\p{L}\p{N}_])(?:ILA|[íi]ndice\s+(?:de|do)\s+l[íi]quido\s+amni[óo]tico)(?=\s|[=:])[^.!?\n]{0,30}?\b(?:mede|medindo|de|[=:])?\s*${VALUE}\s*(cm)\b`,
      "giu",
    ),
  },
  {
    method: "MBV",
    pattern: new RegExp(
      String.raw`(?<![\p{L}\p{N}_])(?:MBV|maior\s+bols[aã]o(?:\s+vertical)?)(?=\s|[=:])[^.!?\n]{0,30}?\b(?:mede|medindo|de|[=:])?\s*${VALUE}\s*(cm)\b`,
      "giu",
    ),
  },
];

function detectExplicitClass(text: string): ExplicitAmnioticClass | undefined {
  if (
    /\b(?:quantidade|volume)(?:\s+de\s+l[íi]quido\s+amni[óo]tico)?\s+(?:reduzid[oa]|diminu[ií]d[oa]|escass[oa])\b/iu.test(
      text,
    ) ||
    /\boligo(?:d|h)r[aâ]mnio\b/iu.test(text)
  ) {
    return "reduzida";
  }
  if (
    /\b(?:quantidade|volume)(?:\s+de\s+l[íi]quido\s+amni[óo]tico)?\s+aumentad[oa]\b/iu.test(
      text,
    ) ||
    /\bpoli(?:d|h)r[aâ]mnio\b/iu.test(text)
  ) {
    return "aumentada";
  }
  if (
    /\b(?:quantidade|volume)(?:\s+de\s+l[íi]quido\s+amni[óo]tico)?\s+normal\b/iu.test(
      text,
    ) ||
    /\bl[íi]quido\s+amni[óo]tico(?:\s+em)?\s+(?:quantidade|volume)\s+normal\b/iu.test(text)
  ) {
    return "normal";
  }
  return undefined;
}

export function extractAmnioticFluidObservations(
  text: string,
): AmnioticFluidObservation[] {
  const explicitClass = detectExplicitClass(text);
  const observations: AmnioticFluidObservation[] = [];

  for (const { method, pattern } of METHOD_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const valueText = match[1];
      if (!valueText) continue;
      observations.push({
        method,
        value: Number(valueText.replace(",", ".")),
        unit: "cm",
        explicitClass,
        raw: match[0],
      });
    }
  }

  return observations;
}

function sameValue(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

/**
 * Compara apenas dados explicitamente ditados. Não deriva classe pelo valor e
 * não reescreve o laudo.
 */
export function checkAmnioticFluidFidelity(
  rawInput: string,
  finalText: string,
): DeterministicIssue[] {
  const input = extractAmnioticFluidObservations(rawInput);
  if (input.length === 0) return [];

  const output = extractAmnioticFluidObservations(finalText);
  const issues: DeterministicIssue[] = [];

  for (const expected of input) {
    const sameMethod = output.find((item) => item.method === expected.method);
    if (!sameMethod) {
      const oppositeWithValue = output.find(
        (item) =>
          item.method !== expected.method &&
          sameValue(item.value, expected.value),
      );
      issues.push({
        type: "liquido_amniotico_divergente",
        severity: "critical",
        detail: oppositeWithValue
          ? `${expected.method} ${expected.value} cm foi trocado por ${oppositeWithValue.method} no laudo.`
          : `${expected.method} ${expected.value} cm ditado não aparece no laudo.`,
        trecho_laudo: oppositeWithValue?.raw,
        campo_achado: expected.method,
      });
      continue;
    }

    if (!sameValue(sameMethod.value, expected.value)) {
      issues.push({
        type: "liquido_amniotico_divergente",
        severity: "critical",
        detail: `${expected.method} foi ditado como ${expected.value} cm, mas aparece como ${sameMethod.value} cm no laudo.`,
        trecho_laudo: sameMethod.raw,
        campo_achado: expected.method,
      });
    }

    if (
      expected.explicitClass &&
      sameMethod.explicitClass &&
      expected.explicitClass !== sameMethod.explicitClass
    ) {
      issues.push({
        type: "liquido_amniotico_divergente",
        severity: "critical",
        detail: `Classe do líquido explicitamente ditada como ${expected.explicitClass}, mas descrita como ${sameMethod.explicitClass}.`,
        trecho_laudo: sameMethod.raw,
        campo_achado: "classe_liquido_amniotico",
      });
    }
  }

  return issues;
}
