import { z } from "zod";

/**
 * Estilos fixos validados pelo criador. Persistidos na tabela `writing_styles`
 * com UUIDs estáveis (ver seeds em packages/db/seeds/writing_styles.ts).
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
