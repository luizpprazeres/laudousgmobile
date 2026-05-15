import type { StructuredFindings } from "@laudousg/shared";

/**
 * Aplica respostas de clarify aos findings estruturados.
 *
 * Estratégia conservadora:
 * 1. Para cada answer, se ela vem com `target_field` (path tipo "utero.volume_cm3"
 *    persistido na ClarifyQuestion), preenche o campo em `findings.achados`.
 * 2. Independentemente, anexa todas as respostas como comandos do médico do tipo
 *    `outro` — garantindo que o writer veja a informação literal mesmo se o
 *    target_field não bater.
 * 3. Remove `trechos_confusos` (foram resolvidos pelo médico).
 * 4. Aumenta nivel_de_confianca para "alta" (o médico confirmou).
 *
 * Não tentamos re-rodar o structurer com input atualizado — seria custo IA
 * adicional sem ganho claro. O writer recebe answers via comandos.
 */
export function applyClarifyAnswers(
  findings: StructuredFindings,
  answers: { question_id: string; answer: string }[],
  questionsContext?: { id: string; target_field?: string; question: string }[],
): StructuredFindings {
  if (answers.length === 0) return findings;

  const updated: StructuredFindings = {
    ...findings,
    achados: { ...findings.achados },
    comandos_do_medico: [...findings.comandos_do_medico],
    trechos_confusos: [],
    nivel_de_confianca: "alta",
  };

  for (const { question_id, answer } of answers) {
    const ctx = questionsContext?.find((q) => q.id === question_id);
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) continue;

    // 1. Preenche target_field se existir (notação dot path)
    if (ctx?.target_field) {
      setByPath(updated.achados, ctx.target_field, trimmedAnswer);
    }

    // 2. Sempre adiciona como comando do médico (segurança em profundidade)
    updated.comandos_do_medico.push({
      tipo: "outro",
      texto: ctx?.question
        ? `Esclarecimento "${ctx.question}": ${trimmedAnswer}`
        : `Esclarecimento do médico: ${trimmedAnswer}`,
    });
  }

  return updated;
}

/**
 * Set valor em objeto via dot-path. Cria objetos intermediários se necessário.
 *
 * NÃO sobrescreve escalar útil (fix codex T-D review #1): se um path
 * intermediário já existe como string/number/boolean com conteúdo, retorna
 * false sem fazer nada. Garante que answer.target_field como dot-path
 * inválido não destrua dado existente — a resposta sempre vai entrar como
 * comando do médico igualmente (defesa em profundidade).
 *
 * Retorna true se aplicou; false se desistiu pra preservar escalar útil.
 */
function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: string,
): boolean {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return false;

  let cursor: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const existing = cursor[key];
    if (existing === null || existing === undefined) {
      cursor[key] = {};
    } else if (typeof existing !== "object" || Array.isArray(existing)) {
      // Path intermediário existe como escalar útil — não sobrescrever.
      // Resposta ainda vai como comando.
      return false;
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
  return true;
}
