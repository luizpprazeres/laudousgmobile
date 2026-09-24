import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { alteracoesDe } from '../../api/src/server/renderer/catalog/alteracoes/index'

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 900 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
] as const

const CATEGORY_IDS = [
  'ABDOMEN_TOTAL',
  'ABDOMEN_SUPERIOR',
  'PROSTATA_SUPRAPUBICA',
  'VIAS_URINARIAS',
  'MAMARIA',
  'PELVE_FEMININA',
  'CERVICAL',
  'CERVICOMETRIA',
  'PARTES_MOLES',
  'MUSCULOESQUELETICO',
  'OBSTETRICA',
  'MORFOLOGICO',
  'DOPPLER_OBSTETRICO',
  'DOPPLER_CAROTIDAS',
  'TIREOIDE',
] as const

async function nextFrame(page: any) {
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
}

async function selectCategory(page: any, categoryId: string) {
  await page.locator('[data-category-selector] select').selectOption(categoryId)
  await page.waitForFunction((id: string) => {
    const selector = document.querySelector<HTMLSelectElement>('[data-category-selector] select')
    return selector?.value === id && document.querySelectorAll('[data-organ-card]').length > 0
  }, categoryId)
  await nextFrame(page)
}

async function assertCardContract(page: any, categoryId: string, requiredSectionIds: string[]) {
  await selectCategory(page, categoryId)
  const cards = page.locator('#workspace-panel-achados [data-organ-card]')
  const count = await cards.count()
  assert.ok(count > 0, `${categoryId} exposes at least one card`)
  assert.ok(count >= requiredSectionIds.length, `${categoryId} exposes its organ cards simultaneously`)
  assert.equal(await page.locator('#workspace-panel-achados > aside').count(), 0, `${categoryId} has no organ sidebar`)

  const contract = await cards.evaluateAll((nodes: HTMLElement[]) => nodes.map((node) => {
    const headingId = node.getAttribute('aria-labelledby') ?? ''
    const heading = headingId ? document.getElementById(headingId) : null
    return {
      organCard: node.dataset.organCard ?? '',
      sectionId: node.dataset.sectionId ?? '',
      group: node.dataset.sectionGroup ?? '',
      size: node.dataset.cardSize ?? '',
      kind: node.dataset.cardKind ?? '',
      isSection: node.tagName === 'SECTION',
      heading: heading?.tagName === 'H3' ? heading.textContent?.trim() ?? '' : '',
    }
  }))
  const sectionIds = contract.map((card: { sectionId: string }) => card.sectionId)
  assert.equal(sectionIds.every(Boolean), true, `${categoryId} cards expose data-section-id`)
  assert.equal(new Set(sectionIds).size, sectionIds.length, `${categoryId} card ids are unique`)
  assert.equal(contract.every((card: { organCard: string; sectionId: string }) => card.organCard === card.sectionId), true, `${categoryId} data-organ-card matches data-section-id`)
  assert.equal(contract.every((card: { group: string }) => ['cabecalho', 'orgaos', 'conclusao', 'calculos'].includes(card.group)), true, `${categoryId} cards expose a valid section group`)
  assert.equal(contract.every((card: { size: string }) => ['regular', 'wide', 'full'].includes(card.size)), true, `${categoryId} cards expose a valid size`)
  assert.equal(contract.every((card: { kind: string }) => ['organ', 'panel'].includes(card.kind)), true, `${categoryId} cards expose a valid kind`)
  assert.equal(contract.every((card: { isSection: boolean; heading: string }) => card.isSection && Boolean(card.heading)), true, `${categoryId} cards are named regions backed by h3 headings`)
  for (const sectionId of requiredSectionIds) {
    assert.ok(sectionIds.includes(sectionId), `${categoryId} keeps ${sectionId} in the DOM`)
    assert.equal(
      await page.locator(`[data-organ-card][data-section-id="${sectionId}"]`).isVisible(),
      true,
      `${categoryId}/${sectionId} is visible without section navigation`,
    )
  }
  assert.equal(await cards.evaluateAll((nodes: HTMLElement[]) => nodes.every((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
  })), true, `${categoryId} keeps every card visible`)
}

