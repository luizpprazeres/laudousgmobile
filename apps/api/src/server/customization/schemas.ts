/**
 * Validação de FORMA das operações de personalização (zod).
 *
 * Isto é só o piso: garante que o JSON tem o formato certo. A validação que
 * importa — slot existe, é personalizável, conserva os dados obrigatórios — é
 * `validateOperations()`, que precisa do catálogo e roda depois. Nunca grave
 * operações que passaram só por aqui.
 */

import { z } from "zod";
import type { Operation } from "@/server/renderer/catalog/types";

export const OperationSchema: z.ZodType<Operation> = z.union([
  z.object({ op: z.literal("remove_slot"), slot: z.string().min(1).max(120) }),
  z.object({
    op: z.literal("replace_phrase"),
    slot: z.string().min(1).max(120),
    variant: z.string().min(1).max(120).optional(),
    value: z.string().max(2000),
  }),
  z.object({ op: z.literal("append_conclusion_item"), value: z.string().min(1).max(1000) }),
  z.object({
    op: z.literal("insert_phrase_after"),
    anchor: z.string().min(1).max(120),
    value: z.string().min(1).max(2000),
  }),
]);

/** O teto de 200 é o mesmo CHECK da coluna `operations` (migration 0022). */
export const OperationsSchema = z.array(OperationSchema).max(200);

/** O mesmo teto de 500 do CHECK da coluna `note`. */
export const NoteSchema = z.string().max(500).nullable().optional();

/** Os códigos são os do enum `writing_style_code` — ver registry.ESTILOS_VIVOS. */
export const EstiloSchema = z.enum(["CLASSICO_COMPLETO", "OBJETIVO"]);
export type Estilo = z.infer<typeof EstiloSchema>;
