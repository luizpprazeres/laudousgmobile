import assert from 'node:assert/strict'
import {
  COMPANION_FORM_PATCH_CATEGORY,
  COMPANION_FORM_PATCH_VERSION,
  CompanionFormPatchClientError,
  applyCompanionCarotidFormPatch,
  companionFormPatchReviewItems,
  extractCompanionFormPatch,
  parseCompanionFormPatchRequest,
  parseCompanionFormPatchResponse,
} from './companionFormPatch'

const validRequest = {
  contractVersion: COMPANION_FORM_PATCH_VERSION,
  category: COMPANION_FORM_PATCH_CATEGORY,
  sourceKind: 'transcript',
  text: '  carótida interna direita com VPS de 82 cm/s  ',
}
assert.deepEqual(parseCompanionFormPatchRequest(validRequest), { ...validRequest, text: validRequest.text.trim() })
assert.equal(parseCompanionFormPatchRequest({ ...validRequest, contractVersion: 'companion-form-patch/v2' }), null)
assert.equal(parseCompanionFormPatchRequest({ ...validRequest, category: 'OBSTETRICA' }), null)
assert.equal(parseCompanionFormPatchRequest({ ...validRequest, sourceKind: 'image' }), null)
assert.equal(parseCompanionFormPatchRequest({ ...validRequest, text: ' ' }), null)
assert.equal(parseCompanionFormPatchRequest({ ...validRequest, text: 'x'.repeat(2_001) }), null)

const response = {
  contractVersion: COMPANION_FORM_PATCH_VERSION,
  category: COMPANION_FORM_PATCH_CATEGORY,
  sourceKind: 'transcript',
  data: { carotidMeasurements: [{ side: 'direita', vessel: 'interna', psv: '82' }] },
  warnings: [{ code: 'UNIT_INFERRED', message: 'Unidade inferida.', blocking: false }],
}
assert.deepEqual(parseCompanionFormPatchResponse(response), {
  ...response,
  data: { ...response.data, carotidPlaques: [], carotidClassifications: [] },
})
assert.equal(parseCompanionFormPatchResponse({ ...response, data: [] }), null)
assert.equal(parseCompanionFormPatchResponse({ ...response, warnings: [12] }), null)
assert.equal(parseCompanionFormPatchResponse({ ...response, sourceKind: 'image' }), null)

async function main() {
const originalFetch = globalThis.fetch
try {
  let sent: RequestInit | undefined
  globalThis.fetch = async (_input, init) => {
    sent = init
    return Response.json(parseCompanionFormPatchResponse(response))
  }
  const result = await extractCompanionFormPatch({ sourceKind: 'text', text: 'VPS ACI direita 82 cm/s' })
  assert.equal(result.data.carotidMeasurements instanceof Array, true)
  assert.deepEqual(companionFormPatchReviewItems(result).map(({ label, value }) => [label, value]), [
    ['Carótida interna direita', 'PSV 82 cm/s'],
  ])
  assert.equal(applyCompanionCarotidFormPatch({}, result).direita?.interna_vps, '82')
  assert.deepEqual(JSON.parse(String(sent?.body)), {
    contractVersion: COMPANION_FORM_PATCH_VERSION,
    category: COMPANION_FORM_PATCH_CATEGORY,
    sourceKind: 'text',
    text: 'VPS ACI direita 82 cm/s',
  })

  globalThis.fetch = async () => Response.json({
    error: 'no_applicable_findings',
    warnings: [{ code: 'CLASSIFICATION_SIDE_MISSING', message: 'O lado da classificação não foi informado.', blocking: true }],
  }, { status: 422 })
  await assert.rejects(
    () => extractCompanionFormPatch({ sourceKind: 'text', text: 'VPS' }),
    (error) => error instanceof CompanionFormPatchClientError
      && error.code === 'no_applicable_findings'
      && /Não reconheci campos seguros/.test(error.message)
      && /lado da classificação/.test(error.message)
      && error.warnings.length === 1,
  )
  globalThis.fetch = async () => Response.json({ ok: true })
  await assert.rejects(
    () => extractCompanionFormPatch({ sourceKind: 'text', text: 'VPS' }),
    /dados inválidos/,
  )
} finally {
  globalThis.fetch = originalFetch
}

console.log('companionFormPatch: ok')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
