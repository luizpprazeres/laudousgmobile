import assert from "node:assert/strict";
import { reviewOf } from "../review";
import { initialSelection, neighborId, orderByCreation, positionOf, selectionReducer, type FeedEntry } from "../selection";
import { selectedReportIsStale, acceptResponse, contentChanged, isCurrentPoll, LEGACY_REFETCH_POLLS, shouldRefetchSelected } from "../freshness";
import {
  brtDay, clearAllNames, loadNames, nameKey, NAME_MAX_LENGTH, namesExpiry, nextBrtMidnight,
  restampNames, saveName, type NameStorage,
} from "../localNames";
import { composeReport, type Addition } from "../compose";
import { copyPlan } from "../copyPlan";
import { annotationsFor, annotationsReducer, initialAnnotations, type Annotation } from "../annotations";

// ---------- revisão: na dúvida, nunca "revisado" ----------
assert.deepEqual(reviewOf(undefined), { status: "pending", reviewedAt: null });
assert.deepEqual(reviewOf({}), { status: "pending", reviewedAt: null });
assert.deepEqual(reviewOf({ reviewStatus: "REVIEWED", reviewedAt: "x" }), { status: "pending", reviewedAt: null });
assert.deepEqual(reviewOf({ reviewStatus: true }), { status: "pending", reviewedAt: null });
assert.deepEqual(reviewOf({ reviewStatus: "pending", reviewedAt: "2026-09-28T12:00:00Z" }), { status: "pending", reviewedAt: null });
assert.deepEqual(reviewOf({ reviewStatus: "reviewed", reviewedAt: "2026-09-28T12:00:00Z" }), { status: "reviewed", reviewedAt: "2026-09-28T12:00:00Z" });
assert.deepEqual(reviewOf({ reviewStatus: "reviewed", reviewedAt: null }), { status: "reviewed", reviewedAt: null });

// ---------- anotações: cache isolado por laudo e respostas tardias seguras ----------
const noteA: Annotation = { id: "note-a", reportId: "report-a", text: "A", placement: "footer", createdAt: "2026-09-29T10:00:00Z" };
const noteB: Annotation = { id: "note-b", reportId: "report-b", text: "B", placement: "footer", createdAt: "2026-09-29T10:01:00Z" };
let notes = annotationsReducer(initialAnnotations, { type: "reset", token: "token-1" });
notes = annotationsReducer(notes, { type: "load", token: "token-1", reportId: "report-a", version: 0, items: [noteA] });
notes = annotationsReducer(notes, { type: "load", token: "token-1", reportId: "report-b", version: 0, items: [noteB] });
assert.deepEqual(annotationsFor(notes, "token-1", "report-a"), [noteA]);
assert.deepEqual(annotationsFor(notes, "token-1", "report-b"), [noteB]);
assert.deepEqual(annotationsFor(notes, "token-1", null), []);
// Uma resposta GET iniciada antes de uma inclusão local não pode apagar a inclusão.
notes = annotationsReducer(notes, { type: "upsert", token: "token-1", reportId: "report-a", item: { ...noteA, id: "note-a2", text: "A2" } });
notes = annotationsReducer(notes, { type: "load", token: "token-1", reportId: "report-a", version: 0, items: [] });
assert.equal(annotationsFor(notes, "token-1", "report-a").length, 2);
// Token e reportId divergentes não contaminam o laudo atual.
assert.equal(annotationsReducer(notes, { type: "upsert", token: "other", reportId: "report-a", item: noteA }), notes);
assert.equal(annotationsReducer(notes, { type: "upsert", token: "token-1", reportId: "report-b", item: noteA }), notes);

// ---------- ordenação por criação, estável ----------
const a: FeedEntry = { id: "a", createdAt: "2026-09-28T12:00:00Z", contentRevision: 1 };
const b: FeedEntry = { id: "b", createdAt: "2026-09-28T12:10:00Z", contentRevision: 1 };
const c: FeedEntry = { id: "c", createdAt: "2026-09-28T12:20:00Z", contentRevision: 1 };
assert.deepEqual(orderByCreation([a, c, b]).map((e) => e.id), ["c", "b", "a"]);
// API ordena por updated_at: "a" editado vem primeiro, mas a ordem exibida não muda.
assert.deepEqual(orderByCreation([{ ...a, contentRevision: 2 }, c, b]).map((e) => e.id), ["c", "b", "a"]);
const tieX = { id: "x", createdAt: a.createdAt };
const tieY = { id: "y", createdAt: a.createdAt };
assert.deepEqual(orderByCreation([tieY, tieX]).map((e) => e.id), ["x", "y"]);

