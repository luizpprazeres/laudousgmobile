import { z } from "zod";

/**
 * Writer V2 (EXPERIMENTAL, flag-gated, INERTE) — tipos do spec e do plano de edição.
 * Arquitetura: docs/writer-v2-arquitetura-convergida-2026-07-25.md.
 * A inteligência mora no SPEC (dado editável) + no CÓDIGO (montagem/auditoria).
 */

/** Um slot do laudo-base (a AUTORIDADE do estilo). id estável sobrevive a edições. */
export const specSlotSchema = z.object({
  id: z.string(),
  frase_normal: z.string(),
  obrigatorio: z.boolean().default(false),
});
export type SpecSlot = z.infer<typeof specSlotSchema>;

/** Entrada do dicionário achado→frase (gatilho → corpo morfológico + conclusão nomeada). */
export const findingPhraseSchema = z.object({
  gatilho: z.string(),
  slot_alvo: z.string(),
  corpo: z.string(),
  conclusao: z.string(),
});
export type FindingPhrase = z.infer<typeof findingPhraseSchema>;

export const categoryContractSchema = z.object({
  titulo: z.string(),
  /** "1." (ponto, abdome) ou "1)" (parêntese, demais). O separador é o sufixo. */
  numeracao_conclusao: z.string().default("1)"),
  segmentos_romanos: z.boolean().default(true),
});
export type CategoryContract = z.infer<typeof categoryContractSchema>;

export const reportSpecSchema = z.object({
  base: z.array(specSlotSchema),
  dictionary: z.array(findingPhraseSchema),
  contract: categoryContractSchema,
});
export type ReportSpec = z.infer<typeof reportSpecSchema>;

/**
 * EDITPLAN — o que a chamada semântica (LLM) emite. NÃO é o laudo; é a INTENÇÃO
 * de edição sobre os slots. O código (assemble) produz o texto final e garante
 * fidelidade ao base. Slots não citados aqui mantêm a frase_normal por default.
 */
export const editPlanSchema = z.object({
  /** Slots com achado: o corpo morfológico que SUBSTITUI a frase_normal do slot. */
  slots: z
    .array(
      z.object({
        slotId: z.string(),
        corpo: z.string(),
      }),
    )
    .default([]),
  /** Itens de conclusão (diagnósticos nomeados), na ordem final. Vazio = exame normal. */
  conclusao: z.array(z.string()).default([]),
  /** slotIds a OMITIR do laudo (ex.: médico pediu "não descreva a bexiga"). */
  omitSlots: z.array(z.string()).default([]),
});
export type EditPlan = z.infer<typeof editPlanSchema>;

/** Divergência encontrada pela auditoria determinística (fidelidade ditado→laudo). */
export type Divergencia = {
  tipo: "medida_ausente" | "lado_ausente" | "placeholder_obrigatorio" | "slot_inexistente";
  detalhe: string;
  severidade: "alta" | "media";
};