async function assertCardsDoNotOverlap(page: any, label: string) {
  const overlaps = await page.locator('#workspace-panel-achados [data-organ-card]').evaluateAll((nodes: HTMLElement[]) => {
    const rects = nodes.map((node) => ({ id: node.dataset.sectionId ?? 'unknown', rect: node.getBoundingClientRect() }))
    const collisions: string[] = []
    for (let left = 0; left < rects.length; left += 1) {
      for (let right = left + 1; right < rects.length; right += 1) {
        const a = rects[left]!
        const b = rects[right]!
        const width = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left)
        const height = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top)
        if (width > 1 && height > 1) collisions.push(`${a.id}/${b.id}`)
      }
    }
    return collisions
  })
  assert.deepEqual(overlaps, [], `${label} cards do not overlap`)
}

async function assertCardControlsClickable(page: any, label: string) {
  const cards = page.locator('#workspace-panel-achados [data-organ-card]')
  let checked = 0
  for (let index = 0; index < await cards.count(); index += 1) {
    const controls = cards.nth(index).locator('button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])')
    for (let controlIndex = 0; controlIndex < await controls.count(); controlIndex += 1) {
      const control = controls.nth(controlIndex)
      if (!await control.isVisible()) continue
      await control.scrollIntoViewIfNeeded()
      await control.click({ trial: true })
      const ownsCenter = await control.evaluate((element: HTMLElement) => {
        const rect = element.getBoundingClientRect()
        const x = Math.max(0, Math.min(window.innerWidth - 1, rect.left + rect.width / 2))
        const y = Math.max(0, Math.min(window.innerHeight - 1, rect.top + rect.height / 2))
        const hit = document.elementFromPoint(x, y)
        return rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight
          && (hit === element || Boolean(hit && element.contains(hit)))
      })
      assert.ok(ownsCenter, `${label} card control owns its viewport hit target`)
      checked += 1
      break
    }
  }
  assert.ok(checked >= 2, `${label} checks controls from at least two cards`)
}

async function assertMobileNavClearance(page: any, width: number, height: number) {
  const mobileNav = page.getByRole('navigation', { name: 'Navegação principal' })
  await mobileNav.waitFor()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await nextFrame(page)

  const result = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('.laudar-mobile-navigation')
    if (!nav) throw new Error('Mobile navigation not found')
    const navBox = nav.getBoundingClientRect()
    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      '#workspace-panel-achados [data-organ-card] button:not([disabled]), #workspace-panel-achados [data-organ-card] input:not([type="hidden"]):not([disabled]), #workspace-panel-achados [data-organ-card] select:not([disabled]), #workspace-panel-achados [data-organ-card] textarea:not([disabled])',
    )).filter((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.bottom > 0 && rect.top < window.innerHeight
    })
    const obscured = controls.filter((element) => element.getBoundingClientRect().bottom > navBox.top)
      .map((element) => element.textContent?.trim() || element.getAttribute('aria-label') || element.tagName)
    const clickable = controls.filter((element) => {
      const rect = element.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return rect.top >= 0 && rect.bottom <= navBox.top && (hit === element || Boolean(hit && element.contains(hit)))
    })
    return {
      obscured,
      clickable: clickable.length,
      navTargets: Array.from(nav.querySelectorAll<HTMLElement>(':scope > a, :scope > details > summary'))
        .map((element) => element.getBoundingClientRect().height),
    }
  })

  assert.deepEqual(result.obscured, [], `Bottom nav does not cover card controls at ${width}x${height}`)
  assert.ok(result.clickable > 0, `A card control remains clickable above bottom nav at ${width}x${height}`)
  assert.ok(result.navTargets.every((targetHeight: number) => targetHeight >= 44), `Mobile nav targets are at least 44px at ${width}x${height}`)
}

async function setTheme(page: any, theme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: theme })
  await page.evaluate((nextTheme: string) => {
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    document.documentElement.style.colorScheme = nextTheme
  }, theme)
  await nextFrame(page)
}

