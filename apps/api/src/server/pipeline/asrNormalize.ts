/**
 * Normalização determinística de erros de ASR em VERBOS DE COMANDO.
 *
 * A transcrição troca o verbo do comando ("correlacione" vira "acione", "escreva"
 * vira "escreve") e o sistema então não reconhece a diretiva — ou a ecoa literal.
 * Aqui só tocamos em padrões de COMANDO de alta confiança; nunca em conteúdo
 * clínico. Aplicado só no caminho de interpretação de comandos (flag-gated).
 */

/**
 * Corrige verbos de comando mal transcritos. Conservador: só casa quando o
 * contexto é claramente de comando (perto de "na conclusão", "com a US precoce",
 * "no lugar de").
 */
export function normalizeAsrCommands(text: string): string {
  return (
    text
      // "acione/acionar/aciona [na conclusão] com a US precoce/DUM" → correlacione.
      // ASR clássico: o médico dita "correlacione", sai "acione".
      .replace(
        /\bacion(?:e|ar|a)\b(?=[^.;\n]*?(?:ultrassonograf|us\s+precoce|\bdum\b|conclus))/gi,
        "correlacione",
      )
      // "no lugar de X escreve Y" → "escreva" (imperativo).
      .replace(
        /(\bno\s+lugar\s+d[eoa]\b[^.;\n]*?)\bescreve\b/gi,
        "$1escreva",
      )
  );
}
