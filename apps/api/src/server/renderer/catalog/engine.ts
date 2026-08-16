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

  const emit = (id: string, fetoIndex: number, instance?: string) => {
    const slot = byId.get(id);
    if (!slot) return;
    const ctx: SlotContext<F> = { findings, fetoIndex, gemelar, flags };
    if (slot.incluirSe && !slot.incluirSe(ctx)) return;
    const variant = pickVariant(slot, ctx);
    if (!variant) return;
    const vars = varsFor(ctx);
    const text = textOf(variant, ctx, vars);

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
      for (const id of item.repetirPorFeto) emit(id, i, gemelar ? inst : undefined);
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
  const concl = doc.segments.filter((s) => s.kind === "conclusao").map((s) => s.text);
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

  for (const o of ops) {
    if (o.op === "append_conclusion_item") {
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
      : slot.variantes.find((v) => !v.quando) ?? slot.variantes[0];
    if (!alvo) {
      erros.push(`variante inexistente em "${o.slot}": ${o.variant}`);
      continue;
    }
    if (alvo.personalizavel === false) {
      erros.push(`"${o.slot}" descreve um estado clínico e não pode ser reescrito`);
      continue;
    }
    if (alvo.montar) {
      erros.push(`"${o.slot}" é montado pelo motor e não pode ser reescrito`);
      continue;
    }
    if (o.value.trim() === "") {
      erros.push(`frase vazia esvazia o slot na prática: ${o.slot}`);
      continue;
    }
    for (const ph of slot.placeholdersObrigatorios ?? []) {
      if (!o.value.includes(`{${ph}}`)) {
        erros.push(`a frase de "${o.slot}" precisa conservar o dado {${ph}}`);
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

/** Aplica operações JÁ VALIDADAS sobre o catálogo-base, sem mutá-lo. */
export function applyCustomization<F>(
  catalog: Catalog<F>,
  custom: Customization,
): AppliedCustomization<F> {
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
    return {
      ...s,
      variantes: s.variantes.map((v) => {
        const hit = mine.find((r) => (r.variant ? r.variant === v.id : !v.quando));
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
