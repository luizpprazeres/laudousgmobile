// Preview sintetico: formulario, adaptador e renderer reais; sem autenticacao ou banco.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from 'tailwindcss'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { renalTestTemplate } from './renalMeasurements.fixture'

async function main() {
  const web = resolve('apps/web')
  const output = resolve('tmp-review/web-rins-dimensoes')
  mkdirSync(output, { recursive: true })
  const bundle = await build({ entryPoints: [join(web, 'tests/renalMeasurements.browser.tsx')], bundle: true, write: false,
    platform: 'browser', jsx: 'automatic', tsconfig: join(web, 'tsconfig.json'), define: { 'process.env.NODE_ENV': '"test"' } })
  const css = await postcss([tailwind({ content: [join(web, 'src/components/laudar/*.tsx'), join(web, 'tests/renalMeasurements.browser.tsx')] })])
    .process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })
  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles![0].text); return }
      if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css.css); return }
      if (req.url === '/render' && req.method === 'POST') {
        let raw = ''; for await (const chunk of req) raw += chunk
        const result = renderizarSelecao('ABDOMEN_TOTAL', 'CLASSICO_COMPLETO', [], JSON.parse(raw), { templateBody: renalTestTemplate })
        res.statusCode = result.ok ? 200 : 500
        res.end(result.ok ? result.texto : JSON.stringify(result)); return
      }
      res.setHeader('Content-Type', 'text/html')
      res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) { res.statusCode = 500; res.end(String(error)) }
  })
  await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', done) })
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  if (process.env.RENAL_PREVIEW === '1') { console.log(`Preview renal sintetico: ${origin}`); return }
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    await page.goto(origin)
    const right = page.getByRole('region', { name: 'Rim direito', exact: true })
    const left = page.getByRole('region', { name: 'Rim esquerdo', exact: true })
    const toggle = right.getByRole('checkbox', { name: 'Informar medidas' })
    const measures = right.getByLabel('Medidas do rim (L x AP x T cm)', { exact: true })
    const thickness = right.getByLabel('Espessura do parênquima (cm)', { exact: true })
    const report = page.getByRole('status', { name: 'Laudo gerado' })
    await report.getByText(/ULTRASSONOGRAFIA/).waitFor()
    assert.equal(await toggle.isChecked(), false)
    assert.equal(await measures.count(), 0)
    await toggle.check()
    assert.equal(await measures.count(), 1)
    assert.equal(await thickness.count(), 1)
    await measures.fill('10,2 x 4,8 x 5,1')
    await thickness.fill('1,6')
    await left.getByRole('checkbox', { name: 'Informar medidas' }).check()
    await left.getByLabel('Medidas do rim (L x AP x T cm)', { exact: true }).fill('11,3 x 4,7 x 5,2')
    await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent?.includes('11,3'))
    assert.match(await report.innerText(), /10,2/)
    await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true })
    await right.getByRole('button', { name: 'Reduzido', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent?.includes('reduzid'))
    await toggle.uncheck()
    await page.waitForFunction(() => !document.querySelector('[role=status]')?.textContent?.includes('10,2'))
    assert.doesNotMatch(await report.innerText(), /10,2|4,8|5,1|1,6/)
    assert.match(await report.innerText(), /11,3/)
    assert.match(await report.innerText(), /reduzid/)
    assert.equal(await measures.count(), 0)
    await page.screenshot({ path: join(output, 'desktop-desmarcado.png'), fullPage: true })
    await toggle.check()
    assert.equal(await measures.inputValue(), '10,2 x 4,8 x 5,1')
    assert.equal(await thickness.inputValue(), '1,6')
    await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent?.includes('10,2'))
    for (const width of [390, 320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      const a = await measures.boundingBox(), b = await thickness.boundingBox()
      assert.ok(a && b && Math.abs(a.y - b.y) < 2 && a.x + a.width <= b.x, `two columns at ${width}`)
      assert.ok(a.x >= 0 && b.x + b.width <= width, `fields fit at ${width}`)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow at ${width}`)
      for (const kidney of [right, left]) {
        for (const name of ['Angiomiolipoma', 'Cisto complexo']) {
          const button = kidney.getByRole('button', { name: new RegExp(name) })
          assert.ok(await button.evaluate((element: HTMLElement) => {
            const bounds = element.getBoundingClientRect()
            const checkbox = element.children[0].getBoundingClientRect()
            const label = element.children[1]
            const range = document.createRange()
            range.selectNodeContents(label)
            return [...range.getClientRects()].every(rect =>
              rect.left >= checkbox.right && rect.right <= bounds.right &&
              rect.top >= bounds.top && rect.bottom <= bounds.bottom)
          }), `${name} fits without checkbox overlap at ${width}`)
        }
      }
      await page.screenshot({ path: join(output, `${width === 390 ? 'mobile' : `width-${width}`}.png`), fullPage: true })
    }
    await page.setViewportSize({ width: 320, height: 1000 })
    await right.getByRole('button', { name: /Angiomiolipoma/ }).click()
    await right.getByRole('button', { name: /Cisto complexo/ }).click()
    assert.equal(await measures.inputValue(), '10,2 x 4,8 x 5,1')
    assert.equal(await thickness.inputValue(), '1,6')
    assert.equal(await right.getByText('Dimensões (mm)', { exact: true }).count(), 2)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'expanded renal fields fit')
    await page.screenshot({ path: join(output, 'mobile-achados-expandidos.png'), fullPage: true })
    assert.deepEqual(errors, [])
    console.log(`PASS browser: both kidneys, toggle, draft, real report, 320/390/768/1440. Screenshots: ${output}`)
  } finally { await browser.close(); await new Promise<void>(done => server.close(() => done())) }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