// ---------- seleção ----------
let s = selectionReducer(initialSelection, { type: "feed", entries: [] });
assert.equal(s.initialized, false, "dia vazio não inicializa");
assert.equal(s.selectedId, null);

s = selectionReducer(s, { type: "feed", entries: [a] });
assert.equal(s.selectedId, "a", "primeiro laudo do dia é selecionado (nada a roubar)");
assert.deepEqual(s.fresh, []);
assert.equal(s.arrivalId, null, "primeira carga não gera aviso");

s = selectionReducer(initialSelection, { type: "feed", entries: [a, b] });
assert.equal(s.selectedId, "b", "primeira carga seleciona o mais recente por criação");
s = selectionReducer(s, { type: "select", id: "a" });
assert.equal(s.selectedId, "a");

// Laudo novo NÃO rouba a seleção.
s = selectionReducer(s, { type: "feed", entries: [c, b, a] });
assert.equal(s.selectedId, "a");
assert.deepEqual(s.fresh, ["c"]);
assert.equal(s.arrivalId, "c");

// Edição de outro laudo: marca "alterado", sem trocar a seleção.
s = selectionReducer(s, { type: "feed", entries: [{ ...b, contentRevision: 2 }, c, a] });
assert.equal(s.selectedId, "a");
assert.deepEqual(s.changed, ["b"]);
// Edição do selecionado não entra em "changed" (o aviso é no próprio laudo).
s = selectionReducer(s, { type: "feed", entries: [{ ...a, contentRevision: 2 }, { ...b, contentRevision: 2 }, c] });
assert.equal(s.selectedId, "a");
assert.deepEqual(s.changed, ["b"]);

// Abrir limpa selos e aviso.
s = selectionReducer(s, { type: "select", id: "c" });
assert.deepEqual(s.fresh, []);
assert.equal(s.arrivalId, null);
s = selectionReducer(s, { type: "select", id: "b" });
assert.deepEqual(s.changed, []);

// Vários chegam de uma vez: aviso aponta o mais recente.
const d: FeedEntry = { id: "d", createdAt: "2026-09-28T12:30:00Z" };
const e: FeedEntry = { id: "e", createdAt: "2026-09-28T12:40:00Z" };
s = selectionReducer(s, { type: "feed", entries: [a, b, c, d, e] });
assert.equal(s.arrivalId, "e");
assert.deepEqual([...s.fresh].sort(), ["d", "e"]);
s = selectionReducer(s, { type: "dismissArrival" });
assert.equal(s.arrivalId, null);
assert.deepEqual([...s.fresh].sort(), ["d", "e"], "dispensar o aviso mantém o selo NOVO");

// Selecionado sumiu da lista (ocultado em outra aba / fora do dia): continua selecionado.
s = selectionReducer(s, { type: "feed", entries: [c, d, e] });
assert.equal(s.selectedId, "b");

// Ocultar o selecionado (clear) → próximo feed escolhe o mais recente.
s = selectionReducer(s, { type: "clear" });
s = selectionReducer(s, { type: "feed", entries: [c, d, e] });
assert.equal(s.selectedId, "e");

// Backend legado sem revisão: nunca marca "alterado".
let legacy = selectionReducer(initialSelection, { type: "feed", entries: [{ id: "l1", createdAt: a.createdAt }, { id: "l2", createdAt: b.createdAt }] });
legacy = selectionReducer(legacy, { type: "feed", entries: [{ id: "l1", createdAt: a.createdAt }, { id: "l2", createdAt: b.createdAt }] });
assert.deepEqual(legacy.changed, []);

// Navegação.
const list = [a, b, c];
assert.equal(neighborId(list, "c", 1), "b");
assert.equal(neighborId(list, "b", 1), "a");
assert.equal(neighborId(list, "a", 1), "a", "fim da lista trava");
assert.equal(neighborId(list, "c", -1), "c", "início da lista trava");
assert.equal(neighborId(list, "zzz", 1), "c", "fora da lista → primeiro");
assert.equal(neighborId([], "a", 1), null);
assert.equal(positionOf(list, "b"), 2);
assert.equal(positionOf(list, "zzz"), 0);
s = selectionReducer({ ...initialSelection, initialized: true, selectedId: "c", fresh: ["b"] }, { type: "step", delta: 1, entries: list });
assert.equal(s.selectedId, "b");
assert.deepEqual(s.fresh, []);

