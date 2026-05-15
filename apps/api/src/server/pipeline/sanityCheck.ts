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
  "Você é o sanity check do LaudoUSG. Compara o JSON de ACHADOS ESTRUTURADOS",
  "com o LAUDO FINAL gerado e detecta inconsistências.",
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
  "Retorne JSON estrito conforme o schema. NÃO sugira correções.",
].join("\n");

export async function runSanityCheck(args: {
  findings: StructuredFindings;
  finalText: string;
  signal?: AbortSignal;
}): Promise<{ result: SanityResult; latencyMs: number }> {
  const t0 = Date.now();

  const userPrompt = [
    "## ACHADOS ESTRUTURADOS",
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
