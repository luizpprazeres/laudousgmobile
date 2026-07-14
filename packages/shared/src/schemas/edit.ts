import { z } from "zod";

/**
 * POST /api/edit — ajuste incremental sobre laudo já gerado.
 */
export const EditReportRequestSchema = z.object({
  report_id: z.string().uuid(),
  instruction: z.string().min(2).max(5_000),
  // Sem base_text override: a edição SEMPRE parte do conteúdo armazenado do
  // report (final_output/generated_output). Aceitar texto-base do cliente
  // permitiria sobrescrever o laudo com conteúdo arbitrário (review Dex1).
});

export type EditReportRequest = z.infer<typeof EditReportRequestSchema>;
