import type { HepaticAssessment } from '@laudousg/shared'

export type PersistedHepaticReport = { id: string; contentRevision: number; generatedOutput: string }
export type HepaticReportFlowState = {
  phase: 'editing' | 'persisting' | 'pending_review' | 'reviewing' | 'reviewed'
  persisted: PersistedHepaticReport | null
  error: string | null
}

export const initialHepaticReportFlow: HepaticReportFlowState = { phase: 'editing', persisted: null, error: null }
/** Mantém a linha persistida como âncora para a próxima atualização. */
export const invalidateHepaticReportFlow = (state: HepaticReportFlowState): HepaticReportFlowState => ({ phase: 'editing', persisted: state.persisted, error: null })
export const startHepaticReportPersistence = (state: HepaticReportFlowState): HepaticReportFlowState => ({ phase: 'persisting', persisted: state.persisted, error: null })
export const hepaticReportPersisted = (persisted: PersistedHepaticReport): HepaticReportFlowState => ({ phase: 'pending_review', persisted, error: null })
export const hepaticReportPersistenceFailed = (state: HepaticReportFlowState, error: string): HepaticReportFlowState => ({ phase: 'editing', persisted: state.persisted, error })
export function startHepaticReportReview(state: HepaticReportFlowState): HepaticReportFlowState {
  return state.phase === 'pending_review' && state.persisted ? { ...state, phase: 'reviewing', error: null } : state
}
export function hepaticReportReviewed(state: HepaticReportFlowState): HepaticReportFlowState {
  return state.persisted ? { ...state, phase: 'reviewed', error: null } : state
}
export function hepaticReportReviewFailed(state: HepaticReportFlowState, error: string): HepaticReportFlowState {
  return state.persisted ? { ...state, phase: 'pending_review', error } : { phase: 'editing', persisted: null, error }
}
export const canReleaseHepaticReport = (state: HepaticReportFlowState) => state.phase === 'reviewed' && state.persisted !== null

function message(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object' || !('error' in body) || typeof body.error !== 'string') return fallback
  const known: Record<string, string> = {
    hepatic_reports_v1_unavailable: 'Os modelos hepáticos ainda não foram ativados no servidor.',
    hepatic_contract_incomplete: 'Revise os dados técnicos e as confirmações médicas antes de gerar.',
    hepatic_quality_criterion_unapproved: 'Revise o critério técnico: método/equipamento, jejum, IQR/mediana e confirmação do protocolo.',
    hepatic_report_content_changed: 'Este laudo foi atualizado em outra sessão. Reabra a versão mais recente.',
    hepatic_report_idempotency_conflict: 'Este exame já existe com outro conteúdo. Reabra a versão salva.',
    content_changed: 'O conteúdo mudou. Gere e revise uma nova versão.',
    report_not_ready: 'O rascunho ainda não está pronto para revisão.',
  }
  return known[body.error] ?? fallback
}

export async function persistHepaticReportDraft(assessment: HepaticAssessment, previous: PersistedHepaticReport | null = null): Promise<PersistedHepaticReport> {
  const response = await fetch('/api/v1/hepatic-reports', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(previous
      ? { assessment, report_id: previous.id, expected_revision: previous.contentRevision }
      : { assessment }),
  })
  const body = await response.json().catch(() => null) as { error?: string; report?: { id?: unknown; content_revision?: unknown; generated_output?: unknown } } | null
  const report = body?.report
  if (!response.ok || typeof report?.id !== 'string' || typeof report.content_revision !== 'number' || typeof report.generated_output !== 'string') {
    throw new Error(message(body, 'Não foi possível salvar o rascunho hepático.'))
  }
  return { id: report.id, contentRevision: report.content_revision, generatedOutput: report.generated_output }
}

export async function reviewHepaticReport(report: PersistedHepaticReport): Promise<void> {
  const response = await fetch(`/api/v1/hepatic-reports/${encodeURIComponent(report.id)}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: report.contentRevision, expectedText: report.generatedOutput }),
  })
  const body = await response.json().catch(() => null) as { ok?: unknown; error?: string } | null
  if (!response.ok || body?.ok !== true) throw new Error(message(body, 'Não foi possível confirmar a revisão médica.'))
}
