// Uso: tsx compare-tri.mjs cases.json results.json — app × motor local de trissomias
import { readFileSync } from 'node:fs'
import { calcularTrissomias, crlToGaDays } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomy.ts'
const [,, cf, rf] = process.argv
const cases = Object.fromEntries(JSON.parse(readFileSync(cf, 'utf8')).map(c => [c.id, c]))
const results = JSON.parse(readFileSync(rf, 'utf8'))
const EXAM = Date.UTC(2026, 8, 15)
const ageAt = (dob, at) => { const [m, d, y] = dob.split('/').map(Number); return (at - Date.UTC(y, m - 1, d)) / (365.25 * 86400000) }
const ETN = { 'White': 'white', 'Black': 'black', 'South Asian': 'south_asian', 'East Asian': 'east_asian' }
const rows = []
for (const r of results) {
  const c = cases[r.id]; if (!c || r.error || r.suspect || r.calcPending) { rows.push({ id: r.id, erro: r.error ?? 'sem caso' }); continue }
  const t = c.tri, m = c.maternal
  const gaDays = crlToGaDays(t.crl)
  const ageExam = ageAt(m.dob, EXAM)
  const inp = { maternalAge: ageExam, gaDaysDated: (m.gaWeeks ?? 12) * 7 + (m.gaDays ?? 3), crl: t.crl, nt: t.nt, freeBetaHcgMoM: t.freeBhcgMom, pappaMoM: t.pappaMom, dvPI: t.dvpi, fhr: t.fhr, tricuspidRegurgitation: t.tricuspid === 'Yes' ? true : t.tricuspid === 'No' ? false : undefined, nasalBoneAbsent: t.nasalBone === 'Absent' ? true : t.nasalBone === 'Present' ? false : undefined, smoking: !!m.smoking, ethnicity: ETN[m.ethnicity] ?? 'mixed', weight: m.weight, previousT21: !!t.previousT21, previousT18: !!t.previousT18, previousT13: !!t.previousT13, isMoMCorrected: true }
  let loc
  try { const o = calcularTrissomias(inp); loc = { t21: o.t21.ratio, t18: o.t18.ratio, t13: o.t13.ratio, p21: o.basal.t21.ratio, p18: o.basal.t18.ratio, p13: o.basal.t13.ratio, t1813: 1 / (o.t18.probability + o.t13.probability), p1813: 1 / (o.basal.t18.probability + o.basal.t13.probability) } } catch (e) { loc = { erro: e.message.slice(0, 40) } }
  const dev = (a, b) => (a && b) ? ((b / a - 1) * 100).toFixed(0) + '%' : ''
  rows.push({ id: r.id, idade: ageExam.toFixed(1), 'prior21 app/loc': `${r.prior21}/${loc.p21 ? Math.round(loc.p21) : loc.erro}`, dP21: dev(r.prior21, loc.p21), 'prior1813 app/loc': `${r.prior18t13}/${loc.p1813 ? Math.round(loc.p1813) : ''}`, 'T21 app/loc': `${r.t21}/${loc.t21 ? Math.round(loc.t21) : ''}`, dT21: dev(r.t21, loc.t21), 'T1813 app/loc': `${r.t18t13}/${loc.t1813 ? Math.round(loc.t1813) : ''}`, dT1813: dev(r.t18t13, loc.t1813) })
}
console.table(rows)
