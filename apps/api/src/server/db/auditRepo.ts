import { getServiceClient } from "../supabaseService";

export type GenerationAuditStage =
  | "auth"
  | "request"
  | "lookups"
  | "resume"
  | "structurer"
  | "validator"
  | "retriever"
  | "writer"
  | "sanity"
  | "finalize";

export type GenerationAuditState = {
  reportId: string | null;
  userId: string;
  category: string;
  writingStyleId: string | null;
  rawInput: string | null;
  categoryHint: string | null;
  structuredOutput: unknown | null;
  validatorResult: unknown | null;
  ragBlocksRetrieved: unknown | null;
  ragBlocksSkipped: unknown | null;
  systemMessageFull: string | null;
  outputText: string | null;
  sanityResult: unknown | null;
  totalDurationMs: number | null;
  structurerDurationMs: number | null;
  validatorDurationMs: number | null;
  ragDurationMs: number | null;
  writerDurationMs: number | null;
  sanityDurationMs: number | null;
  openaiInputTokens: number | null;
  openaiOutputTokens: number | null;
  openaiCostUsd: number | null;
  modelWriter: string | null;
  modelStructurer: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorStage: GenerationAuditStage | null;
  promptVersion: string;
  pipelineVersion: "v1";
  contractHash: string;
  /** Qual modelo montou o laudo — migration 0023. Opcionais: só o caminho do
   *  catálogo os preenche; writer e renderer antigo deixam nulos. */
  modelCatalogId?: string | null;
  modelCatalogVersao?: number | null;
  modelCustomizationVersao?: number | null;
};

/**
 * Erro de coluna inexistente — o código chegou antes da migration 0023.
 * PostgREST devolve PGRST204 ("column not found in schema cache"); o Postgres
 * cru, 42703.
 */
function ehColunaDesconhecida(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /column .* does not exist|could not find the .* column/i.test(error.message ?? "")
  );
}

export async function persistAudit(state: GenerationAuditState): Promise<void> {
  try {
    const base = {
      report_id: state.reportId,
      user_id: state.userId,
      category: state.category,
      writing_style_id: state.writingStyleId,
      raw_input: state.rawInput,
      category_hint: state.categoryHint,
      structured_output: state.structuredOutput,
      validator_result: state.validatorResult,
      rag_blocks_retrieved: state.ragBlocksRetrieved,
      rag_blocks_skipped: state.ragBlocksSkipped,
      system_message_full: state.systemMessageFull,
      output_text: state.outputText,
      sanity_result: state.sanityResult,
      total_duration_ms: state.totalDurationMs,
      structurer_duration_ms: state.structurerDurationMs,
      validator_duration_ms: state.validatorDurationMs,
      rag_duration_ms: state.ragDurationMs,
      writer_duration_ms: state.writerDurationMs,
      sanity_duration_ms: state.sanityDurationMs,
      openai_input_tokens: state.openaiInputTokens,
      openai_output_tokens: state.openaiOutputTokens,
      openai_cost_usd: state.openaiCostUsd,
      model_writer: state.modelWriter,
      model_structurer: state.modelStructurer,
      error_code: state.errorCode,
      error_message: state.errorMessage,
      error_stage: state.errorStage,
      prompt_version: state.promptVersion,
      pipeline_version: state.pipelineVersion,
      contract_hash: state.contractHash,
    };
    // Colunas da migration 0023. Separadas do resto para poder reinserir sem
    // elas se o código chegar a produção antes da migration — assim a ordem do
    // deploy não custa a auditoria inteira daquela geração.
    const modelo = {
      model_catalog_id: state.modelCatalogId ?? null,
      model_catalog_versao: state.modelCatalogVersao ?? null,
      model_customization_versao: state.modelCustomizationVersao ?? null,
    };

    const sb = getServiceClient();
    const { error } = await sb.from("generation_audit").insert({ ...base, ...modelo });
    if (error && ehColunaDesconhecida(error)) {
      console.warn("generation_audit: migration 0023 ainda não aplicada; gravando sem as colunas de modelo");
      const retry = await sb.from("generation_audit").insert(base);
      if (retry.error) console.error("generation_audit insert failed:", retry.error);
    } else if (error) {
      console.error("generation_audit insert failed:", error);
    }
  } catch (error) {
    console.error("generation_audit persist failed:", error);
  }
}

export function estimateCost(inputTokens = 0, outputTokens = 0): number {
  return (inputTokens * 0.4 + outputTokens * 1.6) / 1_000_000;
}
