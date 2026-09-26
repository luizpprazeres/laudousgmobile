/**
 * Exercita os handlers Web reais; somente Supabase e fetch externo são simulados.
 * Rodar de apps/web: node --import tsx tests/compositionRoutes.route.manual.ts
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { build } from 'esbuild'
import { extractReportPresentation, textToReportHtml } from '../src/components/laudar/reportRichText'

type Row = {
  id: string
  user_id: string
  category_code: string
  title: string
  laudo_text: string
  exam_state: unknown
  updated_at: string
}
type Query = { table: string; operation: string; filters: Record<string, unknown>; patch?: Partial<Row> }

const reportId = randomUUID()
const ownerId = randomUUID()
const otherId = randomUUID()
const compositionId = randomUUID()
const abdomenId = randomUUID()
const prostataId = randomUUID()
const contextId = randomUUID()
const timestamp = '2026-09-26T10:00:00.000Z'

function envelope() {
  return {
    kind: 'clinical-composition', envelopeVersion: 1, contractVersion: 'clinical-composition/v1',
    compositionId, revision: 1, associationCode: 'ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA',
    primaryComponentId: abdomenId, sharedBladderId: randomUUID(),
    components: [
      { componentId: abdomenId, categoryCode: 'ABDOMEN_TOTAL', acquisitionContextId: contextId, uiState: {} },
      { componentId: prostataId, categoryCode: 'PROSTATA_SUPRAPUBICA', acquisitionContextId: contextId, uiState: {} },
    ],
    rendered: { requestId: randomUUID(), revision: 1, fullText: 'LAUDO ORIGINAL', blocks: [] },
    extras: { calculatorBlocks: {}, companionNotes: [] },
    draft: { text: 'LAUDO ORIGINAL', html: '<h1>LAUDO ORIGINAL</h1>', sourceText: 'LAUDO ORIGINAL', sourceHtml: '<h1>LAUDO ORIGINAL</h1>', dirty: false },
  }
}

const row: Row = {
  id: reportId, user_id: ownerId, category_code: 'ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA',
  title: 'Composição', laudo_text: 'LAUDO ORIGINAL', exam_state: envelope(), updated_at: timestamp,
}
const state: { userId: string | null; row: Row | null; queries: Query[]; fetches: Array<{ url: string; init: RequestInit }>; styleId: string | null } = {
  userId: ownerId, row: structuredClone(row), queries: [], fetches: [], styleId: null,
}

function client() {
  return {
    auth: { getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null } }) },
    from(table: string) {
      const query: Query = { table, operation: 'select', filters: {} }
      const chain = {
        select(_columns: string) { return chain },
        update(patch: Partial<Row>) { query.operation = 'update'; query.patch = patch; return chain },
        eq(key: string, value: unknown) { query.filters[key] = value; return chain },
        async maybeSingle() {
          state.queries.push({ ...query, filters: { ...query.filters } })
          if (table === 'profiles') return { data: { default_writing_style_id: state.styleId }, error: null }
          const found = state.row && Object.entries(query.filters).every(([key, value]) => (state.row as unknown as Record<string, unknown>)[key] === value)
          if (!found) return { data: null, error: null }
          if (query.operation === 'update') {
            state.row = { ...state.row!, ...query.patch }
            return { data: { updated_at: state.row.updated_at }, error: null }
          }
          return { data: structuredClone(state.row), error: null }
        },
      }
      return chain
    },
  }
}

;(globalThis as unknown as { __routeClient: typeof client }).__routeClient = client

async function importRoute(path: string) {
  const result = await build({
    entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'esm',
    tsconfig: 'tsconfig.json',
    plugins: [{ name: 'route-client-mock', setup(api) {
      api.onResolve({ filter: /^@\/lib\/supabase\/server$/ }, () => ({ path: 'client', namespace: 'route-mock' }))
      api.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'route-mock' }))
      api.onLoad({ filter: /.*/, namespace: 'route-mock' }, (args) => ({
        contents: args.path === 'client' ? 'export const createClient = async () => globalThis.__routeClient()' : 'export default {}',
        loader: 'js',
      }))
    }}],
  })
  const code = result.outputFiles?.[0]?.text
  if (!code) throw new Error(`bundle vazio: ${path}`)
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}

