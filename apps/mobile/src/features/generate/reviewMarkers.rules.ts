/**
 * A REGRA DA COR, sem React — para poder ser testada e reusada.
 *
 * Vive à parte do `.tsx` porque a regra é a parte que importa e a que erra: ela
 * já divergiu entre iOS e Android (o Android pintava só um "(?)" e ignorava
 * `____`), e já confundiu o médico ao dar a mesma cor a dois problemas
 * diferentes.
 */

/**
 * - **roxo** — falta um dado (`____`). O laudo está incompleto: preencher.
 * - **âmbar** — há algo divergente (`[REVISAR — ...]`). O dado existe, mas o
 *   sistema desconfia dele: conferir.
 *
 * Enquanto as duas compartilhavam o roxo, o médico via "falta alguma coisa"
 * numa frase completa e ia procurar o que não estava faltando — aconteceu em
 * 19/08, na frase da 1ª ultrassonografia. A cor precisa dizer o que fazer.
 */
export const COR_FALTA = { bg: "#EDE9FE", fg: "#6D28D9" } as const;
export const COR_REVISAR = { bg: "#FEF3C7", fg: "#92400E" } as const;

export type CorDeAtencao = typeof COR_FALTA | typeof COR_REVISAR;

export const REVIEW_MARKER_RE = /\s*\[REVISAR\b[^\]]*\]/g;

/** O texto sem os marcadores — para COPIAR, ENVIAR e SALVAR limpo. */
export function stripReviewMarkers(text: string): string {
  return text.replace(REVIEW_MARKER_RE, "");
}

/**
 * Que cor esta linha pede — ou nenhuma.
 *
 * Havendo os dois problemas, o âmbar vence: uma divergência ativa pesa mais que
 * uma lacuna, e a lacuna continua visível no próprio `____`.
 */
export function corDaLinha(linha: string): CorDeAtencao | null {
  if (linha.includes("[REVISAR")) return COR_REVISAR;
  return linha.includes("____") ? COR_FALTA : null;
}
