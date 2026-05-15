import { z } from "zod";

/**
 * Sanity check: COMPARA achados estruturados vs laudo final.
 * IMPORTANTE: o sanity NÃO reescreve. Apenas julga e aponta.
 */
export const SanityIssueTypeSchema = z.enum([
  "medida_divergente",
  "lateralidade_divergente",
  "achado_omitido",
  "achado_inventado",
  "comando_ignorado",
  "categoria_divergente",
  "conclusao_inconsistente",
  "data_divergente",
  "formato_quebrado",
  "outro",
]);

export const SanitySeveritySchema = z.enum(["info", "warning", "critical"]);

export const SanityIssueSchema = z.object({
  type: SanityIssueTypeSchema,
  severity: SanitySeveritySchema,
  detail: z.string().min(1),
  // Trecho do laudo final que motivou o issue
  trecho_laudo: z.string().optional(),
  // Campo/path no JSON de achados que motivou o issue
  campo_achado: z.string().optional(),
});

export type SanityIssue = z.infer<typeof SanityIssueSchema>;

export const SanityResultSchema = z.object({
  verdict: z.enum(["ok", "warning", "critical"]),
  issues: z.array(SanityIssueSchema),
  summary: z.string(),
});

export type SanityResult = z.infer<typeof SanityResultSchema>;
