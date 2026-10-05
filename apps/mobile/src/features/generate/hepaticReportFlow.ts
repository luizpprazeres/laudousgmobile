import { z } from "zod";
import { HepaticAssessmentSchema, type HepaticAssessment } from "@laudousg/shared";
import type { HepaticAndroidModelCode } from "./hepaticModels";

/**
 * Persistência e revisão do laudo hepático no Android, mesmo protocolo da Web:
 * POST /api/v1/hepatic-reports cria/atualiza o rascunho (texto renderizado no
 * SERVIDOR, sempre `pending`) e POST /api/v1/hepatic-reports/:id/review
 * confirma a revisão médica vinculada à revisão e ao texto exatos.
 * Nada aqui publica na Sala: a Sala lê o mesmo `reports` e só mostra
 * "revisado" quando a revisão médica corresponde ao conteúdo atual.
 */
export type PersistedHepaticReport = {
  id: string;
  categoryCode: HepaticAndroidModelCode;
  contentRevision: number;
  generatedOutput: string;
  assessment: HepaticAssessment;
};

export type HepaticReportFlowState = {
  phase: "editing" | "persisting" | "pending_review" | "reviewing" | "reviewed";
  persisted: PersistedHepaticReport | null;
  error: string | null;
};

export const initialHepaticReportFlow: HepaticReportFlowState = { phase: "editing", persisted: null, error: null };
/** Qualquer edição volta a "editando"; a linha persistida segue como âncora da próxima atualização. */
export const invalidateHepaticReportFlow = (state: HepaticReportFlowState): HepaticReportFlowState =>
  ({ phase: "editing", persisted: state.persisted, error: null });
export const startHepaticReportPersistence = (state: HepaticReportFlowState): HepaticReportFlowState =>
  ({ phase: "persisting", persisted: state.persisted, error: null });
export const hepaticReportPersisted = (persisted: PersistedHepaticReport): HepaticReportFlowState =>
  ({ phase: "pending_review", persisted, error: null });
export const hepaticReportPersistenceFailed = (state: HepaticReportFlowState, error: string): HepaticReportFlowState =>
  ({ phase: "editing", persisted: state.persisted, error });
export function startHepaticReportReview(state: HepaticReportFlowState): HepaticReportFlowState {
  return state.phase === "pending_review" && state.persisted ? { ...state, phase: "reviewing", error: null } : state;
}
export function hepaticReportReviewed(state: HepaticReportFlowState): HepaticReportFlowState {
  return state.phase === "reviewing" && state.persisted ? { ...state, phase: "reviewed", error: null } : state;
}
export function hepaticReportReviewFailed(state: HepaticReportFlowState, error: string): HepaticReportFlowState {
  return state.persisted ? { ...state, phase: "pending_review", error } : { phase: "editing", persisted: null, error };
}
/** Cópia/liberação só depois da revisão confirmada pelo servidor. */
export const canReleaseHepaticReport = (state: HepaticReportFlowState): boolean =>
  state.phase === "reviewed" && state.persisted !== null;

// Ordem de chaves e `undefined` não importam (mesma regra do contrato compartilhado).
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameHepaticAssessment(a: HepaticAssessment, b: HepaticAssessment): boolean {
  return canonical(a) === canonical(b);
}

const CATEGORY_BY_PURPOSE = {
  multiparametric: "AVALIACAO_MULTIPARAMETRICA_HEPATICA",
  elastography: "ELASTOGRAFIA_HEPATICA",
} as const;

export function hepaticCategoryForPurpose(purpose: HepaticAssessment["purpose"]): HepaticAndroidModelCode | null {
  return purpose === "multiparametric" || purpose === "elastography" ? CATEGORY_BY_PURPOSE[purpose] : null;
}

const CreateResponseSchema = z.object({
  report: z.object({
    id: z.string().uuid(),
    category_code: z.string(),
    content_revision: z.number().int().positive(),
    review_status: z.literal("pending"),
    physician_reviewed: z.literal(false),
    generated_output: z.string().min(1),
    assessment: HepaticAssessmentSchema,
  }).passthrough(),
}).passthrough();

const ReviewResponseSchema = z.object({ ok: z.literal(true) }).passthrough();

