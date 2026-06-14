import { z } from "zod";

/**
 * DET-6 — Comandos do médico como OPERAÇÕES estruturadas.
 *
 * A visão do plano (ADR-0004 / DET-6): o médico dá instruções ("mude a frase X",
 * "adicione item Y na conclusão") que devem virar operações CONFIÁVEIS aplicadas
 * por código sobre o laudo já renderizado — nunca um LLM re-escrevendo o laudo
 * inteiro (que bagunça o resto). Conjunto FECHADO de operações; cada uma é uma
 * transformação determinística e auditável de string→string.
 *
 * Substitui gradualmente o `commandGuard.ts` (regex sobre input bruto, só cobre
 * conclusão). Aqui as operações são tipadas e o aplicador (`pipeline/operations.ts`)
 * é uma função pura testável.
 */

/** Campo comum a todas as operações: trecho do ditado que a originou (auditável). */
const baseFields = {
  trecho_original: z.string().optional(),
};

/** Troca uma frase por outra (substituição literal de todas as ocorrências). */
export const ReplacePhraseOpSchema = z.object({
  op: z.literal("replace_phrase"),
  from: z.string().min(1),
  to: z.string(),
  ...baseFields,
});

/**
 * Acrescenta um item à CONCLUSÃO. `position` é 1-based: 1 = topo; ausente ou
 * maior que o total = ao final. Não duplica item equivalente já presente.
 */
export const AddConclusionItemOpSchema = z.object({
  op: z.literal("add_conclusion_item"),
  text: z.string().min(1),
  position: z.number().int().positive().optional(),
  ...baseFields,
});

/** Remove da CONCLUSÃO o(s) item(ns) que contêm o trecho `match` (case-insensitive). */
export const RemoveConclusionItemOpSchema = z.object({
  op: z.literal("remove_conclusion_item"),
  match: z.string().min(1),
  ...baseFields,
});

/** Insere `text` imediatamente antes da 1ª ocorrência da âncora textual. */
export const InsertBeforeOpSchema = z.object({
  op: z.literal("insert_before"),
  anchor: z.string().min(1),
  text: z.string().min(1),
  ...baseFields,
});

/** Insere `text` imediatamente depois da 1ª ocorrência da âncora textual. */
export const InsertAfterOpSchema = z.object({
  op: z.literal("insert_after"),
  anchor: z.string().min(1),
  text: z.string().min(1),
  ...baseFields,
});

export const ReportOperationSchema = z.discriminatedUnion("op", [
  ReplacePhraseOpSchema,
  AddConclusionItemOpSchema,
  RemoveConclusionItemOpSchema,
  InsertBeforeOpSchema,
  InsertAfterOpSchema,
]);

export type ReportOperation = z.infer<typeof ReportOperationSchema>;
export type ReportOperationKind = ReportOperation["op"];

export const ReportOperationsSchema = z.array(ReportOperationSchema);
