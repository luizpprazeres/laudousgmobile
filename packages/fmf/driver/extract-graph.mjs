// Extrai as curvas dos gráficos do app (SVG: polylines + ticks) e converte para dados.
import { writeFileSync } from 'node:fs'
import { connect, press, openCalculators } from './lib.mjs'
const { browser, page } = await connect()
const grab = async (graphId, xLabelRe, yTicksMin) => {
  await press(page, graphId); await page.waitForTimeout(2000)
  const data = await page.evaluate(([xLabelRe]) => {
    const svg = [...document.querySelectorAll('svg')].find(s => s.getBoundingClientRect().width > 200 && s.querySelectorAll('polyline').length)
    if (!svg) return null
    const box = svg.getBoundingClientRect()
    const texts = [...svg.querySelectorAll('text')].map(t => { const r = t.getBoundingClientRect(); return { txt: t.textContent.trim(), x: r.x + r.width / 2 - box.x, y: r.y + r.height / 2 - box.y } })
    const numeric = texts.filter(t => /^-?\d+(\.\d+)?$/.test(t.txt)).map(t => ({ v: Number(t.txt), x: t.x, y: t.y }))
    // ticks do eixo X: os que compartilham y (mais abaixo); do eixo Y: compartilham x (mais à esquerda)
    const yBottom = Math.max(...numeric.map(t => t.y)); const xTicks = numeric.filter(t => Math.abs(t.y - yBottom) < 6)
    const xLeft = Math.min(...numeric.map(t => t.x)); const yTicks = numeric.filter(t => Math.abs(t.x - xLeft) < 12)
    const polylines = [...svg.querySelectorAll('polyline')].map(p => ({ stroke: p.getAttribute('stroke'), width: p.getAttribute('stroke-width'), dash: p.getAttribute('stroke-dasharray'), pts: (p.getAttribute('points') || '').trim().split(/\s+/).map(s => s.split(',').map(Number)) }))
    const circles = [...svg.querySelectorAll('circle')].map(c => ({ cx: Number(c.getAttribute('cx')), cy: Number(c.getAttribute('cy')), r: c.getAttribute('r'), fill: c.getAttribute('fill') }))
    const labels = texts.filter(t => !/^-?\d+(\.\d+)?$/.test(t.txt)).map(t => t.txt)
    return { w: box.width, h: box.height, xTicks, yTicks, polylines, circles, labels, viewBox: svg.getAttribute('viewBox') }
  }, [String(xLabelRe)])
  if (await page.locator('[data-testid="close-assessments"]').count()) { await page.locator('[data-testid="close-assessments"]').first().click({ force: true }); await page.waitForTimeout(600) }
  return data
}
const fitAxis = (ticks, key) => { // v = a + b*px (regressão linear nos ticks)
  const n = ticks.length, sx = ticks.reduce((s, t) => s + t[key], 0), sy = ticks.reduce((s, t) => s + t.v, 0), sxx = ticks.reduce((s, t) => s + t[key] ** 2, 0), sxy = ticks.reduce((s, t) => s + t[key] * t.v, 0)
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a: (sy - b * sx) / n, b }
}
await openCalculators(page); await press(page, 'trisomies-tab'); await page.waitForTimeout(600)
const out = {}
for (const id of ['graph-nt', 'graph-crl', 'graph-fhr']) {
  const g = await grab(id)
  if (!g) { console.log(id, ': sem svg com polylines'); continue }
  const ax = fitAxis(g.xTicks, 'x'), ay = fitAxis(g.yTicks, 'y')
  const curves = g.polylines.map(p => ({ stroke: p.stroke, dash: p.dash, width: p.width, n: p.pts.length, data: p.pts.filter(q => q.length === 2 && q.every(Number.isFinite)).map(([px, py]) => [Number((ax.a + ax.b * px).toFixed(2)), Number((ay.a + ay.b * py).toFixed(3))]) }))
  const point = g.circles.map(c => [Number((ax.a + ax.b * c.cx).toFixed(2)), Number((ay.a + ay.b * c.cy).toFixed(3))])
  out[id] = { labels: g.labels, xTicks: g.xTicks.map(t => t.v), yTicks: g.yTicks.map(t => t.v), curves, point, viewBox: g.viewBox, size: [g.w, g.h] }
  console.log(`${id}: eixos ${g.labels.join(' / ')} | x ticks ${g.xTicks.map(t => t.v).join(',')} | y ticks ${g.yTicks.map(t => t.v).join(',')} | ${curves.length} curvas (${curves.map(c => c.n + 'pts ' + (c.dash ? 'tracejada' : 'cheia')).join(', ')}) | ponto ${JSON.stringify(point)}`)
  for (const c of curves) console.log('   ', c.stroke, c.dash ?? 'cheia', 'início', JSON.stringify(c.data.slice(0, 3)), 'fim', JSON.stringify(c.data.slice(-2)))
}
writeFileSync('graphs-trisomies.json', JSON.stringify(out, null, 1))
await browser.close()
