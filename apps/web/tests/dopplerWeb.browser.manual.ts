/** Local browser harness. Auth/storage are fake; catalog renderer is real.
 * PLAYWRIGHT_MODULE may point to an existing Playwright installation.
 * Run from repository root, after building web, with the API tsconfig.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'

async function main() {
  const output = mkdtempSync(join(tmpdir(), 'doppler-web-'))
  const web = resolve(__dirname, '..')
  const saved: any[] = []
  let renderRequests = 0
  let delayMs = 0
  let failRender = false
  const buildBundle = () => build({
    entryPoints: [join(web, 'tests/dopplerWeb.browser.tsx')], bundle: true, write: false,
    platform: 'browser', jsx: 'automatic', tsconfig: join(web, 'tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION': '"false"' },
    plugins: [{ name: 'local-only-services', setup(b) {
      b.onResolve({ filter: /^(next\/link|next\/navigation|@\/lib\/supabase\/client)$/ }, args => ({ path: args.path, namespace: 'test' }))
      b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'jsx', resolveDir: web, contents:
        args.path === 'next/link' ? 'export default function Link({children, ...props}) { return <a {...props}>{children}</a> }'
          : args.path === 'next/navigation' ? 'export const usePathname = () => "/app/gerar"'
          : `export function createClient() {
              return { auth: { getUser: async () => ({data: {user: {id: 'synthetic'}}}) }, from(table) {
                const query = new Proxy({}, { get(_target, prop) {
                  if (prop === 'maybeSingle') return async () => ({data: null, error: null});
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
  const bundle = await buildBundle()
  const css = readdirSync(join(web, '.next/static/css')).filter(f => f.endsWith('.css')).map(f => readFileSync(join(web, '.next/static/css', f), 'utf8')).join('\n')
  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/bundle.js') {
        const current = process.env.DOPPLER_WEB_PREVIEW === '1' ? await buildBundle() : bundle
        res.setHeader('Content-Type', 'text/javascript'); res.end(current.outputFiles![0].text); return
      }
      if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); return }
      if (req.url === '/icons/apple-touch-icon.png') { res.setHeader('Content-Type', 'image/png'); res.end(readFileSync(join(web, 'public/icons/apple-touch-icon.png'))); return }
      if (req.url === '/fonts/BarlowCondensed-Light.ttf') { res.setHeader('Content-Type', 'font/ttf'); res.end(readFileSync(join(web, 'public/fonts/BarlowCondensed-Light.ttf'))); return }
      if (/^\/categories\/[a-z0-9-]+\.webp$/.test(req.url ?? '')) {
        res.setHeader('Content-Type', 'image/webp'); res.end(readFileSync(join(web, 'public', req.url!.slice(1)))); return
      }
      if (req.method === 'POST') {
        let raw = ''; for await (const chunk of req) raw += chunk
        const body = JSON.parse(raw)
        if (req.url === '/test-save') { saved.push(body); res.end('{}'); return }
        const category = req.url?.match(/^\/api\/catalog\/([^/]+)\/render$/)?.[1]
        if (category) {
          renderRequests++
          const result = renderizarSelecao(category, 'CLASSICO_COMPLETO', [], body.dados)
          const failure = failRender
          await new Promise(r => setTimeout(r, delayMs))
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = failure ? 503 : result.ok ? 200 : 409
          res.end(JSON.stringify(failure ? {error: 'Falha de teste'} : result.ok ? {laudo: result.texto} : result)); return
        }
      }
      if (req.url !== '/') { res.statusCode = 404; res.end(); return }
      res.setHeader('Content-Type', 'text/html')
      res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) { res.statusCode = 500; res.end(String(error)) }
  })
  await new Promise<void>((r, reject) => {
    server.once('error', reject)
    server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', r)
  })
  const port = (server.address() as any).port
  const origin = `http://127.0.0.1:${port}`
  if (process.env.DOPPLER_WEB_PREVIEW === '1') {
    console.log(`Preview local (auth e salvamento simulados): ${origin}`)
    return
  }
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: {width: 1440, height: 900} })
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    await page.goto(origin)
    await page.getByRole('heading', {name: 'Qual exame você deseja realizar?'}).waitFor()
    const choiceCount = await page.locator('.exam-category-item').count()
    assert.ok(choiceCount >= 14)
    await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>('.exam-category-art img')).length === 15 && Array.from(document.querySelectorAll<HTMLImageElement>('.exam-category-art img')).every(img => img.complete && img.naturalWidth > 0))
    assert.equal(await page.locator('.exam-category-art img').count(), choiceCount)
    assert.ok(await page.locator('.exam-category-art img').evaluateAll((images: HTMLImageElement[]) => images.every(img => getComputedStyle(img).filter === 'grayscale(1)' && getComputedStyle(img).opacity === '0.8')))
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    assert.equal(await page.locator('.exam-category-art img').first().evaluate((img: HTMLImageElement) => getComputedStyle(img).opacity), '0.8')
    assert.equal(await page.locator('.exam-category-picker').evaluate((el: HTMLElement) => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
    assert.ok(await page.locator('.exam-category-item').evaluateAll((items: HTMLElement[]) => items.every(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)')))
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
    await page.evaluate(() => document.fonts.ready)
    assert.ok(await page.evaluate(() => document.fonts.check('300 22px "Category Condensed"')))
    assert.ok(await page.locator('.exam-category-label').evaluateAll((items: HTMLElement[]) => items.every(el => {
      const style = getComputedStyle(el)
      return style.textTransform === 'uppercase' && style.fontWeight === '300' && style.textAlign === 'center'
    })))
    assert.equal(await page.locator('.exam-category-art img').evaluateAll((images: HTMLImageElement[]) => new Set(images.map(img => img.src)).size), choiceCount)
    await page.getByLabel('Buscar categoria').fill('obstetrica')
    assert.equal(await page.locator('.exam-category-item').count(), 2)
    await page.getByLabel('Buscar categoria').fill('exame inexistente')
    await page.getByRole('status').getByText('Nenhum exame encontrado.').waitFor()
    await page.getByRole('button', {name: 'Limpar busca'}).click()
    assert.equal(await page.locator('.exam-category-item').count(), choiceCount)
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height: 900})
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      assert.ok(await page.locator('.exam-category-item').evaluateAll((items: HTMLElement[]) => items.every(item => item.scrollWidth <= item.clientWidth)))
      await page.screenshot({path: join(output, `categories-${width}.png`), fullPage: true, animations: 'disabled'})
    }
    assert.equal(renderRequests, 0, 'no report request before selecting a category')
    assert.ok(await page.locator('.exam-category-picker img').evaluateAll((images: HTMLImageElement[]) => images.every(img => img.complete && img.naturalWidth > 0)))
    await page.getByLabel('Buscar categoria').focus()
    await page.keyboard.press('Tab')
    assert.ok(await page.locator('.exam-category-item').first().evaluate((button: HTMLElement) => button === document.activeElement), 'Tab must reach category choices')
    await page.emulateMedia({reducedMotion: 'reduce'})
    assert.equal(await page.locator('.exam-category-item').first().evaluate((button: HTMLElement) => getComputedStyle(button).animationName), 'none')
    await page.setViewportSize({width: 1440, height: 900})
    await page.getByRole('button', {name: 'Obstétrica com Doppler', exact: true}).click()
    const toggle = page.getByRole('switch', {name: 'Somente Doppler'})
    const editor = page.getByRole('textbox', {name: 'Editar texto do laudo'})
    const save = page.getByRole('button', {name: 'Salvar laudo', exact: true})
    await page.waitForFunction(() => document.querySelector('[contenteditable]')?.textContent?.includes('COM DOPPLER COLORIDO'))
    assert.equal(await toggle.isChecked(), false)
    assert.equal(await page.getByLabel('Selecionar categoria').inputValue(), 'DOPPLER_OBSTETRICO')
    assert.equal(await page.locator('option:checked').first().innerText(), 'Obstétrica com Doppler')
    await page.getByRole('button', {name: 'Biometria e crescimento', exact: true}).click()
    await page.getByPlaceholder('48', {exact: true}).fill('82')
    await page.getByPlaceholder('175', {exact: true}).fill('295')
    await page.getByPlaceholder('152', {exact: true}).fill('285')
    await page.getByPlaceholder('33', {exact: true}).fill('62')
    await page.getByPlaceholder('320', {exact: true}).fill('1900')
    await page.waitForFunction(() => document.querySelector('[contenteditable]')?.textContent?.includes('1900'))
    for (const value of ['82', '295', '285', '62', '1900']) assert.ok((await editor.innerText()).includes(value))
    assert.doesNotMatch(await editor.innerText(), /(?:DBP|cabeça|abdominal|fêmur)[^\n]*____/i)
    await page.screenshot({path: join(output, 'combined.png'), fullPage: true})
    const original = await editor.innerText()
    await editor.fill(`${original}\nRASCUNHO COMBINADO`)
    await page.getByRole('button', {name: 'Voltar às categorias'}).click()
    await page.getByRole('button', {name: 'Obstétrica com Doppler', exact: true}).click()
    assert.match(await editor.innerText(), /RASCUNHO COMBINADO/)
    await toggle.check()
    await page.waitForFunction(() => document.querySelector('[contenteditable]')?.textContent?.startsWith('DOPPLERVELOCIMETRIA OBSTÉTRICA'))
    assert.equal(await page.getByRole('button', {name: 'Biometria e crescimento', exact: true}).count(), 0)
    assert.doesNotMatch(await editor.innerText(), /1900|RASCUNHO COMBINADO|biometria|placenta/i)
    await save.click()
    await page.getByRole('button', {name: 'Salvo', exact: true}).waitFor()
    assert.equal(saved.at(-1).category_code, 'DOPPLER_OBSTETRICO')
    assert.equal(saved.at(-1).exam_state.biometria, undefined)
    assert.doesNotMatch(saved.at(-1).laudo_text, /RASCUNHO COMBINADO|1900/)
    await page.screenshot({path: join(output, 'isolated.png'), fullPage: true})
    await editor.fill(`${await editor.innerText()}\nRASCUNHO ISOLADO`)
    await toggle.uncheck()
    assert.match(await editor.innerText(), /RASCUNHO COMBINADO/)
    assert.doesNotMatch(await editor.innerText(), /RASCUNHO ISOLADO/)
    await toggle.check()
    assert.match(await editor.innerText(), /RASCUNHO ISOLADO/)
    // Fresh page: delayed combined response must not replace the isolated report.
    await page.reload()
    delayMs = 1000
    await page.getByRole('button', {name: 'Obstétrica com Doppler', exact: true}).click()
    await page.waitForRequest((r: any) => r.url().includes('/OBSTETRICA/render'))
    await toggle.check()
    await page.waitForFunction(() => document.querySelector('[contenteditable]')?.textContent?.startsWith('DOPPLERVELOCIMETRIA OBSTÉTRICA'))
    assert.doesNotMatch(await editor.innerText(), /COM DOPPLER COLORIDO|biometria/i)
    delayMs = 0; failRender = true
    await toggle.uncheck()
    await page.getByText('Falha de teste', {exact: false}).first().waitFor()
    const savedBeforeFailure = saved.length
    await save.click()
    await page.getByText('O laudo não foi montado — não dá para salvar o texto anterior como se fosse este exame.', {exact: true}).waitFor()
    assert.equal(saved.length, savedBeforeFailure)
    failRender = false
    await page.getByLabel('Selecionar categoria').selectOption('OBSTETRICA')
    assert.equal(await toggle.count(), 0)
    assert.equal(await page.getByRole('button', {name: 'Doppler', exact: true}).count(), 0)
    await page.setViewportSize({width: 390, height: 844})
    await page.getByLabel('Selecionar categoria').selectOption('DOPPLER_OBSTETRICO')
    await toggle.uncheck()
    await page.waitForFunction(() => document.querySelector('[contenteditable]')?.textContent?.includes('COM DOPPLER COLORIDO'))
    await page.getByRole('button', {name: 'Biometria e crescimento', exact: true}).click()
    for (const [placeholder, value] of [['48', '82'], ['175', '295'], ['152', '285'], ['33', '62'], ['320', '1900']]) {
      await page.getByPlaceholder(placeholder, {exact: true}).fill(value)
    }
    await page.waitForFunction(() => document.querySelector('[contenteditable]')?.textContent?.includes('1900'))
    for (const value of ['82', '295', '285', '62', '1900']) assert.ok((await editor.innerText()).includes(value))
    await page.screenshot({path: join(output, 'mobile-combined.png'), fullPage: true})
    const mobileBounds = await editor.boundingBox()
    assert.ok(mobileBounds)
    assert.ok(mobileBounds.x >= 0 && mobileBounds.x + mobileBounds.width <= 390, 'mobile report must fit')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page overflow')
    await toggle.check()
    await page.waitForFunction(() => document.querySelector('[contenteditable]')?.textContent?.startsWith('DOPPLERVELOCIMETRIA OBSTÉTRICA'))
    assert.equal(await page.getByRole('button', {name: 'Biometria e crescimento', exact: true}).count(), 0)
    await page.screenshot({path: join(output, 'mobile-isolated.png'), fullPage: true})
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({width, height: 900})
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no page overflow at ${width}`)
    }
    console.log('Responsive: 320/390/768/1280px without horizontal page overflow; mobile report fits')
    await page.getByLabel('Selecionar categoria').selectOption('OBSTETRICA')
    await page.getByRole('button', {name: 'Pré-eclâmpsia FMF', exact: true}).click()
    await page.getByLabel('Peso (kg)', {exact: true}).fill('69')
    await page.getByRole('button', {name: 'Voltar às categorias'}).click()
    await page.getByRole('button', {name: 'Obstétrica', exact: true}).click()
    assert.equal(await page.getByLabel('Peso (kg)', {exact: true}).inputValue(), '69', 'category picker must preserve uninserted calculator inputs')
    for (const [label, value] of [['Idade na DPP (anos)', '30'], ['Altura (cm)', '165'], ['IG — semanas', '12'], ['IG — dias', '5']]) {
      await page.getByLabel(label, {exact: true}).fill(value)
    }
    await page.getByRole('button', {name: 'Branca', exact: true}).click()
    await page.getByRole('button', {name: 'Nulípara', exact: true}).click()
    const openSheet = page.getByRole('button', {name: 'Folha para impressão', exact: true})
    await openSheet.waitFor()
    const clinicalText = await page.locator('.pe-fmf-panel pre').innerText()
    await page.getByRole('button', {name: 'Inserir no laudo', exact: true}).click()
    await page.evaluate(() => { (window as any).printCalls = 0; window.print = () => { (window as any).printCalls++ } })
    await openSheet.click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    assert.equal(await dialog.locator('pre').innerText(), clinicalText)
    assert.equal(await page.evaluate(() => (window as any).printCalls), 0)
    await dialog.getByRole('button', {name: 'Imprimir', exact: true}).click()
    assert.equal(await page.evaluate(() => (window as any).printCalls), 1)
    await dialog.getByRole('button', {name: 'Fechar', exact: true}).focus()
    await page.keyboard.press('Tab')
    assert.ok(await dialog.getByRole('button', {name: 'Imprimir', exact: true}).evaluate((el: HTMLElement) => el === document.activeElement))
    await page.keyboard.press('Shift+Tab')
    assert.ok(await dialog.getByRole('button', {name: 'Fechar', exact: true}).evaluate((el: HTMLElement) => el === document.activeElement))
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height: 900})
      await page.screenshot({path: join(output, `pe-sheet-${width}.png`), fullPage: true})
      assert.ok(await dialog.evaluate((el: HTMLElement) => el.scrollWidth <= el.clientWidth), `print dialog overflow at ${width}; screenshots: ${output}`)
    }
    await page.setViewportSize({width: 1440, height: 900})
    await page.emulateMedia({media: 'print'})
    assert.equal(await page.locator('#root').isVisible(), false)
    assert.equal(await dialog.getByRole('button', {name: 'Imprimir', exact: true}).isVisible(), false)
    await page.pdf({path: join(output, 'pe-sheet.pdf'), preferCSSPageSize: true, printBackground: true})
    await page.emulateMedia({media: 'screen'})
    await page.keyboard.press('Escape')
    await dialog.waitFor({state: 'hidden'})
    assert.ok(await openSheet.evaluate((el: HTMLElement) => el === document.activeElement))
    assert.equal(await page.locator('[data-pe-print-root]').count(), 0)
    assert.equal(await page.locator('#root').getAttribute('inert'), null)
    await page.getByLabel('Peso (kg)', {exact: true}).fill('90')
    const updatedText = await page.locator('.pe-fmf-panel pre').innerText()
    assert.notEqual(updatedText, clinicalText)
    await openSheet.click()
    assert.equal(await dialog.locator('pre').innerText(), updatedText, 'print current result, not previously inserted block')
    await page.keyboard.press('Escape')
    await page.getByLabel('Peso (kg)', {exact: true}).fill('')
    assert.equal(await openSheet.count(), 0, 'invalid inputs must not offer a stale print result')
    // An enabled growth assessment must not silently discard malformed input.
    await page.reload()
    await page.getByRole('button', {name: 'Obstétrica', exact: true}).click()
    await page.waitForFunction(() => Boolean(document.querySelector('[contenteditable]')?.textContent?.trim()))
    await page.getByRole('button', {name: 'Biometria e crescimento', exact: true}).click()
    const growthPanel = page.locator('section').filter({has: page.getByRole('heading', {name: 'Crescimento fetal', exact: true})}).last()
    await growthPanel.getByRole('button', {name: 'Sim', exact: true}).first().click()
    const percentileInput = page.getByLabel('Percentil do peso fetal', {exact: true})
    await percentileInput.fill('8abc')
    await page.getByText('O laudo não foi montado.', {exact: true}).waitFor()
    const requestsWithInvalidPercentile = renderRequests
    const savesWithInvalidPercentile = saved.length
    await save.click()
    await page.getByText('O laudo não foi montado — não dá para salvar o texto anterior como se fosse este exame.', {exact: true}).waitFor()
    assert.equal(saved.length, savesWithInvalidPercentile)
    assert.equal(renderRequests, requestsWithInvalidPercentile)
    assert.equal(await percentileInput.inputValue(), '8abc')
    await growthPanel.getByRole('button', {name: 'Não', exact: true}).first().click()
    await page.getByText('O laudo não foi montado.', {exact: true}).waitFor({state: 'hidden'})
    await growthPanel.getByRole('button', {name: 'Sim', exact: true}).first().click()
    assert.equal(await percentileInput.inputValue(), '8abc', 'invalid draft must survive deactivation')
    await page.getByText('O laudo não foi montado.', {exact: true}).waitFor()
    await page.getByPlaceholder('48', {exact: true}).fill('82')
    await page.getByRole('button', {name: 'Reset', exact: true}).click()
    assert.equal(await page.getByPlaceholder('48', {exact: true}).inputValue(), '')
    assert.equal(await percentileInput.count(), 0, 'group reset must also deactivate growth')
    await growthPanel.getByRole('button', {name: 'Sim', exact: true}).first().click()
    assert.equal(await percentileInput.inputValue(), '', 'group reset must clear growth draft')
    await page.getByPlaceholder('320', {exact: true}).fill('1900')
    await percentileInput.fill('8.5')
    await page.getByText('O laudo não foi montado.', {exact: true}).waitFor({state: 'hidden'})
    await page.getByPlaceholder('320', {exact: true}).fill('2000')
    assert.equal(await percentileInput.inputValue(), '', 'new weight requires a new percentile')
    await page.getByText('O laudo não foi montado.', {exact: true}).waitFor()
    await percentileInput.fill('9')
    await page.getByPlaceholder('48', {exact: true}).fill('83')
    assert.equal(await percentileInput.inputValue(), '9', 'unrelated biometric field preserves manual percentile')
    await page.getByPlaceholder('320', {exact: true}).fill('2000,0')
    assert.equal(await percentileInput.inputValue(), '9', 'equivalent weight formatting preserves percentile')
    for (const [placeholder, value] of [['48', '82'], ['175', '295'], ['152', '285'], ['33', '62']]) {
      await page.getByPlaceholder(placeholder, {exact: true}).fill(value)
    }
    assert.equal(await page.getByPlaceholder('320', {exact: true}).inputValue(), '2000,0', 'automatic calculation must preserve manual weight until applied')
    await page.getByRole('button', {name: 'Aplicar 1977 g ao peso estimado', exact: true}).click()
    assert.equal(await page.getByPlaceholder('320', {exact: true}).inputValue(), '1977')
    assert.equal(await percentileInput.inputValue(), '', 'applying calculated weight invalidates old percentile')
    await page.getByPlaceholder('48', {exact: true}).fill('82abc')
    assert.equal(await page.getByRole('button', {name: /Aplicar .* g ao peso estimado/}).count(), 0, 'invalid measure cannot be applied')
    // The Hadlock-3 chart is a separate read-only result, not manual weight.
    await page.getByRole('button', {name: 'Datação', exact: true}).click()
    await page.getByLabel('Biometria atual · semanas', {exact: true}).fill('24')
    await page.getByPlaceholder('3', {exact: true}).fill('3')
    await page.getByRole('button', {name: /^Biometria e crescimento/}).click()
    for (const [placeholder, value] of [['175', '230'], ['152', '210'], ['33', '50']]) {
      await page.getByPlaceholder(placeholder, {exact: true}).fill(value)
    }
    await percentileInput.fill('11')
    const curve = page.getByRole('img', {name: /^Gráfico INTERGROWTH/})
    await curve.waitFor()
    assert.match(await curve.getAttribute('aria-label'), /870 g.*24\+3.*99,5/)
    assert.equal(await curve.locator('path').count(), 5)
    assert.equal(await page.getByPlaceholder('320', {exact: true}).inputValue(), '1977')
    assert.equal(await percentileInput.inputValue(), '11')
    await page.getByPlaceholder('48', {exact: true}).fill('70')
    assert.match(await curve.getAttribute('aria-label'), /870 g.*24\+3.*99,5/, 'DBP does not change Hadlock-3 preview')
    await page.getByText('O laudo não foi montado.', {exact: true}).waitFor({state: 'hidden'})
    await curve.scrollIntoViewIfNeeded()
    await page.screenshot({path: join(output, 'intergrowth-desktop.png')})
    await page.setViewportSize({width: 390, height: 844})
    await curve.scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    const box = await curve.boundingBox()
    assert.ok(box && box.width > 150 && box.x >= 0 && box.x + box.width <= 391)
    await page.screenshot({path: join(output, 'intergrowth-mobile.png')})
    await page.setViewportSize({width: 1440, height: 900})
    const growthSheetButton = page.getByRole('button', {name: 'Abrir folha de crescimento fetal', exact: true})
    await growthSheetButton.click()
    const growthSheet = page.getByRole('dialog', {name: /Crescimento fetal/})
    await growthSheet.waitFor()
    assert.match(await growthSheet.textContent(), /870 g/)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    assert.equal(await growthSheet.evaluate(el => el.contains(document.activeElement)), true)
    await page.emulateMedia({media: 'print'})
    await page.pdf({path: join(output, 'intergrowth-sheet.pdf'), format: 'A4', printBackground: true})
    assert.equal(await page.locator('#root').evaluate(el => getComputedStyle(el).display), 'none')
    await page.emulateMedia({media: 'screen'})
    await page.keyboard.press('Escape')
    await growthSheet.waitFor({state: 'detached'})
    assert.equal(await page.locator('#root').getAttribute('inert'), null)
    assert.equal(await growthSheetButton.evaluate(el => el === document.activeElement), true)
    await page.getByPlaceholder('175', {exact: true}).fill('')
    assert.equal(await curve.count(), 0, 'invalid measure must remove old chart')
    assert.equal(await percentileInput.inputValue(), '11', 'read-only preview cannot clear manual percentile')
    await page.getByPlaceholder('175', {exact: true}).fill('230')
    await curve.waitFor()
    await page.getByRole('button', {name: /^Datação/}).click()
    await page.getByPlaceholder('3', {exact: true}).fill('')
    await page.getByRole('button', {name: /^Biometria e crescimento/}).click()
    assert.equal(await curve.count(), 0, 'missing days must not silently become zero')
    assert.deepEqual(errors, [])
    const fallbackPage = await browser.newPage()
    await fallbackPage.route('**/*', (route: any) => {
      const url = route.request().url()
      return !url.startsWith(origin) || url.endsWith('/categories/tireoide-v1.webp') ? route.abort() : route.continue()
    })
    await fallbackPage.goto(origin)
    const thyroidChoice = fallbackPage.getByRole('button', {name: 'Tireoide', exact: true})
    await thyroidChoice.locator('svg').waitFor()
    await thyroidChoice.click()
    assert.equal(await fallbackPage.getByLabel('Selecionar categoria').inputValue(), 'TIREOIDE')
    await fallbackPage.close()
    console.log(`Browser: mode, drafts, save, stale response and failure checks passed. Screenshots: ${output}`)
  } finally { await browser.close(); await new Promise<void>(r => server.close(() => r())) }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
