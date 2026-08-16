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
   * Esta é a variante PADRÃO do slot — a que a Biblioteca oferece para editar
   * quando o médico não escolhe uma.
   *
   * Normalmente é inferida ("a que não tem `quando`"). Precisa ser declarada
   * quando a frase de normalidade ganhou um predicado. Foi o que aconteceu com
   * a `placenta`: para não sair "Placenta de aspecto normal." seguida da
   * descrição do acretismo, a variante `normal` virou condicional — e com isso
   * o slot ficou SEM padrão. O efeito colateral: `replace_phrase` sem `variant`
   * caía em `variantes[0]` (inserção baixa, `personalizavel: false`) e o médico
   * levava um "descreve um estado clínico e não pode ser reescrito" ao tentar
   * personalizar a placenta NORMAL. E, se passasse, a troca não se aplicava.
   */
  padrao?: boolean;
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
   * Falso quando quem escreve esta frase é o MOTOR, e não há texto a editar.
   *
   * ⚠️ NÃO é "esta frase descreve patologia, então é proibido mexer". Essa
   * leitura estava errada e travava a Biblioteca inteira: um achado ficava
   * fechado, e o médico não podia dizer como o SEU laudo descreve um óbito ou
   * um acretismo. A proteção do sistema nunca foi proibir a edição — é o
   * conjunto de invariantes: slot que não pode sair (`removivel`), dado que
   * não pode ser descartado (`placeholdersObrigatorios`), frase que não pode
   * sumir (`obrigatorio`). Dentro disso, a redação é do médico.
   *
   * O que sobra aqui é o caso legítimo: variantes cuja frase depende de
   * montagem condicional (listas, partes opcionais, concordância) e que
   * portanto não existem como texto com lacunas. Ver a placenta descrita.
   */
  personalizavel?: boolean;
  /**
   * Dados do exame que a redação DESTA variante precisa conservar.
   *
   * Existe por variante, e não só por slot, porque variantes do mesmo slot
   * carregam dados diferentes: a ventriculomegalia tem a medida do átrio, o
   * cisto de plexo coroide tem medida E lateralidade, e o Dandy-Walker não tem
   * nenhum. Um invariante único no slot ou exigiria demais das que não têm
   * dado, ou de menos das que têm.
   */
  placeholdersObrigatorios?: string[];
  /**
   * Achado de EXEMPLO que faz esta variante valer — usado só para exibição.
   *
   * Sem isto, as variantes montadas pelo motor (justamente as patológicas)
   * aparecem na Biblioteca e no Lab **sem texto nenhum**: `frase` é undefined e
   * não há o que mostrar. O médico via "não editável" e o motivo, mas nunca a
   * frase que sairia no laudo dele.
   *
   * É mesclado sobre um achado-base da categoria e renderizado; o resultado
   * vira `corpoExemplo` / `conclusaoExemplo` em `describeCatalog`.
   */
  exemplo?: Record<string, unknown>;
};

export type Slot<F> = {
  id: string;
  /** Invariante de PRESENÇA: nenhuma personalização remove. */
  obrigatorio?: boolean;
  /**
   * Invariante de SOBREVIVÊNCIA do achado — separada de `obrigatorio`.
   *
   * BURACO (revisão Codex 16/08): `personalizavel: false` só impede
   * `replace_phrase`. NÃO impedia `remove_slot`. Um médico podia remover
   * `cranio_achado`, `placenta_achado` e `cordao_umbilical` e o laudo perdia
   * Dandy-Walker, acretismo, prévia e artéria umbilical única — conservando
   * "estruturas cranianas normais". A validação retornava zero erros.
   *
   * Isso viola a crítica C3 mais gravemente que o defeito que ela criou para
   * impedir: não é normalidade mascarando patologia, é patologia APAGADA.
   *
   * `obrigatorio` não serve aqui: estes slots são CONDICIONAIS — não aparecem
   * quando não há achado. O que não se pode é removê-los do modelo.
   */
  removivel?: boolean;
  /** Invariante de CONTEÚDO: placeholders que a frase precisa conservar. */
  placeholdersObrigatorios?: string[];
  /**
   * Invariante de CONTEÚDO no modelo DERIVADO: quantas lacunas `____` a frase
   * precisa conservar.
   *
   * O catálogo escrito à mão marca o dado com `{dbp}` — nome e tudo. O modelo
   * derivado do renderer não tem esse nome: o que ele vê é a lacuna que o
   * próprio renderer imprime quando o valor não foi ditado. São dois jeitos de
   * dizer a mesma coisa ("aqui entra um dado do exame, e a sua redação não
   * pode descartá-lo"), e o motor precisa entender os dois — senão a validação
   * do derivado procura `{dado}` numa frase que nunca teve chaves.
   */
  lacunasObrigatorias?: number;
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
  /**
   * Como cada placeholder se chama PARA O MÉDICO.
   *
   * Sem isto a tela mostra o nome da variável, e o nome da variável é de
   * programador: `{apresentacao}{dorso_sufixo}{polo_sufixo}` virava
   * "apresentacaodorso sufixopolo sufixo" na frente do médico — três chips
   * colados, sem acento, com o `_` trocado por espaço. Ilegível.
   */
  rotulosVariaveis?: Readonly<Record<string, string>>;
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
  /**
   * Como marcar, na CONCLUSÃO, a instância a que o item pertence.
   *
   * No corpo a atribuição é estrutural — há um cabeçalho "Feto B:" antes do
   * bloco. A conclusão não tem isso: os itens são reordenados e agrupados, e
   * "Óbito fetal." saía sem dono num laudo com dois fetos. O `instance` estava
   * no segmento desde sempre; era a serialização que o descartava.
   *
   * Fica no catálogo, e não no motor, porque a redação da marca é da categoria
   * ("(feto B)" aqui; "(à direita)" numa categoria bilateral). Ausente, a
   * serialização ignora `instance` — o comportamento anterior.
   */
  atribuirConclusao?: (texto: string, instance: string) => string;
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
  | { op: "append_conclusion_item"; value: string }
  /**
   * Acrescenta uma frase nova ao corpo, logo depois de um slot existente.
   * O slot criado recebe id `custom:<n>` e nasce opcional — nunca obrigatório,
   * porque invariante clínica é decisão do catálogo-base, não do usuário.
   */
  | { op: "insert_phrase_after"; anchor: string; value: string };

export type Customization = {
  baseCatalogId: string;
  baseVersao: number;
  operations: Operation[];
};