async function importApiRoute() {
  const result = await build({
    entryPoints: ['../api/src/app/api/compositions/render/route.ts'],
    bundle: true, write: false, platform: 'node', format: 'esm', tsconfig: '../api/tsconfig.json',
    plugins: [{ name: 'api-boundary-mock', setup(api) {
      api.onResolve({ filter: /^@\/server\/catalog-api\/auth$/ }, () => ({ path: 'auth', namespace: 'api-mock' }))
      api.onResolve({ filter: /^@\/server\/renderer\/composition\/renderClinicalComposition$/ }, () => ({ path: 'renderer', namespace: 'api-mock' }))
      api.onLoad({ filter: /.*/, namespace: 'api-mock' }, (args) => ({
        contents: args.path === 'auth'
          ? 'export const autorizarServico = (req) => req.headers.get("authorization") === "Bearer test-token" ? { ok: true } : { ok: false, status: 401, erro: "não autorizado" }'
          : 'export const renderClinicalComposition = async () => { throw new Error("renderer não esperado neste teste de limite") }',
        loader: 'js',
      }))
    }}],
  })
  const code = result.outputFiles?.[0]?.text
  if (!code) throw new Error('bundle vazio: rota real da API')
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`) as Promise<{ POST: (req: Request) => Promise<Response> }>
}

function reset() {
  state.userId = ownerId
  state.row = structuredClone(row)
  state.queries = []
  state.fetches = []
  state.styleId = null
}

const context = (id = reportId) => ({ params: Promise.resolve({ id }) })
const request = (body: unknown) => new Request(`http://localhost/api/web-reports/${reportId}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})
const patchBody = () => ({ expectedUpdatedAt: timestamp, title: 'Composição editada', laudoText: 'LAUDO ORIGINAL', envelope: envelope() })

let passed = 0
const failures: string[] = []
async function test(name: string, run: () => Promise<void>) {
  reset()
  try { await run(); console.log(`PASS ${++passed}: ${name}`) }
  catch (e) { failures.push(name); console.error(`FAIL ${name}: ${e instanceof Error ? e.message : String(e)}`) }
}

async function main() {
  const reports = await importRoute('src/app/api/web-reports/[id]/route.ts') as {
    GET: (req: Request, ctx: ReturnType<typeof context>) => Promise<Response>
    PATCH: (req: Request, ctx: ReturnType<typeof context>) => Promise<Response>
  }
  const proxy = await importRoute('src/app/api/compositions/render/route.ts') as { POST: (req: Request) => Promise<Response> }
  const api = await importApiRoute()

  await test('GET 401 sem sessão, sem consulta à tabela', async () => {
    state.userId = null
    const res = await reports.GET(new Request('http://localhost'), context())
    assert.equal(res.status, 401); assert.equal(state.queries.length, 0)
  })
  await test('GET 404 para UUID inválido e laudo de outro usuário', async () => {
    assert.equal((await reports.GET(new Request('http://localhost'), context('inválido'))).status, 404)
    state.userId = otherId
    assert.equal((await reports.GET(new Request('http://localhost'), context())).status, 404)
    assert.deepEqual(state.queries.at(-1)?.filters, { id: reportId, user_id: otherId })
  })
  await test('GET recusa legado, versão e envelope inválidos', async () => {
    state.row!.exam_state = { figado: {} }
    assert.equal((await reports.GET(new Request('http://localhost'), context())).status, 422)
    state.row!.exam_state = { ...envelope(), envelopeVersion: 2 }
    assert.equal((await reports.GET(new Request('http://localhost'), context())).status, 422)
    state.row!.exam_state = { ...envelope(), components: [] }
    assert.equal((await reports.GET(new Request('http://localhost'), context())).status, 422)
  })
  await test('GET devolve texto, timestamp e envelope do próprio usuário', async () => {
    const res = await reports.GET(new Request('http://localhost'), context())
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.laudoText, row.laudo_text)
    assert.equal(body.updatedAt, timestamp)
    assert.equal(body.envelope.compositionId, compositionId)
  })
  await test('GET devolve JSON; apresentação e texto passam pela barreira HTML do consumidor', async () => {
    const raw = '<img src=x onerror=alert(1)><script>alert(2)</script>'
    state.row!.laudo_text = raw
    // Linha COERENTE (texto derivado do rascunho): o que se testa aqui é a
    // barreira de HTML, não a divergência texto × estado (caso próprio abaixo).
    const hostileHtml = `<p onclick="alert(3)">${raw}</p>`
    const base = envelope()
    state.row!.exam_state = {
      ...base,
      rendered: { ...base.rendered, fullText: raw },
      draft: { text: raw, html: hostileHtml, sourceText: raw, sourceHtml: hostileHtml, dirty: false },
      __presentation: { format: 'report-html-v1', html: hostileHtml },
    }
    const res = await reports.GET(new Request('http://localhost'), context())
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /application\/json/)
    const body = await res.json()
    assert.equal(body.laudoText, raw)
    const safe = extractReportPresentation(body.envelope)
    assert.ok(safe)
    assert.doesNotMatch(safe, /<script|<img|onerror|onclick/i)
    assert.match(textToReportHtml(body.laudoText), /&lt;img/)
  })
  await test('PATCH 401/404/400 não atualizam', async () => {
    state.userId = null
    assert.equal((await reports.PATCH(request(patchBody()), context())).status, 401)
    state.userId = ownerId
    assert.equal((await reports.PATCH(request(patchBody()), context('inválido'))).status, 404)
    assert.equal((await reports.PATCH(request({ ...patchBody(), envelope: { ...envelope(), contractVersion: 'clinical-composition/v2' } }), context())).status, 400)
    assert.equal((await reports.PATCH(request({ ...patchBody(), envelope: { ...envelope(), rendered: { ...envelope().rendered, revision: 2 } } }), context())).status, 400)
    assert.equal(state.queries.filter((q) => q.operation === 'update').length, 0)
  })
  await test('PATCH outro usuário e outro compositionId não atualizam', async () => {
    state.userId = otherId
    assert.equal((await reports.PATCH(request(patchBody()), context())).status, 404)
    state.userId = ownerId
    assert.equal((await reports.PATCH(request({ ...patchBody(), envelope: { ...envelope(), compositionId: randomUUID() } }), context())).status, 409)
    assert.equal(state.queries.filter((q) => q.operation === 'update').length, 0)
  })
  await test('PATCH expectedUpdatedAt obsoleto recebe 409 e não altera linha', async () => {
    const body = { ...patchBody(), expectedUpdatedAt: '2026-09-25T10:00:00.000Z' }
    assert.equal((await reports.PATCH(request(body), context())).status, 409)
    assert.equal(state.row?.laudo_text, row.laudo_text)
    assert.deepEqual(state.queries.at(-1)?.filters, { id: reportId, user_id: ownerId, updated_at: body.expectedUpdatedAt })
  })
  await test('PATCH válido atualiza com filtros id/user_id/updated_at', async () => {
    const res = await reports.PATCH(request(patchBody()), context())
    assert.equal(res.status, 200)
    const query = state.queries.find((q) => q.operation === 'update')
    assert.deepEqual(query?.filters, { id: reportId, user_id: ownerId, updated_at: timestamp })
    assert.equal(query?.patch?.laudo_text, 'LAUDO ORIGINAL')
    assert.equal(query?.patch?.category_code, 'ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA')
    assert.equal((query?.patch?.exam_state as { compositionId: string }).compositionId, compositionId)
  })
  await test('PATCH recusa título/texto acima dos limites', async () => {
    assert.equal((await reports.PATCH(request({ ...patchBody(), title: 'a'.repeat(201) }), context())).status, 400)
    assert.equal((await reports.PATCH(request({ ...patchBody(), laudoText: 'a'.repeat(100_001) }), context())).status, 400)
    assert.equal(state.queries.filter((q) => q.operation === 'update').length, 0)
  })
  await test('GET recusa reabrir quando o texto do histórico diverge do envelope', async () => {
    state.row!.laudo_text = 'TEXTO DIFERENTE'
    assert.equal((await reports.GET(new Request('http://localhost'), context())).status, 422)
    state.row!.laudo_text = 'LAUDO ORIGINAL\n\n/ab'
    state.row!.exam_state = { ...envelope(), initials: 'A1B' }
    assert.equal((await reports.GET(new Request('http://localhost'), context())).status, 422)
  })
  await test('PATCH aceita texto com iniciais derivado do envelope', async () => {
    const res = await reports.PATCH(request({ ...patchBody(), laudoText: 'LAUDO ORIGINAL\n\n/ab', envelope: { ...envelope(), initials: 'ab' } }), context())
    assert.equal(res.status, 200)
    reset()
    const semIniciais = await reports.PATCH(request({ ...patchBody(), laudoText: 'LAUDO ORIGINAL', envelope: { ...envelope(), initials: 'ab' } }), context())
    assert.equal(semIniciais.status, 400, 'iniciais no envelope e ausentes no texto: recusado')
  })
  await test('PATCH recusa iniciais que deixam HTML e texto salvo diferentes', async () => {
    const e = envelope()
    const html = '<h1 data-report-block="true">LAUDO ORIGINAL</h1><p data-report-block="true">/A1B</p>'
    const res = await reports.PATCH(request({
      ...patchBody(),
      laudoText: 'LAUDO ORIGINAL\n\n/ab',
      envelope: { ...e, initials: 'A1B', __presentation: { format: 'report-html-v1', html } },
    }), context())
    assert.equal(res.status, 400)
    assert.equal(state.queries.filter((q) => q.operation === 'update').length, 0)
  })
  await test('PATCH exige coerência entre texto salvo e envelope', async () => {
    const original = envelope()
    const withPresentation = {
      ...original,
      __presentation: { format: 'report-html-v1', html: '<h1 data-report-block="true">LAUDO ORIGINAL</h1>' },
    }
    const res = await reports.PATCH(request({ ...patchBody(), laudoText: 'TEXTO DIFERENTE', envelope: withPresentation }), context())
    assert.equal(res.status, 400)
    assert.equal(state.queries.filter((q) => q.operation === 'update').length, 0)
  })

  const originalFetch = globalThis.fetch
  const oldUrl = process.env.CATALOG_API_URL
  const oldToken = process.env.CATALOG_SERVICE_TOKEN
  process.env.CATALOG_API_URL = 'https://mock.invalid'
  process.env.CATALOG_SERVICE_TOKEN = 'test-token'
  globalThis.fetch = async (input, init) => {
    state.fetches.push({ url: String(input), init: init ?? {} })
    return Response.json({ echoed: JSON.parse(String(init?.body)) }, { status: 200 })
  }
  try {
    await test('proxy 401 sem sessão não chama perfil nem upstream', async () => {
      state.userId = null
      assert.equal((await proxy.POST(new Request('http://localhost', { method: 'POST', body: '{}' }))).status, 401)
      assert.equal(state.queries.length, 0); assert.equal(state.fetches.length, 0)
    })
    await test('proxy 400 para JSON inválido, writingStyle injetado e versão inválida', async () => {
      const invalid = [
        '{', JSON.stringify({ writingStyle: 'OBJETIVO' }),
        JSON.stringify({ contractVersion: 'clinical-composition/v2' }),
      ]
      for (const body of invalid) assert.equal((await proxy.POST(new Request('http://localhost', { method: 'POST', body }))).status, 400)
      assert.equal(state.fetches.length, 0)
    })
    await test('proxy atribui estilo do perfil e credencial só no upstream', async () => {
      const body = {
        contractVersion: 'clinical-composition/v1', requestId: randomUUID(), compositionId, revision: 1,
        associationCode: 'MAMARIA__PELVE_FEMININA',
        components: [
          { componentId: randomUUID(), categoryCode: 'MAMARIA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
          { componentId: randomUUID(), categoryCode: 'PELVE_FEMININA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
        ],
        sharedStructures: [],
      }
      const res = await proxy.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }))
      assert.equal(res.status, 200)
      assert.equal(state.fetches.length, 1)
      assert.equal(state.fetches[0].url, 'https://mock.invalid/api/compositions/render')
      assert.equal((state.fetches[0].init.headers as Record<string, string>).Authorization, 'Bearer test-token')
      assert.equal((JSON.parse(String(state.fetches[0].init.body)) as { writingStyle: string }).writingStyle, 'CLASSICO_COMPLETO')
    })
    await test('proxy usa OBJETIVO do perfil, sem aceitar estilo do navegador', async () => {
      state.styleId = '44444444-4444-4444-8444-444444444444'
      const body = {
        contractVersion: 'clinical-composition/v1', requestId: randomUUID(), compositionId, revision: 1,
        associationCode: 'MAMARIA__PELVE_FEMININA',
        components: [
          { componentId: randomUUID(), categoryCode: 'MAMARIA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
          { componentId: randomUUID(), categoryCode: 'PELVE_FEMININA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
        ], sharedStructures: [],
      }
      assert.equal((await proxy.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }))).status, 200)
      assert.equal((JSON.parse(String(state.fetches[0].init.body)) as { writingStyle: string }).writingStyle, 'OBJETIVO')
      assert.deepEqual(state.queries[0].filters, { id: ownerId })
    })
    await test('proxy sem URL de serviço retorna 503 sem fetch', async () => {
      delete process.env.CATALOG_API_URL
      try {
        const body = {
          contractVersion: 'clinical-composition/v1', requestId: randomUUID(), compositionId, revision: 1,
          associationCode: 'MAMARIA__PELVE_FEMININA',
          components: [
            { componentId: randomUUID(), categoryCode: 'MAMARIA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
            { componentId: randomUUID(), categoryCode: 'PELVE_FEMININA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
          ], sharedStructures: [],
        }
        assert.equal((await proxy.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }))).status, 503)
        assert.equal(state.fetches.length, 0)
      } finally { process.env.CATALOG_API_URL = 'https://mock.invalid' }
    })
    await test('proxy preserva 413 e corpo clínico de erro do serviço', async () => {
      const body = {
        contractVersion: 'clinical-composition/v1', requestId: randomUUID(), compositionId, revision: 1,
        associationCode: 'MAMARIA__PELVE_FEMININA',
        components: [
          { componentId: randomUUID(), categoryCode: 'MAMARIA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
          { componentId: randomUUID(), categoryCode: 'PELVE_FEMININA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
        ], sharedStructures: [],
      }
      globalThis.fetch = async () => Response.json({ status: 'error', error: { code: 'PAYLOAD_LIMIT_EXCEEDED' } }, { status: 413 })
      const res = await proxy.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }))
      assert.equal(res.status, 413)
      assert.equal((await res.json()).error.code, 'PAYLOAD_LIMIT_EXCEEDED')
      globalThis.fetch = async (input, init) => {
        state.fetches.push({ url: String(input), init: init ?? {} })
        return Response.json({ echoed: JSON.parse(String(init?.body)) }, { status: 200 })
      }
    })
    await test('proxy + handler real da API recusam corpo acima de 256 KiB', async () => {
      const body = {
        contractVersion: 'clinical-composition/v1', requestId: randomUUID(), compositionId, revision: 1,
        associationCode: 'MAMARIA__PELVE_FEMININA',
        components: [
          { componentId: randomUUID(), categoryCode: 'MAMARIA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: { padding: 'x'.repeat(270_000) } } },
          { componentId: randomUUID(), categoryCode: 'PELVE_FEMININA', acquisitionContextId: randomUUID(), data: { alteracoes: [], dados: {} } },
        ], sharedStructures: [],
      }
      globalThis.fetch = async (input, init) => {
        state.fetches.push({ url: String(input), init: init ?? {} })
        return api.POST(new Request(String(input), init))
      }
      const res = await proxy.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }))
      assert.equal(res.status, 413)
      assert.equal((await res.json()).error.code, 'PAYLOAD_LIMIT_EXCEEDED')
      assert.equal(state.fetches.length, 1)
      assert.ok(Buffer.byteLength(String(state.fetches[0].init.body)) > 256 * 1024)
    })
  } finally {
    globalThis.fetch = originalFetch
    if (oldUrl === undefined) delete process.env.CATALOG_API_URL; else process.env.CATALOG_API_URL = oldUrl
    if (oldToken === undefined) delete process.env.CATALOG_SERVICE_TOKEN; else process.env.CATALOG_SERVICE_TOKEN = oldToken
  }
  console.log(`${passed} passed, ${failures.length} failed`)
  if (failures.length) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
