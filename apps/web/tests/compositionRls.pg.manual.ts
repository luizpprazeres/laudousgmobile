/**
 * RLS e concorrência de `web_reports` em POSTGRES REAL (temporário).
 *
 * O que é real: o motor Postgres 17, as políticas de `0018_web_reports.sql`
 * (arquivo versionado, aplicado sem alteração), os papéis `anon`/`authenticated`
 * e as MESMAS consultas que o cliente (INSERT) e a rota (`GET/PATCH
 * /api/web-reports/[id]`) produzem: filtro por `id` + `user_id` e, no PATCH,
 * `updated_at` esperado.
 *
 * O que NÃO é: Supabase Auth nem PostgREST. `auth.uid()` é emulado como no
 * Supabase (claim `sub` da requisição); não há JWT, gateway nem rede. Isto
 * prova as políticas SQL e a concorrência, não o caminho HTTP ponta a ponta —
 * esse fica para `compositionPersistence.real.manual.ts` numa stack local.
 *
 * Dados sintéticos; o cluster vive num diretório temporário e é apagado.
 *
 *   PG_EMBEDDED_MODULE=<dir>/node_modules/embedded-postgres \
 *   node --import tsx apps/web/tests/compositionRls.pg.manual.ts     (da raiz)
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const moduleDir = process.env.PG_EMBEDDED_MODULE
if (!moduleDir) {
  console.error('BLOQUEADO: defina PG_EMBEDDED_MODULE (pacote embedded-postgres instalado fora do produto).')
  process.exit(2)
}
const req = createRequire(join(moduleDir, 'package.json'))

type Client = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>; end: () => Promise<void>; connect: () => Promise<void> }

async function main() {
  const EmbeddedPostgres = (await import(join(moduleDir!, 'dist/index.js'))).default
  const { Client: PgClient } = req('pg') as { Client: new (cfg: Record<string, unknown>) => Client }
  const dir = mkdtempSync(join(tmpdir(), 'laudousg-rls-'))
  const port = 55000 + Math.floor(Math.random() * 5000)
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port, persistent: false, onLog: () => undefined })
  const connect = async () => {
    const c = new PgClient({ host: '127.0.0.1', port, user: 'postgres', password: 'postgres', database: 'postgres' })
    await c.connect()
    return c
  }
  let passed = 0
  const step = (name: string) => console.log(`PASS ${++passed}: ${name}`)
  const clients: Client[] = []
  try {
    await pg.initialise()
    await pg.start()
    const admin = await connect()
    clients.push(admin)

    // O mínimo do Supabase que as políticas usam: auth.users, auth.uid() e os papéis.
    await admin.query(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      grant usage on schema public to anon, authenticated;
    `)
    // A migração VERSIONADA, byte a byte.
    await admin.query(readFileSync(resolve('packages/db/src/sql/0018_web_reports.sql'), 'utf8'))
    // Permissões: as de 0024 + o SELECT padrão que o Supabase concede (lido no metadado de produção).
    await admin.query(`
      grant select on public.web_reports to anon, authenticated;
      grant insert, update, delete on public.web_reports to authenticated;
    `)
    const a = randomUUID()
    const b = randomUUID()
    await admin.query('insert into auth.users (id) values ($1), ($2)', [a, b])

    /** Uma "requisição" com a identidade de um usuário (ou anônima). */
    const as = async (c: Client, sub: string | null) => {
      await c.query('reset role')
      await c.query(`select set_config('request.jwt.claim.sub', $1, false)`, [sub ?? ''])
      await c.query(sub ? 'set role authenticated' : 'set role anon')
    }
    const s1 = await connect()
    const s2 = await connect()
    clients.push(s1, s2)

    const envelope = { kind: 'clinical-composition', synthetic: true }
    // INSERT do cliente (saveCompositionReport): user_id = o próprio.
    await as(s1, a)
    const ins = await s1.query(
      `insert into public.web_reports (user_id, category_code, title, laudo_text, exam_state)
       values ($1, 'ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA', 'Abdome total + Próstata', 'texto sintético', $2)
       returning id, to_json(updated_at) #>> '{}' as updated_at`, [a, envelope])
    const id = ins.rows[0].id as string
    const openedAt = ins.rows[0].updated_at as string
    step('INSERT do dono passa pela política web_reports_insert_own')

    await assert.rejects(
      s1.query(`insert into public.web_reports (user_id, category_code, laudo_text) values ($1, 'X', 'x')`, [b]),
      /row-level security/,
    )
    step('INSERT em nome de outro usuário é recusado pela RLS')

    // GET da rota: select ... eq(id) eq(user_id).
    const getSql = `select id, laudo_text, exam_state from public.web_reports where id = $1 and user_id = $2`
    assert.equal((await s1.query(getSql, [id, a])).rowCount, 1)
    await as(s1, b)
    assert.equal((await s1.query(getSql, [id, b])).rowCount, 0)
    assert.equal((await s1.query('select id from public.web_reports where id = $1', [id])).rowCount, 0, 'nem sem o filtro de dono')
    await as(s1, null)
    assert.equal((await s1.query('select id from public.web_reports where id = $1', [id])).rowCount, 0)
    step('SELECT: dono vê; outro usuário e anônimo não veem, mesmo sem filtro de user_id')

    // PATCH da rota: update ... eq(id) eq(user_id) eq(updated_at, esperado) returning updated_at.
    const patchSql = `update public.web_reports set laudo_text = $4, updated_at = now()
      where id = $1 and user_id = $2 and updated_at = $3::timestamptz
      returning to_json(updated_at) #>> '{}' as updated_at`
    await as(s1, b)
    assert.equal((await s1.query(patchSql, [id, b, openedAt, 'invasão'])).rowCount, 0)
    assert.equal((await s1.query('update public.web_reports set laudo_text = $2 where id = $1', [id, 'invasão'])).rowCount, 0)
    step('UPDATE de outro usuário atinge 0 linhas (rota responde 409/404, nada muda)')

    await as(s1, a)
    const p1 = await s1.query(patchSql, [id, a, openedAt, 'edição 1'])
    assert.equal(p1.rowCount, 1)
    const afterP1 = p1.rows[0].updated_at as string
    assert.notEqual(afterP1, openedAt)
    step('UPDATE do dono com a versão aberta grava e avança updated_at (string ISO do JSON casa com timestamptz)')

    assert.equal((await s1.query(patchSql, [id, a, openedAt, 'edição velha'])).rowCount, 0)
    assert.equal((await s1.query('select laudo_text from public.web_reports where id = $1', [id])).rows[0].laudo_text, 'edição 1')
    step('concorrência sequencial: updated_at antigo → 0 linhas, texto intacto')

    // Duas abas ao MESMO tempo com a mesma versão aberta: só uma vence.
    await as(s2, a)
    await s1.query('begin')
    await s2.query('begin')
    assert.equal((await s1.query(patchSql, [id, a, afterP1, 'aba 1'])).rowCount, 1)
    const racing = s2.query(patchSql, [id, a, afterP1, 'aba 2'])
    await new Promise((done) => setTimeout(done, 200))
    await s1.query('commit')
    assert.equal((await racing).rowCount, 0, 'a segunda aba reavalia o WHERE após o commit da primeira')
    await s2.query('commit')
    assert.equal((await s1.query('select laudo_text from public.web_reports where id = $1', [id])).rows[0].laudo_text, 'aba 1')
    step('concorrência simultânea: duas abas com a mesma versão, uma grava e a outra recebe 0 linhas')

    await assert.rejects(
      s1.query('update public.web_reports set user_id = $2 where id = $1', [id, b]),
      /row-level security/,
    )
    step('dono não consegue transferir a linha para outro usuário')

    // Produção: a política de UPDATE está SEM with check (metadado lido). Sem
    // with check, o Postgres usa o USING também na linha nova — conferir.
    await admin.query(`
      drop policy web_reports_update_own on public.web_reports;
      create policy web_reports_update_own on public.web_reports for update using (auth.uid() = user_id);
    `)
    await as(s1, a)
    await assert.rejects(
      s1.query('update public.web_reports set user_id = $2 where id = $1', [id, b]),
      /row-level security/,
    )
    await as(s1, b)
    assert.equal((await s1.query(patchSql, [id, b, afterP1, 'x'])).rowCount, 0)
    step('forma de PRODUÇÃO da política de UPDATE (só USING) mantém as mesmas garantias')

    console.log(`${passed} checks SQL reais passaram (Postgres temporário; sem Supabase Auth/PostgREST)`)
  } finally {
    for (const c of clients) await c.end().catch(() => undefined)
    await pg.stop().catch(() => undefined)
    rmSync(dir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
