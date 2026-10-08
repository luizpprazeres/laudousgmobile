import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'

async function main() {
  const web = resolve('apps/web')
  const bundle = await build({
    entryPoints: [join(web, 'tests/companionFormPatch.browser.tsx')],
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    tsconfig: join(web, 'tsconfig.json'),
    define: {
      'process.env.NODE_ENV': '"test"',
      'process.env.NEXT_PUBLIC_COMPANION_FORM_PATCH_CATEGORIES': '"DOPPLER_CAROTIDAS"',
    },
    plugins: [{ name: 'companion-stubs', setup(plugin) {
      plugin.onResolve({ filter: /^@\/lib\/(companion|companionFormPatch)$/ }, (args) => ({ path: args.path, namespace: 'test' }))
      plugin.onLoad({ filter: /^@\/lib\/companion$/, namespace: 'test' }, () => ({
        loader: 'js',
        contents: `
          const event = { id: 'event-1', kind: 'transcript', payload: { text: 'ACI direita com VPS 120 e VDF 35 cm/s.' }, status: 'pending', created_at: '2026-10-07T20:00:00Z' };
          export async function latestCompanionSession() { return { id: 'session-1', pairing_code: null, pairing_expires_at: '', connected_at: '2026-10-07T20:00:00Z', expires_at: '', revoked_at: null }; }
          export async function listPendingCompanionEvents() { return window.__resolved ? [] : [event]; }
          export async function resolveCompanionEvent(id, status) { window.__resolveCalls = [...(window.__resolveCalls || []), {id, status}]; window.__resolved = true; }
          export async function createCompanionSession() { throw new Error('not used'); }
          export async function revokeCompanionSession() {}
        `,
      }))
      plugin.onLoad({ filter: /^@\/lib\/companionFormPatch$/, namespace: 'test' }, () => ({
        loader: 'js',
        contents: `
          export async function extractCompanionFormPatch() {
            window.__extractCalls = (window.__extractCalls || 0) + 1;
            return { contractVersion: 'companion-form-patch/v1', category: 'DOPPLER_CAROTIDAS', sourceKind: 'transcript', data: { carotidMeasurements: [{side: 'direita', vessel: 'interna', psv: '120', vdf: '35'}] }, warnings: [{code: 'review', message: 'Confirme a unidade das velocidades.'}] };
          }
          export function companionFormPatchReviewItems() { return [{key: 'aci-direita', label: 'Carótida interna direita', value: 'VPS 120 · VDF 35'}]; }
        `,
      }))
    }}],
  })

  const server = createServer((request, response) => {
    if (request.url === '/bundle.js') {
      response.setHeader('content-type', 'text/javascript')
      response.end(bundle.outputFiles[0].text)
      return
    }
    if (request.url !== '/carotidas' && request.url !== '/abdome') {
      response.statusCode = 404
      response.end()
      return
    }
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end('<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  let browser: any
  try {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
    await page.goto(`${origin}/carotidas`)
    const interpret = page.getByRole('button', { name: 'Interpretar campos', exact: true })
    await interpret.waitFor()
    await interpret.click()
    await page.getByRole('button', { name: 'Confirmar preenchimento', exact: true }).waitFor()
    assert.match(await page.getByLabel('Campos que serão preenchidos').textContent(), /Carótida interna direita.*VPS 120.*VDF 35/s)
    assert.match(await page.getByLabel('Pontos para revisar').textContent(), /Confirme a unidade/)

    await page.getByRole('button', { name: 'Confirmar preenchimento', exact: true }).click()
    await page.getByText(/continua pendente/).waitFor()
    assert.equal(await page.getByText('ACI direita com VPS 120 e VDF 35 cm/s.').count(), 1)
    assert.deepEqual(await page.evaluate(() => (window as any).__resolveCalls ?? []), [])

    await page.evaluate(() => { (window as any).__companionApplyAllowed = true })
    await page.getByRole('button', { name: 'Confirmar preenchimento', exact: true }).click()
    await page.getByText('Aguardando uma entrada do médico.').waitFor()
    assert.deepEqual(await page.evaluate(() => (window as any).__resolveCalls), [{ id: 'event-1', status: 'applied' }])
    assert.equal(await page.evaluate(() => (window as any).__extractCalls), 1, 'a confirmação não deve repetir a extração')

    await page.goto(`${origin}/abdome`)
    await page.getByRole('button', { name: 'Inserir achado', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Interpretar campos', exact: true }).count(), 0)
    console.log('Companion form patch browser: flag, revisão em duas etapas e resolução após sucesso aprovados')
  } finally {
    await browser?.close()
    await new Promise<void>((done) => server.close(() => done()))
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
