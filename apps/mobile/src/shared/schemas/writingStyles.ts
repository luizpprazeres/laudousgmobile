import { z } from "zod";

/**
 * Códigos históricos aceitos nos registros. A interface oferece apenas os
 * estilos ativos retornados pelo produto (hoje Clássico e Objetivo).
 */
export const WritingStyleCodeSchema = z.enum([
  "CLASSICO_COMPLETO",
  "DIRETO_OBJETIVO",
  "DETALHADO_PROTOCOLAR",
  "OBJETIVO",
]);

export type WritingStyleCode = z.infer<typeof WritingStyleCodeSchema>;

export const WritingStyleSchema = z.object({
  id: z.string().uuid(),
  code: WritingStyleCodeSchema,
  name: z.string(),
  description: z.string(),
  active: z.boolean(),
});

export type WritingStyle = z.infer<typeof WritingStyleSchema>;
