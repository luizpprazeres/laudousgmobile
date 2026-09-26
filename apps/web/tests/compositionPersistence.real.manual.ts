/**
 * PERSISTÊNCIA REAL da composição — Supabase de verdade, RLS de verdade.
 *
 * Diferente de `composition.browser.manual.ts` (persistência simulada) e de
 * `compositionRoutes.route.manual.ts` (handlers reais, banco simulado), aqui o
 * banco é real: usuários sintéticos do Auth, INSERT pelo cliente com RLS,
 * GET/PATCH pelos handlers reais da Web usando a sessão de cada usuário,
 * concorrência por `updated_at` e isolamento de dono.
 *
 * ## Onde roda — e onde se RECUSA a rodar
 *
 * Só contra uma stack LOCAL (`supabase start`) ou um projeto de TESTE
 * explicitamente nomeado. O projeto de produção (`yldtkqrsbgcnwlydrrot`, o
 * banco do iOS/Android) é recusado sempre: este teste cria usuários e linhas.
 *
 * ## Preparar a stack local (uma vez)
 *
 *   supabase init            # na raiz, se ainda não houver supabase/config.toml
 *   supabase start
 *   # a tabela e as permissões versionadas do projeto:
 *   psql "$LOCAL_DB_URL" -f packages/db/src/sql/0018_web_reports.sql
 *   psql "$LOCAL_DB_URL" -c "grant select, insert, update, delete on public.web_reports to authenticated;"
 *
 * ## Rodar (da raiz; chaves da stack local, nunca de produção)
 *
 *   COMPOSITION_REAL_SUPABASE_URL=http://127.0.0.1:54321 \
 *   COMPOSITION_REAL_ANON_KEY=... COMPOSITION_REAL_SERVICE_ROLE_KEY=... \
 *   TSX_TSCONFIG_PATH=$PWD/apps/api/tsconfig.json \
 *   node --import tsx apps/web/tests/compositionPersistence.real.manual.ts
 *
 * Dados: dois usuários `@example.test` com senha aleatória e laudos gerados
 * pelo renderer a partir do estado INICIAL das telas. Nenhum dado de paciente.
 * Tudo é apagado no fim, inclusive em falha.
 */
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import { createClient as createSupabase, type SupabaseClient } from '@supabase/supabase-js'
import { CATEGORIES, initialExamState } from '../src/lib/deterministic'
import { associationByCode, startAssociation } from '../src/lib/composition/associations'
import { buildCompositionBody } from '../src/lib/composition/buildRequest'
import { buildEnvelope, parseEnvelope, savedTextOf, type CompositionEnvelopeV1 } from '../src/lib/composition/envelope'
import { ClinicalCompositionRequestV1Schema, type CompositionCategoryCode } from '../src/lib/composition/contract'
import { renderClinicalComposition } from '../../api/src/server/renderer/composition/renderClinicalComposition'

const PRODUCTION_REF = 'yldtkqrsbgcnwlydrrot'

/** Guarda: só local, ou um projeto de teste nomeado que não seja produção. */
export function alvoPermitido(url: string, allowRemoteRef?: string): { ok: true } | { ok: false; motivo: string } {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return { ok: false, motivo: 'URL inválida' }
  }
  if (url.includes(PRODUCTION_REF)) return { ok: false, motivo: 'alvo é o projeto de PRODUÇÃO' }
  if (host === '127.0.0.1' || host === 'localhost') return { ok: true }
  const ref = host.split('.')[0]
  if (allowRemoteRef && allowRemoteRef === ref && ref !== PRODUCTION_REF) return { ok: true }
  return { ok: false, motivo: 'alvo remoto não autorizado (use stack local ou COMPOSITION_REAL_ALLOW_REMOTE_TEST_REF)' }
}

type RouteModule = {
  GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
  PATCH: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
}

type Globals = { __realClient?: unknown }

/** Um cliente com a SESSÃO do usuário — é o que `createClient()` do servidor devolveria. */
function asUser(url: string, anonKey: string, accessToken: string | null) {
  const client = createSupabase(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  })
  return {
    auth: {
      getUser: async () => accessToken
        ? client.auth.getUser(accessToken)
        : { data: { user: null }, error: null },
    },
    from: client.from.bind(client),
  }
}

async function bundle(entry: string) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm',
    tsconfig: resolve('apps/web/tsconfig.json'),
    external: ['@supabase/*'],
    plugins: [{ name: 'real-session', setup(api) {
      api.onResolve({ filter: /^@\/lib\/supabase\/(server|client)$/ }, (args) => ({ path: args.path, namespace: 'real-session' }))
      api.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'real-session' }))
      api.onLoad({ filter: /.*/, namespace: 'real-session' }, (args) => ({
        loader: 'js',
        contents: args.path === 'server-only'
          ? 'export default {}'
          : args.path.endsWith('/server')
            ? 'export const createClient = async () => globalThis.__realClient'
            : 'export const createClient = () => globalThis.__realClient',
      }))
    }}],
  })
  const code = result.outputFiles?.[0]?.text
  if (!code) throw new Error(`bundle vazio: ${entry}`)
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}

