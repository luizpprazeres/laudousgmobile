import { z } from "zod";
import { CategoryCodeSchema } from "./categories";
import { StructuredFindingsSchema } from "./findings";
import { SanityResultSchema } from "./sanity";

export const ReportStatusSchema = z.enum([
  "draft",
  "awaiting_clarify",
  "generated",
  "blocked",
  "published",
  "discarded",
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category_code: CategoryCodeSchema,
  writing_style_id: z.string().uuid(),
  status: ReportStatusSchema,
  raw_input: z.string(),
  consolidated_transcript: z.string().nullable(),
  structured_findings: StructuredFindingsSchema.nullable(),
  generated_output: z.string().nullable(),
  // O usuário pode editar o laudo na UI; final_output guarda a edição final
  final_output: z.string().nullable(),
  rag_blocks_used: z.array(z.string().uuid()),
  sanity_result: SanityResultSchema.nullable(),
  generation_metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Report = z.infer<typeof ReportSchema>;

/**
 * Persistido em `generation_runs`. Uma row por chamada do pipeline
 * (incluindo retomadas após clarify).
 */
export const GenerationRunSchema = z.object({
  id: z.string().uuid(),
  report_id: z.string().uuid(),
  // Versionamento — bump a cada mudança em prompts/global.ts, contratos, schema
  prompt_version: z.string(),
  contract_version: z.string(),
  findings_schema_version: z.string(),
  // Modelos efetivos usados (registrados, não os defaults)
  model_structurer: z.string(),
  model_writer: z.string(),
  model_sanity: z.string(),
  embedding_model: z.string(),
  // Inputs auditáveis
  rag_query_text: z.string(),
  rag_blocks_used: z.array(z.string().uuid()),
  structured_input: StructuredFindingsSchema.nullable(),
  // Outputs
  sanity_output: SanityResultSchema.nullable(),
  // Métricas
  latency_ms_total: z.number().int(),
  latency_ms_structurer: z.number().int().nullable(),
  latency_ms_writer: z.number().int().nullable(),
  latency_ms_sanity: z.number().int().nullable(),
  tokens_input: z.number().int().nullable(),
  tokens_output: z.number().int().nullable(),
  cost_usd: z.number().nullable(),
  // Resultado da run
  outcome: z.enum(["success", "clarify", "blocked", "error", "aborted"]),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type GenerationRun = z.infer<typeof GenerationRunSchema>;
