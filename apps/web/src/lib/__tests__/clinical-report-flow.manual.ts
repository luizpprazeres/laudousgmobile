import assert from 'node:assert/strict'
import { createInitialClinicalModelInput, renderClinicalModelReport, validateClinicalModelInput, type DopplerVenosoMmssInput } from '@laudousg/shared'
import {
  canReleaseClinicalReport,
  clinicalReportPersisted,
  clinicalReportReviewed,
  initialClinicalReportFlow,
  invalidateClinicalReportFlow,
  persistClinicalReportDraft,
  reviewClinicalReport,
  startClinicalReportPersistence,
  startClinicalReportReview,
} from '../clinicalReportFlow'
import { CLINICAL_WEB_MODELS, isClinicalWebModel } from '../clinicalModels'

const originalFetch = globalThis.fetch
const requests: Array<{ url: string; body: unknown }> = []
const reportId = '11111111-1111-4111-8111-111111111111'

async function main() {
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body ?? '{}')) as unknown
    requests.push({ url, body })
    if (url.endsWith('/review')) return Response.json({ ok: true })
    return Response.json({
      report: {
        id: reportId,
        content_revision: 3,
        generated_output: 'Laudo sintético persistido',
      },
    }, { status: 201 })
  }

  try {
    assert.equal(CLINICAL_WEB_MODELS.length, 5)
    for (const { id } of CLINICAL_WEB_MODELS) assert.equal(isClinicalWebModel(id), true, `${id} deve estar ativo na Web`)
    assert.equal(isClinicalWebModel('TESTE'), false)

    let state = initialClinicalReportFlow
    assert.equal(canReleaseClinicalReport(state), false)

    const contract = createInitialClinicalModelInput('DOPPLER_VENOSO_MMSS') as DopplerVenosoMmssInput
    const previewValidation = validateClinicalModelInput(contract, { requirePhysicianReview: false })
    assert.equal(previewValidation.success, true, 'prévia estrutural não depende do evento posterior de revisão')
    assert.match(renderClinicalModelReport(contract), /DOPPLER VENOSO/)
    contract.physicianReviewed = true
    state = startClinicalReportPersistence()
    const persisted = await persistClinicalReportDraft(contract)
    assert.equal((requests[0]!.body as { contract: { physicianReviewed: boolean } }).contract.physicianReviewed, false, 'geração nunca aceita autorrevisão do cliente')
    state = clinicalReportPersisted(persisted)
    assert.equal(state.phase, 'pending_review')
    assert.equal(canReleaseClinicalReport(state), false, 'persistir rascunho ainda não libera cópia/Sala')

    state = startClinicalReportReview(state)
    await reviewClinicalReport(persisted)
    assert.deepEqual(requests[1], {
      url: `/api/v1/clinical-reports/${reportId}/review`,
      body: { expectedRevision: 3, expectedText: 'Laudo sintético persistido' },
    }, 'revisão deve ficar vinculada à revisão e ao texto persistidos')
    state = clinicalReportReviewed(state)
    assert.equal(canReleaseClinicalReport(state), true)

    state = invalidateClinicalReportFlow()
    assert.equal(state.persisted, null, 'qualquer edição descarta reportId/revisão locais')
    assert.equal(canReleaseClinicalReport(state), false, 'edição volta a bloquear cópia/Sala')
    console.log('clinical report web flow: OK')
  } finally {
    globalThis.fetch = originalFetch
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
