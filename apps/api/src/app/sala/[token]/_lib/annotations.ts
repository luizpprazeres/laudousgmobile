/** In-memory, session-scoped cache. Never store patient names or write storage. */
export type Annotation = { id: string; reportId: string | null; text: string; placement: "after-title" | "in-conclusion" | "footer"; createdAt: string };
export type AnnotationState = { token: string; reports: Record<string, { items: Annotation[]; version: number }> };
export type AnnotationEvent =
  | { type: "reset"; token: string }
  | { type: "load"; token: string; reportId: string; items: Annotation[]; version: number }
  | { type: "upsert"; token: string; reportId: string; item: Annotation }
  | { type: "remove"; token: string; reportId: string; id: string };
export const initialAnnotations: AnnotationState = { token: "", reports: {} };
export function annotationsFor(state: AnnotationState, token: string, id: string | null): Annotation[] {
  return state.token === token && id ? state.reports[id]?.items ?? [] : [];
}
export function annotationsReducer(state: AnnotationState, event: AnnotationEvent): AnnotationState {
  if (event.type === "reset") return { token: event.token, reports: {} };
  if (event.token !== state.token) return state;
  const entry = state.reports[event.reportId] ?? { items: [], version: 0 };
  if (event.type === "load" && event.version !== entry.version) return state;
  if (event.type === "upsert" && event.item.reportId !== event.reportId) return state;
  const items = event.type === "load" ? event.items.filter(a => a.reportId === event.reportId)
    : event.type === "remove" ? entry.items.filter(a => a.id !== event.id)
    : [...entry.items.filter(a => a.id !== event.item.id), event.item].sort((a,b) => a.createdAt.localeCompare(b.createdAt));
  return { ...state, reports: { ...state.reports, [event.reportId]: { items, version: entry.version + (event.type === "load" ? 0 : 1) } } };
}
