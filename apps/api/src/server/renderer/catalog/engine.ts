/**
 * Motor do catálogo — constrói o documento estruturado e o serializa.
 *
 * A string do laudo só existe no último passo (`serialize`). Tudo antes disso
 * é `ReportDoc`, com cada trecho carregando seu `slotId`/`instance`/`origin` —
 * é isso que permite guards por slot e rastreabilidade no Lab.
 *
 * Ver docs/projeto-modelos/04-revisao-codex.md (críticas C1, C2, C3, C12).
 */
import type {
  Catalog,
  Customization,
  Operation,
  OrderItem,
  ReportDoc,
  Segment,
  Slot,
  SlotContext,
  SlotVariant,
} from "./types";

/**
 * A categoria usa o catálogo? Lê a CSV de MODEL_CATALOG_CATEGORIES.
 * Fail-closed: vazio, espaços ou entradas soltas nunca ligam por acidente.
 */
export function catalogEnabledFor(csv: string, categoria: string): boolean {
  if (categoria === "") return false;
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .includes(categoria);
}

/**
 * O usuário está na allowlist da personalização?
 *
 * Fail-closed pelo mesmo motivo de `catalogEnabledFor`: lista vazia é NINGUÉM,
 * nunca "todo mundo". Uma função que muda o texto do laudo não pode ligar por
 * acidente de configuração.
 */
export function usuarioLiberado(csv: string, userId: string): boolean {
  if (userId === "") return false;
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .includes(userId);
}

// ---------------------------------------------------------------------------
// Interpolação — estrita (crítica C12: na v1 placeholder desconhecido vazava)
// ---------------------------------------------------------------------------

export function placeholdersOf(frase: string): string[] {
  return [...frase.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string);
}

export function interpolate(frase: string, vars: Record<string, string>): string {
  return frase.replace(/\{(\w+)\}/g, (_m, k: string) => {
    const v = vars[k];
    if (v === undefined) throw new Error(`placeholder desconhecido no catálogo: {${k}}`);
    return v;
  });
}

// ---------------------------------------------------------------------------
// Construção do documento
// ---------------------------------------------------------------------------

function pickVariant<F>(slot: Slot<F>, ctx: SlotContext<F>): SlotVariant<F> | undefined {
  return slot.variantes.find((v) => v.quando?.(ctx)) ?? slot.variantes.find((v) => !v.quando);
}

/**
 * A variante que a personalização edita quando não especifica qual.
 *
 * É a mesma regra em três lugares — validação, aplicação e projeção para a
 * Biblioteca — e por isso vive aqui. Divergir entre eles é o defeito que
 * aceitava uma operação na validação e depois não a aplicava.
 */
export function variantePadrao<F>(slot: Slot<F>): SlotVariant<F> | undefined {
  return slot.variantes.find((v) => v.padrao) ?? slot.variantes.find((v) => !v.quando);
}

function textOf<F>(v: SlotVariant<F>, ctx: SlotContext<F>, vars: Record<string, string>): string {
  if (v.montar) return v.montar(ctx, vars);
  if (v.frase !== undefined) return interpolate(v.frase, vars);
  return "";
}

function conclusaoOf<F>(
  v: SlotVariant<F>,
  ctx: SlotContext<F>,
  vars: Record<string, string>,
): string | null {
  if (v.montarConclusao) return v.montarConclusao(ctx, vars);
  if (v.conclusao !== undefined) return interpolate(v.conclusao, vars);
  return null;
}

export type BuildArgs<F> = {
  catalog: Catalog<F>;
  findings: F;
  /** Variáveis por índice de feto — o motor da categoria produz. */
  varsFor: (ctx: SlotContext<F>) => Record<string, string>;
  gemelar: boolean;
  instancias: string[];
  flags: SlotContext<F>["flags"];
  titulo?: string;
  preLinhas?: string[];
  /** Slots cujo texto veio de personalização (para marcar origin). */
  customSlots?: Set<string>;
  /** Itens extras de conclusão (personalização / camada flexível). */
  /**
   * Texto livre que entra no FIM DO CORPO — as observações livres do médico
   * (camada flexível). Simétrico de `extraConclusao`. Sem isto, o catálogo
   * simplesmente PERDIA o que o médico ditou fora dos slots, enquanto o
   * renderer o preservava (categories/OBSTETRICA.ts:738). Achado da revisão
   * do Codex no port de 11/08.
   */
  extraCorpo?: string[];
  extraConclusao?: string[];
};