// ---------- laudo antigo aberto continua atualizado ----------
const loaded = { id: "a", outputText: "v1", contentRevision: 1, reviewStatus: "pending", reviewedAt: null };
const listedSame = { contentRevision: 1, reviewStatus: "pending", reviewedAt: null };
const refetch = (over: Partial<Parameters<typeof shouldRefetchSelected>[0]>) =>
  shouldRefetchSelected({ loaded, listed: listedSame, isLatest: false, pollsSinceFetch: 0, ...over });
assert.equal(refetch({ listed: { ...listedSame, contentRevision: 2 } }), true, "revisão nova");
assert.equal(refetch({ pollsSinceFetch: 99 }), false, "nada mudou");
// Aprovação NÃO muda contentRevision: status/horário de revisão também recarregam.
assert.equal(refetch({ listed: { ...listedSame, reviewStatus: "reviewed", reviewedAt: "2026-09-28T12:00:00Z" } }), true, "aprovação recarrega");
assert.equal(
  shouldRefetchSelected({
    loaded: { ...loaded, reviewStatus: "reviewed", reviewedAt: "2026-09-28T12:00:00Z" },
    listed: { ...listedSame, reviewStatus: "reviewed", reviewedAt: "2026-09-28T12:05:00Z" },
    isLatest: false, pollsSinceFetch: 0,
  }),
  true,
  "nova aprovação (outro horário) recarrega",
);
assert.equal(
  shouldRefetchSelected({ loaded: { ...loaded, reviewStatus: "reviewed", reviewedAt: "x" }, listed: listedSame, isLatest: false, pollsSinceFetch: 0 }),
  true,
  "revisão desfeita recarrega",
);
assert.equal(refetch({ listed: { ...listedSame, contentRevision: 2 }, isLatest: true }), false, "latest já chega atualizado");
assert.equal(refetch({ loaded: null }), true);
assert.equal(refetch({ listed: undefined, pollsSinceFetch: 99 }), false, "fora da lista");
const legacyLoaded = { id: "a", outputText: "v1" };
assert.equal(shouldRefetchSelected({ loaded: legacyLoaded, listed: {}, isLatest: false, pollsSinceFetch: LEGACY_REFETCH_POLLS - 1 }), false);
assert.equal(shouldRefetchSelected({ loaded: legacyLoaded, listed: {}, isLatest: false, pollsSinceFetch: LEGACY_REFETCH_POLLS }), true);

assert.equal(contentChanged(loaded, { ...loaded, contentRevision: 2, outputText: "v1" }), true);
assert.equal(contentChanged(loaded, { ...loaded, outputText: "igual pela revisão" }), false);
assert.equal(contentChanged(loaded, { ...loaded, reviewStatus: "reviewed" }), false, "aprovar não é 'alterou'");
assert.equal(contentChanged(legacyLoaded, { id: "a", outputText: "v2" }), true);
assert.equal(contentChanged(legacyLoaded, { id: "b", outputText: "v2" }), false);
assert.equal(contentChanged(null, loaded), false);

// Respostas fora de ordem.
const reviewed = { ...loaded, reviewStatus: "reviewed", reviewedAt: "t" };
assert.equal(acceptResponse({ prev: reviewed, next: loaded, startedAt: 4, appliedAt: 7 }), false, "pending atrasado não desfaz reviewed (mesma revisão)");
assert.equal(acceptResponse({ prev: loaded, next: reviewed, startedAt: 8, appliedAt: 7 }), true);
assert.equal(acceptResponse({ prev: { ...loaded, contentRevision: 3 }, next: loaded, startedAt: 9, appliedAt: 7 }), false, "revisão menor recusada");
assert.equal(acceptResponse({ prev: undefined, next: loaded, startedAt: 1, appliedAt: undefined }), true);
assert.equal(acceptResponse({ prev: legacyLoaded, next: { id: "a", outputText: "v2" }, startedAt: 2, appliedAt: 1 }), true);
assert.equal(isCurrentPoll({ generation: 2, currentGeneration: 2, seq: 5, lastAppliedSeq: 4 }), true);
assert.equal(isCurrentPoll({ generation: 2, currentGeneration: 2, seq: 3, lastAppliedSeq: 4 }), false, "poll antigo (ex.: token inválido velho) descartado");
assert.equal(isCurrentPoll({ generation: 1, currentGeneration: 2, seq: 9, lastAppliedSeq: 4 }), false, "outro código descartado");

