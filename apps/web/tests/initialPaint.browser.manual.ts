/** Primeiro paint real, cache desligado, JS/fontes lentos. Sem login/banco:
 * o seletor real é renderizado no servidor e hidratado; a Sala usa Next local
 * com respostas sintéticas somente no navegador.
 * PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright \
 * pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/initialPaint.browser.manual.ts
 * SALA_ORIGIN=http://127.0.0.1:3000 PAINT_SHOTS=/tmp/laudousg-paint
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, mkdtempSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'

const web = resolve('apps/web')
const output = mkdtempSync(join(tmpdir(), 'initial-paint-'))
const shots = process.env.PAINT_SHOTS ?? output
mkdirSync(shots, { recursive: true })
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function main() {
  const imports = `import React from 'react'; import {ExamCategoryPicker} from '${join(web, 'src/components/laudar/ExamCategoryPicker')}';`
  const common = { bundle: true, jsx: 'automatic' as const, tsconfig: join(web, 'tsconfig.json'), define: { 'process.env.NODE_ENV': '"production"' } }
  await build({ ...common, platform: 'node', outfile: join(output, 'ssr.cjs'), stdin: {
    contents: imports + `import {renderToString} from 'react-dom/server'; export const html=renderToString(<ExamCategoryPicker onSelect={()=>{}}/>);`,
    resolveDir: web, loader: 'tsx',
  } })
  await build({ ...common, platform: 'browser', outfile: join(output, 'client.js'), banner: { js: 'var process={env:{}};' }, stdin: {
    contents: imports + `import {hydrateRoot} from 'react-dom/client'; hydrateRoot(document.getElementById('root'),<ExamCategoryPicker onSelect={()=>{}}/>);`,
    resolveDir: web, loader: 'tsx',
  } })
  execFileSync(resolve('node_modules/.bin/tailwindcss'), ['-c', join(web, 'tailwind.config.ts'), '-i', join(web, 'src/app/globals.css'), '--content', join(web, 'src/components/**/*.tsx'), '-o', join(output, 'style.css')], { stdio: 'pipe' })
  const html = require(join(output, 'ssr.cjs')).html
  assert.ok(!html.includes('&#x27;Category Condensed'), 'fonte não pode depender da hidratação para corrigir CSS escapado')
  const server = createServer((req, res) => {
    const url = req.url ?? '/'
    if (url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(readFileSync(join(output, 'style.css'))); return }
    if (url === '/client.js') { setTimeout(() => { res.setHeader('Content-Type', 'text/javascript'); res.end(readFileSync(join(output, 'client.js'))) }, 1200); return }
    const file = join(web, 'public', url)
    if (url !== '/' && file.startsWith(join(web, 'public')) && existsSync(file)) { res.end(readFileSync(file)); return }
    res.setHeader('Content-Type', 'text/html')
    res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preload" href="/fonts/BarlowCondensed-Light.ttf" as="font" type="font/ttf" crossorigin="anonymous"><link rel="stylesheet" href="/style.css"></head><body><div id="root">${html}</div><script defer src="/client.js"></script></body></html>`)
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const pickerOrigin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [1440, 390]) for (const fontDelay of [0, 1500]) {
      for (const [name, url, selector] of [
        ['picker', pickerOrigin, '.exam-category-title'],
        ['sala-entry', `${process.env.SALA_ORIGIN ?? 'http://127.0.0.1:3000'}/sala`, '.frame'],
        ['sala-room', `${process.env.SALA_ORIGIN ?? 'http://127.0.0.1:3000'}/sala/ABC234`, '.topbar'],
      ]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
        const errors: string[] = []
        page.on('pageerror', (e: Error) => { errors.push(e.message); console.error(name, e.message) })
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('Network.enable')
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
        await page.route('**/*', async (route: any) => {
          const u = route.request().url()
          if (/fonts\.googleapis|fonts\.gstatic/.test(u)) throw new Error('fonte externa no caminho inicial')
          if (u.includes('/api/sala/')) { await new Promise(r => setTimeout(r, 3500)); await route.fulfill({ json: { tokenValid: true, report: null, reportsToday: [], schemas: [] } }); return }
          if (/\.(woff2|ttf)(\?|$)/.test(u) && fontDelay) await new Promise(r => setTimeout(r, fontDelay))
          if (u.includes('/_next/') && u.includes('.js')) await new Promise(r => setTimeout(r, 1200))
          await route.continue()
        })
        // tsx preserva nomes de funções aninhadas com este helper.
        await page.addInitScript('window.__name = (fn) => fn')
        await page.addInitScript((selector: string) => {
          const state = (window as any).__paint = { samples: [], shifts: [] }
          new PerformanceObserver(list => { for (const e of list.getEntries()) if (!(e as any).hadRecentInput) state.shifts.push({ t: e.startTime, value: (e as any).value }) }).observe({ type: 'layout-shift', buffered: true })
          function sample() {
            const el = document.querySelector(selector)
            if (el && performance.getEntriesByName('first-paint').length) {
              const css = getComputedStyle(el), rect = el.getBoundingClientRect(), range = document.createRange()
              range.selectNodeContents(el)
              const text = range.getBoundingClientRect()
              state.samples.push({ t: performance.now(), display: css.display, opacity: css.opacity, family: css.fontFamily, width: rect.width, height: rect.height, textWidth: text.width, textHeight: text.height, bg: getComputedStyle(document.body).backgroundColor })
            }
            if (performance.now() < 10000) requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        }, selector)
        await page.goto(url, { waitUntil: 'commit' })
        await page.screenshot({ path: join(shots, `${name}-${width}-${fontDelay}-navigation.png`) })
        await page.waitForFunction(() => (window as any).__paint.samples.length > 0)
        await page.screenshot({ path: join(shots, `${name}-${width}-${fontDelay}-first.png`) })
        await page.waitForTimeout(2200)
        const result = await page.evaluate(() => (window as any).__paint)
        const samples = result.samples
        assert.ok(samples.length > 10)
        if (name === 'sala-room') assert.ok(samples.every((s: any) => s.display === 'flex'), 'barra da Sala precisa nascer em flex')
        if (name === 'sala-entry') assert.ok(samples.every((s: any) => s.width <= 520 && s.opacity === '1' && s.bg !== 'rgba(0, 0, 0, 0)'), 'entrada precisa nascer com largura/fundo reais')
        if (name === 'picker') {
          assert.ok(samples.every((s: any) => s.family.includes('Category Condensed')), 'família aplicada já no primeiro paint')
          assert.ok(Math.max(...samples.map((s: any) => s.textWidth)) - Math.min(...samples.map((s: any) => s.textWidth)) < 1, 'texto mudou de largura após primeiro paint')
          assert.ok(Math.max(...samples.map((s: any) => s.textHeight)) - Math.min(...samples.map((s: any) => s.textHeight)) < 1, 'texto mudou de altura após primeiro paint')
          assert.equal(await page.locator('.exam-category-item').evaluateAll((els: HTMLElement[]) => els.filter(e => e.scrollWidth > e.clientWidth).length), 0, 'fallback de fonte não pode estourar cartões')
        }
        const cls = result.shifts.reduce((sum: number, e: any) => sum + e.value, 0)
        assert.ok(cls < 0.02, `${name}: CLS inicial ${cls}`)
        assert.deepEqual(errors, [])
        await page.screenshot({ path: join(shots, `${name}-${width}-${fontDelay}-final.png`), fullPage: true })
        require('node:fs').writeFileSync(join(shots, `${name}-${width}-${fontDelay}.json`), JSON.stringify(result, null, 2))
        console.log(`${name} ${width}px fonte +${fontDelay}ms: CLS=${cls.toFixed(5)}, primeiro frame já estilizado`)
        await page.close()
      }
    }
  } finally { await browser.close(); server.close() }
}
main().catch(error => { console.error(error); process.exit(1) })
