import { z } from "zod";

/**
 * Lista provisória de category codes. A lista canônica vem da extração do
 * LaudoUSG original (claude2) e é persistida na tabela `categories`.
 * O backend deve sempre validar contra o DB, não contra esta enum.
 */
export const CategoryCodeSchema = z.string().min(2).max(64).regex(
  /^[A-Z][A-Z0-9_]*$/,
  "category_code deve ser SCREAMING_SNAKE_CASE",
);

export type CategoryCode = z.infer<typeof CategoryCodeSchema>;

export const CategorySchema = z.object({
  id: z.string().uuid(),
  code: CategoryCodeSchema,
  label: z.string().min(2),
  active: z.boolean(),
});

export type Category = z.infer<typeof CategorySchema>;