async function main() {
  const realRender = process.env.WORKSPACE_REAL_RENDER === '1'
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
        let raw = ''
        for await (const chunk of req) raw += chunk
        const category = req.url?.match(/^\/api\/catalog\/([^/]+)\/render$/)?.[1]
        if (category) {
          const decodedCategory = decodeURIComponent(category)
          res.setHeader('Content-Type', 'application/json')
          if (realRender) {
            const body = JSON.parse(raw)
            const catalog = alteracoesDe(decodedCategory)
            const selected = (body.alteracoes ?? []).map((id: string) => catalog.find(item => item.id === id))
            if (selected.some((item: unknown) => !item)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Alteração desconhecida nesta categoria.' }))
              return
            }
            // A prévia não consulta o banco. Abdome usa o renderer Objetivo,
            // que dispensa a máscara clássica armazenada no banco.
            const result = renderizarSelecao(decodedCategory, decodedCategory === 'ABDOMEN_TOTAL' ? 'OBJETIVO' : 'CLASSICO_COMPLETO', selected, body.dados)
            res.statusCode = result.ok ? 200 : 409
            res.end(JSON.stringify(result.ok ? { laudo: result.texto } : {
              error: 'Não foi possível renderizar esta seleção na prévia local.',
              ...('conflitos' in result ? { conflitos: result.conflitos } : {}),
            }))
            return
          }
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
      res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>LaudoUSG — Prévia local, sem salvamento</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
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
    const page = await browser.newPage({ viewport: VIEWPORTS[0] })
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    await page.goto(origin)
    if (realRender) {
      await page.getByRole('button', { name: 'Abdome Total', exact: true }).click()
      await page.locator('[data-section-id="figado"]').getByRole('button', { name: 'Esteatose leve', exact: true }).click()
      await page.getByRole('tab', { name: /Laudo/ }).click()
      const report = page.getByRole('textbox', { name: 'Editar texto do laudo' })
      await page.waitForFunction(() => document.querySelector('[aria-label="Editar texto do laudo"]')?.textContent?.includes('Esteatose hepática, grau leve'))
      assert.doesNotMatch(await report.innerText(), /Conteudo renderizado deterministico|Exame de teste/)
      await selectCategory(page, 'VIAS_URINARIAS')
      const bladder = page.locator('[data-section-id="bexiga"]')
      await bladder.getByRole('combobox', { name: 'Parede', exact: true }).selectOption('trabeculada')
      await page.getByRole('tab', { name: /Laudo/ }).click()
      await page.waitForFunction(() => document.querySelector('[aria-label="Editar texto do laudo"]')?.textContent?.includes('Trabeculação da parede vesical'))
      assert.doesNotMatch(await report.innerText(), /Bexiga ecograficamente normal/)
      assert.deepEqual(errors, [])
      console.log('PASS real local preview: UI → adapter → canonical renderer for abdomen and urinary findings; no database or persistence.')
      return
    }
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

    await laudoTab.click()
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
    assert.equal(await laudoTab.getAttribute('aria-selected'), 'true', 'Tab inside Laudo must not switch panels')
    assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1)
    await page.getByRole('button', { name: /Esquema visual/ }).click()
    await page.locator('[data-visual-schema-inline]').waitFor()
    assert.equal(await achadosTab.getAttribute('aria-selected'), 'true', 'Schema belongs to findings grid')
    assert.equal(await page.locator('[data-section-id="visual-schema"] [data-visual-schema-inline]').count(), 1)
    assert.equal(await page.locator('[aria-label="Editar texto do laudo"]').count(), 1, 'Visual schema keeps LaudoPreview mounted')
    await page.getByRole('button', { name: 'Ocultar esquema' }).click()
    assert.equal(await achadosTab.getAttribute('aria-selected'), 'true', 'Closing schema keeps findings active')
    await laudoTab.click()
    assert.match(await editor.innerText(), /LAUDO EDITADO WORKSPACE/)
    await page.locator('[data-category-selector] select').selectOption('TIREOIDE')
    assert.equal(await achadosTab.getAttribute('aria-selected'), 'true', 'Category change returns to Achados')

    const categoryOptions = await page.locator('[data-category-selector] select option').evaluateAll((options: HTMLOptionElement[]) => options.map((option) => option.value))
    assert.deepEqual(categoryOptions, [...CATEGORY_IDS], 'All category choices remain available')

    const requiredCards: Partial<Record<(typeof CATEGORY_IDS)[number], string[]>> = {
      ABDOMEN_TOTAL: ['figado', 'vesicula'],
      OBSTETRICA: ['ig', 'biometria_crescimento'],
      TIREOIDE: ['lobo_direito', 'lobo_esquerdo'],
      MAMARIA: ['mamas', 'axilas'],
      DOPPLER_CAROTIDAS: ['direita', 'esquerda', 'conclusao'],
      PELVE_FEMININA: ['utero', 'endometrio'],
    }
    for (const categoryId of CATEGORY_IDS) {
      await assertCardContract(page, categoryId, requiredCards[categoryId] ?? [])
    }

    await selectCategory(page, 'MAMARIA')
    const breastScope = page.locator('[data-exam-options]').getByRole('group', { name: 'O que será avaliado?', exact: true })
    await breastScope.getByRole('button', { name: 'Somente axilas', exact: true }).click()
    assert.equal(await page.locator('[data-section-id="calc:bi-rads"]').count(), 0, 'Axilla-only scope has no breast BI-RADS suggestions')
    assert.equal(await page.locator('[data-section-id="visual-schema"]').count(), 0, 'Axilla-only scope does not show the breast schema')
    await breastScope.getByRole('button', { name: 'Mamas e axilas', exact: true }).click()
    assert.equal(await page.locator('[data-section-id="calc:bi-rads"]').count(), 1, 'Breast calculator returns with breast scope')

    await selectCategory(page, 'MUSCULOESQUELETICO')
    const mskSide = page.locator('[data-exam-options]').getByRole('group', { name: 'Lado', exact: true })
    const rightTendon = page.locator('[data-section-id="ombro__d__supraespinhal"]')
    await rightTendon.getByRole('combobox').selectOption('tendinopatia')
    await mskSide.getByRole('button', { name: 'Ambos', exact: true }).click()
    const leftTendon = page.locator('[data-section-id="ombro__e__supraespinhal"]')
    assert.equal(await rightTendon.getByRole('combobox').inputValue(), 'tendinopatia', 'Adding opposite side preserves the original finding')
    assert.equal(await leftTendon.getByRole('combobox').inputValue(), 'normal', 'Opposite side has independent state')
    await leftTendon.getByRole('combobox').selectOption('rotura_parcial')
    await rightTendon.getByRole('button', { name: /^Reset / }).click()
    assert.equal(await rightTendon.getByRole('combobox').inputValue(), 'normal', 'Right reset clears right tendon')
    assert.equal(await leftTendon.getByRole('combobox').inputValue(), 'rotura_parcial', 'Right reset preserves left tendon')
    await mskSide.getByRole('button', { name: 'Direito', exact: true }).click()
    assert.equal(await leftTendon.count(), 0, 'Unselected side is hidden')
    await mskSide.getByRole('button', { name: 'Ambos', exact: true }).click()
    assert.equal(await leftTendon.getByRole('combobox').inputValue(), 'rotura_parcial', 'Returning to both restores the left finding')

    await selectCategory(page, 'PELVE_FEMININA')
    const viaGroup = page.locator('[data-exam-options]').getByRole('group', { name: 'Via do exame' })
    await viaGroup.waitFor()
    const transvaginal = viaGroup.getByRole('button', { name: 'Transvaginal', exact: true })
    await transvaginal.waitFor()
    await transvaginal.click()
    assert.equal(await transvaginal.getAttribute('aria-pressed'), 'true', 'Pelvic route category control remains functional')

    await page.setViewportSize({ width: 390, height: 844 })
    await selectCategory(page, 'ABDOMEN_TOTAL')
    const categoryScrollBefore = await page.evaluate(() => {
      window.scrollTo(0, 600)
      return window.scrollY
    })
    assert.ok(categoryScrollBefore >= 500, `Abdomen reaches the regression scroll position, got ${categoryScrollBefore}`)
    await selectCategory(page, 'OBSTETRICA')
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'Changing category resets the pane scroll to the top')

    await selectCategory(page, 'ABDOMEN_TOTAL')
    const liverCard = page.locator('[data-organ-card][data-section-id="figado"]')
    const gallbladderCard = page.locator('[data-organ-card][data-section-id="vesicula"]')
    const mildSteatosis = liverCard.getByRole('button', { name: 'Esteatose leve', exact: true })
    const contractedGallbladder = gallbladderCard.getByRole('combobox', { name: 'Aspecto da vesícula' })
    await mildSteatosis.click()
    await contractedGallbladder.selectOption('contraida')
    assert.equal(await mildSteatosis.getAttribute('aria-pressed'), 'true', 'Liver handler selects mild steatosis')
    assert.equal(await contractedGallbladder.inputValue(), 'contraida', 'Gallbladder handler selects contracted state')

    await laudoTab.click()
    await achadosTab.click()
    assert.equal(await mildSteatosis.getAttribute('aria-pressed'), 'true', 'Liver finding persists across workspace tabs')
    assert.equal(await contractedGallbladder.inputValue(), 'contraida', 'Gallbladder finding persists across workspace tabs')

    await liverCard.getByRole('button', { name: 'Reset Fígado', exact: true }).click()
    assert.equal(await mildSteatosis.getAttribute('aria-pressed'), 'false', 'Liver reset clears only the liver finding')
    assert.equal(await liverCard.getByRole('button', { name: 'Homogênea', exact: true }).getAttribute('aria-pressed'), 'true', 'Liver reset restores its default state')
    assert.equal(await contractedGallbladder.inputValue(), 'contraida', 'Liver reset preserves the gallbladder finding')

    const recommendations = page.locator('[data-section-id="recommendations"]')
    await recommendations.getByRole('textbox', { name: 'Orientação do médico' }).fill('Comparar com o exame anterior disponível.')
    await laudoTab.click()
    assert.doesNotMatch(await editor.innerText(), /Comparar com o exame anterior disponível/i)
    await achadosTab.click()
    await recommendations.getByRole('button', { name: 'Incluir no laudo', exact: true }).click()
    await laudoTab.click()
    await page.waitForFunction(() => document.querySelector('[aria-label="Editar texto do laudo"]')?.textContent?.includes('Conteudo renderizado deterministico: ABDOMEN_TOTAL'))
    assert.match(await editor.innerText(), /RECOMENDAÇÕES:[\s\S]*Comparar com o exame anterior disponível/i)
    await achadosTab.click()
    await recommendations.getByRole('button', { name: 'Remover do laudo', exact: true }).click()
    await laudoTab.click()
    assert.doesNotMatch(await editor.innerText(), /Comparar com o exame anterior disponível/i)
    await achadosTab.click()
    assert.equal(await page.locator('[data-bilateral-group="rins"] [data-organ-card]').count(), 2, 'Kidneys share one group with independent cards')

    const bladderCard = page.locator('[data-section-id="bexiga"]')
    const volumeDimensions = ['L', 'AP', 'T'].map(axis => bladderCard.getByLabel(`Volume pré-miccional — ${axis} (cm)`, { exact: true }))
    await volumeDimensions[0].fill('5abc')
    await volumeDimensions[1].fill('4')
    await volumeDimensions[2].fill('3')
    assert.equal(await bladderCard.getByRole('button', { name: '= calcular', exact: true }).isEnabled(), false, 'Volume does not accept a numeric prefix followed by text')
    await volumeDimensions[0].fill('5,5')
    await bladderCard.getByRole('button', { name: '= calcular', exact: true }).click()
    assert.equal(await bladderCard.getByLabel('Volume pré-miccional (mL)', { exact: true }).inputValue(), '35', 'Valid decimal dimensions calculate the volume')
    await bladderCard.getByRole('button', { name: 'Reset Bexiga', exact: true }).click()

    const hepatic = page.locator('[data-section-id="liver-quantification"]')
    await hepatic.getByRole('switch', { name: /^Elastografia:/ }).click()
    await hepatic.getByLabel('Modalidade', { exact: true }).selectOption('2d-swe')
    await hepatic.getByLabel('Unidade da rigidez', { exact: true }).selectOption('kPa')
    await hepatic.getByLabel('Mediana da rigidez', { exact: true }).fill('7,2')
    await hepatic.getByLabel('IQR', { exact: true }).fill('0')
    await hepatic.getByRole('button', { name: 'Incluir medidas no laudo', exact: true }).click()
    await laudoTab.click()
    assert.match(await editor.innerText(), /Mediana da rigidez: 7[.,]2 kPa/)
    await achadosTab.click()
    await hepatic.getByLabel('Mediana da rigidez', { exact: true }).fill('8,1')
    await laudoTab.click()
    assert.doesNotMatch(await editor.innerText(), /Mediana da rigidez:/, 'Editing a measurement invalidates its included snapshot')
    await achadosTab.click()
    await hepatic.getByRole('switch', { name: /^Elastografia:/ }).click()

    for (const { width, height } of VIEWPORTS) {
      await page.setViewportSize({ width, height })
      await achadosTab.click()
      await nextFrame(page)
      assert.equal(await page.getByRole('textbox', { name: 'Editar texto do laudo' }).count(), 0, `Achados hides editor at ${width}`)
      assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1, `Only one tabpanel is visible at ${width}`)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Achados has no horizontal overflow at ${width}`)

      const headerStyle = await page.locator('.laudar-web-responsive > header').evaluate((header: HTMLElement) => {
        const style = getComputedStyle(header)
        const rgba = style.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? []
        const alpha = rgba.length >= 4 ? rgba[3]! : style.backgroundColor === 'transparent' ? 0 : 1
        return { alpha, backdrop: style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter') }
      })
      assert.ok(headerStyle.alpha < 1, `Header is translucent at ${width}`)
      assert.notEqual(headerStyle.backdrop, 'none', `Header uses backdrop blur at ${width}`)

      if (width >= 768) {
        const tabBox = await tablist.boundingBox()
        assert.ok(tabBox && Math.abs(tabBox.x + tabBox.width / 2 - width / 2) <= 4, `Tabs are centered at ${width}`)
        const statusBox = await page.getByRole('button', { name: /Celular (conectado|desconectado)/ }).boundingBox()
        assert.ok(statusBox && statusBox.x + statusBox.width <= width && statusBox.x >= width / 2, `Cell status stays on the right at ${width}`)
      } else {
        const tabBox = await laudoTab.boundingBox()
        assert.ok(tabBox && tabBox.height >= 44, `Mobile tab target is at least 44px at ${width}`)
      }
      if (width === 320) {
        const brand = page.locator('.laudar-header-start .laudar-brand')
        assert.equal(await brand.isVisible(), true, 'LaudoUSG Web brand remains visible at 320px')
        assert.match((await brand.innerText()).replace(/\s+/g, ' '), /Laudo\s*USG\s*Web/i)
      }

      await assertCardsDoNotOverlap(page, `${width}x${height}`)
      await assertCardControlsClickable(page, `${width}x${height}`)
      const stickyBox = await tablist.boundingBox()
      assert.ok(stickyBox && stickyBox.y >= 0 && stickyBox.y + stickyBox.height <= height, `Tablist remains visible at ${width}`)

      if (width < 768) {
        const mobileNav = page.getByRole('navigation', { name: 'Navegação principal' })
        await mobileNav.waitFor()
        for (const label of ['Laudar', 'Histórico', 'Analytics', 'Biblioteca', 'Preferências']) {
          assert.equal(await mobileNav.getByRole('link', { name: label }).count(), 1, `Mobile nav exposes ${label}`)
        }
        await mobileNav.getByText('Mais').click()
        assert.equal(await mobileNav.getByRole('button', { name: /Tema claro|Tema escuro/ }).count(), 1, 'Mobile nav exposes theme toggle')
        assert.equal(await mobileNav.getByRole('button', { name: 'Sair' }).count(), 1, 'Mobile nav exposes sign out')
        await mobileNav.getByText('Mais').click()
        await assertMobileNavClearance(page, width, height)
      }

      for (const theme of ['light', 'dark'] as const) {
        await setTheme(page, theme)
        await achadosTab.click()
        await page.screenshot({ path: join(output, `achados-${width}-${theme}.png`), fullPage: true, animations: 'disabled' })
        await laudoTab.click()
        assert.equal(await achadosPanel.isVisible(), false, `Laudo hides Achados at ${width}/${theme}`)
        assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1, `Only Laudo is visible at ${width}/${theme}`)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Laudo has no horizontal overflow at ${width}/${theme}`)
        const editorBox = await editor.boundingBox()
        assert.ok(editorBox && editorBox.x >= 0 && editorBox.x + editorBox.width <= width, `Laudo editor fits at ${width}/${theme}`)
        await page.screenshot({ path: join(output, `laudo-${width}-${theme}.png`), fullPage: true, animations: 'disabled' })
      }
    }

    await setTheme(page, 'light')
    await page.setViewportSize({ width: 1440, height: 900 })
    assert.equal(await page.getByRole('navigation', { name: 'Navegação principal' }).isVisible(), false, 'Desktop keeps mobile navigation hidden')
    await page.setViewportSize({ width: 390, height: 844 })
    await achadosTab.click()
    await page.waitForTimeout(120)
    const achadosScroll = await page.evaluate(() => {
      window.scrollTo(0, Math.min(320, document.documentElement.scrollHeight - window.innerHeight))
      return window.scrollY
    })
    await laudoTab.click()
    await page.evaluate(() => window.scrollTo(0, 0))
    await achadosTab.click()
    await page.waitForTimeout(120)
    const restoredAchadosScroll = await page.evaluate(() => window.scrollY)
    assert.ok(Math.abs(restoredAchadosScroll - achadosScroll) <= 4, `Achados scrollY restored: expected ${achadosScroll}, got ${restoredAchadosScroll}`)

    assert.deepEqual(errors, [])
    console.log(`PASS workspace cards: simultaneous organ cards, categories/controls, keyboard/state/schema/scroll, 1440/1024/768/390/320, light/dark screenshots. Harness stub does not validate clinical output or production. Screenshots: ${output}`)
  } finally {
    await browser?.close()
    await new Promise<void>(done => server.close(() => done()))
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
