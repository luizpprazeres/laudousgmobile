/**
 * Modelo de laudo como DADO — tipos do catálogo e do documento estruturado.
 *
 * Projeto: docs/projeto-modelos/. Decisões em 03-perguntas-abertas.md,
 * revisão adversarial em 04-revisao-codex.md.
 *
 * Separação central:
 *   MOTOR (código)    → cálculos, formatação, concordância, ramificação, predicados
 *   CONTEÚDO (dado)   → as frases, a ordem dos slots, o que é obrigatório
 *
 * Nada aqui é importado pelo pipeline de produção ainda. A adoção acontece
 * atrás da flag MODEL_CATALOG_CATEGORIES, e só depois de equivalência
 * byte-a-byte comprovada contra o renderer atual.
 */

/** Contexto que o motor entrega ao catálogo para decidir variante e interpolar. */
export type SlotContext<F> = {
  findings: F;
  /** Índice do feto corrente (0 no feto único). */
  fetoIndex: number;
  gemelar: boolean;
  flags: { igCorrection: boolean; flexivel: boolean; grannum: boolean; objetivo: boolean };
};

/**
 * Uma redação possível de um slot. `quando` é código (determinístico, do motor);
 * `frase` é dado (editável pelo usuário, quando permitido).
 */
export type SlotVariant<F> = {
  id: string;
  /** Predicado do motor. Ausente = variante padrão (fallback). */
  quando?: (ctx: SlotContext<F>) => boolean;
  /**
   * Texto com placeholders nomeados `{campo}`. Quando o texto depende de dados
   * de forma que interpolação simples não expressa (listas, concordância),
   * use `montar` — aí a frase deixa de ser editável e passa a ser do motor.
   */
  frase?: string;
  montar?: (ctx: SlotContext<F>, vars: Record<string, string>) => string;
  /** Item correspondente na conclusão, se este slot contribuir com um. */
  conclusao?: string;
  montarConclusao?: (ctx: SlotContext<F>, vars: Record<string, string>) => string;
  /**
   * Falso quando esta variante representa um ESTADO CLÍNICO ALTERADO — nesse
   * caso quem escreve é o motor e a personalização do usuário não se aplica.
   * (Crítica C3 da revisão: uma frase personalizada de normalidade jamais pode
   * mascarar um achado patológico.)
   */
  personalizavel?: boolean;
};

export type Slot<F> = {
  id: string;
  /** Invariante de PRESENÇA: nenhuma personalização remove. */
  obrigatorio?: boolean;
  /** Invariante de CONTEÚDO: placeholders que a frase precisa conservar. */
  placeholdersObrigatorios?: string[];
  /** Só entra no documento se o predicado passar. */
  incluirSe?: (ctx: SlotContext<F>) => boolean;
  variantes: SlotVariant<F>[];
};

/**
 * Item da ordem do corpo. `repetirPorFeto` agrupa POR FETO, não por slot —
 * o renderer gemelar emite (header A, bcf A, biometria A…), (header B, …),
 * e não (header A, header B, bcf A, bcf B…).
 */
export type OrderItem = string | { repetirPorFeto: string[] };

export type Catalog<F> = {
  id: string;
  categoria: string;
  estilo: string;
  versao: number;
  /** Vocabulário de placeholders que o motor sabe preencher nesta categoria. */
  variaveis: readonly string[];
  titulo: (ctx: SlotContext<F>) => string;
  cabecalhos: { tecnica?: string; corpo: string; conclusao: string };
  /** Bloco fixo antes do corpo (ex.: COMENTÁRIOS no estilo clássico). */
  preambulo?: string;
  /** Ordem dos slots do corpo. O motor escolhe qual lista usar. */
  ordem: (ctx: SlotContext<F>) => OrderItem[];
  /**
   * Ordem dos itens de CONCLUSÃO por slotId — não acompanha a ordem do corpo.
   * (No gemelar o corpo é …ponderal, placenta, líquido; a conclusão é
   * IG, líquido, ponderal.) Slots ausentes desta lista vão para o fim.
   */
  ordemConclusao?: (ctx: SlotContext<F>) => string[];
  slots: Slot<F>[];
  /** Numeração dos itens de conclusão: (i, total) => prefixo. */
  numerarConclusao: (i: number, total: number) => string;
};

// ---------------------------------------------------------------------------
// Documento estruturado — a string é o ÚLTIMO passo (crítica C1 da revisão)
// ---------------------------------------------------------------------------

export type SegmentKind = "corpo" | "conclusao";

export type Segment = {
  slotId: string;
  variantId: string;
  /** "A" / "B" no gemelar; ausente no feto único. */
  instance?: string;
  kind: SegmentKind;
  text: string;
  /** Rastreabilidade para o Lab: de que camada veio este trecho. */
  origin: "base" | "custom" | "computed";
};

export type ReportDoc = {
  catalogId: string;
  catalogVersao: number;
  titulo: string;
  /** Linhas soltas entre o título e o preâmbulo (DUM, referência de IG). */
  preLinhas: string[];
  segments: Segment[];
};

/** Chave estável de um segmento — é ela que guards e personalização endereçam. */
export function segmentKey(s: Pick<Segment, "slotId" | "instance">): string {
  return s.instance ? `${s.slotId}#${s.instance}` : s.slotId;
}

// ---------------------------------------------------------------------------
// Personalização
// ---------------------------------------------------------------------------

export type Operation =
  | { op: "remove_slot"; slot: string }
  | { op: "replace_phrase"; slot: string; variant?: string; value: string }
  | { op: "append_conclusion_item"; value: string };

export type Customization = {
  baseCatalogId: string;
  baseVersao: number;
  operations: Operation[];
};
