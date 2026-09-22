import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'

async function main() {
  const web = resolve('apps/web')
  const output = resolve('tmp-review/web-workspace-tabs')
  mkdirSync(output, { recursive: true })
  const bundle = await build({
    entryPoints: [join(web, 'tests/workspaceTabs.browser.tsx')],
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    tsconfig: join(web, 'tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION': '"false"' },
    plugins: [{ name: 'workspace-tabs-mocks', setup(buildApi) {
      buildApi.onResolve({ filter: /^(next\/link|next\/navigation|@\/lib\/supabase\/client)$/ }, args => ({ path: args.path, namespace: 'test' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'jsx', resolveDir: web, contents:
        args.path === 'next/link'
          ? 'export default function Link({children, ...props}) { return <a {...props}>{children}</a> }'
          : args.path === 'next/navigation'
            ? 'export const usePathname = () => "/app/gerar"'
            : `export function createClient() {
                return { auth: { getUser: async () => ({ data: { user: { id: 'synthetic' } } }) }, from() {
                  const query = new Proxy({}, { get() { return () => query } });
                  return query;
                } };
              }`,
      }))
    }}],
  })
  const webRequire = createRequire(join(web, 'package.json'))
  const importedConfig = webRequire('./tailwind.config.ts')
  const config = importedConfig.default ?? importedConfig
  const css = (await webRequire('postcss')([webRequire('tailwindcss')({
    ...config,
    content: [join(web, 'src/**/*.{ts,tsx}'), join(web, 'tests/workspaceTabs.browser.tsx')],
  })]).process(readFileSync(join(web, 'src/app/globals.css'), 'utf8'), { from: join(web, 'src/app/globals.css') })).css

  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles![0].text); return }
      if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); return }
      if (req.url === '/fonts/BarlowCondensed-Light.ttf') { res.setHeader('Content-Type', 'font/ttf'); res.end(readFileSync(join(web, 'public/fonts/BarlowCondensed-Light.ttf'))); return }
      if (/^\/categories\/[a-z0-9-]+\.webp$/.test(req.url ?? '')) {
        res.setHeader('Content-Type', 'image/webp'); res.end(readFileSync(join(web, 'public', req.url!.slice(1)))); return
      }
      if (req.method === 'POST') {
        for await (const chunk of req) void chunk
        const category = req.url?.match(/^\/api\/catalog\/([^/]+)\/render$/)?.[1]
        if (category) {
          const decodedCategory = decodeURIComponent(category)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            laudo: [
              `ULTRASSONOGRAFIA ${decodedCategory}`,
              `Conteudo renderizado deterministico: ${decodedCategory}.`,
              'CONCLUSAO:',
              'Exame de teste para Workspace Tabs.',
            ].join('\n\n'),
          }))
          return
        }
      }
      res.setHeader('Content-Type', 'text/html')
      res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) {
      res.statusCode = 500
      res.end(String(error))
    }
  })
  await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', done) })
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  if (process.env.WORKSPACE_TABS_PREVIEW === '1') { console.log(`Workspace tabs preview: ${origin}`); return }
  let browser: any
  try {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    await page.goto(origin)
    await page.getByRole('heading', { name: 'Qual exame você deseja realizar?' }).waitFor()
    await page.getByLabel('Buscar categoria').fill('mamas')
    await page.locator('.exam-category-item', { hasText: /Mamas e axilas/i }).click()

    const tablist = page.getByRole('tablist', { name: 'Alternar área de trabalho' })
    const achadosTab = page.getByRole('tab', { name: 'Achados' })
    const laudoTab = page.getByRole('tab', { name: /Laudo/ })
    const achadosPanel = page.locator('#workspace-panel-achados')
    const laudoPanel = page.locator('#workspace-panel-laudo')
    await tablist.waitFor()
    assert.equal(await achadosTab.getAttribute('aria-selected'), 'true')
    assert.equal(await laudoTab.getAttribute('aria-selected'), 'false')
    assert.equal(await achadosPanel.isVisible(), true)
    assert.equal(await laudoPanel.isVisible(), false)
    assert.equal(await page.getByRole('textbox', { name: 'Editar texto do laudo' }).count(), 0)

    await achadosTab.focus()
    await page.keyboard.press('ArrowRight')
    assert.equal(await laudoTab.getAttribute('aria-selected'), 'true')
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes('Laudo')), true)
    await page.waitForFunction(() => document.querySelector('#workspace-panel-achados')?.hasAttribute('hidden'))
    assert.equal(await achadosPanel.isVisible(), false)
    assert.equal(await laudoPanel.isVisible(), true)
    const editor = page.getByRole('textbox', { name: 'Editar texto do laudo' })
    await editor.waitFor()
    await page.waitForFunction(() => document.querySelector('[aria-label="Editar texto do laudo"]')?.textContent?.includes('Conteudo renderizado deterministico: MAMARIA'))
    assert.match(await editor.innerText(), /Conteudo renderizado deterministico: MAMARIA/)
    await page.keyboard.press('Home')
    assert.equal(await achadosTab.getAttribute('aria-selected'), 'true')
    await page.keyboard.press('End')
    assert.equal(await laudoTab.getAttribute('aria-selected'), 'true')
    await page.keyboard.press('ArrowLeft')
    assert.equal(await achadosTab.getAttribute('aria-selected'), 'true')

      const sectionButtons = page.locator('#workspace-panel-achados aside nav button')
      await sectionButtons.nth(1).click()
      const selectedSectionBefore = await page.locator('#workspace-panel-achados aside nav button').nth(1).getAttribute('class')
      await laudoTab.click()
      await achadosTab.click()
      assert.match(selectedSectionBefore ?? '', /emerald/)
      assert.match(await sectionButtons.nth(1).getAttribute('class') ?? '', /emerald/)
      await laudoTab.click()
      assert.equal(await editor.count(), 1)
      await editor.evaluate((node: HTMLElement) => {
        node.innerHTML = '<p>LAUDO EDITADO WORKSPACE</p>'
        node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }))
      })
      await page.waitForSelector('[data-laudo-tab-indicator="dirty"]')
      await achadosTab.click()
      assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1)
      await laudoTab.click()
      assert.match(await editor.innerText(), /LAUDO EDITADO WORKSPACE/)
      await editor.focus()
      await page.keyboard.press('Tab')
      assert.equal(await laudoTab.getAttribute('aria-selected'), 'true', 'Tab inside Laudo must not switch hidden section')
      assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1)
      await page.getByRole('button', { name: /Esquema visual/ }).click()
      await page.getByRole('button', { name: 'Voltar ao laudo' }).waitFor()
      assert.equal(await editor.count(), 1, 'Visual schema must keep LaudoPreview mounted')
      await page.getByRole('button', { name: 'Voltar ao laudo' }).click()
      assert.equal(await laudoTab.getAttribute('aria-selected'), 'true', 'Closing visual schema keeps Laudo tab active')
      assert.match(await editor.innerText(), /LAUDO EDITADO WORKSPACE/)
      await page.locator('[data-category-selector] select').selectOption('TIREOIDE')
      assert.equal(await achadosTab.getAttribute('aria-selected'), 'true', 'Category change returns to Achados')

      for (const width of [1440, 1024, 768, 375]) {
        await page.setViewportSize({ width, height: width === 375 ? 700 : 900 })
        await achadosTab.click()
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
        assert.equal(await page.getByRole('textbox', { name: 'Editar texto do laudo' }).count(), 0, `Achados hides editor at ${width}`)
        assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1, `Only one tabpanel is visible at ${width}`)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Achados no overflow at ${width}`)
        const formBox = await page.locator('#workspace-panel-achados > section').boundingBox()
        assert.ok(formBox && formBox.x >= 0 && formBox.x + formBox.width <= width, `Achados form fits at ${width}`)
        const formBodyBox = await page.locator('.achados-form-body').boundingBox()
        assert.ok(formBodyBox && formBodyBox.width <= 970, `Achados form keeps readable width at ${width}`)
        const navBox = await page.locator('#workspace-panel-achados > aside').boundingBox()
        if (width >= 768) {
          assert.ok(navBox && formBox && navBox.x < formBox.x, `Section nav stays lateral at ${width}`)
        } else {
          assert.ok(navBox && formBox && navBox.y < formBox.y, `Section nav becomes top chips at ${width}`)
          const tabBox = await laudoTab.boundingBox()
          assert.ok(tabBox && tabBox.height >= 44, 'Mobile tab target is at least 44px tall')
        }
        await page.evaluate(() => window.scrollTo(0, Math.min(240, document.documentElement.scrollHeight - window.innerHeight)))
        await page.waitForTimeout(50)
        const stickyBox = await tablist.boundingBox()
        const tabsShellBox = await page.locator('.workspace-tabs-shell').boundingBox()
        const viewportHeight = page.viewportSize()?.height ?? 900
        assert.ok(stickyBox && stickyBox.y >= 0 && stickyBox.y + stickyBox.height <= viewportHeight, `Tablist remains sticky and visible at ${width}`)
        if (width === 375) {
          assert.ok(tabsShellBox && tabsShellBox.y <= 1, 'Only the tabs bar sticks to the top at 375px')
          assert.ok(tabsShellBox && tabsShellBox.height <= viewportHeight * 0.25, 'Fixed top region stays below 25% of viewport at 375px')
          const mobileNav = page.getByRole('navigation', { name: 'Navegação principal' })
          await mobileNav.waitFor()
          for (const label of ['Laudar', 'Histórico', 'Analytics', 'Biblioteca', 'Preferências']) {
            assert.equal(await mobileNav.getByRole('link', { name: label }).count(), 1, `Mobile nav exposes ${label}`)
          }
          await mobileNav.getByText('Mais').click()
          assert.equal(await mobileNav.getByRole('button', { name: /Tema claro|Tema escuro/ }).count(), 1, 'Mobile nav exposes theme toggle')
          assert.equal(await mobileNav.getByRole('button', { name: 'Sair' }).count(), 1, 'Mobile nav exposes sign out')
        }
        await page.screenshot({ path: join(output, `achados-${width}.png`), fullPage: true, animations: 'disabled' })
        await laudoTab.click()
        assert.equal(await achadosPanel.isVisible(), false, `Laudo hides achados at ${width}`)
        assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1, `Only Laudo tabpanel is visible at ${width}`)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Laudo no overflow at ${width}`)
        const editorBox = await editor.boundingBox()
        assert.ok(editorBox && editorBox.x >= 0 && editorBox.x + editorBox.width <= width, `Laudo editor fits at ${width}`)
        await page.screenshot({ path: join(output, `laudo-${width}.png`), fullPage: true, animations: 'disabled' })
      }
      await page.setViewportSize({ width: 375, height: 520 })
      await achadosTab.click()
      await page.waitForTimeout(120)
      const achadosScroll = await page.evaluate(() => {
        window.scrollTo(0, Math.min(160, document.documentElement.scrollHeight - window.innerHeight))
        return window.scrollY
      })
      await laudoTab.click()
      await page.evaluate(() => window.scrollTo(0, 0))
      await achadosTab.click()
      await page.waitForTimeout(120)
      const restoredAchadosScroll = await page.evaluate(() => window.scrollY)
      assert.ok(Math.abs(restoredAchadosScroll - achadosScroll) <= 4, `Achados scrollY restored: expected ${achadosScroll}, got ${restoredAchadosScroll}`)
      assert.deepEqual(errors, [])
      console.log(`PASS workspace tabs: deterministic render, keyboard/state/schema/sticky/scroll, no simultaneous panes, 1440/1024/768/375. Screenshots: ${output}`)
  } finally {
    await browser?.close()
    await new Promise<void>(done => server.close(() => done()))
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
