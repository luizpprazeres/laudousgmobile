/**
 * Guard determinístico para a linha "DUM:" no corpo do laudo.
 *
 * O structurer (LLM) às vezes devolve um valor de DUM inválido — a string
 * literal "null", uma data impossível ("41/01/0000") ou uma idade gestacional
 * roteada por engano para o campo DUM ("22s6d"). Esses valores eram renderizados
 * como "DUM: null." / "DUM: 41/01/0000." e o médico apagava.
 *
 * Regra: só renderizar a linha DUM quando o valor for uma data DD/MM/AAAA real.
 */
export function isValidDum(dum: string | null | undefined): boolean {
  if (!dum) return false;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dum.trim());
  if (!m) return false;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yy = Number(m[3]);
  return dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yy >= 1900 && yy <= 2100;
}

/**
 * Rede de segurança para o caminho writer (LLM), que pode emitir a linha DUM
 * diretamente: remove qualquer linha "DUM: <valor>" cujo valor não seja uma
 * data válida. Preserva linhas DUM legítimas. Opera linha a linha (seguro).
 */
export function stripInvalidDumLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const m = /^DUM:\s*(.+?)\.?\s*$/i.exec(line);
      if (!m) return true; // não é linha DUM → mantém
      return isValidDum(m[1]); // linha DUM → mantém só se válida
    })
    .join("\n");
}
