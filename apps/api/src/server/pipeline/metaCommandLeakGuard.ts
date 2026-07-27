import type { DeterministicIssue } from "./deterministicSanity";

const META_COMMAND_PATTERNS = [
  /\bacrescente\b/giu,
  /\badicione\b/giu,
  /\bpode\s+colocar\b/giu,
  /\bno\s+lugar\s+de\b/giu,
  /\btroque\s+por\b/giu,
  /\bsubstitua\b/giu,
  /\bna\s+conclus[ãa]o\s+coloque\b/giu,
  /\bap[óo]s\s+o\s+t[íi]tulo\s+escreva\b/giu,
];

/** Sinaliza metacomandos literais no laudo; nunca remove ou reescreve texto. */
export function checkMetaCommandLeaks(finalText: string): DeterministicIssue[] {
  const issues: DeterministicIssue[] = [];

  for (const pattern of META_COMMAND_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(finalText);
    if (!match?.[0]) continue;
    const line =
      finalText
        .slice(0, match.index)
        .split("\n")
        .length - 1;
    const trecho = finalText.split("\n")[line]?.trim() ?? match[0];
    issues.push({
      type: "metacomando_residual",
      severity: "critical",
      detail: `Metacomando residual encontrado no laudo: "${match[0]}".`,
      trecho_laudo: trecho,
      campo_achado: "metacomando",
    });
  }

  return issues;
}
