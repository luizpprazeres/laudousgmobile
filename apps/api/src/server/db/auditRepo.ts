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
};

export async function persistAudit(state: GenerationAuditState): Promise<void> {
  try {
    const { error } = await getServiceClient().from("generation_audit").insert({
      report_id: state.reportId,
      user_id: state.userId,
      category: state.category,
      writing_style_id: state.writingStyleId,
      raw_input: state.rawInput,
      category_hint: state.categoryHint,
      structured_output: state.structuredOutput,
      validator_result: state.validatorResult,
      rag_blocks_retrieved: state.ragBlocksRetrieved,
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
    });
    if (error) {
      console.error("generation_audit insert failed:", error);
    }
  } catch (error) {
    console.error("generation_audit persist failed:", error);
  }
}

export function estimateCost(inputTokens = 0, outputTokens = 0): number {
  return (inputTokens * 0.4 + outputTokens * 1.6) / 1_000_000;
}
