import type { ClinicalModelInput } from '@laudousg/shared'

export type PersistedClinicalReport = {
  id: string
  contentRevision: number
  generatedOutput: string
}

export type ClinicalReportFlowState = {
  phase: 'editing' | 'persisting' | 'pending_review' | 'reviewing' | 'reviewed'
  persisted: PersistedClinicalReport | null
  error: string | null
}

export const initialClinicalReportFlow: ClinicalReportFlowState = {
  phase: 'editing',
  persisted: null,
  error: null,
}

export function invalidateClinicalReportFlow(): ClinicalReportFlowState {
  return initialClinicalReportFlow
}

export function startClinicalReportPersistence(): ClinicalReportFlowState {
  return { phase: 'persisting', persisted: null, error: null }
}

export function clinicalReportPersisted(report: PersistedClinicalReport): ClinicalReportFlowState {
  return { phase: 'pending_review', persisted: report, error: null }
}

export function clinicalReportPersistenceFailed(message: string): ClinicalReportFlowState {
  return { phase: 'editing', persisted: null, error: message }
}

export function startClinicalReportReview(state: ClinicalReportFlowState): ClinicalReportFlowState {
  if (!state.persisted || state.phase !== 'pending_review') return state
  return { ...state, phase: 'reviewing', error: null }
}

export function clinicalReportReviewed(state: ClinicalReportFlowState): ClinicalReportFlowState {
  if (!state.persisted) return state
  return { ...state, phase: 'reviewed', error: null }
}

export function clinicalReportReviewFailed(state: ClinicalReportFlowState, message: string): ClinicalReportFlowState {
  if (!state.persisted) return clinicalReportPersistenceFailed(message)
  return { ...state, phase: 'pending_review', error: message }
}

export function canReleaseClinicalReport(state: ClinicalReportFlowState): boolean {
  return state.phase === 'reviewed' && state.persisted !== null
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    const known: Record<string, string> = {
      clinical_models_v1_unavailable: 'Os novos modelos ainda não foram ativados em conjunto.',
      clinical_contract_incomplete: 'Revise os campos clínicos indicados antes de gerar.',
      content_changed: 'O laudo mudou após a prévia. Gere o rascunho novamente.',
      report_not_ready: 'O rascunho ainda não está pronto para revisão.',
      review_unavailable: 'A revisão médica está temporariamente indisponível.',
    }
    return known[body.error] ?? fallback
  }
  return fallback
}

export async function persistClinicalReportDraft(contract: ClinicalModelInput): Promise<PersistedClinicalReport> {
  const response = await fetch('/api/v1/clinical-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contract: { ...contract, physicianReviewed: false } }),
  })
  const body = await response.json().catch(() => null) as {
    error?: string
    report?: { id?: unknown; content_revision?: unknown; generated_output?: unknown }
  } | null
  const report = body?.report
  if (!response.ok || typeof report?.id !== 'string' || typeof report.content_revision !== 'number' || typeof report.generated_output !== 'string') {
    throw new Error(errorMessage(body, 'Não foi possível salvar o rascunho clínico.'))
  }
  return {
    id: report.id,
    contentRevision: report.content_revision,
    generatedOutput: report.generated_output,
  }
}

export async function reviewClinicalReport(report: PersistedClinicalReport): Promise<void> {
  const response = await fetch(`/api/v1/clinical-reports/${encodeURIComponent(report.id)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expectedRevision: report.contentRevision,
      expectedText: report.generatedOutput,
    }),
  })
  const body = await response.json().catch(() => null) as { ok?: unknown; error?: string } | null
  if (!response.ok || body?.ok !== true) {
    throw new Error(errorMessage(body, 'Não foi possível confirmar a revisão médica.'))
  }
}
