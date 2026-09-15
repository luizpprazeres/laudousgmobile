/** Real PE panel and shared FMF kernel, synthetic inputs, no external services. */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'

async function main() {
  const web = resolve('apps/web')
  const output = resolve('tmp-review/web-pe-campos')
  mkdirSync(output, {recursive: true})
  const bundle = await build({entryPoints: [join(web, 'tests/peWeb.browser.tsx')], bundle: true, write: false,
    platform: 'browser', jsx: 'automatic', tsconfig: join(web, 'tsconfig.json'), define: {'process.env.NODE_ENV': '"test"'}})
  // Compile the project's CSS independently of concurrent Next builds.
  const webRequire = createRequire(join(web, 'package.json'))
  const importedConfig = webRequire('./tailwind.config.ts')
  const config = importedConfig.default ?? importedConfig
  const css = (await webRequire('postcss')([webRequire('tailwindcss')({
    ...config, content: [join(web, 'src/components/laudar/PreEclampsiaFmfPanel.tsx')],
  })]).process(readFileSync(join(web, 'src/app/globals.css'), 'utf8'), {from: join(web, 'src/app/globals.css')})).css
  const server = createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles![0].text); return }
    if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); return }
    res.setHeader('Content-Type', 'text/html')
    res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
  })
  await new Promise<void>((r, reject) => {server.once('error', reject); server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', r)})
  const url = `http://127.0.0.1:${(server.address() as any).port}`
  if (process.env.PE_WEB_PREVIEW === '1') { console.log(`PE preview: ${url}`); return }
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  let browser: any
  try {
    browser = await chromium.launch({headless: true})
    const page = await browser.newPage({viewport: {width: 1280, height: 900}})
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    await page.goto(url)
    assert.equal(await page.getByRole('button', {name: 'Nulípara', exact: true}).getAttribute('aria-pressed'), 'false')
    assert.equal(await page.getByRole('button', {name: 'Multípara', exact: true}).getAttribute('aria-pressed'), 'false')
    assert.equal(await page.locator('pre').count(), 0)
    for (const [label, value] of [['Idade na DPP (anos)', '36'], ['Peso (kg)', '69'], ['Altura (cm)', '164'], ['IG — semanas', '12'], ['IG — dias', '0']]) await page.getByLabel(label, {exact: true}).fill(value)
    await page.getByRole('button', {name: 'Branca', exact: true}).click()
    await page.getByRole('button', {name: 'Multípara', exact: true}).click()
    await page.getByLabel('IG do parto anterior (sem)', {exact: true}).fill('35')
    await page.getByLabel('Intervalo entre gestações (anos)', {exact: true}).fill('3')
    assert.equal(await page.getByRole('button', {name: 'Sim', exact: true}).getAttribute('aria-pressed'), 'false')
    assert.equal(await page.getByRole('button', {name: 'Não', exact: true}).getAttribute('aria-pressed'), 'false')
    assert.equal(await page.locator('pre').count(), 0)
    await page.getByRole('button', {name: 'Sim', exact: true}).click()
    await page.getByLabel('Z-score do peso ao nascer', {exact: true}).fill('-1')
    await page.getByRole('button', {name: 'Nulípara', exact: true}).click()
    assert.equal(await page.getByRole('button', {name: 'Sim', exact: true}).count(), 0)
    assert.equal(await page.getByLabel('Z-score do peso ao nascer', {exact: true}).count(), 0)
    await page.getByRole('button', {name: 'Multípara', exact: true}).click()
    assert.equal(await page.getByRole('button', {name: 'Sim', exact: true}).getAttribute('aria-pressed'), 'true')
    assert.equal(await page.getByLabel('IG do parto anterior (sem)', {exact: true}).inputValue(), '35')
    assert.equal(await page.getByLabel('Z-score do peso ao nascer', {exact: true}).inputValue(), '-1')
    await page.getByRole('button', {name: 'Não', exact: true}).click()
    assert.equal(await page.getByLabel('Z-score do peso ao nascer', {exact: true}).count(), 0)
    await page.getByRole('button', {name: 'Sim', exact: true}).click()
    assert.equal(await page.getByLabel('Z-score do peso ao nascer', {exact: true}).inputValue(), '-1')
    for (const label of ['HAS crônica', 'DM tipo 1 ou 2', 'In vitro']) {
      await page.getByLabel(label, {exact: true}).check()
      assert.equal(await page.getByLabel(label, {exact: true}).isChecked(), true)
      await page.getByLabel(label, {exact: true}).uncheck()
    }
    assert.match(await page.getByLabel('DM tipo 1 ou 2', {exact: true}).getAttribute('aria-description'), /pré-gestacional.*não diabetes gestacional/)
    await page.getByLabel('PAS 1', {exact: true}).fill('120')
    await page.getByLabel('PAD 1', {exact: true}).fill('80')
    const right = page.getByLabel('IP direito', {exact: true})
    const left = page.getByLabel('IP esquerdo', {exact: true})
    for (const [direito, esquerdo, media] of [['1.1', '1.3', '1,2'], ['1.21', '1.24', '1,225']]) {
      await right.fill(direito)
      await left.fill(esquerdo)
      assert.equal(await page.getByLabel('IP médio calculado', {exact: true}).inputValue(), media)
    }
    await left.fill('')
    await right.fill('1,2')
    await page.getByRole('alert').waitFor()
    assert.equal(await page.getByRole('button', {name: 'Inserir no laudo', exact: true}).count(), 0)
    await left.fill('1,6')
    assert.equal(await page.getByLabel('IP médio calculado', {exact: true}).inputValue(), '1,4')
    assert.match(await page.locator('pre').innerText(), /IP médio das artérias uterinas: 1,40/)
    await page.getByRole('button', {name: 'Inserir no laudo', exact: true}).click()
    await page.screenshot({path: join(output, 'desktop-bilateral.png'), fullPage: true})
    await page.getByLabel('Média manual', {exact: true}).check()
    assert.equal(await right.isDisabled(), true)
    assert.equal(await right.inputValue(), '')
    assert.equal(await left.inputValue(), '')
    assert.doesNotMatch(await page.locator('pre').innerText(), /IP médio das artérias uterinas:/)
    await page.getByText('O laudo ainda contém um resultado anterior.', {exact: false}).waitFor()
    await page.getByLabel('IP médio manual', {exact: true}).fill('2')
    assert.match(await page.locator('pre').innerText(), /IP médio das artérias uterinas: 2,00/)
    await page.getByLabel('Direito e esquerdo', {exact: true}).check()
    assert.equal(await page.getByLabel('IP médio calculado', {exact: true}).inputValue(), '')
    await right.fill('1')
    assert.equal(await page.locator('pre').count(), 0)
    await left.fill('1,4')
    assert.match(await page.locator('pre').innerText(), /IP médio das artérias uterinas: 1,20/)
    for (let n = 2; n <= 4; n++) {
      await page.getByRole('button', {name: 'Aferição', exact: true}).click()
      await page.getByLabel(`PAS ${n}`, {exact: true}).fill('120')
      await page.getByLabel(`PAD ${n}`, {exact: true}).fill('80')
    }
    assert.match(await page.locator('pre').innerText(), /4 aferições/)
    assert.equal(await page.getByRole('button', {name: 'Aferição', exact: true}).count(), 0)
    await page.getByRole('button', {name: 'Remover aferição 4', exact: true}).click()
    assert.match(await page.locator('pre').innerText(), /3 aferições/)
    for (const width of [390, 320, 768]) {
      await page.setViewportSize({width, height: 844})
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow ${width}`)
      const bounds = await page.locator('.pe-ip-grid input').evaluateAll((inputs: HTMLInputElement[]) => inputs.map(i => ({x:i.getBoundingClientRect().x, y:i.getBoundingClientRect().y, right:i.getBoundingClientRect().right})))
      assert.equal(new Set(bounds.map((b: any) => b.y)).size, 1)
      assert.ok(bounds.every((b: any) => b.x >= 0 && b.right <= width))
      if (width === 390) await page.screenshot({path: join(output, 'mobile-bilateral.png'), fullPage: true})
    }
    await page.setViewportSize({width: 390, height: 844})
    await page.getByRole('button', {name: 'Nulípara', exact: true}).click()
    await page.getByLabel('Média manual', {exact: true}).check()
    await page.getByLabel('IP médio manual', {exact: true}).fill('1,08')
    await page.screenshot({path: join(output, 'mobile-manual-nulipara.png'), fullPage: true})
    await page.goto(`${url}/?multiple=1`)
    const panels = page.locator('.pe-fmf-panel')
    await panels.nth(0).getByLabel('Média manual', {exact: true}).check()
    assert.equal(await panels.nth(1).getByLabel('Direito e esquerdo', {exact: true}).isChecked(), true)
    assert.notEqual(await panels.nth(0).getByLabel('Média manual', {exact: true}).getAttribute('name'), await panels.nth(1).getByLabel('Média manual', {exact: true}).getAttribute('name'))
    assert.deepEqual(errors, [])
    console.log(`PASS: conditional history, preserved inputs, exclusive PI, stale result, 1-4 BP, 320/390/768 layout. Screenshots: ${output}`)
  } finally { await browser?.close(); await new Promise<void>(r => server.close(() => r())) }
}
main().catch(error => {console.error(error); process.exitCode = 1})