export function buildDoc<F>(args: BuildArgs<F>): ReportDoc {
  const { catalog, findings, varsFor, gemelar, instancias, flags } = args;
  const custom = args.customSlots ?? new Set<string>();
  const byId = new Map(catalog.slots.map((s) => [s.id, s]));
  const base: SlotContext<F> = { findings, fetoIndex: 0, gemelar, flags };
  const segments: Segment[] = [];

  const emit = (id: string, fetoIndex: number, instance?: string, dentroDoGrupo = false) => {
    const slot = byId.get(id);
    if (!slot) return;
    const ctx: SlotContext<F> = { findings, fetoIndex, gemelar, flags };
    if (slot.incluirSe && !slot.incluirSe(ctx)) return;
    const variant = pickVariant(slot, ctx);
    if (!variant) return;
    const vars = varsFor(ctx);
    let text = textOf(variant, ctx, vars);

    /**
     * Dentro de um bloco repetido por instância, só a PRIMEIRA linha abre
     * parágrafo — quem separa os blocos é o cabeçalho ("Feto B:").
     *
     * O "\n" inicial de uma frase é a marcação de parágrafo do catálogo, e ela
     * é escrita pensando no feto único, onde o slot está entre outros blocos.
     * O MESMO slot reaparece dentro do bloco do feto no gemelar — e ali a
     * quebra rasgava o bloco ao meio: "Feto B:" ficava sozinho, com uma linha
     * em branco antes da ausência de BCF e outra antes do cordão. Isto é
     * posição, não conteúdo, e por isso é decisão do motor.
     */
    if (dentroDoGrupo && text.startsWith("\n")) text = text.replace(/^\n+/, "");

    // Crítica C3: variante de estado clínico alterado é escrita pelo motor;
    // a personalização do usuário não se aplica a ela.
    const editavel = variant.personalizavel !== false;
    const origin: Segment["origin"] = !editavel ? "computed" : custom.has(id) ? "custom" : "base";

    if (text !== "") {
      segments.push({
        slotId: id,
        variantId: variant.id,
        ...(instance ? { instance } : {}),
        kind: "corpo",
        text,
        origin,
      });
    }

    const concl = conclusaoOf(variant, ctx, vars);
    if (concl) {
      segments.push({
        slotId: id,
        variantId: variant.id,
        ...(instance ? { instance } : {}),
        kind: "conclusao",
        text: concl,
        origin: editavel ? origin : "computed",
      });
    }
  };

  for (const item of catalog.ordem(base)) {
    if (typeof item === "string") {
      emit(item, 0);
      continue;
    }
    // Agrupamento por feto: (slots do feto A), (slots do feto B), …
    instancias.forEach((inst, i) => {
      // "Primeiro do grupo" é o primeiro EMITIDO NO CORPO, não o primeiro da
      // lista: os slots do bloco são condicionais e o cabeçalho pode ter sido
      // removido por personalização.
      const corpoAntes = () => segments.filter((s) => s.kind === "corpo").length;
      const inicio = corpoAntes();
      for (const id of item.repetirPorFeto) {
        emit(id, i, gemelar ? inst : undefined, corpoAntes() > inicio);
      }
    });
  }

  // A conclusão tem ordem própria (ver Catalog.ordemConclusao).
  const ordemConcl = catalog.ordemConclusao?.(base);
  if (ordemConcl) {
    const rank = (id: string) => {
      const i = ordemConcl.indexOf(id);
      return i === -1 ? ordemConcl.length : i;
    };
    const corpo = segments.filter((s) => s.kind === "corpo");
    const concl = segments
      .filter((s) => s.kind === "conclusao")
      .sort((a, b) => rank(a.slotId) - rank(b.slotId));
    segments.length = 0;
    segments.push(...corpo, ...concl);
  }

  // No fim do corpo, antes da conclusão — a mesma posição do renderer.
  for (const extra of args.extraCorpo ?? []) {
    // `findLastIndex` exigiria lib es2023; o alvo do projeto é menor.
    let i = -1;
    for (let k = segments.length - 1; k >= 0; k--) {
      if (segments[k]!.kind === "corpo") { i = k; break; }
    }
    segments.splice(i + 1, 0, {
      slotId: "corpo_extra",
      variantId: "custom",
      kind: "corpo",
      text: extra,
      origin: "custom",
    });
  }

  for (const extra of args.extraConclusao ?? []) {
    segments.push({
      slotId: "conclusao_extra",
      variantId: "custom",
      kind: "conclusao",
      text: extra,
      origin: "custom",
    });
  }

  return {
    catalogId: catalog.id,
    catalogVersao: catalog.versao,
    titulo: args.titulo ?? catalog.titulo(base),
    preLinhas: args.preLinhas ?? [],
    segments,
  };
}

