import { z } from "zod";
import { CategoryCodeSchema } from "./categories";
import { WritingStyleCodeSchema } from "./writingStyles";

/**
 * Tipos de bloco no RAG. A composição final do prompt usa quotas por kind
 * (ex: 1 modelo, ≤5 regras, ≤8 frases, ≤2 conclusões, ≤3 exceções,
 *      ≤3 comentários técnicos, ≤2 exemplos).
 */
export const RagBlockKindSchema = z.enum([
  "modelo",
  "regra",
  "frase",
  "conclusao",
  "excecao",
  "comentario_tecnico",
  "exemplo",
]);

export type RagBlockKind = z.infer<typeof RagBlockKindSchema>;

export const RagBlockStatusSchema = z.enum([
  "draft",
  "validated",
  "archived",
]);

export type RagBlockStatus = z.infer<typeof RagBlockStatusSchema>;

export const RagBlockSchema = z.object({
  id: z.string().uuid(),
  category_code: CategoryCodeSchema,
  writing_style_id: z.string().uuid(),
  // Espelho do code do estilo para conveniência em logs/prompts
  writing_style_code: WritingStyleCodeSchema.optional(),
  kind: RagBlockKindSchema,
  title: z.string().min(2),
  content: z.string().min(1),
  status: RagBlockStatusSchema,
  // 0..100 — usado para tie-break antes da similaridade
  priority: z.number().int().min(0).max(100),
  version: z.number().int().min(1),
  // Tags livres para filtros adicionais (ex: "primeiro_trimestre", "transvaginal")
  tags: z.array(z.string()).default([]),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type RagBlock = z.infer<typeof RagBlockSchema>;

/**
 * Versão "compacta" usada no prompt do writer (sem campos de auditoria
 * que apenas inflariam tokens).
 */
export const RagBlockForPromptSchema = z.object({
  id: z.string().uuid(),
  kind: RagBlockKindSchema,
  title: z.string(),
  content: z.string(),
  priority: z.number().int(),
});

export type RagBlockForPrompt = z.infer<typeof RagBlockForPromptSchema>;
