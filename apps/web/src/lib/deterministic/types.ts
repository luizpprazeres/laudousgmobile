/**
 * Motor de geração determinística (Modo Auxiliar Web) — tipos base.
 *
 * Princípio (feedback_deterministic_pegada): o que é conhecido por clique da UI
 * NÃO passa pela IA. A auxiliar seleciona Estado/Conteúdo/Paredes de cada órgão
 * e o compositor monta a frase de laudo em código — rápido, barato, nunca alucina.
 *
 * Cada órgão é um módulo (OrganModule) com:
 *   - schema: declaração dos campos pra UI renderizar (segmented, checklist, sub-campos)
 *   - compose(state): seleções → { body, conclusion } em texto clínico canônico
 *
 * O storage é o texto canônico do laudo: "\n\n" separa seções, "\n" simples = quebra
 * interna. Mesma convenção do ReportEditor/ReportRenderer (ver globals.css §Editor).
 */

/** Tipos de campo que a UI sabe renderizar.
 *  - 'volume': input direto do valor + 3 medidas opcionais com botão "calcular"
 *    (elipsoide: D1×D2×D3×factor). O valor calculado é gravado em state[key]. */
export type FieldKind = 'segmented' | 'checklist' | 'text' | 'mini-segmented' | 'volume'

/** Uma opção dentro de um campo segmented/checklist. */
export interface FieldOption {
  /** Valor canônico (estável, usado no estado e na composição). */
  value: string
  /** Rótulo exibido na UI. */
  label: string
  /** Marca a opção pré-selecionada (default agressivo: "normal/ausente"). */
  isDefault?: boolean
  /** Sub-campos que aparecem quando esta opção é marcada (ex.: colelitíase → quantidade). */
  subFields?: Field[]
}

/** Declaração de um campo do órgão. */
export interface Field {
  /** Chave estável no estado do órgão. */
  key: string
  /** Rótulo curto (UPPERCASE mono na UI). */
  label: string
  kind: FieldKind
  /** Texto auxiliar à direita do label (ex.: "default: normal", "marque se houver"). */
  hint?: string
  /** Opções (para segmented/checklist/mini-segmented). */
  options?: FieldOption[]
  /** Placeholder/unidade para campos de texto (ex.: "8 mm"). */
  placeholder?: string
  /** Fator do elipsoide para kind 'volume' (default 0,523). */
  factor?: number
  /** Unidade exibida no campo 'volume' (ex.: 'mL', 'cm³'). */
  unit?: string
}

/** Schema declarativo de um órgão — a UI renderiza a partir disto. */
export interface OrganSchema {
  /** Id estável do órgão (ex.: 'vesicula'). */
  id: string
  /** Nome exibido (ex.: 'Vesícula'). */
  name: string
  /** Categoria de exame à qual pertence (ex.: 'ABDOMEN_TOTAL'). */
  category: string
  /** Campos comuns (sempre visíveis). */
  fields: Field[]
  /** Achados raros colapsados sob "+ Achados raros" (cada um vira checklist simples). */
  rareFindings?: FieldOption[]
}

/**
 * Estado de preenchimento de um órgão.
 * - segmented/text/mini-segmented: string (valor único).
 * - checklist: string[] (valores marcados).
 * - sub-campos: aninhados sob a chave do campo pai → `${parentKey}.${optionValue}.${subKey}`.
 */
export type OrganState = Record<string, string | string[]>

/** Resultado da composição de um órgão. */
export interface OrganComposition {
  /** Frase(s) descritivas pro corpo do laudo (seção ANÁLISE). */
  body: string
  /** Itens pra CONCLUSÃO (vazio quando normal). */
  conclusion: string[]
  /** True quando o órgão está 100% nos defaults (nenhuma alteração). */
  isNormal: boolean
}

/** Módulo completo de um órgão: schema + lógica de composição. */
export interface OrganModule {
  schema: OrganSchema
  /** Estado inicial (defaults aplicados). */
  initialState: () => OrganState
  /** Compõe a frase de laudo a partir do estado.
   *  `opts` = estado dos controles de categoria (ex.: via, menopausa) — opcional. */
  compose: (state: OrganState, opts?: OrganState) => OrganComposition
}