// Reset ao trocar de código.
const busy = selectionReducer(selectionReducer(initialSelection, { type: "feed", entries: [a, b] }), { type: "feed", entries: [a, b, c] });
assert.deepEqual(selectionReducer(busy, { type: "reset" }), initialSelection);

// ---------- composição: texto do médico × acréscimos da Sala ----------
// Referência: implementação antiga (renderWithAnnotations) — o texto não pode mudar.
function legacyRender(body: string, inserted: Addition[], annotations: Addition[]): string {
  const m = body.match(/CONCLUS[ÃA]O\s*:/i);
  let lastN = 0; let has = false;
  if (m && m.index !== undefined) {
    has = true;
    const nums = [...body.slice(m.index).matchAll(/^\s*(\d+)\)\s/gm)];
    if (nums.length) lastN = Math.max(...nums.map((x) => parseInt(x[1] ?? "0", 10)));
  }
  const after = inserted.filter((p) => p.placement === "after-title").map((p) => p.text);
  const inC = [...inserted.filter((p) => p.placement === "in-conclusion").map((p) => p.text), ...annotations.filter((x) => x.placement === "in-conclusion").map((x) => x.text)];
  const foot = [...inserted.filter((p) => p.placement === "footer").map((p) => p.text), ...annotations.filter((x) => x.placement === "footer").map((x) => x.text)];
  let r = body;
  if (after.length) r = after.join("\n\n") + "\n\n" + r;
  if (inC.length) { if (has) r = r + "\n" + inC.map((t, i) => `${lastN + i + 1}) ${t}`).join("\n"); else foot.push(...inC); }
  if (foot.length) r = r + "\n\n" + foot.join("\n\n");
  return r;
}
const bodyWithConclusion = "ACHADOS\nFígado normal.\n\nCONCLUSÃO:\n1) Exame normal.\n2) Sem cálculos.";
const bodyNoConclusion = "ACHADOS\nTireoide normal.";
const ins: Addition[] = [
  { text: "Frase no topo", placement: "after-title" },
  { text: "Frase na conclusão", placement: "in-conclusion" },
  { text: "Rodapé\nem duas linhas", placement: "footer" },
];
const ann: Addition[] = [{ text: "Anotação da auxiliar", placement: "in-conclusion" }];
for (const body of [bodyWithConclusion, bodyNoConclusion]) {
  for (const [i1, a1] of [[[], []], [ins, []], [[], ann], [ins, ann]] as [Addition[], Addition[]][]) {
    const out = composeReport(body, i1, a1);
    assert.equal(out.text, legacyRender(body, i1, a1), "mesmo texto do renderWithAnnotations");
    assert.equal(out.added.length, out.text.split("\n").length);
    // Todas as linhas do médico ficam não-marcadas; todas as dos acréscimos, marcadas.
    const lines = out.text.split("\n");
    for (const bodyLine of body.split("\n").filter(Boolean)) {
      const idx = lines.indexOf(bodyLine);
      assert.ok(idx >= 0 && out.added[idx] === false, `linha médica não marcada: ${bodyLine}`);
    }
    for (const t of [...i1, ...a1]) for (const tl of t.text.split("\n")) {
      const idx = lines.findIndex((l, k) => out.added[k] && l.endsWith(tl));
      assert.ok(idx >= 0, `acréscimo marcado: ${tl}`);
    }
    assert.equal(out.additionCount, i1.length + a1.length);
  }
}
assert.equal(composeReport(bodyWithConclusion, [], ann).text.includes("3) Anotação da auxiliar"), true);

