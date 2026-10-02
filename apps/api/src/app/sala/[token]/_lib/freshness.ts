/**
 * Mantém atualizado o laudo aberto quando ele NÃO é o "latest" do polling
 * (ex.: auxiliar lendo um laudo antigo que o médico acabou de editar).
 */
export type LoadedReport = {
  id: string;
  outputText: string;
  contentRevision?: number | null;
  reviewStatus?: unknown;
  reviewedAt?: unknown;
};

/** Metadados do mesmo laudo como vieram na lista do dia. */
export type ListedMeta = {
  contentRevision?: number | null;
  reviewStatus?: unknown;
  reviewedAt?: unknown;
};

function reviewKey(x: { reviewStatus?: unknown; reviewedAt?: unknown }): string {
  const status = x.reviewStatus === "reviewed" ? "reviewed" : "pending";
  const at = typeof x.reviewedAt === "string" ? x.reviewedAt : "";
  return `${status}|${at}`;
}

/** Backend sem `contentRevision`: recarrega o laudo aberto a cada N ciclos. */
export const LEGACY_REFETCH_POLLS = 5;

export function shouldRefetchSelected(args: {
  loaded: LoadedReport | null | undefined;
  /** O mesmo laudo na lista do dia; undefined se fora da lista. */
  listed: ListedMeta | null | undefined;
  /** O laudo aberto é o `report` do polling (já chega atualizado). */
  isLatest: boolean;
  pollsSinceFetch: number;
}): boolean {
  const { loaded, listed, isLatest, pollsSinceFetch } = args;
  if (isLatest) return false;
  if (!loaded) return true;
  if (!listed) return false;
  // Aprovação NÃO muda a revisão: o status de revisão também dispara recarga.
  if (reviewKey(listed) !== reviewKey(loaded)) return true;
  if (typeof listed.contentRevision === "number" && typeof loaded.contentRevision === "number") {
    return listed.contentRevision !== loaded.contentRevision;
  }
  return pollsSinceFetch >= LEGACY_REFETCH_POLLS;
}

/** O mesmo laudo mudou de conteúdo? Usa a revisão quando os dois lados têm. */
export function contentChanged(prev: LoadedReport | null | undefined, next: LoadedReport): boolean {
  if (!prev || prev.id !== next.id) return false;
  if (typeof prev.contentRevision === "number" && typeof next.contentRevision === "number") {
    return prev.contentRevision !== next.contentRevision;
  }
  return prev.outputText !== next.outputText;
}

/**
 * Não deixa uma resposta atrasada sobrescrever uma mais nova. `startedAt` é um
 * relógio monotônico do cliente marcado no INÍCIO da requisição; `appliedAt` é
 * o do último valor aplicado para o mesmo laudo. Mesma revisão com status
 * diferente (reviewed → pending) é justamente o caso que só a ordem resolve.
 */
export function acceptResponse(args: {
  prev: LoadedReport | null | undefined;
  next: LoadedReport;
  startedAt: number;
  appliedAt: number | undefined;
}): boolean {
  const { prev, next, startedAt, appliedAt } = args;
  if (appliedAt !== undefined && startedAt < appliedAt) return false;
  if (prev && typeof prev.contentRevision === "number" && typeof next.contentRevision === "number") {
    return next.contentRevision >= prev.contentRevision;
  }
  return true;
}

/** Resposta de polling só vale se for da geração (token) atual e mais nova que a última aplicada. */
export function isCurrentPoll(args: {
  generation: number;
  currentGeneration: number;
  seq: number;
  lastAppliedSeq: number;
}): boolean {
  return args.generation === args.currentGeneration && args.seq > args.lastAppliedSeq;
}

/**
 * O laudo na tela ficou para trás da lista do dia (revisão, status ou horário
 * de revisão diferentes, ou fora da lista)? Vale até uma recarga BEM-SUCEDIDA,
 * independente da conexão global: se `/api/sala/report` falha mas o `latest`
 * responde, a tela não pode continuar parecendo atual (nem verde). Cache com
 * revisão MAIOR que a lista (lista alguns segundos atrás) não conta.
 */
export function selectedReportIsStale(loaded: LoadedReport | null | undefined, listed: ListedMeta | null | undefined): boolean {
  if (!loaded) return false;
  if (!listed) return true;
  if (typeof loaded.contentRevision === "number" && typeof listed.contentRevision === "number") {
    if (listed.contentRevision > loaded.contentRevision) return true;
    if (listed.contentRevision < loaded.contentRevision) return false;
  }
  return reviewKey(loaded) !== reviewKey(listed);
}
