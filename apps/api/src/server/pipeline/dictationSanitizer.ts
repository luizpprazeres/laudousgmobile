/**
 * Guard de SANITIZAÇÃO de artefatos de ditado (cinto de segurança).
 *
 * Boletim diário 2026-06-17: ASR sujo e comandos falados vazaram para o texto
 * clínico — "vírgula" escrita como palavra, "Você vai escrever ...", "Item dos
 * ovários:", "tchau tchau". Este guard DETERMINÍSTICO limpa esses artefatos do
 * laudo final, sem tocar em conteúdo clínico legítimo (incl. placeholders ____,
 * que DEVEM permanecer quando o dado falta — decisão do Luiz).
 *
 * Conservador por construção: cada padrão exige contexto de COMANDO/RUÍDO claro;
 * negativos (texto de laudo real) são testados em dictationSanitizer.manual.ts.
 */

/** Pontuação ditada que vazou como palavra (a IA deveria ter convertido). */
function fixSpokenPunctuation(s: string): string {
  // "vírgula" como palavra isolada → "," (jamais é termo médico).
  return s.replace(/\s*,?\s*\bv[íi]rgula\b\s*,?\s*/gi, ", ");
}

/** Prefixos de COMANDO de ditado que introduzem conteúdo ("você vai escrever X"). */
function stripLeadingCommands(s: string): string {
  return (
    s
      // "Você vai escrever ...", "Vou escrever ...", "Escreva que ...", "Acrescente que ..."
      .replace(/\b(?:voc[êe]\s+vai\s+escrever|vou\s+escrever|escreva\s+que|acrescente\s+que)\s+/gi, "")
      // "adicione/acrescente/coloque/inclua (um) item ..." (comando de item)
      .replace(/\b(?:adicione|acrescente|coloque|inclua)\s+(?:um\s+|mais\s+)?item\b[:,]?\s*/gi, "")
      // "no final (da conclusão), acrescente/coloque/escreva ..." (precisa do verbo p/ não pegar "no final da gestação")
      .replace(/\bno\s+final(?:\s+da\s+conclus[ãa]o)?[,:]?\s*(?:acrescente|coloque|escreva|adicione)\b\s*/gi, "")
      // "após o título, acrescente/coloque ..."
      .replace(/\bap[óo]s\s+o\s+t[íi]tulo[,:]?\s*(?:acrescente|coloque|escreva|adicione)\b\s*/gi, "")
      // "corrija o item N ..."
      .replace(/\bcorrij[ae]\s+o\s+item\s+\d+\b[:,]?\s*/gi, "")
  );
}

/** Rótulo de comando de substituição no INÍCIO de linha ("Item dos ovários:"). */
function stripItemLabels(s: string): string {
  // Linha começando com "Item d[oa]s <palavra>:" — vazamento do comando de troca.
  return s.replace(/^item\s+d[oae]s?\s+[\wÀ-ú]+\s*:\s*/gim, "");
}

/** Despedida/ruído no fim do laudo. NÃO come o ponto final da frase anterior. */
function stripTrailingNoise(s: string): string {
  return s.replace(
    /[\s,;]*\b(?:tchau(?:\s+tchau)?|obrigad[oa]|valeu|fim(?:\s+do\s+laudo)?|[ée]\s+isso)\b[\s.!]*$/gi,
    "",
  );
}

/** Limpeza de artefatos de pontuação/espaço gerados pelas remoções. */
function cleanup(s: string): string {
  return s
    .replace(/,\s*,+/g, ",") // vírgulas duplicadas
    .replace(/\s+([,.;:])/g, "$1") // espaço antes de pontuação
    .replace(/([(])\s+/g, "$1") // espaço depois de abre-parênteses
    .replace(/[ \t]{2,}/g, " ") // espaços duplicados
    .replace(/^[ \t]*,\s*/gm, "") // linha começando com vírgula
    // Recapitaliza o início da linha quando ficou minúsculo após remover comando.
    .replace(/^([ \t]*)([a-zà-ú])/gm, (_m, ws: string, c: string) => ws + c.toUpperCase())
    .replace(/\n{3,}/g, "\n\n"); // linhas em branco extras
}

/**
 * Sanitiza o laudo final, removendo artefatos de ditado/ASR (comandos falados,
 * pontuação ditada, despedidas). Preserva 100% do conteúdo clínico e os
 * placeholders ____. Idempotente.
 */
export function sanitizeDictationArtifacts(laudo: string): string {
  let s = laudo;
  s = fixSpokenPunctuation(s);
  s = stripLeadingCommands(s);
  s = stripItemLabels(s);
  s = stripTrailingNoise(s);
  s = cleanup(s);
  return s.trim();
}
