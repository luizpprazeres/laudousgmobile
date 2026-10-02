import assert from "node:assert/strict";
import { test } from "node:test";
import { type HepaticAssessment } from "@laudousg/shared";
import { createInitialHepaticAssessment } from "./hepaticModels";
import {
  buildHepaticPersistBody,
  canReleaseHepaticReport,
  hepaticCategoryForPurpose,
  hepaticErrorMessage,
  hepaticReportPersisted,
  hepaticReportPersistenceFailed,
  hepaticReportReviewed,
  hepaticReportReviewFailed,
  initialHepaticReportFlow,
  invalidateHepaticReportFlow,
  parseHepaticPersistResponse,
  persistHepaticReportDraft,
  reviewHepaticReport,
  sameHepaticAssessment,
  startHepaticReportPersistence,
  startHepaticReportReview,
  type HepaticSend,
  type PersistedHepaticReport,
} from "./hepaticReportFlow";

// Respostas e ids SINTÉTICOS; nenhuma rede é usada.
const EXAM = "d91d9e82-a692-4491-bac8-3f3847d7f809";
const sent = (): HepaticAssessment => ({
  ...createInitialHepaticAssessment("ELASTOGRAFIA_HEPATICA", EXAM),
  indication: "Indicação sintética",
});
const okBody = (assessment: HepaticAssessment, over: Record<string, unknown> = {}) => ({
  report: {
    id: assessment.examId,
    category_code: "ELASTOGRAFIA_HEPATICA",
    status: "generated",
    content_revision: 1,
    review_status: "pending",
    physician_reviewed: false,
    generated_output: "Texto sintético renderizado pelo servidor.",
    assessment,
    created_at: "2026-10-02T15:00:00Z",
    ...over,
  },
});

