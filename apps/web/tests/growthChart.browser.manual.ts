import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'

async function main() {
  const web = resolve('apps/web')
  const saved: any[] = []
  const bundle = await build({
    entryPoints: [join(web, 'tests/growthChart.browser.tsx')],
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    tsconfig: join(web, 'tsconfig.json'),
    define: {
      'process.env.NODE_ENV': '"test"',
      'process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION': '"false"',
      'process.env.NEXT_PUBLIC_HEPATIC_MODELS_V1': '"true"',
    },
    plugins: [{ name: 'local-only-services', setup(plugin) {
      plugin.onResolve({ filter: /^(next\/link|next\/navigation|@\/lib\/supabase\/client)$/ }, args => ({ path: args.path, namespace: 'test' }))
      plugin.onLoad({ filter: /.*/, namespace: 'test' }, args => ({
        loader: 'jsx',
        resolveDir: web,
        contents: args.path === 'next/link'
          ? 'export default function Link({children, ...props}) { return <a {...props}>{children}</a> }'
          : args.path === 'next/navigation'
            ? 'export const usePathname = () => location.pathname'
            : `export function createClient() {
                return { auth: { getUser: async () => ({data: {user: {id: 'synthetic'}}}) }, from() {
                  const query = new Proxy({}, { get(_target, prop) {
                    if (prop === 'maybeSingle') return async () => ({data: null, error: null});
                    if (prop === 'delete') return () => query;
                    if (prop === 'insert') return (value) => ({select: () => ({single: async () => {
                      await fetch('/test-save', {method: 'POST', body: JSON.stringify(value)});
                      return {data: {id: 'synthetic-report'}, error: null};
                    }})});
                    return () => query;
                  }}); return query;
                }};
              }`,
      }))
    }}],
  })
  const css = readdirSync(join(web, '.next/static/css'))
    .filter(file => file.endsWith('.css'))
    .map(file => readFileSync(join(web, '.next/static/css', file), 'utf8'))
    .join('\n')

  const server = createServer(async (request, response) => {
    try {
      if (request.url === '/bundle.js') {
        response.setHeader('Content-Type', 'text/javascript')
        response.end(bundle.outputFiles![0].text)
        return
      }
      if (request.url === '/style.css') {
        response.setHeader('Content-Type', 'text/css')
        response.end(css)
        return
      }
      if (request.method === 'POST') {
        let raw = ''
        for await (const chunk of request) raw += chunk
        const body = JSON.parse(raw)
        if (request.url === '/test-save') {
          saved.push(body)
          response.end('{}')
          return
        }
        const category = request.url?.match(/^\/api\/catalog\/([^/]+)\/render$/)?.[1]
        if (category) {
          const result = renderizarSelecao(category, 'CLASSICO_COMPLETO', [], body.dados)
          response.setHeader('Content-Type', 'application/json')
          response.statusCode = result.ok ? 200 : 409
          response.end(JSON.stringify(result.ok ? { laudo: result.texto } : result))
          return
        }
      }
      if (request.url !== '/' && request.url !== '/history') {
        response.statusCode = 404
        response.end()
        return
      }
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) {
      response.statusCode = 500
      response.end(String(error))
    }
  })
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Servidor local indisponível')
  const origin = `http://127.0.0.1:${address.port}`
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    await page.goto(origin)
    await page.getByRole('heading', { name: 'Qual exame você deseja realizar?' }).waitFor()
    await page.getByRole('button', { name: 'Obstétrica', exact: true }).click()

    await page.getByLabel('Biometria atual · semanas', { exact: true }).fill('28')
    await page.getByLabel('Dias', { exact: true }).fill('0')
    await page.getByLabel('BCF (bpm)', { exact: true }).fill('145')
    await page.getByLabel('DBP (mm)', { exact: true }).fill('70')
    await page.getByLabel('CC (mm)', { exact: true }).fill('230')
    await page.getByLabel('CA (mm)', { exact: true }).fill('210')
    await page.getByLabel('CF (mm)', { exact: true }).fill('50')

    assert.equal(await page.getByRole('img', { name: /^Gráfico INTERGROWTH/ }).count(), 0, 'biometria atual não pode datar o próprio crescimento')
    await page.getByRole('button', { name: 'DUM', exact: true }).click()
    await page.getByLabel('DUM (DD/MM/AAAA)', { exact: true }).fill('01/01/2026')
    await page.getByLabel('Data do exame (DD/MM/AAAA)', { exact: true }).fill('21/06/2026')

    const curve = page.getByRole('img', { name: /^Gráfico INTERGROWTH/ })
    await curve.waitFor()
    assert.match(await curve.getAttribute('aria-label'), /870 g.*24\+3.*99,5/)
    assert.doesNotMatch(await curve.getAttribute('aria-label'), /28\+0/)
    assert.equal(await curve.locator('path').count(), 5)

    await page.getByRole('button', { name: 'Incluir gráfico no laudo', exact: true }).click()
    await page.locator('[data-report-figure="fetal-growth-intergrowth"]').first().waitFor({ state: 'attached' })
    await page.waitForFunction(() => !document.querySelector('[data-laudo-tab-indicator="updating"]'))
    await page.getByRole('tab', { name: /^Laudo/ }).click()
    const saveButton = page.getByRole('button', { name: /Salvar laudo/ })
    if (await saveButton.count() === 0) {
      throw new Error('Botão de salvar ausente na aba Laudo')
    }
    await saveButton.click()
    await page.getByRole('button', { name: 'Salvo', exact: true }).waitFor()
    assert.equal(saved.length, 1)
    const stored = saved[0].exam_state.__growth_chart.figure
    assert.equal(stored.format, 'fetal-growth-intergrowth-v1')
    assert.equal(stored.calculationVersion, 'intergrowth2020-lms-hadlock3-v1')
    assert.equal(stored.standardVersion, 'INTERGROWTH-21st 2020')
    assert.equal(stored.formula, 'Hadlock CC/CA/CF (3 parâmetros)')
    assert.equal(stored.gestationalAgeSource, 'dum')
    assert.equal(stored.examDate, '2026-06-21')
    assert.equal(stored.gestationalAgeDays, 171)
    assert.deepEqual(stored.measurementsMm, { cc: 230, ca: 210, cf: 50 })
    assert.ok(Math.abs(stored.weightGramsRaw - 870.16177215199957) < 1e-9)
    assert.doesNotMatch(saved[0].exam_state.__presentation.html, /<svg|<img/i)

    await page.goto(`${origin}/history`)
    await page.getByText('Obstétrica com gráfico salvo', { exact: true }).waitFor()
    const historyFigure = page.locator('[data-report-figure="fetal-growth-intergrowth"]')
    await historyFigure.waitFor()
    assert.match(await historyFigure.getByRole('img').getAttribute('aria-label'), /870 g.*24\+3.*99,5/)
    assert.match(await historyFigure.textContent(), /INTERGROWTH-21st 2020.*870 g.*24\+3/s)
    await page.addScriptTag({ content: `
      window.ClipboardItem = class ClipboardItemMock {
        constructor(data) { this.data = data }
      };
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          write: async (items) => { window.__copiedGrowthHtml = await items[0].data['text/html'].text() },
          writeText: async (value) => { window.__copiedGrowthText = value },
        },
      });
    ` })
    await page.getByRole('button', { name: 'Copiar', exact: true }).click()
    await page.waitForFunction(() => typeof (window as any).__copiedGrowthHtml === 'string')
    const copiedHtml = await page.evaluate(() => (window as any).__copiedGrowthHtml as string)
    assert.match(copiedHtml, /Laudo sintético/)
    assert.match(copiedHtml, /<img src="data:image\/png/)
    assert.deepEqual(errors, [])
    console.log('Growth chart browser: datação, inclusão, persistência e histórico aprovados')
  } finally {
    await browser.close()
    await new Promise<void>(resolveClose => server.close(() => resolveClose()))
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
