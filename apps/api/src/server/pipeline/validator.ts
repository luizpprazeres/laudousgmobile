import type { StructuredFindings, ValidatorResult } from "@laudousg/shared";

/**
 * Etapa 2 — Deterministic Validator (TS puro, sem IA).
 *
 * Checa coisas objetivas:
 *  - medidas (números > 0, unidades plausíveis: cm, mm, ml, cm³)
 *  - lateralidade consistente entre achados e comandos
 *  - datas no formato dd/mm/aaaa ou aaaa-mm-dd
 *  - comandos NÃO contaminam achados
 *  - categoria detectada existe no DB
 *  - nível de confiança baixo + trechos confusos → gera ClarifyQuestion
 *
 * Por categoria, regras adicionais virão dos contratos em prompts/contracts/*.
 *
 * STUB: implementação real virá após integração dos contratos por categoria
 *       (extraídos pelo claude2 em _extraction/04-rules-by-category/).
 */
export function runValidator(args: {
  findings: StructuredFindings;
  knownCategoryCodes: Set<string>;
}): ValidatorResult {
  const issues: ValidatorResult["issues"] = [];
  const questions: ValidatorResult["questions"] = [];

  // Categoria existe?
  if (!args.knownCategoryCodes.has(args.findings.categoria_detectada)) {
    issues.push({
      code: "UNKNOWN_CATEGORY",
      field: "categoria_detectada",
      message: `Categoria '${args.findings.categoria_detectada}' desconhecida.`,
      severity: "blocker",
    });
  }

  // Confiança baixa + trechos confusos → pergunta
  if (
    args.findings.nivel_de_confianca === "baixa" &&
    args.findings.trechos_confusos.length > 0
  ) {
    args.findings.trechos_confusos.slice(0, 2).forEach((t, i) => {
      questions.push({
        id: `confuso_${i}`,
        question: `Você quis dizer o quê neste trecho? "${t.trecho}" (${t.motivo})`,
        expects: "text",
      });
    });
  }

  // TODO(integração-claude2): regras por categoria, faixas normais, formatos.

  const ok = issues.every((i) => i.severity !== "blocker") && questions.length === 0;

  return { ok, issues, questions };
}