function fakeSend(status: number, body: unknown, calls: Array<{ path: string; init: RequestInit }>): HepaticSend {
  return async (path, init) => {
    calls.push({ path, init });
    return new Response(body === undefined ? "nada" : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
}

test("categoria vem da finalidade; complementos abdominais não viram laudo hepático próprio", () => {
  assert.equal(hepaticCategoryForPurpose("multiparametric"), "AVALIACAO_MULTIPARAMETRICA_HEPATICA");
  assert.equal(hepaticCategoryForPurpose("elastography"), "ELASTOGRAFIA_HEPATICA");
  assert.equal(hepaticCategoryForPurpose("abdomen_total"), null);
  assert.equal(hepaticCategoryForPurpose("abdomen_superior"), null);
});

test("corpo do POST: criação só com assessment; atualização com report_id + expected_revision", () => {
  const value = sent();
  assert.deepEqual(Object.keys(buildHepaticPersistBody(value, null)), ["assessment"]);
  const previous: PersistedHepaticReport = { id: EXAM, categoryCode: "ELASTOGRAFIA_HEPATICA", contentRevision: 3, generatedOutput: "x", assessment: value };
  assert.deepEqual(buildHepaticPersistBody(value, previous), { assessment: value, report_id: EXAM, expected_revision: 3 });
  assert.throws(() => buildHepaticPersistBody({ ...value, examId: "não-uuid" }, null), "payload inválido nunca sai do aparelho");
});

test("persistência envia o contrato e aceita só a resposta coerente", async () => {
  const value = sent();
  const calls: Array<{ path: string; init: RequestInit }> = [];
  const persisted = await persistHepaticReportDraft(fakeSend(201, okBody(value), calls), value);
  assert.equal(calls[0]!.path, "/api/v1/hepatic-reports");
  assert.equal(calls[0]!.init.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), { assessment: value });
  assert.equal(persisted.id, EXAM);
  assert.equal(persisted.contentRevision, 1);
  assert.equal(persisted.generatedOutput, "Texto sintético renderizado pelo servidor.");
  assert.equal(persisted.categoryCode, "ELASTOGRAFIA_HEPATICA");
  // Ordem de chaves diferente continua sendo o mesmo conteúdo.
  const reordered = Object.fromEntries(Object.entries(value).reverse()) as HepaticAssessment;
  assert.notEqual(JSON.stringify(reordered), JSON.stringify(value));
  assert.equal(sameHepaticAssessment(reordered, value), true);
});

test("resposta incoerente é recusada (fail-closed)", () => {
  const value = sent();
  const cases: Array<[string, unknown]> = [
    ["revisado na criação", okBody(value, { physician_reviewed: true })],
    ["status revisado", okBody(value, { review_status: "reviewed" })],
    ["outra categoria", okBody(value, { category_code: "AVALIACAO_MULTIPARAMETRICA_HEPATICA" })],
    ["outro laudo", okBody(value, { id: "c2c4c302-2f31-424c-92df-08265908a158" })],
    ["dados alterados", okBody(value, { assessment: { ...value, indication: "Outra" } })],
    ["texto vazio", okBody(value, { generated_output: "" })],
    ["revisão zero", okBody(value, { content_revision: 0 })],
    ["sem assessment", okBody(value, { assessment: undefined })],
    ["corpo nulo", null],
  ];
  for (const [label, body] of cases) {
    assert.throws(() => parseHepaticPersistResponse(body, value), Error, label);
  }
});

test("erros da API viram mensagens claras; desconhecido usa o texto padrão", async () => {
  assert.match(hepaticErrorMessage({ error: "hepatic_reports_v1_unavailable" }, 404, "x"), /ainda não foram ativados/);
  assert.match(hepaticErrorMessage({ error: "hepatic_quality_criterion_unapproved" }, 422, "x"), /critério técnico/);
  assert.match(hepaticErrorMessage({ error: "hepatic_confirmation_actor_mismatch" }, 403, "x"), /médico desta sessão/);
  assert.match(hepaticErrorMessage({ error: "hepatic_category_unavailable" }, 409, "x"), /categoria hepática/);
  assert.equal(hepaticErrorMessage({ error: "algo_novo" }, 500, "padrão"), "padrão");
  assert.equal(hepaticErrorMessage(null, 503, "padrão"), "padrão");
  assert.match(hepaticErrorMessage(null, 401, "x"), /Sessão expirada/);
  const calls: Array<{ path: string; init: RequestInit }> = [];
  await assert.rejects(
    persistHepaticReportDraft(fakeSend(404, { error: "hepatic_reports_v1_unavailable" }, calls), sent()),
    /ainda não foram ativados/,
  );
  await assert.rejects(persistHepaticReportDraft(fakeSend(500, undefined, calls), sent()), /Não foi possível salvar/);
});

test("revisão envia revisão e texto exatos; só ok:true conta", async () => {
  const value = sent();
  const report: PersistedHepaticReport = { id: EXAM, categoryCode: "ELASTOGRAFIA_HEPATICA", contentRevision: 2, generatedOutput: "Texto sintético.", assessment: value };
  const calls: Array<{ path: string; init: RequestInit }> = [];
  await reviewHepaticReport(fakeSend(200, { ok: true, reviewStatus: "reviewed" }, calls), report);
  assert.equal(calls[0]!.path, `/api/v1/hepatic-reports/${EXAM}/review`);
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), { expectedRevision: 2, expectedText: "Texto sintético." });
  await assert.rejects(reviewHepaticReport(fakeSend(200, { ok: false }, calls), report));
  await assert.rejects(reviewHepaticReport(fakeSend(200, {}, calls), report));
  await assert.rejects(reviewHepaticReport(fakeSend(409, { error: "content_changed" }, calls), report), /conteúdo mudou/);
});

test("máquina de estados: só libera cópia após revisão confirmada; edição derruba", () => {
  const value = sent();
  const persisted: PersistedHepaticReport = { id: EXAM, categoryCode: "ELASTOGRAFIA_HEPATICA", contentRevision: 1, generatedOutput: "Texto.", assessment: value };
  let flow = initialHepaticReportFlow;
  assert.equal(canReleaseHepaticReport(flow), false);
  flow = startHepaticReportPersistence(flow);
  assert.equal(flow.phase, "persisting");
  assert.equal(hepaticReportPersistenceFailed(flow, "falhou").phase, "editing");
  flow = hepaticReportPersisted(persisted);
  assert.equal(flow.phase, "pending_review");
  assert.equal(canReleaseHepaticReport(flow), false, "salvo não é revisado");
  assert.equal(hepaticReportReviewed(flow).phase, "pending_review", "não pula de pendente para revisado sem iniciar a revisão");
  flow = startHepaticReportReview(flow);
  assert.equal(flow.phase, "reviewing");
  assert.equal(hepaticReportReviewFailed(flow, "erro").phase, "pending_review");
  flow = hepaticReportReviewed(flow);
  assert.equal(canReleaseHepaticReport(flow), true);
  const edited = invalidateHepaticReportFlow(flow);
  assert.equal(edited.phase, "editing");
  assert.equal(canReleaseHepaticReport(edited), false, "qualquer edição retira a liberação");
  assert.equal(edited.persisted?.id, EXAM, "linha salva continua como âncora da próxima atualização");
  assert.equal(startHepaticReportReview(edited).phase, "editing", "não revisa versão desatualizada");
});
