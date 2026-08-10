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
  ReportDoc,
  Segment,
  Slot,
  SlotContext,
  SlotVariant,
} from "./types";

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

  for (const o of ops) {
    if (o.op === "append_conclusion_item") {
      if (o.value.trim() === "") erros.push("item de conclusão vazio");
      else if (CABECALHO_RE.test(o.value)) erros.push("item de conclusão não pode conter cabeçalho de seção");
      continue;
    }

    const slot = byId.get(o.slot);
    if (!slot) {
      erros.push(`slot inexistente no modelo-base v${catalog.versao}: ${o.slot}`);
      continue;
    }

    if (o.op === "remove_slot") {
      if (slot.obrigatorio) erros.push(`slot obrigatório não pode ser removido: ${o.slot}`);
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
    slots,
    // Remoção vale tanto para slots soltos quanto para os repetidos por feto.
    ordem: (ctx) =>
      catalog
        .ordem(ctx)
        .map((item) =>
          typeof item === "string"
            ? item
            : { repetirPorFeto: item.repetirPorFeto.filter((id) => !removed.has(id)) },
        )
        .filter((item) => (typeof item === "string" ? !removed.has(item) : item.repetirPorFeto.length > 0)),
  };

  return {
    catalog: next,
    customSlots: new Set([...removed, ...replaced.map((r) => r.slot)]),
    extraConclusao: extras,
  };
}