const initialOf = (category: CompositionCategoryCode) => initialExamState(CATEGORIES[category])

async function composedEnvelope(initials: string): Promise<{ envelope: CompositionEnvelopeV1; laudoText: string }> {
  const session = startAssociation(associationByCode('ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA'), 'ABDOMEN_TOTAL', initialOf('ABDOMEN_TOTAL'), initialOf, randomUUID)
  const built = buildCompositionBody(session)
  if (!built.ok) throw new Error('estado inicial com pendência')
  const request = ClinicalCompositionRequestV1Schema.parse({ ...built.body, requestId: randomUUID(), revision: 1, writingStyle: 'OBJETIVO' })
  const response = await renderClinicalComposition(request, { resolveContext: async () => ({}) })
  if (response.status !== 'complete') throw new Error(`renderer: ${response.error.message}`)
  const text = response.document.fullText
  const envelope = buildEnvelope({
    session,
    rendered: { requestId: request.requestId, revision: 1, fullText: text, blocks: response.blocks },
    extras: { calculatorBlocks: {}, companionNotes: [] },
    draft: { text, html: `<p>${text}</p>`, sourceText: text, sourceHtml: `<p>${text}</p>`, dirty: false },
    initials,
  })
  return { envelope, laudoText: savedTextOf(envelope) }
}