// ---------- plano de cópia: verde só para o texto do médico revisado ----------
const rev = { status: "reviewed" as const, reviewedAt: "2026-09-28T12:00:00Z" };
const pen = { status: "pending" as const, reviewedAt: null };
let plan = copyPlan({ review: rev, offline: false, additionCount: 0, lastSyncLabel: "12:00" });
assert.equal(plan.banner, "reviewed");
assert.deepEqual(plan.primary, { mode: "medical", label: "Copiar laudo revisado", tone: "approved" });
assert.equal(plan.secondary, null);
plan = copyPlan({ review: rev, offline: false, additionCount: 2, lastSyncLabel: "12:00" });
assert.equal(plan.primary.mode, "medical", "verde copia só o texto do médico");
assert.equal(plan.primary.tone, "approved");
assert.match(plan.primary.label, /sem acréscimos/);
assert.deepEqual(plan.secondary, { mode: "with-additions", label: "Copiar com acréscimos · não revisados", tone: "draft" });
assert.match(plan.detail, /2 acréscimos da Sala/);
assert.doesNotMatch(plan.detail, /Pode copiar e imprimir/, "conjunto com acréscimos não é 'pronto'");
plan = copyPlan({ review: pen, offline: false, additionCount: 1, lastSyncLabel: null });
assert.equal(plan.banner, "pending");
assert.equal(plan.primary.tone, "draft");
assert.equal(plan.secondary?.tone, "draft");
// Sem conexão: nem revisado aparece verde/atual.
plan = copyPlan({ review: rev, offline: true, additionCount: 0, lastSyncLabel: "12:34" });
assert.equal(plan.banner, "stale");
assert.equal(plan.primary.tone, "draft");
assert.match(plan.title, /Sem conexão · última versão recebida/);
assert.match(plan.detail, /12:34/);
assert.doesNotMatch(plan.detail + plan.title, /Pode copiar e imprimir|revisado/i);
for (const off of [true, false]) for (const r of [rev, pen]) for (const n of [0, 3]) {
  const p = copyPlan({ review: r, offline: off, additionCount: n, lastSyncLabel: null });
  if (p.secondary) assert.equal(p.secondary.tone, "draft", "acréscimos nunca aprovados");
  if (p.primary.tone === "approved") assert.ok(!off && r.status === "reviewed" && p.primary.mode === "medical");
}

// ---------- nome local ----------
class FakeStorage implements NameStorage {
  map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
}
const st = new FakeStorage();
const day1 = new Date("2026-09-28T15:00:00Z"); // 12h BRT
const lateDay1 = new Date("2026-09-29T02:59:00Z"); // 23h59 BRT do dia 28
const day2 = new Date("2026-09-29T03:01:00Z"); // 00h01 BRT do dia 29
assert.equal(brtDay(day1), "2026-09-28");
assert.equal(brtDay(lateDay1), "2026-09-28");
assert.equal(brtDay(day2), "2026-09-29");
assert.equal(nameKey("abc234", day1), "sala:names:v1:ABC234:2026-09-28");

assert.equal(nextBrtMidnight(day1), Date.parse("2026-09-29T03:00:00Z"));
assert.equal(nextBrtMidnight(lateDay1), Date.parse("2026-09-29T03:00:00Z"));
assert.equal(namesExpiry(day1), Date.parse("2026-09-29T03:00:00Z"));
assert.equal(namesExpiry(day1, "2026-09-28T18:00:00Z"), Date.parse("2026-09-28T18:00:00Z"), "código vence antes");
assert.equal(namesExpiry(day1, "2027-01-01T00:00:00Z"), Date.parse("2026-09-29T03:00:00Z"), "meia-noite vence antes");
assert.equal(namesExpiry(day1, "lixo"), Date.parse("2026-09-29T03:00:00Z"));

st.setItem("sala-theme", "dark");
let names = saveName(st, "ABC234", day1, "r1", "  Maria\n  Souza  ");
assert.deepEqual(names, { r1: "Maria Souza" });
names = saveName(st, "ABC234", day1, "r2", "x".repeat(200));
assert.equal(names.r2!.length, NAME_MAX_LENGTH);
assert.deepEqual(loadNames(st, "ABC234", lateDay1), names, "mesmo dia BRT mantém");
names = saveName(st, "ABC234", day1, "r2", "   ");
assert.deepEqual(names, { r1: "Maria Souza" }, "vazio apaga");

// Virada do dia apaga.
assert.deepEqual(loadNames(st, "ABC234", day2), {});
assert.equal([...st.map.keys()].some((k) => k.startsWith("sala:names:")), false);
assert.equal(st.getItem("sala-theme"), "dark", "não toca em outras chaves");

