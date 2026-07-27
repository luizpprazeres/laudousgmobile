import type { DeterministicIssue } from "./deterministicSanity";

const NEGATIVE_VITALITY_PATTERNS = [
  /\b(?:bcf|batimentos?\s+card[ií]acos?\s+fetais?)\b[^.!?\n]{0,50}\b(?:n[aã]o\s+(?:foram\s+)?visualizad[oa]s?|ausentes?)\b/iu,
  /\b(?:n[aã]o\s+(?:foram\s+)?visualizad[oa]s?|ausentes?)\b[^.!?\n]{0,30}\b(?:bcf|batimentos?\s+card[ií]acos?\s+fetais?)\b/iu,
  /\bsem\s+(?:atividade\s+card[ií]aca|batimentos?(?:\s+card[ií]acos?)?)\b/iu,
  /\b(?:feto|embri[aã]o)\s+sem\s+vitalidade\b/iu,
];

const POSITIVE_BCF_PATTERNS = [
  /\bbcf\s*(?:de\s+|[=:]\s*)?(?:\d{2,3}|_{2,})\s*(?:bpm)?\b/iu,
  /\b(?:bcf|batimentos?\s+card[ií]acos?\s+fetais?)[^.!?\n]{0,35}\b(?:presentes?|r[ií]tmic[oa]s?)\b/iu,
  /\b(?:presentes?|r[ií]tmic[oa]s?)\b[^.!?\n]{0,35}\b(?:bcf|batimentos?\s+card[ií]acos?\s+fetais?)\b/iu,
];

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0];
  }
  return undefined;
}

/**
 * Sinaliza BCF positivo no laudo quando o médico declarou ausência de
 * batimentos/vitalidade. Ausência de BCF no input, isoladamente, não dispara.
 */
export function checkFetalVitality(
  rawInput: string,
  finalText: string,
): DeterministicIssue[] {
  const negativeInput = firstMatch(rawInput, NEGATIVE_VITALITY_PATTERNS);
  if (!negativeInput) return [];

  const positiveOutput = firstMatch(finalText, POSITIVE_BCF_PATTERNS);
  if (!positiveOutput) return [];

  return [
    {
      type: "vitalidade_fetal_divergente",
      severity: "critical",
      detail: `Input declara ausência de vitalidade/BCF, mas o laudo afirma BCF positivo: "${positiveOutput}".`,
      trecho_laudo: positiveOutput,
      campo_achado: "vitalidade_fetal",
    },
  ];
}