async function main() {
  const url = process.env.COMPOSITION_REAL_SUPABASE_URL ?? ''
  const anonKey = process.env.COMPOSITION_REAL_ANON_KEY ?? ''
  const serviceKey = process.env.COMPOSITION_REAL_SERVICE_ROLE_KEY ?? ''
  if (!url || !anonKey || !serviceKey) {
    console.error('BLOQUEADO: defina COMPOSITION_REAL_SUPABASE_URL, COMPOSITION_REAL_ANON_KEY e COMPOSITION_REAL_SERVICE_ROLE_KEY de uma stack LOCAL/teste.')
    process.exit(2)
  }
  const alvo = alvoPermitido(url, process.env.COMPOSITION_REAL_ALLOW_REMOTE_TEST_REF)
  if (!alvo.ok) {
    console.error(`RECUSADO: ${alvo.motivo}. Nada foi escrito.`)
    process.exit(2)
  }

  const admin = createSupabase(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const globals = globalThis as Globals
  const created: string[] = []
  const signIn = async () => {
    const email = `composicao-${randomUUID()}@example.test`
    const password = randomBytes(24).toString('base64url')
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) throw new Error(`createUser: ${error?.message}`)
    created.push(data.user.id)
    const anon = createSupabase(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const signed = await anon.auth.signInWithPassword({ email, password })
    if (signed.error || !signed.data.session) throw new Error(`signIn: ${signed.error?.message}`)
    return { id: data.user.id, token: signed.data.session.access_token }
  }

  let passed = 0
  const step = (name: string) => console.log(`PASS ${++passed}: ${name}`)
  try {
    const route = await bundle(resolve('apps/web/src/app/api/web-reports/[id]/route.ts')) as RouteModule
    const webReports = await bundle(resolve('apps/web/src/lib/webReports.ts')) as {
      saveCompositionReport: (input: { associationCode: string; title: string; laudoText: string; envelope: unknown }) => Promise<{ id: string; updatedAt: string }>
    }
    const a = await signIn()
    const b = await signIn()
    const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
    const get = (id: string) => route.GET(new Request(`http://local/api/web-reports/${id}`), ctx(id))
    const patch = (id: string, body: unknown) => route.PATCH(new Request(`http://local/api/web-reports/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }), ctx(id))

    // 1. INSERT real pelo cliente do médico A (RLS: auth.uid() = user_id).
    globals.__realClient = asUser(url, anonKey, a.token)
    const first = await composedEnvelope('ab')
    const saved = await webReports.saveCompositionReport({
      associationCode: first.envelope.associationCode, title: 'Abdome total + Próstata', laudoText: first.laudoText, envelope: first.envelope,
    })
    const { data: row } = await admin.from('web_reports').select('user_id, category_code, laudo_text, updated_at').eq('id', saved.id).single()
    assert.equal(row?.user_id, a.id)
    assert.equal(row?.category_code, 'ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA')
    assert.equal(row?.laudo_text, first.laudoText)
    step('INSERT real com RLS grava a composição do dono, com texto derivado do envelope')

    // 2. INSERT forjando outro dono é barrado pela RLS.
    const forged = await (globals.__realClient as ReturnType<typeof asUser>).from('web_reports')
      .insert({ user_id: b.id, category_code: 'X', title: 'x', laudo_text: 'x', exam_state: null }).select('id').maybeSingle()
    assert.ok(forged.error, 'insert com user_id de outro usuário é recusado')
    step('RLS recusa INSERT em nome de outro usuário')

    // 3. GET real do dono: reabre o envelope idêntico.
    const g = await get(saved.id)
    assert.equal(g.status, 200)
    const body = await g.json() as { laudoText: string; updatedAt: string; envelope: unknown }
    assert.equal(body.laudoText, first.laudoText)
    const reopened = parseEnvelope(body.envelope)
    assert.equal(reopened.kind, 'composition')
    if (reopened.kind === 'composition') assert.deepEqual(reopened.envelope, first.envelope)
    step('GET real devolve o envelope salvo idêntico para reabrir')

    // 4. Outro médico não lê nem grava (404), nem direto pela API de dados.
    globals.__realClient = asUser(url, anonKey, b.token)
    assert.equal((await get(saved.id)).status, 404)
    assert.equal((await patch(saved.id, { expectedUpdatedAt: body.updatedAt, title: 't', laudoText: first.laudoText, envelope: first.envelope })).status, 404)
    const direct = await (globals.__realClient as ReturnType<typeof asUser>).from('web_reports').select('id').eq('id', saved.id)
    assert.deepEqual(direct.data ?? [], [])
    const directUpdate = await (globals.__realClient as ReturnType<typeof asUser>).from('web_reports').update({ laudo_text: 'invasão' }).eq('id', saved.id).select('id')
    assert.deepEqual(directUpdate.data ?? [], [])
    step('outro usuário: GET/PATCH 404 e RLS esconde a linha (select e update vazios)')

    // 5. Sem sessão: 401, e a API de dados anônima não vê nada.
    globals.__realClient = asUser(url, anonKey, null)
    assert.equal((await get(saved.id)).status, 401)
    const anonRead = await createSupabase(url, anonKey, { auth: { persistSession: false } }).from('web_reports').select('id').eq('id', saved.id)
    assert.deepEqual(anonRead.data ?? [], [])
    step('sem sessão: 401 na rota e nenhuma linha pela chave anônima')

    // 6. PATCH real do dono com a versão aberta: grava e muda updated_at.
    globals.__realClient = asUser(url, anonKey, a.token)
    const edited = { ...first.envelope, draft: { ...first.envelope.draft, text: `${first.envelope.draft.text}\n\nNota sintética.`, html: `${first.envelope.draft.html}<p>Nota sintética.</p>`, dirty: true } }
    const editedText = savedTextOf(edited)
    const p1 = await patch(saved.id, { expectedUpdatedAt: body.updatedAt, title: 'Abdome total + Próstata', laudoText: editedText, envelope: edited })
    assert.equal(p1.status, 200)
    const p1Body = await p1.json() as { updatedAt: string }
    assert.notEqual(p1Body.updatedAt, body.updatedAt)
    const { data: afterPatch } = await admin.from('web_reports').select('laudo_text').eq('id', saved.id).single()
    assert.equal(afterPatch?.laudo_text, editedText)
    step('PATCH real grava a edição e avança updated_at')

    // 7. Concorrência: a aba que abriu a versão anterior recebe 409 e nada muda.
    const stale = await patch(saved.id, { expectedUpdatedAt: body.updatedAt, title: 't', laudoText: first.laudoText, envelope: first.envelope })
    assert.equal(stale.status, 409)
    const { data: afterStale } = await admin.from('web_reports').select('laudo_text, updated_at').eq('id', saved.id).single()
    assert.equal(afterStale?.laudo_text, editedText)
    assert.equal(new Date(afterStale!.updated_at).getTime(), new Date(p1Body.updatedAt).getTime())
    step('concorrência: updated_at desatualizado → 409, linha intacta')

    // 8. Texto divergente do envelope → 400, sem escrita.
    const incoherent = await patch(saved.id, { expectedUpdatedAt: p1Body.updatedAt, title: 't', laudoText: 'TEXTO DIFERENTE', envelope: edited })
    assert.equal(incoherent.status, 400)
    step('texto divergente do envelope → 400')

    // 9. Reabrir depois do PATCH devolve a edição.
    const g2 = await (await get(saved.id)).json() as { laudoText: string; envelope: unknown }
    assert.equal(g2.laudoText, editedText)
    const r2 = parseEnvelope(g2.envelope)
    assert.equal(r2.kind === 'composition' && r2.envelope.draft.dirty, true)
    step('reabertura após PATCH traz o rascunho editado')

    // 10. Laudo avulso (legado) do próprio dono não reabre para edição.
    const legacy = await (globals.__realClient as ReturnType<typeof asUser>).from('web_reports')
      .insert({ user_id: a.id, category_code: 'ABDOMEN_TOTAL', title: 'Abdome total', laudo_text: 'texto sintético', exam_state: { figado: {} } })
      .select('id').single()
    assert.ok(legacy.data?.id)
    assert.equal((await get(legacy.data!.id)).status, 422)
    step('legado real: GET 422, continua só texto')

    console.log(`${passed} checks de persistência REAL passaram (${new URL(url).host})`)
  } finally {
    // Limpeza: apagar o usuário apaga os laudos (FK on delete cascade).
    for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => undefined)
  }
}

if (process.argv[1]?.endsWith('compositionPersistence.real.manual.ts')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
