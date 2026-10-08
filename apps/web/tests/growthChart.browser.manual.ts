import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
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
      'process.env.NEXT_PUBLIC_COMPANION_FORM_PATCH_CATEGORIES': '""',
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
      if (request.url !== '/' && request.url !== '/history' && request.url !== '/history-invalid' && request.url !== '/history-mixed' && request.url !== '/history-doppler' && request.url !== '/history-firsttrim') {
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
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Servidor local indisponível')
  const origin = `http://127.0.0.1:${address.port}`
  const browser = await chromium.launch({ headless: true })
  try {
    if (process.env.CLINICAL_CHART_QA_DIR) mkdirSync(process.env.CLINICAL_CHART_QA_DIR, { recursive: true })
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true })
    const errors: string[] = []
    page.on('pageerror', (error: Error) => { errors.push(error.message); console.error('Browser error:', error.message) })
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
    assert.match(await curve.getAttribute('aria-label'), /24\+3 semanas.*870 g.*99,5/)
    assert.doesNotMatch(await curve.getAttribute('aria-label'), /28\+0/)
    assert.equal(await curve.locator('[data-growth-centile]').count(), 5)
    assert.equal(await curve.locator('[data-growth-point="current"]').count(), 1)

    await page.getByRole('button', { name: 'Adicionar exame anterior', exact: true }).click()
    await page.getByLabel('Data do exame anterior', { exact: true }).fill('2026-05-21')
    await page.getByLabel('PFE informado no exame anterior (g)', { exact: true }).fill('400')
    await page.getByText(/Exame anterior: 20s0d · 400 g · percentil/).waitFor()
    assert.equal(await curve.locator('[data-growth-point="historical"]').count(), 1)
    assert.equal(await curve.locator('[data-growth-trajectory]').count(), 1)
    assert.match(await curve.getAttribute('aria-label'), /Exame anterior em 21\/05\/2026.*(?:20 semanas e 0 dias|20\+0 semanas).*400 g.*Exame atual/s)

    // Imprimir antes de incluir usa a prévia viva, com histórico intacto.
    const livePrintButton = page.getByRole('button', { name: 'Abrir folha de crescimento fetal', exact: true })
    await livePrintButton.click()
    const liveDialog = page.getByRole('dialog', { name: 'Página clínica · A4' })
    await liveDialog.waitFor()
    assert.match(await liveDialog.textContent(), /870 g.*24\+3.*datação por DUM · exame em 21\/06\/2026/s)
    assert.equal(await liveDialog.locator('[data-growth-point="historical"]').count(), 1)
    await page.keyboard.press('Escape')
    await liveDialog.waitFor({ state: 'detached' })
    assert.equal(await livePrintButton.evaluate(element => document.activeElement === element), true)
    await page.getByRole('button', { name: 'Incluir gráfico no laudo', exact: true }).click()
    assert.equal(await page.locator('[data-clinical-page]').count(), 0, 'A4 não deve alongar o formulário')
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
    assert.equal(stored.format, 'fetal-growth-intergrowth-v2')
    assert.equal(stored.calculationVersion, 'intergrowth2020-lms-hadlock3-v1')
    assert.equal(stored.standardVersion, 'INTERGROWTH-21st 2020')
    assert.equal(stored.formula, 'Hadlock CC/CA/CF (3 parâmetros)')
    assert.equal(stored.gestationalAgeSource, 'dum')
    assert.equal(stored.examDate, '2026-06-21')
    assert.equal(stored.gestationalAgeDays, 171)
    assert.deepEqual(stored.measurementsMm, { cc: 230, ca: 210, cf: 50 })
    assert.ok(Math.abs(stored.weightGramsRaw - 870.16177215199957) < 1e-9)
    assert.equal(stored.priorExams.length, 1)
    assert.equal(stored.priorExams[0].examDate, '2026-05-21')
    assert.equal(stored.priorExams[0].gestationalAgeDays, 140)
    assert.equal(stored.priorExams[0].weightGrams, 400)
    assert.doesNotMatch(saved[0].exam_state.__presentation.html, /<svg|<img/i)

    // Calculadora viva: editar ou apagar uma fonte não deixa risco antigo na folha.
    await page.getByRole('tab', { name: /^Achados/ }).click()
    const pePanel = page.locator('.pe-fmf-panel')
    for (const [label, value] of [['Data de nascimento', '15/03/1990'], ['Data do exame', '21/06/2026'], ['Peso (kg)', '69'], ['Altura (cm)', '164'], ['IG — semanas', '12'], ['IG — dias', '0']]) {
      await pePanel.getByLabel(label, { exact: true }).fill(value)
    }
    await pePanel.getByRole('button', { name: 'Branca', exact: true }).click()
    await pePanel.getByRole('button', { name: 'Nulípara', exact: true }).click()
    await pePanel.getByRole('button', { name: 'Página clínica / PDF', exact: true }).click()
    const liveRiskDialog = page.getByRole('dialog', { name: 'Página clínica · A4' })
    const originalRisks = await liveRiskDialog.locator('.clinical-risk-grid').textContent()
    await page.keyboard.press('Escape')
    await pePanel.getByLabel('Peso (kg)', { exact: true }).fill('90')
    await pePanel.getByRole('button', { name: 'Página clínica / PDF', exact: true }).click()
    assert.notEqual(await liveRiskDialog.locator('.clinical-risk-grid').textContent(), originalRisks)
    await page.keyboard.press('Escape')
    await page.getByRole('tab', { name: /^Laudo/ }).click()
    await page.getByLabel('Incluir Doppler e riscos no laudo salvo', { exact: true }).check()
    await page.getByRole('button', { name: 'Salvar laudo', exact: true }).click()
    await page.getByRole('button', { name: 'Salvo', exact: true }).waitFor()
    assert.equal(saved[1].exam_state.__clinical_charts.figure.pe.gestante.peso, 90)
    await page.getByRole('tab', { name: /^Achados/ }).click()
    await pePanel.getByLabel('Altura (cm)', { exact: true }).fill('')
    await page.getByRole('button', { name: 'Abrir folha de crescimento fetal', exact: true }).click()
    assert.equal(await liveRiskDialog.locator('.clinical-risk-grid').count(), 0, 'fonte incompleta oculta PE em vez de ressuscitar risco salvo')
    await page.keyboard.press('Escape')
    await page.getByRole('tab', { name: /^Laudo/ }).click()
    await page.getByRole('button', { name: 'Salvar laudo', exact: true }).click()
    await page.getByRole('button', { name: 'Salvo', exact: true }).waitFor()
    assert.equal(saved[2].exam_state.__clinical_charts.figure, undefined)
    await page.goto(`${origin}/history`)
    await page.getByText('Obstétrica com gráfico salvo', { exact: true }).waitFor()
    const historyFigure = page.locator('[data-report-figure="fetal-growth-intergrowth"]')
    await historyFigure.waitFor({ state: 'attached' })
    await page.getByText('Página clínica incluída · ver gráficos e riscos', { exact: true }).click()
    assert.match(await historyFigure.getByRole('img').getAttribute('aria-label'), /24\+3 semanas.*870 g.*99,5/)
    assert.equal(await historyFigure.locator('[data-growth-point="historical"]').count(), 1)
    assert.equal(await historyFigure.locator('[data-growth-trajectory]').count(), 1)
    assert.match(await historyFigure.textContent(), /INTERGROWTH-21st 2020.*870 g.*24\+3.*datação por DUM · exame em 21\/06\/2026/s)
    await page.addScriptTag({ content: 'window.print = () => { window.__growthPrintCalls = (window.__growthPrintCalls || 0) + 1 }' })
    const historyPrintButton = page.getByRole('button', { name: 'Imprimir ou salvar gráfico em PDF', exact: true })
    await historyPrintButton.click()
    const printDialog = page.getByRole('dialog', { name: 'Página clínica · A4' })
    await printDialog.waitFor()
    assert.match(await printDialog.textContent(), /24\+3.*DUM · exame em 21\/06\/2026.*230 mm.*210 mm.*50 mm/s)
    assert.match(await printDialog.getByRole('img').getAttribute('aria-label'), /24\+3 semanas.*870 g.*99,5/)
    assert.equal(await printDialog.locator('[data-growth-point="historical"]').count(), 1)
    await printDialog.getByRole('button', { name: 'Imprimir / Salvar PDF', exact: true }).click()
    assert.equal(await page.evaluate(() => (window as any).__growthPrintCalls), 1)
    await page.emulateMedia({ media: 'print' })
    assert.equal(await page.locator('body > #root').evaluate((element) => getComputedStyle(element).display), 'none')
    assert.equal(await page.locator('[data-clinical-print-root]').evaluate((element) => getComputedStyle(element).display), 'block')
    await page.emulateMedia({ media: 'screen' })
    await page.keyboard.press('Escape')
    await printDialog.waitFor({ state: 'detached' })
    assert.equal(await historyPrintButton.evaluate((element) => document.activeElement === element), true)
    assert.equal(await page.locator('body > [inert]').count(), 0)
    assert.equal(await page.locator('[data-clinical-print-root]').count(), 0)
    // A cópia também precisa funcionar com o detalhe recolhido.
    await page.getByText('Página clínica incluída · ver gráficos e riscos', { exact: true }).click()
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
    // Máxima composição: crescimento longitudinal + quatro vasos + dois rastreios.
    await page.goto(`${origin}/history-mixed`)
    await page.getByText('Obstétrica com gráfico salvo', { exact: true }).waitFor()
    await page.addScriptTag({ content: `
      window.ClipboardItem = class { constructor(data) { this.data = data } };
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        write: async items => { window.__mixedHtml = await items[0].data['text/html'].text() },
        writeText: async text => { window.__mixedText = text },
      }});
    ` })
    await page.getByRole('button', { name: 'Copiar', exact: true }).click()
    await page.waitForFunction(() => typeof (window as any).__mixedHtml === 'string')
    const mixedHtml = await page.evaluate(() => (window as any).__mixedHtml as string)
    assert.equal((mixedHtml.match(/<img /g) ?? []).length, 5, 'cópia inclui todos os SVGs clínicos, mesmo recolhidos')
    assert.match(mixedHtml, /Risco basal.*Risco ajustado.*T21.*T18.*T13/s)
    assert.match(mixedHtml, /MoM utilizados/)
    assert.match(mixedHtml, /Validação clínica pendente/)
    await page.getByRole('button', { name: 'Imprimir ou salvar gráfico em PDF', exact: true }).click()
    const mixedDialog = page.getByRole('dialog', { name: 'Página clínica · A4' })
    await mixedDialog.waitFor()
    assert.equal(await mixedDialog.getByRole('img').count(), 5)
    for (const week of [37, 34, 32]) assert.match(await mixedDialog.textContent(), new RegExp(`<${week} semanas`))
    assert.equal(await page.locator('body > #root').getAttribute('inert'), '')
    const uterineChart = mixedDialog.getByRole('img', { name: /^Uterinas · IP médio/ })
    const uterineStatus = mixedDialog.locator('.clinical-chart-card').filter({ has: page.getByRole('img', { name: /^Uterinas · IP médio/ }) }).locator('[role="status"]')
    await uterineChart.focus()
    await uterineChart.press('Home')
    assert.match(await uterineStatus.textContent(), /IG 11s0d: p5 \d+,\d{2}, p50 \d+,\d{2}, p95 \d+,\d{2}/)
    await uterineChart.press('ArrowRight')
    assert.match(await uterineStatus.textContent(), /IG 11s1d/)
    await uterineChart.press('End')
    assert.match(await uterineStatus.textContent(), /IG 44s6d/)
    const chartBox = await uterineChart.boundingBox()
    await page.mouse.move(chartBox!.x + chartBox!.width / 2, chartBox!.y + chartBox!.height / 2)
    assert.doesNotMatch(await uterineStatus.textContent(), /IG 44s6d/)
    assert.equal(await uterineChart.locator('.clinical-doppler-explore').count(), 1)
    await page.emulateMedia({ media: 'print' })
    assert.equal(await uterineChart.locator('.clinical-doppler-explore').evaluate(el => getComputedStyle(el).display), 'none')
    assert.equal(await uterineStatus.evaluate(el => getComputedStyle(el).display), 'none')
    assert.equal(await mixedDialog.locator('.clinical-chart-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2)
    assert.notEqual(await mixedDialog.locator('.clinical-page').evaluate(el => getComputedStyle(el).breakInside), 'avoid')
    const qa = process.env.CLINICAL_CHART_QA_DIR
    const pdf = await page.pdf({ ...(qa ? { path: join(qa, 'clinical-charts-a4.pdf') } : {}), preferCSSPageSize: true, printBackground: true })
    if (qa) await page.screenshot({ path: join(qa, 'clinical-charts-print.png'), fullPage: true })
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length
    assert.equal(pages, 2, 'somente a composição sintética entre trimestres pode ocupar duas A4; fluxos reais abaixo exigem uma')
    await page.emulateMedia({ media: 'screen' })
    await page.setViewportSize({ width: 320, height: 780 })
    const touchBox = await uterineChart.boundingBox()
    await page.touchscreen.tap(touchBox!.x + touchBox!.width * 0.7, touchBox!.y + 30)
    assert.match(await uterineStatus.textContent(), /IG \d+s\dd: p5/)
    assert.ok(await mixedDialog.evaluate(el => el.scrollWidth <= window.innerWidth), 'modal legível sem rolagem horizontal em 320px')
    if (qa) await page.screenshot({ path: join(qa, 'clinical-charts-mobile.png'), fullPage: true })
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('[data-clinical-print-root]').count(), 0)
    await page.setViewportSize({ width: 1440, height: 1000 })
    // As combinações usuais de um único trimestre cabem em uma A4.
    for (const route of ['/history-doppler', '/history-firsttrim']) {
      await page.goto(`${origin}${route}`)
      await page.getByRole('button', { name: 'Imprimir ou salvar gráfico em PDF', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Página clínica · A4' })
      await dialog.waitFor()
      await page.emulateMedia({ media: 'print' })
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, ...(qa ? { path: join(qa, `${route.slice(1)}.pdf`) } : {}) })
      assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 1, route)
      await page.emulateMedia({ media: 'screen' })
      if (route === '/history-firsttrim') assert.equal(await dialog.getByRole('img').count(), 1, '1º trimestre oculta umbilical/ACM/RCP fora da faixa Barcelona')
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('body > [inert]').count(), 0)
    }
    await page.goto(`${origin}/history-invalid`)
    await page.getByText('Obstétrica com gráfico salvo', { exact: true }).waitFor()
    assert.equal(await page.locator('[data-report-figure="fetal-growth-intergrowth"]').count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Imprimir ou salvar gráfico em PDF', exact: true }).count(), 0)
    assert.deepEqual(errors, [])
    console.log('Growth chart browser: datação, inclusão, persistência, impressão e histórico aprovados')
  } finally {
    await browser.close()
    await new Promise<void>(resolveClose => server.close(() => resolveClose()))
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
