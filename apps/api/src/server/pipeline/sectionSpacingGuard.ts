/**
 * Guard determinístico de espaçamento de seções (fase 3 — determinismo MSK).
 *
 * O writer (LLM) é inconsistente com as quebras de linha: às vezes cola tudo num
 * parágrafo, às vezes pula linha entre cada achado. A regra (Dr. Domingos) é:
 *   - cada achado/estrutura em SUA linha (quebra simples entre itens da seção);
 *   - linha EM BRANCO só entre SEÇÕES — antes de um título ou cabeçalho.
 *
 * Este guard normaliza isso por CONSTRUÇÃO (não depende do LLM): descarta as
 * linhas em branco existentes e reinsere exatamente UMA antes de cada divisor
 * (título "ULTRASSONOGRAFIA ..." ou cabeçalho COMENTÁRIOS/OS SEGUINTES.../
 * CONCLUSÃO e variantes objetivo TÉCNICA/ACHADOS/IMPRESSÃO). Cabeçalho é seguido
 * do conteúdo na linha imediatamente abaixo; itens de uma seção ficam adjacentes.
 *
 * Hoje aplicado apenas ao MUSCULOESQUELETICO_V2 (cobertura validada). Os
 * cabeçalhos obstétricos (Biometria, Placenta, etc.) ainda NÃO entram — generalizar
 * exige validar esses divisores extras.
 */

const HEADERS = new Set([
  "COMENTÁRIOS:",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "CONCLUSÃO:",
  "TÉCNICA:",
  "ACHADOS:",
  "IMPRESSÃO:",
]);

/** Linha que abre uma nova seção/laudo — recebe uma linha em branco antes. */
function isDivider(trimmed: string): boolean {
  if (/^ULTRASSONOGRAFIA\b/i.test(trimmed)) return true;
  const withColon = trimmed.endsWith(":") ? trimmed : `${trimmed}:`;
  return HEADERS.has(withColon);
}

export function normalizeSectionSpacing(text: string): string {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/[ \t]+$/g, "");
    const trimmed = line.trim();
    if (trimmed === "") continue; // descarta vazias — reinserimos pela regra
    if (isDivider(trimmed) && out.length > 0) out.push(""); // 1 linha em branco antes do divisor
    out.push(line);
  }
  return out.join("\n");
}
