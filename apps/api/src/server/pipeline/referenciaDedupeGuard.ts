/**
 * Dedup determinístico da FRASE DE REFERÊNCIA de IG (Domingos).
 *
 * Boletim/relato Luiz 04/07 (caso 10813392): a frase "Primeira ultrassonografia
 * realizada {data} com {IG}. Hoje com {IG}." é montada UMA vez pela fraseReferencia
 * (renderer, após o título). Mas quando o médico dita "após o título ACRESCENTE a
 * primeira ultrassonografia…", o interpretador de comandos re-insere uma cópia da
 * mesma frase nos COMENTÁRIOS → a frase aparece DUAS vezes (após o título e no
 * corpo/comentários/conclusão). Conflito renderer × commandInterpreter.
 *
 * Guard: a frase de referência só pode aparecer UMA vez. Mantém a PRIMEIRA
 * ocorrência (a canônica, logo após o título) e remove as demais linhas que a
 * repetem. Determinístico, seguro (a frase nunca é legitimamente repetida).
 * Flag: OBST_REF_DEDUP (default OFF).
 */

// Linha da frase de referência: 1ª US ("realizada …" / "compatível com … na data
// do exame") OU DUM ("Data da última menstruação em …, correspondente a …").
const REF_LINE =
  /\bprimeira\s+ultrassonografia\s+(?:realizada|compat[íi]vel)\b|\bdata\s+da\s+[úu]ltima\s+menstrua[çc][ãa]o\s+em\b/i;

/**
 * Remove ocorrências repetidas da frase de referência, preservando a primeira.
 * Idempotente. Normaliza linhas em branco resultantes (máx. 1 em branco seguida).
 */
export function dedupReferenciaFrase(laudo: string): string {
  let seen = false;
  const linhas = laudo.split("\n").filter((linha) => {
    if (REF_LINE.test(linha)) {
      if (seen) return false; // 2ª+ ocorrência → remove a linha inteira
      seen = true;
    }
    return true;
  });
  return linhas.join("\n").replace(/\n{3,}/g, "\n\n");
}
