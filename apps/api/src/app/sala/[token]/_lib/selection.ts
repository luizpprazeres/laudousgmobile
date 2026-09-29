/**
 * Política de seleção da Sala (pura, sem React).
 *
 * Regra única: a seleção só muda por ação da auxiliar. Exceção: não há nada
 * selecionado (primeira carga, dia vazio, laudo ocultado) — aí o mais recente
 * por criação é escolhido, porque não há o que "roubar".
 */
export type FeedEntry = {
  id: string;
  createdAt: string;
  contentRevision?: number | null;
};

export type SelectionState = {
  initialized: boolean;
  selectedId: string | null;
  /** id → última revisão vista (null quando o backend ainda não manda). */
  known: Record<string, number | null>;
  /** Chegaram depois da primeira carga e ainda não foram abertos. */
  fresh: string[];
  /** Mudaram de revisão desde que foram vistos e ainda não foram abertos. */
  changed: string[];
  /** Laudo novo mais recente, para o aviso; null depois de aberto/dispensado. */
  arrivalId: string | null;
};

export type SelectionEvent =
  | { type: "feed"; entries: FeedEntry[] }
  | { type: "select"; id: string }
  | { type: "step"; delta: 1 | -1; entries: FeedEntry[] }
  | { type: "clear" }
  | { type: "dismissArrival" }
  /** Outro código/sessão: nada da sessão anterior sobrevive. */
  | { type: "reset" };

export const initialSelection: SelectionState = {
  initialized: false,
  selectedId: null,
  known: {},
  fresh: [],
  changed: [],
  arrivalId: null,
};

function time(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Mais recente primeiro, por criação; desempate estável por id. Edição não reordena. */
export function orderByCreation<T extends FeedEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => time(b.createdAt) - time(a.createdAt) || a.id.localeCompare(b.id));
}

function revisionOf(entry: FeedEntry): number | null {
  return typeof entry.contentRevision === "number" ? entry.contentRevision : null;
}

function without(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : list;
}

function select(state: SelectionState, id: string): SelectionState {
  return {
    ...state,
    selectedId: id,
    fresh: without(state.fresh, id),
    changed: without(state.changed, id),
    arrivalId: state.arrivalId === id ? null : state.arrivalId,
  };
}

function feed(state: SelectionState, entries: FeedEntry[]): SelectionState {
  const ordered = orderByCreation(entries);
  const known: Record<string, number | null> = {};
  for (const e of ordered) known[e.id] = revisionOf(e);

  if (!state.initialized) {
    if (ordered.length === 0) return state;
    return { ...initialSelection, initialized: true, selectedId: ordered[0]!.id, known };
  }

  let fresh = state.fresh;
  let changed = state.changed;
  let arrivalId = state.arrivalId;
  // Percorre do mais antigo para o mais novo: o aviso fica com o mais recente.
  for (const e of [...ordered].reverse()) {
    if (!(e.id in state.known)) {
      if (e.id !== state.selectedId) {
        fresh = fresh.includes(e.id) ? fresh : [...fresh, e.id];
        arrivalId = e.id;
      }
      continue;
    }
    const before = state.known[e.id];
    const now = known[e.id];
    if (before != null && now != null && before !== now && e.id !== state.selectedId) {
      changed = changed.includes(e.id) ? changed : [...changed, e.id];
    }
  }

  const next: SelectionState = { ...state, known, fresh, changed, arrivalId };
  if (next.selectedId === null && ordered.length > 0) return select(next, ordered[0]!.id);
  return next;
}

export function selectionReducer(state: SelectionState, event: SelectionEvent): SelectionState {
  switch (event.type) {
    case "feed":
      return feed(state, event.entries);
    case "select":
      return state.selectedId === event.id && !state.fresh.includes(event.id) && !state.changed.includes(event.id)
        ? state
        : select(state, event.id);
    case "step": {
      const id = neighborId(event.entries, state.selectedId, event.delta);
      return id && id !== state.selectedId ? select(state, id) : state;
    }
    case "clear":
      return { ...state, selectedId: null };
    case "dismissArrival":
      return state.arrivalId === null ? state : { ...state, arrivalId: null };
    case "reset":
      return initialSelection;
  }
}

/** Vizinho na ordem exibida. Seleção fora da lista → primeiro da lista. */
export function neighborId(entries: readonly FeedEntry[], selectedId: string | null, delta: 1 | -1): string | null {
  const ordered = orderByCreation(entries);
  if (ordered.length === 0) return null;
  const index = selectedId ? ordered.findIndex((e) => e.id === selectedId) : -1;
  if (index === -1) return ordered[0]!.id;
  const next = Math.min(Math.max(index + delta, 0), ordered.length - 1);
  return ordered[next]!.id;
}

/** Posição 1-based na ordem exibida; 0 quando não está na lista. */
export function positionOf(entries: readonly FeedEntry[], selectedId: string | null): number {
  if (!selectedId) return 0;
  return orderByCreation(entries).findIndex((e) => e.id === selectedId) + 1;
}
