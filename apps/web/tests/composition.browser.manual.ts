/**
 * Composição de exames associados no NAVEGADOR — com renderer REAL.
 *
 * O que é real: a tela inteira (LaudarWebExperience + cards + AssociationPanel
 * + hook), os adaptadores Web, o schema compartilhado e
 * `renderClinicalComposition` do `apps/api` (estilo OBJETIVO, que não consulta
 * máscara no banco).
 *
 * O que é SIMULADO, e declarado: a persistência. `web_reports` é um mapa em
 * memória neste servidor; o GET/PATCH reproduzem a rota autenticada usando o
 * mesmo `parseEnvelope`/schema do envelope. Não há Supabase, sessão real nem
 * RLS aqui — isso é prova de fluxo, não de banco.
 *
 *   node --import tsx apps/web/tests/composition.browser.manual.ts   (na raiz)
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { alteracoesDe } from '../../api/src/server/renderer/catalog/alteracoes/index'
import { renderClinicalComposition } from '../../api/src/server/renderer/composition/renderClinicalComposition'
import { ClinicalCompositionRequestV1Schema } from '@laudousg/shared'
import { CompositionEnvelopeV1Schema, laudoConfereComEnvelope, parseEnvelope, savedTextOf } from '../src/lib/composition/envelope'

function parseEnvelopeStrict(value: unknown) {
  const parsed = parseEnvelope(value)
  if (parsed.kind !== 'composition') throw new Error(`envelope não reabre: ${parsed.kind}`)
  return parsed.envelope
}

type Row = { id: string; category_code: string; title: string; laudo_text: string; exam_state: unknown; updated_at: string }

async function main() {
  // COMPOSITION_PREVIEW=1 PORT=4173: deixa o servidor no ar para abrir no Chrome.
  const preview = process.env.COMPOSITION_PREVIEW === '1'
  const web = resolve('apps/web')
  const output = resolve('tmp-review/web-composition')
  mkdirSync(output, { recursive: true })

  const bundle = await build({
    entryPoints: [join(web, 'tests/composition.browser.tsx')],
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    tsconfig: join(web, 'tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION': '"false"' },
    plugins: [{ name: 'composition-mocks', setup(buildApi) {
      buildApi.onResolve({ filter: /^(next\/link|next\/navigation|@\/lib\/supabase\/client)$/ }, args => ({ path: args.path, namespace: 'test' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'jsx', resolveDir: web, contents:
        args.path === 'next/link'
          ? 'export default function Link({children, ...props}) { return <a {...props}>{children}</a> }'
          : args.path === 'next/navigation'
            ? 'export const usePathname = () => "/app/gerar"'
            // O insert do Supabase vai para o mapa em memória do servidor de teste.
            : `export function createClient() {
                return { auth: { getUser: async () => ({ data: { user: { id: 'synthetic' } } }) }, from(table) {
                  let row = null
                  const q = new Proxy({}, { get(_t, key) {
                    if (key === 'insert') return (r) => { row = r; return q }
                    if (key === 'single') return async () => {
                      const r = await fetch('/__store/insert', { method: 'POST', body: JSON.stringify({ table, row }) })
                      return r.json()
                    }
                    if (key === 'then') return undefined
                    return () => q
                  } })
                  return q
                } }
              }`,
      }))
    }}],
  })
  const webRequire = createRequire(join(web, 'package.json'))
  const importedConfig = webRequire('./tailwind.config.ts')
  const config = importedConfig.default ?? importedConfig
  const css = (await webRequire('postcss')([webRequire('tailwindcss')({
    ...config,
    content: [join(web, 'src/**/*.{ts,tsx}'), join(web, 'tests/composition.browser.tsx')],
  })]).process(readFileSync(join(web, 'src/app/globals.css'), 'utf8'), { from: join(web, 'src/app/globals.css') })).css

  const store = new Map<string, Row>()
  const control = { failNext: 0, delayNextMs: 0 }
  const compositionRequests: Array<{ revision: number; requestId: string }> = []

  const json = (res: any, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      if (url.pathname === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles![0].text); return }
      if (url.pathname === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); return }
      if (/^\/categories\/[a-z0-9-]+\.webp$/.test(url.pathname)) {
        res.setHeader('Content-Type', 'image/webp'); res.end(readFileSync(join(web, 'public', url.pathname.slice(1)))); return
      }
      let raw = ''
      for await (const chunk of req) raw += chunk

      if (url.pathname === '/__store/insert') {
        const { row } = JSON.parse(raw)
        const saved: Row = { id: randomUUID(), category_code: row.category_code, title: row.title, laudo_text: row.laudo_text, exam_state: row.exam_state, updated_at: new Date().toISOString() }
        store.set(saved.id, saved)
        return json(res, 200, { data: { id: saved.id, updated_at: saved.updated_at }, error: null })
      }

      const reportId = url.pathname.match(/^\/api\/web-reports\/([^/]+)$/)?.[1]
      if (reportId) {
        const row = store.get(reportId)
        if (!row) return json(res, 404, { error: 'laudo não encontrado' })
        if (req.method === 'GET') {
          const parsed = parseEnvelope(row.exam_state)
          if (parsed.kind === 'legacy') return json(res, 422, { error: 'este laudo foi salvo só como texto e não reabre para edição' })
          if (parsed.kind === 'composition-unsupported') return json(res, 422, { error: parsed.motivo })
          if (!laudoConfereComEnvelope(row.laudo_text, parsed.envelope)) return json(res, 422, { error: 'o texto salvo não corresponde ao estado da composição' })
          return json(res, 200, { id: row.id, title: row.title, laudoText: row.laudo_text, updatedAt: row.updated_at, envelope: parsed.envelope })
        }
        if (req.method === 'PATCH') {
          const body = JSON.parse(raw)
          const envelope = CompositionEnvelopeV1Schema.safeParse(body.envelope)
          if (!envelope.success || parseEnvelope(envelope.data).kind !== 'composition') return json(res, 400, { error: 'estado da composição inválido' })
          if (!laudoConfereComEnvelope(body.laudoText, envelope.data)) return json(res, 400, { error: 'o texto salvo não corresponde ao estado da composição' })
          const saved = parseEnvelope(row.exam_state)
          if (saved.kind !== 'composition' || saved.envelope.compositionId !== envelope.data.compositionId) return json(res, 409, { error: 'este laudo não corresponde à composição aberta' })
          if (body.expectedUpdatedAt !== row.updated_at) return json(res, 409, { error: 'o laudo foi alterado em outro lugar depois de aberto; reabra antes de salvar' })
          const updated: Row = { ...row, title: body.title, laudo_text: body.laudoText, exam_state: envelope.data, updated_at: new Date(Date.now() + 1).toISOString() }
          store.set(row.id, updated)
          return json(res, 200, { id: row.id, updatedAt: updated.updated_at })
        }
      }

      if (url.pathname === '/api/compositions/render' && req.method === 'POST') {
        // Mesmo recorte do proxy: estilo nunca vem do navegador.
        const body = JSON.parse(raw)
        if ('writingStyle' in body) return json(res, 400, { error: 'pedido de composição inválido' })
        const parsed = ClinicalCompositionRequestV1Schema.safeParse({ ...body, writingStyle: 'OBJETIVO' })
        if (!parsed.success) return json(res, 400, { error: 'pedido de composição inválido' })
        compositionRequests.push({ revision: parsed.data.revision, requestId: parsed.data.requestId })
        const delay = control.delayNextMs
        control.delayNextMs = 0
        const fail = control.failNext > 0
        if (fail) control.failNext -= 1
        const response = await renderClinicalComposition(parsed.data, { resolveContext: async () => ({}) })
        if (delay) await new Promise((done) => setTimeout(done, delay))
        if (fail) {
          // Falha PARCIAL: um componente montou, o outro não.
          const [a, b] = parsed.data.components
          return json(res, 422, {
            contractVersion: parsed.data.contractVersion, requestId: parsed.data.requestId, compositionId: parsed.data.compositionId,
            revision: parsed.data.revision, associationCode: parsed.data.associationCode, status: 'error',
            error: { code: 'COMPONENT_RENDER_FAILED', message: 'Falha simulada em um componente.' },
            components: [
              { componentId: a.componentId, categoryCode: a.categoryCode, status: 'rendered' },
              { componentId: b.componentId, categoryCode: b.categoryCode, status: 'error', message: 'falha simulada' },
            ],
          })
        }
        return json(res, response.status === 'complete' ? 200 : 422, response)
      }

      const category = url.pathname.match(/^\/api\/catalog\/([^/]+)\/render$/)?.[1]
      if (category && req.method === 'POST') {
        const decoded = decodeURIComponent(category)
        const body = JSON.parse(raw)
        const catalog = alteracoesDe(decoded)
        const selected = (body.alteracoes ?? []).map((id: string) => catalog.find(item => item.id === id))
        if (selected.some((item: unknown) => !item)) return json(res, 400, { error: 'Alteração desconhecida nesta categoria.' })
        const result = renderizarSelecao(decoded, 'OBJETIVO', selected, body.dados)
        return json(res, result.ok ? 200 : 409, result.ok ? { laudo: result.texto } : { error: 'Não foi possível renderizar.' })
      }
      if (req.method !== 'GET') return json(res, 404, { error: 'rota de teste inexistente' })

      res.setHeader('Content-Type', 'text/html')
      res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>LaudoUSG — composição (persistência simulada)</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body>' + (preview ? '<div role="note" style="position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:60;max-width:calc(100% - 32px);background:#7c2d12;color:#fff;font:600 12px/1.3 system-ui;padding:6px 12px;border-radius:999px">Prévia local — salvar/reabrir é SIMULADO em memória (sem banco, sem sessão real)</div>' : '') + '<div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) {
      res.statusCode = 500
      res.end(String(error))
    }
  })
  await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', done) })
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  if (preview) {
    console.log(`Prévia de composição (renderer real; salvamento SIMULADO em memória): ${origin}`)
    return
  }

  let browser: any
  let passed = 0
  const step = (name: string) => console.log(`PASS ${++passed}: ${name}`)
  try {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    const dialogs: string[] = []
    page.on('dialog', (dialog: any) => { dialogs.push(dialog.message()); dialog.accept() })
    await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())

    const editor = page.getByRole('textbox', { name: 'Editar texto do laudo' })
    const editorText = () => editor.innerText() as Promise<string>
    const laudoTab = page.getByRole('tab', { name: /Laudo/ })
    const achadosTab = page.getByRole('tab', { name: 'Achados' })
    const waitReady = async () => {
      try {
        await page.waitForFunction(() => {
          const tab = document.querySelector('[data-laudo-tab-indicator]')
          const text = document.querySelector('[aria-label="Editar texto do laudo"]')?.textContent ?? ''
          return !tab && text.length > 40
        }, undefined, { timeout: 15000 })
      } catch (error) {
        const state = await page.evaluate(() => ({
          indicator: document.querySelector('[data-laudo-tab-indicator]')?.getAttribute('data-laudo-tab-indicator'),
          error: document.querySelector('[data-laudo-error]')?.textContent,
          text: (document.querySelector('[aria-label="Editar texto do laudo"]')?.textContent ?? '').slice(0, 200),
        }))
        console.error('waitReady state', JSON.stringify(state))
        throw error
      }
    }
    const groupOf = (category: string) => page.locator(`[data-composition-component="${category}"]`)

    // Uma digitadora escolhida: as iniciais entram no texto salvo.
    await page.addInitScript(() => {
      localStorage.setItem('laudousg.digitadoras', JSON.stringify([{ nome: 'Ana Beatriz', iniciais: 'ab' }]))
      localStorage.setItem('laudousg.initials', 'ab')
    })

    // --- Abdome + Próstata -------------------------------------------------
    await page.goto(origin)
    await page.locator('[data-category-id="ABDOMEN_TOTAL"]').first().click()
    await page.locator('[data-associate="ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA"]').click()
    await groupOf('PROSTATA_SUPRAPUBICA').waitFor()
    assert.equal(await page.locator('[data-composition-component]').count(), 2)
    assert.equal(await page.locator('#workspace-panel-achados [data-section-id="bexiga"]').count(), 1, 'uma bexiga só')
    assert.equal(await groupOf('ABDOMEN_TOTAL').locator('[data-section-id="bexiga"]').count(), 1, 'a bexiga mora no abdome')
    assert.equal(await groupOf('PROSTATA_SUPRAPUBICA').locator('[data-shared-bladder-note]').count(), 1)
    assert.equal(await groupOf('PROSTATA_SUPRAPUBICA').locator('[data-section-id="prostata"]').count(), 1)
    step('abdome + próstata: grupos integrados em cards, uma bexiga só no grupo do abdome')

    await groupOf('ABDOMEN_TOTAL').locator('[data-section-id="bexiga"]').getByRole('combobox', { name: 'Parede', exact: true }).selectOption('trabeculada')
    const prostateCard = groupOf('PROSTATA_SUPRAPUBICA').locator('[data-section-id="prostata"]')
    await prostateCard.getByLabel('Medida 1 (cm)').fill('5,1')
    await laudoTab.click()
    await page.locator('[data-laudo-error]').waitFor({ timeout: 15000 })
    assert.match(await page.locator('[data-laudo-error]').innerText(), /medidas da próstata incompletas/)
    assert.equal(await editorText(), '', 'pendência bloqueante: nenhum texto parcial')
    step('pendência bloqueante em um componente: nenhum laudo parcial')
    await achadosTab.click()
    await prostateCard.getByLabel('Medida 2 (cm)').fill('4,4')
    await prostateCard.getByLabel('Medida 3 (cm)').fill('3,9')
    await laudoTab.click()
    await waitReady()
    const composed = await editorText()
    assert.match(composed, /Trabeculação da parede vesical/i)
    assert.equal((composed.match(/Trabeculação da parede vesical/gi) ?? []).length, 1, 'achado vesical não duplicado')
    assert.equal(await page.locator('[data-laudo-error]').count(), 0)
    assert.ok(await page.locator('[data-composition-provenance] [data-block-id]').count() >= 4)
    step('laudo composto pelo renderer real, bexiga descrita uma vez, origem por bloco')

    // Resposta antiga não vence: a primeira edição demora, a segunda chega antes.
    await achadosTab.click()
    control.delayNextMs = 1500
    await groupOf('ABDOMEN_TOTAL').locator('[data-section-id="figado"]').getByRole('button', { name: 'Esteatose leve', exact: true }).click()
    await page.waitForTimeout(700)
    await groupOf('ABDOMEN_TOTAL').locator('[data-section-id="bexiga"]').getByRole('combobox', { name: 'Parede', exact: true }).selectOption('normal')
    await laudoTab.click()
    await page.waitForTimeout(2200)
    await waitReady()
    const afterRace = await editorText()
    assert.match(afterRace, /Esteatose hepática, grau leve/i)
    assert.doesNotMatch(afterRace, /Trabeculação da parede vesical/i, 'a resposta atrasada (parede trabeculada) não sobrescreveu a mais nova')
    const revisions = compositionRequests.map((r) => r.revision)
    assert.deepEqual([...revisions].sort((a, b) => a - b), revisions, 'revision cresce a cada pedido')
    step('resposta fora de ordem é descartada; revision monotônica')

    // Salvar a versão conferida.
    await page.getByRole('button', { name: 'Salvar laudo' }).click()
    await page.getByRole('button', { name: 'Salvo' }).waitFor()
    assert.equal(store.size, 1)
    const [row] = [...store.values()]
    assert.equal(row.category_code, 'ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA')
    assert.equal(parseEnvelope(row.exam_state).kind, 'composition')
    assert.match(row.laudo_text, /\n\n\/ab$/, 'iniciais no fim do texto salvo')
    assert.equal(row.laudo_text.replace(/\n\n\/ab$/, '').trim(), afterRace.replace(/\/ab\s*$/, '').trim())
    assert.equal(row.laudo_text, savedTextOf(parseEnvelopeStrict(row.exam_state)), 'texto salvo derivado do envelope')
    step('salvar grava a composição inteira (dois componentes, texto, envelope versionado)')

    // Edição manual + mudança de campo: o texto do médico é preservado.
    await editor.click()
    await page.keyboard.press('Control+End')
    await page.keyboard.press('Meta+ArrowDown')
    await page.keyboard.type(' Nota do médico preservada.')
    await achadosTab.click()
    await groupOf('ABDOMEN_TOTAL').locator('[data-section-id="bexiga"]').getByRole('combobox', { name: 'Parede', exact: true }).selectOption('trabeculada')
    await laudoTab.click()
    await page.waitForFunction(() => document.querySelector('[data-laudo-tab-indicator]')?.getAttribute('data-laudo-tab-indicator') === 'suggestion', undefined, { timeout: 15000 })
    assert.match(await editorText(), /Nota do médico preservada\./)
    step('editar campo depois de editar o texto vira sugestão; o texto do médico fica')

    // Falha parcial bloqueia salvar, mesmo com texto editado à mão.
    control.failNext = 1
    await achadosTab.click()
    await groupOf('PROSTATA_SUPRAPUBICA').locator('[data-section-id="prostata"]').getByLabel('Medida 2 (cm)').fill('4,5')
    await laudoTab.click()
    await page.locator('[data-laudo-error]').waitFor({ timeout: 15000 })
    assert.match(await page.locator('[data-laudo-error]').innerText(), /Com falha: Próstata/)
    const beforeFail = store.get(row.id)!.updated_at
    await page.getByRole('button', { name: 'Salvar laudo' }).click()
    await page.waitForTimeout(300)
    assert.equal(store.get(row.id)!.updated_at, beforeFail, 'nada gravado com componente em falha')
    assert.match(await page.locator('#workspace-panel-laudo').innerText(), /não foi montado por inteiro/)
    step('falha parcial: erro visível, salvar recusado mesmo com texto manual')

    // Recupera e regrava a MESMA linha (PATCH com updated_at esperado).
    await achadosTab.click()
    await groupOf('PROSTATA_SUPRAPUBICA').locator('[data-section-id="prostata"]').getByLabel('Medida 3 (cm)').fill('4,0')
    await laudoTab.click()
    await waitForNoError(page)
    await page.getByRole('button', { name: 'Salvar laudo' }).click()
    await page.getByRole('button', { name: 'Salvo' }).waitFor()
    assert.equal(store.size, 1, 'segunda gravação atualiza, não duplica')
    const savedText = store.get(row.id)!.laudo_text
    assert.match(savedText, /Nota do médico preservada\./)
    step('salvar de novo atualiza a mesma composição')

    // --- Reabrir pelo histórico -------------------------------------------
    await page.goto(`${origin}/?reabrir=${row.id}`)
    await groupOf('PROSTATA_SUPRAPUBICA').waitFor({ timeout: 15000 })
    assert.equal(await groupOf('PROSTATA_SUPRAPUBICA').locator('[data-section-id="prostata"]').getByLabel('Medida 1 (cm)').inputValue(), '5,1')
    assert.equal(await groupOf('ABDOMEN_TOTAL').locator('[data-section-id="bexiga"]').getByRole('combobox', { name: 'Parede', exact: true }).inputValue(), 'trabeculada')
    await laudoTab.click()
    await waitForNoError(page)
    assert.equal(savedText, savedTextOf(parseEnvelopeStrict(store.get(row.id)!.exam_state)))
    assert.equal(`${(await editorText()).trim()}\n\n/ab`, savedText, 'texto reaberto + iniciais = texto salvo')
    step('reabrir: estados dos dois componentes e texto (com edição manual) idênticos')

    // Remover componente descarta; reassociar começa do inicial.
    await achadosTab.click()
    await page.getByRole('button', { name: 'Remover Próstata da associação' }).click()
    assert.ok(dialogs.some((d) => /Remover Próstata/.test(d)))
    await page.locator('[data-association-panel="idle"]').waitFor()
    assert.equal(await page.locator('[data-composition-component]').count(), 0)
    assert.equal(await page.locator('#workspace-panel-achados [data-section-id="bexiga"] select[aria-label="Parede"], #workspace-panel-achados [data-section-id="bexiga"]').count() > 0, true)
    await page.locator('[data-associate="ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA"]').click()
    await groupOf('PROSTATA_SUPRAPUBICA').waitFor()
    assert.equal(await groupOf('PROSTATA_SUPRAPUBICA').locator('[data-section-id="prostata"]').getByLabel('Medida 1 (cm)').inputValue(), '', 'próstata removida não volta')
    assert.equal(await groupOf('ABDOMEN_TOTAL').locator('[data-section-id="bexiga"]').getByRole('combobox', { name: 'Parede', exact: true }).inputValue(), 'trabeculada', 'bexiga do exame segue')
    step('remover próstata descarta o estado dela; reassociar começa vazio')

    // Largura: sem rolagem horizontal nos viewports do workspace.
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(150)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert.ok(overflow <= 0, `sem overflow horizontal em ${viewport.width}px (${overflow})`)
      await page.screenshot({ path: join(output, `abdome-prostata-${viewport.width}.png`), fullPage: false })
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    step('sem overflow horizontal de 1440 a 320px')

    // --- Mamas + Pelve ---------------------------------------------------
    await page.goto(origin)
    await page.locator('[data-category-id="MAMARIA"]').first().click()
    await page.locator('[data-associate="MAMARIA__PELVE_FEMININA"]').click()
    await groupOf('PELVE_FEMININA').waitFor()
    assert.equal(await page.locator('[data-shared-bladder-note]').count(), 0)
    assert.equal(await groupOf('PELVE_FEMININA').locator('[data-section-id="bexiga"]').count(), 1, 'pelve mantém sua bexiga, não compartilhada')
    assert.equal(await groupOf('MAMARIA').locator('[data-section-id="calc:bi-rads"]').count(), 1, 'BI-RADS só no grupo da mama')
    assert.equal(await groupOf('PELVE_FEMININA').locator('[data-section-id="calc:bi-rads"]').count(), 0)
    await laudoTab.click()
    await waitReady()
    assert.equal(await page.locator('[data-laudo-error]').count(), 0)
    await page.getByRole('button', { name: 'Salvar laudo' }).click()
    await page.getByRole('button', { name: 'Salvo' }).waitFor()
    step('mamas + pelve: sem estrutura compartilhada, BI-RADS restrito à mama, salva completo')

    // --- Legado: só texto --------------------------------------------------
    const legacyId = randomUUID()
    store.set(legacyId, { id: legacyId, category_code: 'ABDOMEN_TOTAL', title: 'Abdome total', laudo_text: 'texto', exam_state: { figado: {} }, updated_at: new Date().toISOString() })
    await page.goto(`${origin}/?reabrir=${legacyId}`)
    await page.locator('[data-reopen-state="error"]').waitFor()
    assert.match(await page.locator('[data-reopen-state="error"]').innerText(), /só como texto/)
    step('laudo legado não reabre como editável; mensagem explícita')

    assert.deepEqual(errors, [])
    console.log(`${passed} composition browser checks passed (persistência SIMULADA em memória; renderer real)`)
  } finally {
    await browser?.close()
    server.close()
  }
}

async function waitForNoError(page: any) {
  try {
    await page.waitForFunction(() => {
      const indicator = document.querySelector('[data-laudo-tab-indicator]')?.getAttribute('data-laudo-tab-indicator')
      return !document.querySelector('[data-laudo-error]') && indicator !== 'updating' && indicator !== 'error'
    }, undefined, { timeout: 15000 })
  } catch (error) {
    console.error('waitForNoError state', JSON.stringify(await page.evaluate(() => ({
      indicator: document.querySelector('[data-laudo-tab-indicator]')?.getAttribute('data-laudo-tab-indicator'),
      error: document.querySelector('[data-laudo-error]')?.textContent,
      save: document.querySelector('#workspace-panel-laudo')?.textContent?.slice(-300),
    }))))
    throw error
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