// Outro código apaga os do código anterior.
saveName(st, "ABC234", day1, "r1", "Maria");
assert.deepEqual(loadNames(st, "XYZ789", day1), {});
assert.equal(st.getItem(nameKey("ABC234", day1)), null);

// Sair / código inválido.
saveName(st, "ABC234", day1, "r1", "Maria");
clearAllNames(st);
assert.deepEqual(loadNames(st, "ABC234", day1), {});

// Envelope: gravado com expiresAt; vencido é apagado na leitura (foco/visibilidade chamam loadNames).
saveName(st, "ABC234", day1, "r1", "Maria");
const env = JSON.parse(st.getItem(nameKey("ABC234", day1))!);
assert.equal(env.expiresAt, Date.parse("2026-09-29T03:00:00Z"));
assert.deepEqual(env.names, { r1: "Maria" });
saveName(st, "ABC234", day1, "r1", "Maria", "2026-09-28T16:00:00Z");
assert.deepEqual(loadNames(st, "ABC234", new Date("2026-09-28T15:59:00Z")), { r1: "Maria" });
assert.deepEqual(loadNames(st, "ABC234", new Date("2026-09-28T16:00:00Z")), {}, "código venceu → apaga");
assert.equal(st.getItem(nameKey("ABC234", day1)), null);
// Código já vencido: não grava.
assert.deepEqual(saveName(st, "ABC234", day1, "r1", "Maria", "2026-09-28T14:00:00Z"), {});
assert.equal(st.getItem(nameKey("ABC234", day1)), null);
// Restamp quando o backend passa a informar a validade.
saveName(st, "ABC234", day1, "r1", "Maria");
restampNames(st, "ABC234", day1, "2026-09-28T17:00:00Z");
assert.equal(JSON.parse(st.getItem(nameKey("ABC234", day1))!).expiresAt, Date.parse("2026-09-28T17:00:00Z"));
assert.deepEqual(restampNames(st, "ABC234", day1, "2026-09-28T10:00:00Z"), {}, "restamp com código vencido apaga");
assert.equal(st.getItem(nameKey("ABC234", day1)), null);

// Lixo/formato antigo sem envelope é descartado; storage ausente/que lança é tolerado.
st.setItem(nameKey("ABC234", day1), "{not json");
assert.deepEqual(loadNames(st, "ABC234", day1), {});
assert.equal(st.getItem(nameKey("ABC234", day1)), null, "lixo é removido");
st.setItem(nameKey("ABC234", day1), JSON.stringify({ r1: "Ana" }));
assert.deepEqual(loadNames(st, "ABC234", day1), {}, "sem envelope não vale");
st.setItem(nameKey("ABC234", day1), JSON.stringify({ expiresAt: "amanhã", names: { r1: "Ana" } }));
assert.deepEqual(loadNames(st, "ABC234", day1), {});
st.setItem(nameKey("ABC234", day1), JSON.stringify({ expiresAt: nextBrtMidnight(day1), names: { r1: 42, r2: "Ana" } }));
assert.deepEqual(loadNames(st, "ABC234", day1), { r2: "Ana" });
assert.deepEqual(loadNames(null, "ABC234", day1), {});
const throwing: NameStorage = {
  length: 0, key: () => null, getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); },
};
assert.deepEqual(saveName(throwing, "ABC234", day1, "r1", "Ana"), { r1: "Ana" });
clearAllNames(throwing);

console.log("sala-ui.manual: ok");

// Selected report endpoint fails while latest succeeds: cached approval is stale.
const cachedApproved = { id: "older", outputText: "old", contentRevision: 2, reviewStatus: "reviewed", reviewedAt: "2026-09-28T12:00:00Z" };
assert.equal(selectedReportIsStale(cachedApproved, { contentRevision: 3, reviewStatus: "pending" }), true);
assert.equal(selectedReportIsStale(cachedApproved, { contentRevision: 2, reviewStatus: "pending" }), true);
assert.equal(selectedReportIsStale(cachedApproved, cachedApproved), false);
assert.equal(selectedReportIsStale(cachedApproved, { contentRevision: 1 }), false);
const stalePlan = copyPlan({ review: reviewOf(cachedApproved), offline: false, reportStale: true, additionCount: 0, lastSyncLabel: "12:00" });
assert.equal(stalePlan.banner, "stale");
assert.equal(stalePlan.primary.tone, "draft");
assert.match(stalePlan.title, /desatualizado/);
