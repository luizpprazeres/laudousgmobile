// Resumo app × motor por lote (exclui suspeitas, calcPending e valores capados 1:2 / 1:10000)
import { readFileSync } from 'node:fs'
import { calcularTrissomias, crlToGaDays } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomy.ts'
const EXAM = Date.UTC(2026, 8, 15)
const ageAt = dob => { const [m, d, y] = dob.split('/').map(Number); return (EXAM - Date.UTC(y, m - 1, d)) / (365.25 * 86400000) }
const ETN = { 'White': 'white', 'Black': 'black', 'South Asian': 'south_asian', 'East Asian': 'east_asian' }
const LOTES = ['tri-matrix', 'tri-b40', 'tri2', 'tri3', 'tri4', 'tri5', 'tri6', 'tri7', 'tri-09-12']
const all = []
for (const b of LOTES) {
  let cases, res; try { cases = Object.fromEntries(JSON.parse(readFileSync(`cases-${b}.json`, 'utf8')).map(c => [c.id, c])); res = JSON.parse(readFileSync(`results-${b}.json`, 'utf8')) } catch { continue }
  for (const r of res) { const c = cases[r.id]; if (!c || r.error || r.suspect || r.calcPending || !r.t21) continue
    if (b === 'tri2' && /^B40/.test(r.id)) continue
    const t = c.tri, m = c.maternal
    const dv = t.dvAWave && t.dvpi == null ? undefined : undefined
    let o; try { o = calcularTrissomias({ maternalAge: ageAt(m.dob), gaDaysDated: (m.gaWeeks ?? 12) * 7 + (m.gaDays ?? 3), crl: t.crl, nt: t.nt, fhr: t.fhr, freeBetaHcgMoM: t.freeBhcgMom, pappaMoM: t.pappaMom, dvPI: t.dvpi, tricuspidRegurgitation: t.tricuspid === 'Yes' ? true : t.tricuspid === 'No' ? false : undefined, nasalBoneAbsent: t.nasalBone === 'Absent' ? true : t.nasalBone === 'Present' ? false : undefined, smoking: !!m.smoking, ethnicity: ETN[m.ethnicity] ?? 'mixed', weight: m.weight, previousT21: !!t.previousT21, isMoMCorrected: true }) } catch (e) { continue }
    const rec = (k, app, loc) => { if (app > 2 && app < 10000) all.push({ lote: b, id: r.id, k, app, loc, d: Math.abs(loc / app - 1) }) }
    rec('T21', r.t21, o.t21.ratio); rec('T13/18', r.t18t13, o.t18t13.ratio)
  }
}
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const lotes = [...new Set(all.map(x => x.lote))]
console.log('lote | n | mediana | p90 | máx | >25 %')
for (const l of lotes) { const v = all.filter(x => x.lote === l).map(x => x.d); console.log(`${l} | ${v.length} | ${(q(v, .5) * 100).toFixed(0)} % | ${(q(v, .9) * 100).toFixed(0)} % | ${(Math.max(...v) * 100).toFixed(0)} % | ${v.filter(d => d > .25).length}`) }
const v = all.map(x => x.d); console.log(`TOTAL | ${v.length} | ${(q(v, .5) * 100).toFixed(0)} % | ${(q(v, .9) * 100).toFixed(0)} % | ${(Math.max(...v) * 100).toFixed(0)} % | ${v.filter(d => d > .25).length}`)
for (const k of ['T21', 'T13/18']) { const w = all.filter(x => x.k === k).map(x => x.d); console.log(`  ${k}: n ${w.length} mediana ${(q(w, .5) * 100).toFixed(0)} % p90 ${(q(w, .9) * 100).toFixed(0)} %`) }
// classificação (T21: alto ≤1:100, intermediário ≤1:1000): concordância
const cls = r => r <= 100 ? 'alto' : r <= 1000 ? 'inter' : 'baixo'
const t21 = all.filter(x => x.k === 'T21'); const dis = t21.filter(x => cls(x.app) !== cls(Math.round(x.loc)))
console.log(`classificação T21 (1:100 / 1:1000): ${t21.length - dis.length}/${t21.length} concordam; divergentes: ${dis.map(x => `${x.id} app ${x.app} loc ${Math.round(x.loc)}`).join('; ')}`)
console.log('piores 12:'); for (const x of [...all].sort((a, b) => b.d - a.d).slice(0, 12)) console.log(`  ${x.lote}:${x.id} ${x.k} app 1:${x.app} local 1:${Math.round(x.loc)} (${(x.d * 100).toFixed(0)} %)`)
