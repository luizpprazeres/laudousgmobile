import assert from 'node:assert/strict'
import {
  canReleaseHepaticReport,
  hepaticReportPersisted,
  hepaticReportPersistenceFailed,
  hepaticReportReviewed,
  initialHepaticReportFlow,
  invalidateHepaticReportFlow,
  persistHepaticReportDraft,
  reviewHepaticReport,
  startHepaticReportReview,
  startHepaticReportPersistence,
} from '../src/lib/hepaticReportFlow.ts'
import { HEPATIC_WORKSPACE_CONFIGURATION, createInitialHepaticAssessment, hasApprovedHepaticQualityConfiguration } from '../src/lib/hepaticModels.ts'

const assessment = createInitialHepaticAssessment('ELASTOGRAFIA_HEPATICA', 'c2c4c302-2f31-424c-92df-08265908a158')
assert.equal(assessment.purpose, 'elastography')
assert.equal(assessment.modules.fat.status, 'not_performed')
assert.equal(assessment.modules.stiffness.status, 'not_performed')
assert.equal(hasApprovedHepaticQualityConfiguration(HEPATIC_WORKSPACE_CONFIGURATION), false, 'sem registro técnico aprovado a geração fica bloqueada')

const requests: Array<{ url: string; body: unknown }> = []
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input)
  requests.push({ url, body: JSON.parse(String(init?.body ?? '{}')) })
  if (url.endsWith('/review')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
  const updating = requests.length === 2
  return new Response(JSON.stringify({ report: {
    id: '18336f97-7cf7-4adb-a9e2-837f86930141', content_revision: updating ? 4 : 3, generated_output: updating ? 'LAUDO HEPÁTICO ATUALIZADO' : 'LAUDO HEPÁTICO',
  } }), { status: 200 })
}) as typeof fetch

async function main() {
  const persisted = await persistHepaticReportDraft(assessment)
  assert.equal(requests[0].url, '/api/v1/hepatic-reports')
  assert.deepEqual(requests[0].body, { assessment })
  assert.equal(persisted.contentRevision, 3)

  const changed = { ...assessment, revision: 1, indication: 'Controle' }
  const updated = await persistHepaticReportDraft(changed, persisted)
  assert.equal(requests[1].url, '/api/v1/hepatic-reports')
  assert.deepEqual(requests[1].body, { assessment: changed, report_id: persisted.id, expected_revision: 3 })
  assert.equal(updated.id, persisted.id)
  assert.equal(updated.contentRevision, 4)
  assert.equal(updated.generatedOutput, 'LAUDO HEPÁTICO ATUALIZADO')

  let flow = hepaticReportPersisted(updated)
  flow = invalidateHepaticReportFlow(flow)
  assert.equal(flow.persisted?.id, persisted.id, 'editar mantém reportId como âncora')
  flow = startHepaticReportPersistence(flow)
  flow = hepaticReportPersistenceFailed(flow, 'falha transitória')
  assert.equal(flow.persisted?.id, persisted.id, 'falha e retry mantêm a mesma âncora')
  flow = hepaticReportPersisted(updated)
  flow = startHepaticReportReview(flow)
  assert.equal(flow.phase, 'reviewing')
  await reviewHepaticReport(updated)
  assert.equal(requests[2].url, `/api/v1/hepatic-reports/${persisted.id}/review`)
  assert.deepEqual(requests[2].body, { expectedRevision: 4, expectedText: 'LAUDO HEPÁTICO ATUALIZADO' })
  flow = hepaticReportReviewed(flow)
  assert.equal(canReleaseHepaticReport(flow), true)
  assert.equal(canReleaseHepaticReport(initialHepaticReportFlow), false)

  console.log('hepatic Web flow: initialization, persistence and review contract passed')
}

void main()
