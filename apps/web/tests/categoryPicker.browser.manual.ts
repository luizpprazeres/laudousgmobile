/** Seletor de categoria em famílias — navegador real, clique por coordenada.
 *
 * Rodar da raiz do repositório:
 *   PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright \
 *     pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/categoryPicker.browser.manual.ts
 * PICKER_SHOTS=/pasta salva screenshots de cada viewport.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { build } from 'esbuild'

const GRUPOS_ESPERADOS: Array<[string, string[]]> = [
  ['medicina_interna', ['ABDOMEN_TOTAL', 'ABDOMEN_SUPERIOR', 'VIAS_URINARIAS', 'PROSTATA_SUPRAPUBICA', 'DOPPLER_CAROTIDAS']],
  ['obstetricia', ['OBSTETRICA', 'DOPPLER_OBSTETRICO', 'MORFOLOGICO', 'CERVICOMETRIA']],
  ['saude_mulher', ['PELVE_FEMININA', 'MAMARIA']],
  ['pequenas_partes', ['TIREOIDE', 'CERVICAL', 'PARTES_MOLES']],
  ['musculoesqueletico', ['MUSCULOESQUELETICO']],
]
const TODOS = GRUPOS_ESPERADOS.flatMap(([, ids]) => ids)
const TIPOS: Record<string, string> = { '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf' }

async function main() {
  const web = resolve('apps/web')
  const output = mkdtempSync(join(tmpdir(), 'category-picker-'))
  const bundle = await build({
    entryPoints: [join(web, 'tests/categoryPicker.browser.tsx')], bundle: true, write: false,
    platform: 'browser', jsx: 'automatic', tsconfig: join(web, 'tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"test"' },
    // Módulos do catálogo leem outras variáveis de ambiente; no navegador elas não existem.
    banner: { js: 'var process = globalThis.process || { env: {} };' },
  })
  const cssFile = join(output, 'style.css')
  execFileSync(resolve('node_modules/.bin/tailwindcss'), [
    '-c', join(web, 'tailwind.config.ts'), '-i', join(web, 'src/app/globals.css'),
    '--content', `${join(web, 'src/components/**/*.tsx')},${join(web, 'tests/categoryPicker.browser.tsx')}`,
    '-o', cssFile,
  ], { stdio: 'pipe' })
  const css = readFileSync(cssFile, 'utf8')

  const server = createServer((req, res) => {
    const url = req.url ?? '/'
    if (url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); return }
    if (url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); return }
    const file = join(web, 'public', decodeURIComponent(url.slice(1)))
    if (url !== '/' && file.startsWith(join(web, 'public')) && existsSync(file)) {
      res.setHeader('Content-Type', TIPOS[extname(file)] ?? 'application/octet-stream'); res.end(readFileSync(file)); return
    }
    if (url !== '/') { res.statusCode = 404; res.end(); return }
    res.setHeader('Content-Type', 'text/html')
    res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true })
  const shots = process.env.PICKER_SHOTS
  if (shots) mkdirSync(shots, { recursive: true })

  try {
    for (const width of [1920, 1440, 1024, 390, 320]) {
      const mobile = width <= 480
      const page = await browser.newPage({ viewport: { width, height: mobile ? 844 : 1000 }, reducedMotion: 'reduce' })
      const errors: string[] = []
      page.on('pageerror', (e: Error) => errors.push(e.message))
      page.on('console', (m: any) => { if (m.type() === 'error') errors.push(m.text()) })
      await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
      await page.goto(origin)
      await page.getByRole('heading', { name: 'Qual exame você deseja realizar?' }).waitFor()
      await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>('.exam-category-art img')).every((img) => img.complete && img.naturalWidth > 0))
      const escolhida = () => page.getByTestId('escolhida').textContent()
      const cards = page.locator('.exam-category-item')
      const idsVisiveis = () => cards.evaluateAll((els: HTMLElement[]) => els.map((el) => el.dataset.categoryId))

      // --- estrutura: cinco famílias, cada exame uma vez ---------------------------
      const estrutura = await page.locator('[data-category-group]').evaluateAll((els: HTMLElement[]) =>
        els.map((el) => [el.dataset.categoryGroup, Array.from(el.querySelectorAll<HTMLElement>('.exam-category-item')).map((c) => c.dataset.categoryId)]))
      assert.deepEqual(estrutura, GRUPOS_ESPERADOS)
      assert.equal(new Set(await idsVisiveis()).size, TODOS.length, 'cada exame uma vez')
      assert.equal(await page.locator('.exam-category-art img').evaluateAll((imgs: HTMLImageElement[]) => new Set(imgs.map((i) => i.src)).size), TODOS.length)
      assert.deepEqual(await page.getByRole('heading', { level: 2 }).allTextContents(),
        ['Medicina interna', 'Obstetrícia', 'Saúde da mulher', 'Pequenas partes', 'Musculoesquelético'])
      const atalho = page.locator('[data-category-shortcut="MAMARIA"]')
      assert.equal(await atalho.count(), 1)
      assert.equal(await page.locator('[data-category-group="pequenas_partes"] [data-category-shortcut="MAMARIA"]').count(), 1)

      // --- layout: sem rolagem horizontal, largura usada, alvos -------------------
      const pagina = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }))
      assert.ok(pagina.s <= pagina.c, `${width}: rolagem horizontal ${pagina.s} > ${pagina.c}`)
      assert.ok(await cards.evaluateAll((els: HTMLElement[]) => els.every((el) => el.scrollWidth <= el.clientWidth)), `${width}: rótulo estourando`)
      const grupos = await page.locator('[data-category-group]').evaluateAll((els: HTMLElement[]) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ top: Math.round(r.top), left: r.left, right: r.right })))
      const linhas = new Set(grupos.map((g) => g.top)).size
      const usado = Math.max(...grupos.map((g) => g.right)) - Math.min(...grupos.map((g) => g.left))
      if (width === 1920) assert.ok(linhas <= 2, `1920: ${linhas} linhas de famílias`)
      if (width === 1440) assert.ok(linhas <= 3, `1440: ${linhas} linhas de famílias`)
      if (!mobile) assert.ok(usado >= width * 0.88 || usado >= 1790, `${width}: famílias usam só ${Math.round(usado)}px`)
      const cardLarguras = await cards.evaluateAll((els: HTMLElement[]) => els.map((el) => el.getBoundingClientRect().width))
      if (!mobile) assert.ok(Math.max(...cardLarguras) <= 290, `${width}: card largo demais (${Math.max(...cardLarguras)}px)`)
      const alvos = await page.locator('.exam-category-item, [data-category-shortcut]').evaluateAll((els: HTMLElement[]) => els.map((el) => el.getBoundingClientRect().height))
      // 44 px no toque; com ponteiro fino o atalho tem 36 px.
      assert.ok(alvos.every((h) => h >= (mobile ? 44 : 32)), `${width}: alvo pequeno demais (${Math.min(...alvos)}px)`)
      if (shots) await page.screenshot({ path: join(shots, `picker-${width}.png`), fullPage: true })

      // --- clique REAL no centro de cada card ------------------------------------
      for (const id of TODOS) {
        const card = page.locator(`.exam-category-item[data-category-id="${id}"]`)
        await card.scrollIntoViewIfNeeded()
        const box = await card.boundingBox()
        assert.ok(box)
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2
        const alvo = await page.evaluate(([x, y]: number[]) => (document.elementFromPoint(x, y)?.closest('[data-category-id]') as HTMLElement | null)?.dataset.categoryId ?? null, [cx, cy])
        assert.equal(alvo, id, `${width}: o centro de ${id} não é clicável (cobre: ${alvo})`)
        await page.mouse.click(cx, cy)
        assert.equal(await escolhida(), id)
      }
      await atalho.scrollIntoViewIfNeeded()
      const boxAtalho = await atalho.boundingBox()
      assert.ok(boxAtalho)
      await page.mouse.click(boxAtalho.x + boxAtalho.width / 2, boxAtalho.y + boxAtalho.height / 2)
      assert.equal(await escolhida(), 'MAMARIA')

      // --- teclado: Tab sai da busca para o primeiro exame e segue a ordem --------
      await page.getByLabel('Buscar categoria').focus()
      const ordem: string[] = []
      for (let i = 0; i < TODOS.length + 1; i++) {
        await page.keyboard.press('Tab')
        ordem.push(await page.evaluate(() => {
          const el = document.activeElement as HTMLElement
          return el.dataset.categoryId ?? (el.dataset.categoryShortcut ? `atalho:${el.dataset.categoryShortcut}` : el.tagName)
        }))
      }
      // Ordem do DOM = ordem visual: famílias em sequência; o atalho fecha Pequenas partes.
      assert.deepEqual(ordem, [...TODOS.slice(0, 14), 'atalho:MAMARIA', ...TODOS.slice(14)])
      await page.getByLabel('Buscar categoria').focus()
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      assert.equal(await escolhida(), 'ABDOMEN_SUPERIOR')

      // --- busca global sem acento: nome, sinônimo e família ---------------------
      const busca = page.getByLabel('Buscar categoria')
      const buscar = async (texto: string) => { await busca.fill(texto); return idsVisiveis() }
      assert.deepEqual(await buscar('obstetrica'), ['OBSTETRICA', 'DOPPLER_OBSTETRICO'])
      assert.deepEqual(await buscar('próstata'), ['PROSTATA_SUPRAPUBICA'])
      assert.deepEqual(await buscar('tiroide'), ['TIREOIDE'])
      assert.deepEqual(await buscar('joelho'), ['MUSCULOESQUELETICO'])
      assert.deepEqual(await buscar('gravidez'), ['OBSTETRICA'])
      assert.deepEqual(await buscar('saude da mulher'), ['PELVE_FEMININA', 'MAMARIA'])
      assert.deepEqual(await buscar('pequenas partes'), ['TIREOIDE', 'CERVICAL', 'PARTES_MOLES'])
      assert.deepEqual(await buscar('mama'), ['MAMARIA'])
      assert.equal(await page.locator('[data-category-shortcut]').count(), 0, 'atalho não duplica resultado de busca')
      assert.deepEqual(await buscar('colo'), ['CERVICOMETRIA'])
      assert.deepEqual(await buscar('exame inexistente'), [])
      await page.getByRole('status').getByText('Nenhum exame encontrado.').waitFor()
      await page.getByRole('button', { name: 'Limpar busca' }).click()
      assert.equal(await cards.count(), TODOS.length)
      // Um resultado só: Enter na busca abre o exame.
      await busca.fill('tiroide')
      await busca.press('Enter')
      assert.equal(await escolhida(), 'TIREOIDE')
      // Vários resultados: Enter não escolhe por você; Tab passa pelo "Limpar busca" e chega ao primeiro.
      await busca.fill('abdome')
      await busca.press('Enter')
      assert.equal(await escolhida(), 'TIREOIDE')
      await page.keyboard.press('Tab')
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Limpar busca')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      assert.equal(await escolhida(), 'ABDOMEN_TOTAL')

      assert.deepEqual(errors, [], `${width}: erros no console`)
      console.log(`ok ${width}px — ${linhas} linha(s) de famílias, ${Math.round(usado)}px usados`)
      await page.close()
    }
    console.log('categoryPicker.browser: OK')
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
