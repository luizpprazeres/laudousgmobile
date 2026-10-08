import assert from 'node:assert/strict'
import { handleCompanionFormPatchProxy } from '../../../../lib/companionFormPatchProxy'
import {
  COMPANION_FORM_PATCH_CATEGORY,
  COMPANION_FORM_PATCH_VERSION,
} from '../../../../lib/companionFormPatch'

const body = {
  contractVersion: COMPANION_FORM_PATCH_VERSION,
  category: COMPANION_FORM_PATCH_CATEGORY,
  sourceKind: 'text',
  text: 'VPS da carótida interna direita: 82 cm/s.',
}
const request = (value: unknown, contentType = 'application/json') => new Request('http://localhost/api/companion/form-patch', {
  method: 'POST',
  headers: { 'content-type': contentType },
  body: typeof value === 'string' ? value : JSON.stringify(value),
})

const unauthenticated = () => Promise.resolve({ authenticated: false })
const authenticated = () => Promise.resolve({ authenticated: true, token: 'session-token' })
const apiBase = () => 'https://api.example.test'

async function main() {
assert.equal((await handleCompanionFormPatchProxy(request(body), {
  authenticate: unauthenticated,
  apiBase,
  fetchImpl: fetch,
})).status, 401)
assert.equal((await handleCompanionFormPatchProxy(request(body, 'text/plain'), {
  authenticate: authenticated,
  apiBase,
  fetchImpl: fetch,
})).status, 415)
assert.equal((await handleCompanionFormPatchProxy(request('{'), {
  authenticate: authenticated,
  apiBase,
  fetchImpl: fetch,
})).status, 400)
assert.equal((await handleCompanionFormPatchProxy(request({ ...body, category: 'OBSTETRICA' }), {
  authenticate: authenticated,
  apiBase,
  fetchImpl: fetch,
})).status, 400)
assert.equal((await handleCompanionFormPatchProxy(request(body), {
  authenticate: authenticated,
  apiBase: () => undefined,
  fetchImpl: fetch,
})).status, 503)

let upstreamUrl = ''
let upstreamInit: RequestInit | undefined
const successfulFetch: typeof fetch = async (input, init) => {
  upstreamUrl = String(input)
  upstreamInit = init
  return Response.json({
    contractVersion: COMPANION_FORM_PATCH_VERSION,
    category: COMPANION_FORM_PATCH_CATEGORY,
    sourceKind: 'text',
    data: { carotidMeasurements: [{ side: 'direita', vessel: 'interna', psv: '82' }] },
    warnings: [],
  })
}
const successful = await handleCompanionFormPatchProxy(request(body), {
  authenticate: authenticated,
  apiBase,
  fetchImpl: successfulFetch,
})
assert.equal(successful.status, 200)
assert.equal(upstreamUrl, 'https://api.example.test/api/companion/form-patch')
assert.equal((upstreamInit?.headers as Record<string, string>).Authorization, 'Bearer session-token')
assert.deepEqual(JSON.parse(String(upstreamInit?.body)), body)
assert.equal(successful.headers.get('cache-control'), 'no-store')

const malformed = await handleCompanionFormPatchProxy(request(body), {
  authenticate: authenticated,
  apiBase,
  fetchImpl: async () => Response.json({ ok: true }),
})
assert.equal(malformed.status, 502)

const refused = await handleCompanionFormPatchProxy(request(body), {
  authenticate: authenticated,
  apiBase,
  fetchImpl: async () => Response.json({ error: 'Não foi possível extrair medidas.' }, { status: 422 }),
})
assert.equal(refused.status, 422)
assert.deepEqual(await refused.json(), { error: 'Não foi possível extrair medidas.' })

const unavailable = await handleCompanionFormPatchProxy(request(body), {
  authenticate: authenticated,
  apiBase,
  fetchImpl: async () => { throw new Error('offline') },
})
assert.equal(unavailable.status, 503)

console.log('companionFormPatch route: ok')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