// ---------------------------------------------------------------------------
// Serialização — ÚLTIMO passo
// ---------------------------------------------------------------------------

export function serialize<F>(doc: ReportDoc, catalog: Catalog<F>): string {
  const corpo = doc.segments.filter((s) => s.kind === "corpo").map((s) => s.text);
  // O item de conclusão de um slot repetido por instância (feto A/B) precisa
  // dizer de quem ele é: no corpo o cabeçalho "Feto B:" resolve, na conclusão
  // não existe cabeçalho nenhum. Ver Catalog.atribuirConclusao.
  const concl = doc.segments
    .filter((s) => s.kind === "conclusao")
    .map((s) => (s.instance && catalog.atribuirConclusao ? catalog.atribuirConclusao(s.text, s.instance) : s.text));
  const conclTxt = concl.map((it, i) => `${catalog.numerarConclusao(i, concl.length)}${it}`).join("\n");

  const partes: string[] = [doc.titulo, ...doc.preLinhas];
  if (catalog.cabecalhos.tecnica) partes.push("", catalog.cabecalhos.tecnica);
  if (catalog.preambulo) partes.push("", catalog.preambulo);
  partes.push("", catalog.cabecalhos.corpo, corpo.join("\n"), "", catalog.cabecalhos.conclusao, conclTxt);

  return partes.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// Personalização: validação e aplicação
// ---------------------------------------------------------------------------

/**
 * Por que ESTA variante não pode ser reescrita — ou `undefined` se pode.
 *
 * Uma função só, consumida pela validação (o que o servidor aceita) e pela
 * projeção (o que a tela oferece). Enquanto as duas regras eram escritas
 * separadamente, a tela ofereceu um botão que o servidor recusava — e, pior,
 * aceitou uma reescrita que a tela não sabia mostrar.
 */
export function motivoNaoReescrevivel(
  slot: { variantes: { id: string }[]; removivel?: boolean },
  v: SlotVariant<never> | { id: string; montar?: unknown; personalizavel?: boolean; termosObrigatorios?: string[][] },
  padrao: { id: string } | undefined,
): string | undefined {
  if ((v as { personalizavel?: boolean }).personalizavel === false) {
    return "Descreve um achado alterado. O texto é escrito pelo sistema a partir do que foi ditado, para que uma personalização de normalidade nunca oculte uma patologia.";
  }
  if ((v as { montar?: unknown }).montar) {
    return "É montado pelo sistema a partir dos dados do exame (listas, cálculos ou concordância), e não a partir de uma frase fixa.";
  }
  /**
   * VARIANTE DE ACHADO SEM TERMO OBRIGATÓRIO — trava do piloto (Codex, 19/08).
   *
   * `exemplo` é o que faz a variante aparecer na lista de ACHADOS da
   * Biblioteca: ela é a frase de uma patologia. Reescrevê-la sem que o catálogo
   * diga QUAL palavra tem de sobreviver deixa passar "corpo normal, conclusão
   * patológica" — o pior laudo possível, porque parece revisado.
   *
   * Não basta ser não-padrão: `bcf/inicial`, `feto/inicial_feto` e o bolsão
   * vertical também são variantes condicionais, e são NORMAIS — travá-las
   * tiraria da Biblioteca frases que o médico legitimamente quer reescrever.
   *
   * `termosObrigatorios` é o jeito de liberar uma por vez, com a garantia
   * escrita ao lado da frase. `padrao` fica no argumento porque a regra já
   * precisou dele e volta a precisar quando a liberação for por slot.
   */
  void padrao;
  const ehAchado = (v as { exemplo?: unknown }).exemplo !== undefined;
  if (ehAchado && !((v as { termosObrigatorios?: string[][] }).termosObrigatorios?.length)) {
    return "Descreve um achado e ainda não está liberada para reescrita — a frase precisa declarar qual termo do diagnóstico tem de sobreviver.";
  }
  return undefined;
}

/**
 * A frase INVERTE o diagnóstico? "sem ventriculomegalia" conserva a palavra e
 * nega o achado (achado do Codex, 19/08).
 *
 * Só pega a negação imediatamente antes do termo — não é análise semântica, e
 * não pretende ser. É a diferença entre a fraude óbvia e nenhuma trava.
 */
const NEGACAO = /(?:sem|não|nao|ausência de|ausencia de|nenhum[ao]?|exclui|descarta|afasta|livre de|isent[ao] de)\s+(?:sinais\s+de\s+|evidência\s+de\s+|evidencia\s+de\s+)?$/i;

export function negaOTermo(frase: string, termo: string): boolean {
  const t = termo.toLowerCase();
  const f = frase.toLowerCase();
  let i = f.indexOf(t);
  let achouAfirmado = false;
  while (i !== -1) {
    // 40 caracteres é o bastante para "sem evidência de " e sobra.
    if (!NEGACAO.test(f.slice(Math.max(0, i - 40), i))) achouAfirmado = true;
    i = f.indexOf(t, i + t.length);
  }
  return !achouAfirmado;
}

const CABECALHO_RE = /^\s*(CONCLUS[ÃA]O|IMPRESS[ÃA]O|ACHADOS|T[ÉE]CNICA|COMENT[ÁA]RIOS|OS SEGUINTES ASPECTOS)/im;

export function validateOperations<F>(catalog: Catalog<F>, ops: Operation[]): string[] {
  const byId = new Map(catalog.slots.map((s) => [s.id, s]));
  const erros: string[] = [];

  const textoLivre = (rotulo: string, value: string) => {
    if (value.trim() === "") erros.push(`${rotulo} vazio`);
    if (CABECALHO_RE.test(value)) erros.push(`${rotulo} não pode conter cabeçalho de seção`);
    for (const ph of placeholdersOf(value)) {
      if (!catalog.variaveis.includes(ph)) erros.push(`placeholder desconhecido em ${rotulo}: {${ph}}`);
    }
  };

  /**
   * Os slots que ESTE conjunto remove. `insert_phrase_after` é validado contra
   * o catálogo-base, onde a âncora ainda existe — mas na aplicação a remoção
   * roda primeiro, a âncora some da ordem, e a frase nova nunca é inserida
   * (achado do Codex, 19/08).
   *
   * Precisa ser um pré-cálculo: o médico pode listar as operações em qualquer
   * ordem, e a de remoção pode vir depois da de inserção.
   */
  const removidos = new Set(ops.filter((o) => o.op === "remove_slot").map((o) => o.slot));

  /**
   * O catálogo DERIVADO não sabe acrescentar item ao fim da conclusão.
   *
   * Ele não monta o laudo slot a slot: troca linhas de um laudo pronto. Para
   * acrescentar ao fim da conclusão seria preciso saber onde ela termina e com
   * que número o item entra — e numerar é do renderer.
   *
   * A recusa vem AQUI, quando o médico salva, e não lá na geração: até agora o
   * rascunho salvava, a publicação dava certo, e o laudo saía no padrão com a
   * mensagem errada, dizendo que o modelo tinha mudado.
   */
  const derivado = catalog.derivado === true;

  for (const o of ops) {
    if (o.op === "append_conclusion_item") {
      if (derivado) {
        erros.push(
          "esta categoria ainda não aceita item novo na conclusão — " +
            "acrescente a frase depois de uma linha existente",
        );
        continue;
      }
      textoLivre("item de conclusão", o.value);
      // Frase ACRESCENTADA é texto fixo: entra no documento sem passar pela
      // interpolação (é empilhada como segmento pronto). Aceitar {placeholder}
      // aqui faria o laudo sair com a chave crua — "controle com {bcf}." Para
      // usar um dado do exame, o caminho é reescrever um slot que já o tem.
      if (placeholdersOf(o.value).length > 0) {
        erros.push(
          "um item acrescentado à conclusão não pode conter dados entre chaves; " +
            "para usar um dado do exame, reescreva a frase que já o contém",
        );
      }
      continue;
    }

    if (o.op === "insert_phrase_after") {
      if (!byId.has(o.anchor)) {
        erros.push(`a frase seria inserida depois de "${o.anchor}", que não existe no modelo-base v${catalog.versao}`);
        continue;
      }
      if (removidos.has(o.anchor)) {
        erros.push(
          `a frase seria inserida depois de "${o.anchor}", que estas mesmas alterações removem — ` +
            "ela não apareceria em laudo nenhum; escolha outra frase como âncora",
        );
        continue;
      }
      // Aqui os dados do exame VALEM: a frase vira um slot `custom:n` e passa
      // pela mesma interpolação dos demais. Diferente do item de conclusão,
      // que é empilhado como texto pronto.
      textoLivre("frase acrescentada", o.value);
      continue;
    }

    const slot = byId.get(o.slot);
    if (!slot) {
      erros.push(`slot inexistente no modelo-base v${catalog.versao}: ${o.slot}`);
      continue;
    }

    if (o.op === "remove_slot") {
      if (slot.obrigatorio) erros.push(`slot obrigatório não pode ser removido: ${o.slot}`);
      // Segunda trava, independente de `obrigatorio`: slot que carrega achado
      // patológico não pode sumir do modelo. Ver Slot.removivel.
      else if (slot.removivel === false) {
        erros.push(
          `"${o.slot}" descreve achados alterados e não pode ser removido do modelo — ` +
            `ele só aparece quando o achado é ditado`,
        );
      }
      continue;
    }

    // replace_phrase
    const alvo = o.variant
      ? slot.variantes.find((v) => v.id === o.variant)
      : variantePadrao(slot) ?? slot.variantes[0];
    if (!alvo) {
      erros.push(`variante inexistente em "${o.slot}": ${o.variant}`);
      continue;
    }
    const naoReescrevivel = motivoNaoReescrevivel(slot, alvo, variantePadrao(slot));
    if (naoReescrevivel) {
      erros.push(`"${o.slot}": ${naoReescrevivel}`);
      continue;
    }
    if (o.value.trim() === "") {
      erros.push(`frase vazia esvazia o slot na prática: ${o.slot}`);
      continue;
    }
    // Os dados obrigatórios do SLOT valem para todas as variantes; os da
    // VARIANTE, só para ela — ver SlotVariant.placeholdersObrigatorios.
    for (const ph of [...(slot.placeholdersObrigatorios ?? []), ...(alvo.placeholdersObrigatorios ?? [])]) {
      if (!o.value.includes(`{${ph}}`)) {
        erros.push(`a frase de "${o.slot}" precisa conservar o dado {${ph}}`);
      }
    }
    /**
     * O DIAGNÓSTICO precisa sobreviver à reescrita, não só o dado.
     *
     * Sem isto, "Ventriculomegalia, com átrio medindo {cranio_medida} mm" podia
     * virar "Ventrículos sem dilatação, medindo {cranio_medida} mm": o
     * placeholder sobrevive e o achado some.
     */
    for (const alternativas of alvo.termosObrigatorios ?? []) {
      const conserva = alternativas.some((termo) =>
        o.value.toLowerCase().includes(termo.toLowerCase()),
      );
      if (!conserva) {
        erros.push(
          `a sua frase precisa continuar dizendo o achado — use "${alternativas[0]}"` +
            (alternativas.length > 1 ? ` (ou ${alternativas.slice(1).map((a) => `"${a}"`).join(", ")})` : ""),
        );
      } else if (alternativas.every((termo) => negaOTermo(o.value, termo))) {
        // Conservou a palavra e NEGOU o achado: "sem ventriculomegalia".
        erros.push(
          `a sua frase nega o achado que ela deveria descrever — "${alternativas[0]}" aparece negado`,
        );
      }
    }

    // Modelo derivado: o dado é a lacuna do renderer, não um `{nome}`.
    if (slot.lacunasObrigatorias !== undefined) {
      const tem = (o.value.match(/_{2,}/g) ?? []).length;
      if (tem < slot.lacunasObrigatorias) {
        erros.push(
          slot.lacunasObrigatorias === 1
            ? "a sua frase precisa conservar o dado do exame — deixe ____ onde ele entra"
            : `a sua frase precisa conservar os ${slot.lacunasObrigatorias} dados do exame — deixe ____ onde cada um entra`,
        );
      } else if (tem > slot.lacunasObrigatorias) {
        erros.push(
          `a frase original tem ${slot.lacunasObrigatorias} dado(s) do exame e a sua tem ${tem} lacuna(s); ` +
            "as que sobram sairiam como ____ no laudo",
        );
      }
    }
    for (const ph of placeholdersOf(o.value)) {
      if (!catalog.variaveis.includes(ph)) {
        erros.push(`placeholder desconhecido em "${o.slot}": {${ph}}`);
      }
    }
    if (CABECALHO_RE.test(o.value)) {
      erros.push(`a frase de "${o.slot}" não pode conter cabeçalho de seção`);
    }
  }

  return erros;
}

export type AppliedCustomization<F> = {
  catalog: Catalog<F>;
  customSlots: Set<string>;
  extraConclusao: string[];
};

/**
 * Aplica operações JÁ VALIDADAS sobre o catálogo-base, sem mutá-lo.
 *
 * Lança se a personalização foi escrita contra OUTRO catálogo-base. O par
 * (`baseCatalogId`, `baseVersao`) estava sendo recebido e ignorado: uma
 * personalização gravada na v1 era aplicada em silêncio sobre a v2, e
 * `validateOperations` não pega isso — ela só sabe dizer se o slot ainda
 * existe, não se ele ainda QUER DIZER a mesma coisa. Slot que troca de sentido
 * conservando o id é justamente o caso perigoso.
 *
 * Quem edita passa o catálogo atual e nunca vê este erro. Quem lê do banco
 * (customization/resolve.ts) precisa checar antes e cair no modelo-base.
 */
export function applyCustomization<F>(
  catalog: Catalog<F>,
  custom: Customization,
): AppliedCustomization<F> {
  if (custom.baseCatalogId !== catalog.id || custom.baseVersao !== catalog.versao) {
    throw new Error(
      `personalização escrita contra ${custom.baseCatalogId} v${custom.baseVersao}, ` +
        `aplicada sobre ${catalog.id} v${catalog.versao}`,
    );
  }
  const removed = new Set(
    custom.operations.filter((o): o is Extract<Operation, { op: "remove_slot" }> => o.op === "remove_slot").map((o) => o.slot),
  );
  const replaced = custom.operations.filter(
    (o): o is Extract<Operation, { op: "replace_phrase" }> => o.op === "replace_phrase",
  );
  const extras = custom.operations
    .filter((o): o is Extract<Operation, { op: "append_conclusion_item" }> => o.op === "append_conclusion_item")
    .map((o) => o.value);

  // Frases acrescentadas pelo usuário viram slots sintéticos `custom:<n>`.
  // Nascem SEM `obrigatorio`: invariante clínica é decisão do catálogo-base.
  const inseridas = custom.operations.filter(
    (o): o is Extract<Operation, { op: "insert_phrase_after" }> => o.op === "insert_phrase_after",
  );
  const novosSlots: Slot<F>[] = inseridas.map((o, i) => ({
    id: `custom:${i + 1}`,
    variantes: [{ id: "custom", frase: o.value }],
  }));

  const slots = catalog.slots.map((s) => {
    const mine = replaced.filter((r) => r.slot === s.id);
    if (mine.length === 0) return s;
    // MESMA regra de `validateOperations` — ver `variantePadrao`. Quando as duas
    // divergiam, a operação passava na validação e não chegava a ser aplicada.
    const padrao = variantePadrao(s);
    return {
      ...s,
      variantes: s.variantes.map((v) => {
        const hit = mine.find((r) => (r.variant ? r.variant === v.id : v === padrao));
        return hit ? { ...v, frase: hit.value } : v;
      }),
    };
  });

  const next: Catalog<F> = {
    ...catalog,
    slots: [...slots, ...novosSlots],
    ordem: (ctx) => {
      // Remoção vale tanto para slots soltos quanto para os repetidos por feto.
      const base = catalog
        .ordem(ctx)
        .map((item) =>
          typeof item === "string"
            ? item
            : { repetirPorFeto: item.repetirPorFeto.filter((id) => !removed.has(id)) },
        )
        .filter((item) => (typeof item === "string" ? !removed.has(item) : item.repetirPorFeto.length > 0));

      // Insere cada frase nova logo depois da sua âncora. Se a âncora não estiver
      // nesta ordem (ex.: slot que só existe no gemelar), a frase não entra —
      // acompanha o contexto em vez de aparecer fora de lugar.
      const out: OrderItem[] = [];
      for (const item of base) {
        if (typeof item === "string") {
          out.push(item);
          for (const [i, ins] of inseridas.entries()) {
            if (ins.anchor === item) out.push(`custom:${i + 1}`);
          }
          continue;
        }
        // Bloco repetido por feto: a frase nova entra DENTRO do grupo, logo
        // após a sua âncora — e portanto se repete por feto, como o slot que
        // ela acompanha. Ancorar só no último slot do grupo (era o caso)
        // fazia a frase sumir no gemelar sempre que a âncora fosse outra.
        const expandido: string[] = [];
        for (const id of item.repetirPorFeto) {
          expandido.push(id);
          for (const [i, ins] of inseridas.entries()) {
            if (ins.anchor === id) expandido.push(`custom:${i + 1}`);
          }
        }
        out.push({ repetirPorFeto: expandido });
      }
      return out;
    },
  };

  return {
    catalog: next,
    customSlots: new Set([
      ...removed,
      ...replaced.map((r) => r.slot),
      ...novosSlots.map((s) => s.id),
    ]),
    extraConclusao: extras,
  };
}

// ---------------------------------------------------------------------------
// Diff estruturado — o que MUDOU, e só isso
// ---------------------------------------------------------------------------

export type Mudanca = {
  secao: "corpo" | "conclusao";
  tipo: "alterada" | "removida" | "acrescentada";
  slot: string;
  instance?: string;
  antes?: string;
  depois?: string;
};

/**
 * Compara dois documentos por CHAVE DE SEGMENTO, não por texto.
 *
 * Diff textual não sabe distinguir "esta frase foi reescrita" de "esta frase
 * saiu e outra entrou". Como cada segmento carrega o seu slot, aqui a diferença
 * é exata — e é isso que permite mostrar a alteração no ponto, em vez de dois
 * laudos inteiros lado a lado.
 */
export function diffDocs(base: ReportDoc, custom: ReportDoc): Mudanca[] {
  const chave = (s: Segment) => `${s.kind}|${s.slotId}|${s.instance ?? ""}`;
  const mapaBase = new Map(base.segments.map((s) => [chave(s), s]));
  const mapaCustom = new Map(custom.segments.map((s) => [chave(s), s]));
  const mudancas: Mudanca[] = [];

  for (const [k, s] of mapaBase) {
    const alvo = mapaCustom.get(k);
    if (!alvo) {
      mudancas.push({
        secao: s.kind, tipo: "removida", slot: s.slotId,
        ...(s.instance ? { instance: s.instance } : {}), antes: s.text,
      });
    } else if (alvo.text !== s.text) {
      mudancas.push({
        secao: s.kind, tipo: "alterada", slot: s.slotId,
        ...(s.instance ? { instance: s.instance } : {}), antes: s.text, depois: alvo.text,
      });
    }
  }

  for (const [k, s] of mapaCustom) {
    if (!mapaBase.has(k)) {
      mudancas.push({
        secao: s.kind, tipo: "acrescentada", slot: s.slotId,
        ...(s.instance ? { instance: s.instance } : {}), depois: s.text,
      });
    }
  }

  // Corpo antes da conclusão, na ordem em que aparecem no laudo.
  const posicao = (m: Mudanca) => {
    const lista = m.tipo === "removida" ? base.segments : custom.segments;
    return lista.findIndex((s) => s.slotId === m.slot && s.kind === m.secao);
  };
  return mudancas.sort(
    (a, b) => (a.secao === b.secao ? posicao(a) - posicao(b) : a.secao === "corpo" ? -1 : 1),
  );
}
