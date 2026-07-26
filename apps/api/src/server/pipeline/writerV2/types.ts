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
  /**
   * Item de CONCLUSÃO normal deste slot (só nas categorias que concluem
   * item-por-estrutura, ex.: pelve/obstétrica: útero → "Útero de volume
   * normal."). Vazio/ausente = o slot não gera item de conclusão (abdome, que
   * conclui por fechamento único).
   */
  frase_conclusao: z.string().optional(),
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
  /**
   * COMO a categoria conclui:
   * - "fechamento" (abdome): exame normal → 1 frase única de normalidade; com
   *   achado → diagnósticos numerados + fechamento "Demais órgãos...".
   * - "por_estrutura" (pelve/obstétrica): a conclusão SEMPRE lista um item por
   *   estrutura/aspecto (mesmo tudo normal), montado DETERMINISTICAMENTE a partir
   *   dos slots com `frase_conclusao` — o item de achado substitui o normal.
   *   Garante conclusão completa sem depender do LLM lembrar de todos os itens.
   */
  conclusao_modo: z.enum(["fechamento", "por_estrutura"]).default("fechamento"),
  /**
   * (Só modo "por_estrutura") Ordem dos itens da conclusão por slotId, quando ela
   * DIFERE da ordem do corpo (ex.: obstétrica conclui por vitalidade/IG antes da
   * biometria). Vazio = usa a ordem do base. Slots listados sem `frase_conclusao`
   * são ignorados; slots com `frase_conclusao` fora da lista entram ao fim.
   */
  conclusao_ordem: z.array(z.string()).default([]),
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
        /**
         * Item de CONCLUSÃO deste achado (diagnóstico nomeado). Usado no modo
         * "por_estrutura": substitui a `frase_conclusao` normal do slot. "" =
         * o achado é só descritivo e não muda a conclusão daquela estrutura.
         */
        conclusao: z.string().default(""),
      }),
    )
    .default([]),
  /**
   * Itens de conclusão AVULSOS (não ligados a um slot), na ordem final.
   * Modo "fechamento" (abdome): os diagnósticos vão aqui; vazio = exame normal.
   * Modo "por_estrutura": só o que NÃO nasce de uma estrutura (ex.: idade
   * gestacional, correlação com exame anterior).
   */
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
