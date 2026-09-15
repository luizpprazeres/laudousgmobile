import { connect, press, openCalculators } from './lib.mjs'
const { browser, page } = await connect()
const text = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ')
// abrir o gráfico da NT (graph-nt) na aba de trissomias e descrever o overlay
await openCalculators(page); await press(page, 'trisomies-tab'); await page.waitForTimeout(800)
await press(page, 'graph-nt'); await page.waitForTimeout(2500)
const info = await page.evaluate(() => {
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
  const svgs = [...document.querySelectorAll('svg')].filter(vis).map(s => ({ w: Math.round(s.getBoundingClientRect().width), h: Math.round(s.getBoundingClientRect().height), paths: s.querySelectorAll('path').length, circles: s.querySelectorAll('circle').length, texts: [...s.querySelectorAll('text')].map(t => t.textContent.trim()).filter(Boolean).slice(0, 40), lines: s.querySelectorAll('line').length, polylines: s.querySelectorAll('polyline').length }))
  const canvases = [...document.querySelectorAll('canvas')].filter(vis).map(c => ({ w: c.width, h: c.height }))
  const imgs = [...document.querySelectorAll('img')].filter(vis).map(i => (i.src || '').slice(0, 80))
  const tids = [...document.querySelectorAll('[data-testid]')].filter(vis).map(e => e.getAttribute('data-testid')).filter(t => /graph|close|assess|chart|curve|plot|export|download|print/i.test(t))
  const t = document.body.innerText.replace(/\s+/g, ' '); const i = t.search(/percentile|centile|median|95th|5th|Nuchal/i)
  return { svgs, canvases, imgs, tids, text: t.slice(Math.max(0, i - 100), i + 500) }
})
console.log(JSON.stringify(info, null, 1).slice(0, 3000))
// primeiro path do primeiro svg (para ver se as curvas são polylines com coordenadas)
const d = await page.evaluate(() => { const s = [...document.querySelectorAll('svg')].find(x => x.getBoundingClientRect().width > 200); const ps = s ? [...s.querySelectorAll('path')] : []; return ps.slice(0, 6).map(p => (p.getAttribute('d') || '').slice(0, 160) + ` [stroke=${p.getAttribute('stroke')} fill=${p.getAttribute('fill')}]`) })
console.log('PATHS:', d.join('\n'))
await page.screenshot({ path: 'graph-nt.png', scale: 'css' })
if (await page.locator('[data-testid="close-assessments"]').count()) { await page.locator('[data-testid="close-assessments"]').first().click({ force: true }); await page.waitForTimeout(600) }
await browser.close()
