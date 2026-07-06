import type { SanityResult, StructuredFindings } from "@laudousg/shared";
import { SanityResultSchema } from "@laudousg/shared";
import { structuredCompletion } from "../ai/openai";
import { env } from "../env";
import { SANITY_JSON_SCHEMA } from "../ai/jsonSchema";

/**
 * Etapa 5 — Sanity Check.
 *
 * Compara achados estruturados vs laudo final. Retorna ok|warning|critical
 * + lista de issues. NÃO reescreve nada (recomendação do codex).
 *
 * Em paralelo (TODO próxima sessão), rodar checks determinísticos:
 *  - regex de medidas no texto vs medidas em findings.achados
 *  - lateralidades mencionadas em ambos
 *  - presença de cada comando do médico
 * Issues determinísticos têm severity hard ('critical' se medida divergir).
 */

const SANITY_SYSTEM_PROMPT = [
  "Você é o sanity check do LaudoUSG. Compara o que o MÉDICO DITOU com o",
  "LAUDO FINAL gerado e detecta inconsistências FACTUAIS.",
  "",
  "FONTE DE VERDADE: o DITADO DO MÉDICO (texto cru). O JSON de achados",
  "estruturados é AUXILIAR e pode estar incompleto ou vazio — pipelines",
  "novos geram o laudo direto do ditado. REGRAS INEGOCIÁVEIS:",
  "- Conteúdo presente no DITADO e no laudo NUNCA é issue, mesmo que falte",
  "  no JSON auxiliar (não reporte achado_inventado nesse caso).",
  "- JSON com lista de achados vazia ≠ laudo inventado: compare com o ditado.",
  "- O médico decide o que vai no corpo e o que vai na conclusão. Um achado",
  "  presente no corpo e ausente na conclusão (ou vice-versa) NÃO é issue.",
  "- Frases de normalidade padrão da categoria (estruturas não citadas",
  "  descritas como normais) são esperadas — não são achado_inventado.",
  "",
  "Detecte e reporte (sem reescrever) os seguintes tipos de issue:",
  "- medida_divergente, lateralidade_divergente, achado_omitido, achado_inventado,",
  "  comando_ignorado, categoria_divergente, conclusao_inconsistente,",
  "  data_divergente, formato_quebrado.",
  "",
  "Severidade:",
  "- critical: divergência factual (medida, lateralidade, data, comando ignorado)",
  "- warning: omissão menor ou frase ambígua",
  "- info: estilística",
  "",
  "Verdict:",
  "- ok: nenhum issue ou apenas info",
  "- warning: pelo menos um warning, sem critical",
  "- critical: pelo menos um critical → o laudo NÃO deve ser entregue sem revisão",
  "",
  "Na dúvida entre reportar ou não, NÃO reporte: falso alarme treina o médico",
  "a ignorar o card. Retorne JSON estrito conforme o schema. NÃO sugira correções.",
].join("\n");

export async function runSanityCheck(args: {
  findings: StructuredFindings;
  finalText: string;
  /** Texto cru ditado/digitado pelo médico — fonte de verdade primária. */
  rawInput?: string;
  signal?: AbortSignal;
}): Promise<{ result: SanityResult; latencyMs: number }> {
  const t0 = Date.now();

  const userPrompt = [
    "## DITADO DO MÉDICO (fonte de verdade)",
    args.rawInput?.trim() || "(não disponível — use apenas o JSON auxiliar)",
    "",
    "## ACHADOS ESTRUTURADOS (auxiliar — pode estar incompleto)",
    "```json",
    JSON.stringify(args.findings, null, 2),
    "```",
    "",
    "## LAUDO FINAL GERADO",
    args.finalText,
  ].join("\n");

  const result = await structuredCompletion({
    model: env().OPENAI_MODEL_SANITY,
    system: SANITY_SYSTEM_PROMPT,
    user: userPrompt,
    schemaName: "SanityResult",
    schema: SANITY_JSON_SCHEMA as unknown as Record<string, unknown>,
    parser: SanityResultSchema,
    signal: args.signal,
  });

  return { result, latencyMs: Date.now() - t0 };
}