const KNOWN_ERRORS: Record<string, string> = {
  hepatic_reports_v1_unavailable: "Os modelos hepáticos ainda não foram ativados no servidor.",
  hepatic_category_unavailable: "A categoria hepática ainda não está ativa no servidor.",
  hepatic_contract_incomplete: "Revise os dados técnicos e as confirmações médicas antes de gerar.",
  invalid_hepatic_contract: "Os dados hepáticos não passaram na validação do servidor.",
  hepatic_quality_criterion_unapproved: "Revise o critério técnico: método/equipamento, jejum, IQR/mediana e confirmação do protocolo.",
  hepatic_confirmation_actor_mismatch: "As confirmações precisam ser feitas pelo médico desta sessão.",
  hepatic_report_content_changed: "Este laudo foi atualizado em outra sessão. Reabra a versão mais recente.",
  hepatic_report_idempotency_conflict: "Este exame já existe com outro conteúdo. Reabra a versão salva.",
  hepatic_report_identity_mismatch: "O rascunho não corresponde ao laudo salvo.",
  content_changed: "O conteúdo mudou. Gere e revise uma nova versão.",
  report_not_ready: "O rascunho ainda não está pronto para revisão.",
  writing_style_unavailable: "O estilo de escrita não está disponível.",
};

export function hepaticErrorMessage(body: unknown, status: number, fallback: string): string {
  if (status === 401) return "Sessão expirada. Entre novamente.";
  if (body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string") {
    return KNOWN_ERRORS[(body as { error: string }).error] ?? fallback;
  }
  return fallback;
}

/** `authedFetch` em produção; nos testes, um fetch sintético. */
export type HepaticSend = (path: string, init: RequestInit) => Promise<Response>;

export function buildHepaticPersistBody(
  assessment: HepaticAssessment,
  previous: PersistedHepaticReport | null,
): Record<string, unknown> {
  const safe = HepaticAssessmentSchema.parse(assessment);
  return previous
    ? { assessment: safe, report_id: previous.id, expected_revision: previous.contentRevision }
    : { assessment: safe };
}

/**
 * Fail-closed: aceita só um rascunho pendente, da categoria certa, com o id do
 * exame e EXATAMENTE os dados enviados. Qualquer divergência é erro, nunca
 * "ajuste" silencioso do lado do cliente.
 */
export function parseHepaticPersistResponse(body: unknown, sent: HepaticAssessment): PersistedHepaticReport {
  const parsed = CreateResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("A API devolveu uma resposta hepática inválida.");
  const report = parsed.data.report;
  const expectedCategory = hepaticCategoryForPurpose(sent.purpose);
  if (!expectedCategory || report.category_code !== expectedCategory) {
    throw new Error("A API devolveu uma categoria hepática incompatível com o rascunho.");
  }
  if (report.id !== sent.examId) throw new Error("A API devolveu outro laudo para este exame.");
  // Compara com o payload normalizado que de fato saiu do aparelho.
  const normalized = HepaticAssessmentSchema.safeParse(sent);
  if (!normalized.success || !sameHepaticAssessment(report.assessment, normalized.data)) {
    throw new Error("A API devolveu dados hepáticos diferentes dos que foram enviados.");
  }
  return {
    id: report.id,
    categoryCode: expectedCategory,
    contentRevision: report.content_revision,
    generatedOutput: report.generated_output,
    assessment: report.assessment,
  };
}

async function readBody(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function persistHepaticReportDraft(
  send: HepaticSend,
  assessment: HepaticAssessment,
  previous: PersistedHepaticReport | null = null,
): Promise<PersistedHepaticReport> {
  const response = await send("/api/v1/hepatic-reports", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(buildHepaticPersistBody(assessment, previous)),
  });
  const body = await readBody(response);
  if (!response.ok) throw new Error(hepaticErrorMessage(body, response.status, "Não foi possível salvar o rascunho hepático."));
  return parseHepaticPersistResponse(body, assessment);
}

export async function reviewHepaticReport(send: HepaticSend, report: PersistedHepaticReport): Promise<void> {
  const response = await send(`/api/v1/hepatic-reports/${encodeURIComponent(report.id)}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ expectedRevision: report.contentRevision, expectedText: report.generatedOutput }),
  });
  const body = await readBody(response);
  if (!response.ok || !ReviewResponseSchema.safeParse(body).success) {
    throw new Error(hepaticErrorMessage(body, response.status, "Não foi possível confirmar a revisão médica."));
  }
}
