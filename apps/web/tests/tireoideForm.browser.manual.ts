import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'

async function main() {
  const web = resolve('apps/web')
  const output = mkdtempSync(join(tmpdir(), 'tireoide-form-'))
  const bundle = await build({
    entryPoints: [join(web, 'tests/tireoideForm.browser.tsx')],
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    tsconfig: join(web, 'tsconfig.json'),
    define: {
      'process.env.NODE_ENV': '"test"',
      'process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION': '"false"',
    },
  })
  const cssFile = join(output, 'style.css')
  execFileSync(resolve('node_modules/.bin/tailwindcss'), [
    '-c', join(web, 'tailwind.config.ts'),
    '-i', join(web, 'src/app/globals.css'),
    '--content', `${join(web, 'src/components/**/*.tsx')},${join(web, 'tests/tireoideForm.browser.tsx')}`,
    '-o', cssFile,
  ], { stdio: 'pipe' })
  const css = readFileSync(cssFile, 'utf8')
  const server = createServer(async (request, response) => {
    try {
      if (request.url === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].text); return }
      if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return }
      if (request.method === 'POST' && request.url === '/render') {
        let raw = ''; for await (const chunk of request) raw += chunk
        const body = JSON.parse(raw)
        const result = renderizarSelecao('TIREOIDE', 'CLASSICO_COMPLETO', body.alteracoes, body.dados)
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.end(result.ok ? result.texto : `ERRO: ${JSON.stringify(result)}`)
        return
      }
      if (request.url !== '/') { response.statusCode = 404; response.end(); return }
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) { response.statusCode = 500; response.end(String(error)) }
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
      const errors: string[] = []
      page.on('pageerror', (error: Error) => errors.push(error.message))
      page.on('console', (message: any) => { if (message.type() === 'error') errors.push(message.text()) })
      await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
      await page.goto(origin)
      await page.waitForTimeout(250)
      if (await page.locator('#root > *').count() === 0) {
        throw new Error(`O React não montou o formulário. Erros: ${errors.join(' | ') || 'nenhum erro capturado'}`)
      }
      const panel = page.locator('section[aria-label="Nódulos tireoidianos"]')
      await panel.getByRole('button', { name: 'Adicionar nódulo' }).click()
      await panel.getByLabel('Localização do nódulo 1').selectOption('no terço médio')
      const medidas = panel.locator('input[inputmode="decimal"]')
      await medidas.nth(0).fill('1,2'); await medidas.nth(1).fill('1,0'); await medidas.nth(2).fill('0,8')
      for (const label of ['Sólido/quase sólido · 2', 'Muito hipoecoico · 3', 'Mais alta que larga · 3', 'Extensão extratireoidiana · 3', 'Puntiformes · 3']) {
        await panel.getByRole('button', { name: label, exact: true }).click()
      }
      await panel.getByText('TR5 · 14 pontos', { exact: true }).waitFor()
      assert.match(await panel.getByText(/Critério dimensional para PAAF/).textContent(), /12 mm ≥ 10 mm/)
      const adapted = JSON.parse(await page.getByTestId('adaptacao').textContent())
      const nodule = adapted.dados.lobo_direito.nodulos[0]
      assert.equal(nodule.localizacao, 'no terço médio')
      assert.equal(nodule.ecogenicidade, null, 'Domingos desligado não pode classificar')
      assert.equal(nodule.acr_tirads.composicao, 'solido')
      await page.waitForFunction(() => document.querySelector('[aria-label="Laudo gerado"]')?.textContent?.includes('ACR TI-RADS 5'))

      const domingos = panel.getByRole('button', { name: /Classificação de Domingos/ })
      assert.equal(await domingos.getAttribute('aria-pressed'), 'false')
      await domingos.click()
      assert.equal(await domingos.getAttribute('aria-pressed'), 'true')
      await panel.getByRole('button', { name: 'Hipoecoica', exact: true }).click()
      const withDomingos = JSON.parse(await page.getByTestId('adaptacao').textContent())
      assert.equal(withDomingos.dados.lobo_direito.nodulos[0].ecogenicidade, 'hipoecoica')

      const columns = panel.locator('fieldset').filter({ has: page.locator('legend') })
      assert.equal(await columns.count(), 5)
      const boxes = await columns.evaluateAll((elements: HTMLElement[]) => elements.map((element) => {
        const box = element.getBoundingClientRect(); return { x: box.x, y: box.y }
      }))
      if (viewport.name === 'desktop') {
        assert.equal(new Set(boxes.map((box: { y: number }) => Math.round(box.y))).size, 1, 'desktop: os cinco grupos devem ficar na mesma linha')
      } else {
        assert.ok(new Set(boxes.map((box: { y: number }) => Math.round(box.y))).size >= 3, 'mobile: os grupos devem quebrar em linhas')
        const shortTargets = await panel.locator('fieldset button').evaluateAll((buttons: HTMLElement[]) => buttons.filter((button) => button.offsetParent !== null && button.getBoundingClientRect().height < 44).map((button) => button.textContent))
        assert.deepEqual(shortTargets, [], 'mobile: opções ACR menores que 44 px')
      }
      const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
      assert.ok(pageWidth.scroll <= pageWidth.client, `${viewport.name}: rolagem horizontal`)

      await panel.getByRole('button', { name: 'Espongiforme · 0', exact: true }).click()
      await panel.getByText('TR1 · 0 pontos', { exact: true }).waitFor()
      assert.notEqual(await columns.nth(1).getAttribute('disabled'), null, 'espongiforme: demais categorias devem ficar inativas')
      assert.deepEqual(errors, [])
      await page.close()
    }
    console.log('Tireoide browser: ACR principal, responsividade, localização e Domingos opcional aprovados')
  } finally {
    await browser.close()
    await new Promise<void>((done) => server.close(() => done()))
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
