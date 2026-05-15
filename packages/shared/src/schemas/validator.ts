import { z } from "zod";

/**
 * Saída da etapa Deterministic Validator. Pode bloquear a geração até
 * que o usuário responda uma pergunta de esclarecimento.
 */
export const ValidatorIssueSchema = z.object({
  code: z.string(),
  field: z.string().optional(),
  message: z.string(),
  severity: z.enum(["info", "warning", "blocker"]),
});

export type ValidatorIssue = z.infer<typeof ValidatorIssueSchema>;

export const ClarifyQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(2),
  // Tipo de resposta esperada — orienta a UI
  expects: z.enum(["text", "choice", "yesno", "number"]),
  choices: z.array(z.string()).optional(),
  // Field path que essa resposta vai preencher quando confirmada
  target_field: z.string().optional(),
});

export type ClarifyQuestion = z.infer<typeof ClarifyQuestionSchema>;

export const ValidatorResultSchema = z.object({
  ok: z.boolean(),
  issues: z.array(ValidatorIssueSchema),
  // Se houver perguntas, o pipeline pausa e devolve para o app
  questions: z.array(ClarifyQuestionSchema),
});

export type ValidatorResult = z.infer<typeof ValidatorResultSchema>;
