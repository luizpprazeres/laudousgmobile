/** Painel de BI-RADS por achado — navegador real, adaptador e renderer reais.
 *
 * Rodar da raiz do repositório:
 *   PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright \
 *     pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/mamariaBirads.browser.manual.ts
 * BIRADS_SHOTS=/pasta salva screenshots.
 *
 * Prova sincronização, limites e confirmação. Não prova acerto clínico.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'

async function main() {
  const web = resolve('apps/web')
  const output = mkdtempSync(join(tmpdir(), 'mamaria-birads-'))
  const bundle = await build({
    entryPoints: [join(web, 'tests/mamariaBirads.browser.tsx')], bundle: true, write: false,
    platform: 'browser', jsx: 'automatic', tsconfig: join(web, 'tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"test"' },
  })
  const cssFile = join(output, 'style.css')
  execFileSync(resolve('node_modules/.bin/tailwindcss'), [
    '-c', join(web, 'tailwind.config.ts'), '-i', join(web, 'src/app/globals.css'),
    '--content', `${join(web, 'src/components/**/*.tsx')},${join(web, 'tests/mamariaBirads.browser.tsx')}`,
    '-o', cssFile,
  ], { stdio: 'pipe' })
  const css = readFileSync(cssFile, 'utf8')

  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); return }
      if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); return }
      if (req.method === 'POST' && req.url === '/render') {
        let raw = ''; for await (const chunk of req) raw += chunk
        const r = renderizarSelecao('MAMARIA', 'CLASSICO_COMPLETO', [], JSON.parse(raw).dados)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(r.ok ? r.texto : `ERRO: ${JSON.stringify(r)}`); return
      }
      if (req.url !== '/') { res.statusCode = 404; res.end(); return }
      res.setHeader('Content-Type', 'text/html')
      res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) { res.statusCode = 500; res.end(String(error)) }
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true })
  const shots = process.env.BIRADS_SHOTS
  if (shots) mkdirSync(shots, { recursive: true })

  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
      const mobile = viewport.name === 'mobile'
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
      const errors: string[] = []
      page.on('pageerror', (e: Error) => errors.push(e.message))
      page.on('console', (m: any) => { if (m.type() === 'error') errors.push(m.text()) })
      await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
      await page.goto(origin)

      const form = page.getByRole('region', { name: 'Mamas', exact: true })
      const painel = page.getByRole('region', { name: 'BI-RADS', exact: true })
      const linha = (n: number) => painel.locator('[data-birads-achado]').nth(n)
      const status = (n: number) => linha(n).getAttribute('data-birads-status')
      const laudo = () => page.getByRole('status', { name: 'Laudo gerado' }).textContent()
      const laudoEstavel = async () => { await page.waitForTimeout(150); return laudo() }
      const achadoForm = (n: number) => form.locator('[data-mama-achado]').nth(n)
      const pick = (n: number, group: string, option: string) =>
        achadoForm(n).getByRole('group', { name: group, exact: true }).getByRole('button', { name: option, exact: true }).click()

      await painel.getByText('Nenhum achado nas mamas.').waitFor()

      // Achado 1: nódulo novo — sem margem, dados insuficientes.
      await form.getByRole('button', { name: 'Adicionar achado' }).click()
      assert.equal(await status(0), 'incompleta')
      await linha(0).getByText('Margem', { exact: true }).waitFor()
      assert.equal(await linha(0).locator('[data-birads-sugerida]').count(), 0)

      // Tripé benigno → sugestão 3, que NÃO entra no laudo sozinha.
      await pick(0, 'Margem', 'Circunscrita')
      assert.equal(await status(0), 'sugerida')
      assert.equal(await linha(0).locator('[data-birads-sugerida]').textContent(), 'BI-RADS 3')
      assert.doesNotMatch(String(await laudoEstavel()), /Categoria BI-RADS® 3/)

      // Achado 2: cisto simples na mama esquerda → 2.
      await form.getByRole('button', { name: 'Adicionar achado' }).click()
      await achadoForm(1).getByRole('combobox', { name: 'Tipo do achado 2' }).selectOption('cisto_simples')
      await achadoForm(1).getByRole('button', { name: 'Mama esquerda' }).click()
      assert.equal(await status(1), 'sugerida')
      assert.equal(await linha(1).locator('[data-birads-sugerida]').textContent(), 'BI-RADS 2')
      assert.match(String(await linha(1).textContent()), /mama esquerda/)

      // Aplicar a sugestão do achado 1 grava só o achado 1.
      await linha(0).getByRole('button', { name: 'Aplicar BI-RADS 3 ao achado 1' }).click()
      assert.equal(await linha(0).getAttribute('data-birads-status'), 'sugerida')
      assert.equal(await linha(0).locator('[data-birads-definida]').getAttribute('data-birads-definida'), '3')
      assert.equal(await linha(1).locator('[data-birads-definida]').getAttribute('data-birads-definida'), '')
      await page.waitForFunction(() => /Categoria BI-RADS® 3/.test(document.querySelector('[role="status"]')?.textContent ?? ''))

      // Característica suspeita no achado 1: sugestão vira "avaliação suspeita" sem
      // categoria, e a escolha MANUAL (3) continua no laudo até o médico mudar.
      await pick(0, 'Forma', 'Irregular')
      assert.equal(await status(0), 'suspeita')
      assert.equal(await linha(0).locator('[data-birads-sugerida]').count(), 0)
      assert.equal(await linha(0).getByRole('button', { name: /Aplicar/ }).count(), 0)
      assert.equal(await linha(0).locator('[data-birads-definida]').getAttribute('data-birads-definida'), '3')
      assert.match(String(await laudoEstavel()), /Categoria BI-RADS® 3/)

      // O médico escolhe a subcategoria à mão; o formulário vê a mesma escolha.
      await linha(0).getByRole('group', { name: 'BI-RADS definido pelo médico — Achado 1' }).getByRole('button', { name: '4B', exact: true }).click()
      assert.equal(await linha(0).locator('[data-birads-definida]').getAttribute('data-birads-definida'), '4B')
      await page.waitForFunction(() => /Categoria BI-RADS® 4B/.test(document.querySelector('[role="status"]')?.textContent ?? ''))
      assert.equal(
        await achadoForm(0).getByRole('group', { name: 'BI-RADS definido pelo médico' }).getByRole('button', { name: '4B', exact: true }).getAttribute('aria-pressed'),
        'true',
      )

      // Achado 3: calcificações sem regra validada → revisão, sem categoria.
      await form.getByRole('button', { name: 'Adicionar achado' }).click()
      await achadoForm(2).getByRole('combobox', { name: 'Tipo do achado 3' }).selectOption('calcificacoes')
      await achadoForm(2).getByLabel('Padrão das calcificações').selectOption('intraductais')
      assert.equal(await status(2), 'revisao')
      assert.equal(await linha(2).locator('[data-birads-sugerida]').count(), 0)

      // Remover do laudo limpa só o achado 1; remover o achado 2 tira a linha dele.
      await linha(0).getByRole('button', { name: 'Remover do laudo' }).click()
      assert.equal(await linha(0).locator('[data-birads-definida]').getAttribute('data-birads-definida'), '')
      await page.waitForFunction(() => !/Categoria BI-RADS® 4B/.test(document.querySelector('[role="status"]')?.textContent ?? ''))
      await form.getByRole('button', { name: 'Remover achado 2' }).click()
      assert.equal(await painel.locator('[data-birads-achado]').count(), 2)
      assert.deepEqual(await painel.locator('[data-birads-achado] h4').allTextContents(), ['Achado 1', 'Achado 2'])
      assert.equal(await status(1), 'revisao')

      // Layout.
      const pagina = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }))
      assert.ok(pagina.s <= pagina.c, `${viewport.name}: rolagem horizontal`)
      const estourados = await painel.evaluate((root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('*'))
        .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible')
        .map((el) => el.tagName))
      assert.deepEqual(estourados, [], `${viewport.name}: conteúdo estourando no painel`)
      if (mobile) {
        const pequenos = await painel.evaluate((root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('button'))
          .map((b) => ({ t: b.textContent, h: b.getBoundingClientRect().height })).filter((b) => b.h < 44))
        assert.deepEqual(pequenos, [], 'mobile: alvos menores que 44 px')
      }
      if (shots) await page.screenshot({ path: join(shots, `birads-${viewport.name}.png`), fullPage: true })
      assert.deepEqual(errors, [], `${viewport.name}: erros no console`)
      console.log(`ok ${viewport.name} ${viewport.width}px`)
      await page.close()
    }
    console.log('mamariaBirads.browser: OK')
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
