// LR implícita do app para osso nasal (ausente/presente) e tricúspide (sim) em 12 combos NT×CRL, vs local
import { readFileSync } from 'node:fs'
import { calcularTrissomias } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomy.ts'
const cases = Object.fromEntries(JSON.parse(readFileSync('cases-tri3.json', 'utf8')).map(c => [c.id, c]))
const res = Object.fromEntries(JSON.parse(readFileSync('results-tri3.json', 'utf8')).filter(r => r.t21 && r.prior21).map(r => [r.id, r]))
const EXAM = Date.UTC(2026, 8, 15); const ageAt = dob => { const [m, d, y] = dob.split('/').map(Number); return (EXAM - Date.UTC(y, m - 1, d)) / (365.25 * 86400000) }
const odds = N => (1 / N) / (1 - 1 / N)
const ETN = { 'White': 'white', 'Black': 'black', 'South Asian': 'south_asian', 'East Asian': 'east_asian' }
const local = (c) => { const t = c.tri, m = c.maternal; const o = calcularTrissomias({ maternalAge: ageAt(m.dob), crl: t.crl, nt: t.nt, fhr: t.fhr, tricuspidRegurgitation: t.tricuspid === 'Yes' ? true : t.tricuspid === 'No' ? false : undefined, nasalBoneAbsent: t.nasalBone === 'Absent' ? true : t.nasalBone === 'Present' ? false : undefined, weight: m.weight, ethnicity: ETN[m.ethnicity] ?? 'mixed', isMoMCorrected: true }); return { t21: o.t21.probability / (1 - o.t21.probability) / (o.basal.t21.probability / (1 - o.basal.t21.probability)), t1813: ((o.t18.probability + o.t13.probability) / (1 - o.t18.probability - o.t13.probability)) / ((o.basal.t18.probability + o.basal.t13.probability) / (1 - o.basal.t18.probability - o.basal.t13.probability)) } }
const app = r => ({ t21: odds(r.t21) / odds(r.prior21), t1813: odds(r.t18t13) / odds(r.prior18t13), cap: r.t21 >= 10000 || r.t18t13 >= 10000 })
console.log('marcador (NT, CRL) → LR app / LR local  [T21 | T13/18]')
const rows = []
for (const crl of [45, 60, 84]) for (const nt of [1.2, 1.8, 2.5, 3.5]) {
  const b = res[`NB-crl${crl}-nt${nt}-base`]; if (!b) continue; const ab = app(b), lb = local(cases[`NB-crl${crl}-nt${nt}-base`])
  for (const [tag, id] of [['NB ausente', `NB-crl${crl}-nt${nt}-absent`], ['NB presente', `NB-crl${crl}-nt${nt}-present`], ['TR sim', `TR-crl${crl}-nt${nt}-yes`]]) {
    const r = res[id]; if (!r) continue; const a = app(r), l = local(cases[id])
    const row = { tag, nt, crl, app21: a.t21 / ab.t21, loc21: l.t21 / lb.t21, app1813: a.t1813 / ab.t1813, loc1813: l.t1813 / lb.t1813, cap: a.cap || ab.cap }
    rows.push(row); console.log(`${tag.padEnd(12)} NT ${nt} CRL ${crl}: T21 ${row.app21.toFixed(2)}/${row.loc21.toFixed(2)} (×${(row.app21 / row.loc21).toFixed(2)}) | 13/18 ${row.app1813.toFixed(2)}/${row.loc1813.toFixed(2)} (×${(row.app1813 / row.loc1813).toFixed(2)})${row.cap ? ' [cap]' : ''}`)
  }
}
for (const tag of ['NB ausente', 'NB presente', 'TR sim']) { const rs = rows.filter(r => r.tag === tag && !r.cap); const g = a => Math.exp(a.reduce((s, v) => s + Math.log(v), 0) / a.length); console.log(`${tag}: fator médio geométrico app/local — T21 ×${g(rs.map(r => r.app21 / r.loc21)).toFixed(2)} (min ${Math.min(...rs.map(r => r.app21 / r.loc21)).toFixed(2)} max ${Math.max(...rs.map(r => r.app21 / r.loc21)).toFixed(2)}) | 13/18 ×${g(rs.map(r => r.app1813 / r.loc1813)).toFixed(2)}`) }
for (const e of ['Black', 'SouthAsian', 'EastAsian']) { const r = res[`NB-etnia-${e}-absent`]; if (r) { const b = res['NB-crl60-nt1.8-base']; console.log(`NB ausente ${e}: LR app T21 ${(app(r).t21 / app(b).t21).toFixed(1)} | 13/18 ${(app(r).t1813 / app(b).t1813).toFixed(1)}  (branca: ${(app(res['NB-crl60-nt1.8-absent']).t21 / app(b).t21).toFixed(1)})`) } }
for (const id of ['FHR-crl60-nt1.8-100', 'FHR-crl60-nt1.8-170', 'FHR-crl60-nt1.8-175']) { const r = res[id]; if (r) { const b = res['NB-crl60-nt1.8-base']; const l = local(cases[id]), lb = local(cases['NB-crl60-nt1.8-base']); console.log(`${id}: LR app T21 ${(app(r).t21 / app(b).t21).toFixed(2)} local ${(l.t21 / lb.t21).toFixed(2)} | 13/18 app ${(app(r).t1813 / app(b).t1813).toFixed(2)} local ${(l.t1813 / lb.t1813).toFixed(2)}`) } }
