// Ajuste conjunto (FCF, bioquímica T13/18, osso nasal, tricúspide) contra todos os lotes do driver.
// Replica o pipeline do motor com parâmetros sobrescrevíveis; NT e prior vêm do próprio motor.
import { readFileSync, writeFileSync } from 'node:fs'
import { calcularTrissomias, computeFmfNtLikelihoodRatios, crlToGaDays } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomy.ts'
import { NASAL_BONE, TRICUSPID, GAUSS_MEAN_T21, GAUSS_MEAN_T18, GAUSS_MEAN_T13, GAUSS_SD, GAUSS_COR, GAUSS_TRUNCATION } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomyParams.ts'
const EXAM = Date.UTC(2026, 8, 15)
const ageAt = dob => { const [m, d, y] = dob.split('/').map(Number); return (EXAM - Date.UTC(y, m - 1, d)) / (365.25 * 86400000) }
const ETN = { 'White': 'white', 'Black': 'black', 'South Asian': 'south_asian', 'East Asian': 'east_asian' }
const LOTES = ['tri-matrix', 'tri-b40', 'tri2', 'tri3', 'tri4', 'tri5', 'tri6', 'tri7', 'tri-09-12']
const odds = N => (1 / N) / (1 - 1 / N)
// ---------- pontos ----------
const pts = []
for (const b of LOTES) {
  let cases, res; try { cases = Object.fromEntries(JSON.parse(readFileSync(`cases-${b}.json`, 'utf8')).map(c => [c.id, c])); res = JSON.parse(readFileSync(`results-${b}.json`, 'utf8')) } catch { continue }
  for (const r of res) {
    const c = cases[r.id]; if (!c || r.error || r.calcPending || r.suspect || !r.t21 || !r.prior21) continue
    if (b === 'tri2' && /^(B40|G-)/.test(r.id)) continue // B40 do tri2 tinha vazamentos (refeito em tri-b40/R40); G- só NT (já ajustado)
    const t = c.tri, m = c.maternal
    if (t.dvpi != null) continue // DV PI fora deste ajuste
    const input = { maternalAge: ageAt(m.dob), crl: t.crl, nt: t.nt, ethnicity: ETN[m.ethnicity] ?? 'mixed', weight: m.weight, smoking: !!m.smoking, previousT21: !!t.previousT21, isMoMCorrected: true }
    const o = calcularTrissomias(input)
    const p21 = o.basal.t21.probability, p18 = o.basal.t18.probability, p13 = o.basal.t13.probability
    const ntLR = computeFmfNtLikelihoodRatios(t.nt, t.crl)
    pts.push({ id: `${b}:${r.id}`, lote: b, crl: t.crl, ga: (m.gaWeeks ?? 12) * 7 + (m.gaDays ?? 3), nt: t.nt, fhr: t.fhr, nb: t.nasalBone === 'Absent' ? true : t.nasalBone === 'Present' ? false : undefined, tr: t.tricuspid === 'Yes' ? true : undefined, pappa: t.pappaMom, hcg: t.freeBhcgMom, eth: input.ethnicity, smoking: input.smoking, weight: m.weight ?? 69,
      prior: { u: 1 - p21 - p18 - p13, t21: p21, t18: p18, t13: p13 }, ntLR,
      app21: r.t21 > 2 && r.t21 < 10000 ? r.t21 : null, app1813: r.t18t13 > 2 && r.t18t13 < 10000 ? r.t18t13 : null })
  }
}
console.log('pontos:', pts.length, 'por lote:', Object.entries(pts.reduce((a, p) => (a[p.lote] = (a[p.lote] ?? 0) + 1, a), {})).map(([k, v]) => `${k} ${v}`).join(', '))
// ---------- modelo ----------
const dnorm = (x, mu, sd) => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))
const sig = x => 1 / (1 + Math.exp(-x))
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
function dmvnorm(x, S) { const n = x.length; if (n === 1) return dnorm(x[0], 0, Math.sqrt(S[0][0]))
  if (n === 2) { const det = S[0][0] * S[1][1] - S[0][1] * S[1][0]; const q = (S[1][1] * x[0] * x[0] - 2 * S[0][1] * x[0] * x[1] + S[0][0] * x[1] * x[1]) / det; return Math.exp(-0.5 * q) / (2 * Math.PI * Math.sqrt(det)) }
  // 3D: inversa por cofatores
  const [[a, b, c], [d, e, f], [g, h, i]] = S; const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  const inv = [[(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det], [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det], [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]]
  let q = 0; for (let r = 0; r < 3; r++) for (let s = 0; s < 3; s++) q += x[r] * inv[r][s] * x[s]; return Math.exp(-0.5 * q) / Math.pow(2 * Math.PI, 1.5) / Math.sqrt(det) }
const buildCov = (sd, cor) => sd.map((si, i) => sd.map((sj, j) => si * sj * cor[i][j]))
const expectedFhr = ga => 265.98 - 1.7631 * ga + 0.0064445 * ga * ga
const P0 = {
  // FCF
  fhrCapAbs: 1000, fhrShift: 0, fhrLo: GAUSS_TRUNCATION.fhr.lower, fhrHi: GAUSS_TRUNCATION.fhr.upper, fhrSdUn: GAUSS_SD.un[2], fhrMu21: GAUSS_MEAN_T21.fhr.b0, fhrSd21: GAUSS_SD.t21[2], fhrMu18: GAUSS_MEAN_T18.fhr.b0, fhrSd18: GAUSS_SD.t18[2], fhrMu13b0: GAUSS_MEAN_T13.fhr.b0, fhrMu13b1: GAUSS_MEAN_T13.fhr.b1, fhrSd13: GAUSS_SD.t13[2],
  // bioquímica T18/T13 (médias log10 MoM; SD escala)
  hcg18: GAUSS_MEAN_T18.fbhcgT1.b0, pappa18: GAUSS_MEAN_T18.pappa.b0, hcg13: GAUSS_MEAN_T13.fbhcgT1.b0, pappa13: GAUSS_MEAN_T13.pappa.b0, sdScale18: 1, sdScale13: 1,
  // osso nasal / tricúspide
  nbConst: NASAL_BONE.constant, nbNt: NASAL_BONE.nt, nbCrl: NASAL_BONE.crl, nbT21: NASAL_BONE.t21, nbT18: NASAL_BONE.t18,
  trInt: TRICUSPID.intercept, trNt: TRICUSPID.nt, trT21: TRICUSPID.t21, trT18: TRICUSPID.t18, trT13: TRICUSPID.t13, nbT13: NASAL_BONE.t13,
  lrMin: 0.052, bioFloor: 0.0001, bioCap: 10000,
}
function markerLR(P, p) {
  let l21 = p.ntLR.t21, l18 = p.ntLR.t18, l13 = p.ntLR.t13
  const hasBio = p.hcg != null || p.pappa != null, hasFhr = p.fhr != null
  if (hasBio || hasFhr) {
    const gaDiff = p.ga - 77; const mean = m => m.b0 + m.b1 * gaDiff + m.b2 * gaDiff * 2
    const vals = [], sdU = [], sd21 = [], sd18 = [], sd13 = [], mu21 = [], mu18 = [], mu13 = [], idx = []
    if (p.hcg != null) { const tl = GAUSS_TRUNCATION.fbhcgT1; vals.push(Math.log10(clamp(p.hcg, tl.lower, tl.upper))); sdU.push(GAUSS_SD.un[0]); sd21.push(GAUSS_SD.t21[0]); sd18.push(GAUSS_SD.t18[0] * P.sdScale18); sd13.push(GAUSS_SD.t13[0] * P.sdScale13); mu21.push(mean(GAUSS_MEAN_T21.fbhcgT1)); mu18.push(P.hcg18); mu13.push(P.hcg13); idx.push(0) }
    if (p.pappa != null) { const tl = GAUSS_TRUNCATION.pappa; vals.push(Math.log10(clamp(p.pappa, tl.lower, tl.upper))); sdU.push(GAUSS_SD.un[1]); sd21.push(GAUSS_SD.t21[1]); sd18.push(GAUSS_SD.t18[1] * P.sdScale18); sd13.push(GAUSS_SD.t13[1] * P.sdScale13); mu21.push(mean(GAUSS_MEAN_T21.pappa)); mu18.push(P.pappa18); mu13.push(P.pappa13); idx.push(1) }
    if (hasFhr) { const d = clamp(Math.min(p.fhr, P.fhrCapAbs) - (expectedFhr(p.ga) + P.fhrShift), P.fhrLo, P.fhrHi); vals.push(d); sdU.push(P.fhrSdUn); sd21.push(P.fhrSd21); sd18.push(P.fhrSd18); sd13.push(P.fhrSd13); mu21.push(P.fhrMu21); mu18.push(P.fhrMu18); mu13.push(P.fhrMu13b0 + P.fhrMu13b1 * gaDiff); idx.push(2) }
    const sub = cor => idx.map(i => idx.map(j => cor[i][j]))
    const lu = dmvnorm(vals, buildCov(sdU, sub(GAUSS_COR.un)))
    const f = (mu, sd, cor) => dmvnorm(vals.map((v, i) => v - mu[i]), buildCov(sd, sub(cor))) / lu
    l21 *= clamp(f(mu21, sd21, GAUSS_COR.t21), P.bioFloor, P.bioCap); l18 *= clamp(f(mu18, sd18, GAUSS_COR.t18), P.bioFloor, P.bioCap); l13 *= clamp(f(mu13, sd13, GAUSS_COR.t13), P.bioFloor, P.bioCap)
  }
  if (p.tr === true) { const lpUn = P.trInt + P.trNt * p.nt + TRICUSPID.smoker * (p.smoking ? 1 : 0) + TRICUSPID.weight * p.weight; const g = c => sig(lpUn + c) / sig(lpUn); l21 *= g(P.trT21); l18 *= g(P.trT18); l13 *= g(P.trT13) }
  if (p.nb !== undefined) { const nb = p.nb ? 0 : 1; const eth = p.eth === 'black' ? NASAL_BONE.black : p.eth === 'south_asian' ? NASAL_BONE.asian : p.eth === 'east_asian' ? NASAL_BONE.oriental : p.eth === 'mixed' ? NASAL_BONE.mixed : 0
    const lpUn = P.nbConst + NASAL_BONE.sm * (p.smoking ? 1 : 0) + P.nbNt * p.nt + P.nbCrl * p.crl + NASAL_BONE.pLmom * Math.log10(p.pappa ?? 1) + NASAL_BONE.fLmom * Math.log10(p.hcg ?? 1) + eth
    const g = c => { const pu = sig(lpUn), pa = sig(lpUn + c); return (pa ** (1 - nb) * (1 - pa) ** nb) / (pu ** (1 - nb) * (1 - pu) ** nb) }
    l21 *= g(P.nbT21); l18 *= g(P.nbT18); l13 *= g(P.nbT13) }
  return { t21: Math.max(l21, P.lrMin), t18: Math.max(l18, P.lrMin), t13: Math.max(l13, P.lrMin) }
}
function posterior(P, p) { const l = markerLR(P, p); const a = p.prior.t21 * l.t21, b = p.prior.t18 * l.t18, c = p.prior.t13 * l.t13; const tot = p.prior.u + a + b + c; return { r21: a / tot, r1813: (b + c) / tot } }
function resid(P, p) { const q = posterior(P, p); const out = []; if (p.app21) out.push(Math.log(q.r21 / (1 - q.r21)) - Math.log(odds(p.app21))); if (p.app1813) out.push(Math.log(q.r1813 / (1 - q.r1813)) - Math.log(odds(p.app1813))); return out }
const rmsOf = (P, sel) => { let s = 0, n = 0; for (const p of sel) for (const r of resid(P, p)) { s += r * r; n++ } return Math.sqrt(s / Math.max(n, 1)) }
function nm(f, x0, step, iters) { let simplex = [x0, ...x0.map((_, i) => x0.map((v, j) => v + (i === j ? step[j] : 0)))]; let vals = simplex.map(f); const n = x0.length
  for (let it = 0; it < iters; it++) { const idx = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]); simplex = idx.map(i => simplex[i]); vals = idx.map(i => vals[i]); const cen = Array(n).fill(0).map((_, j) => simplex.slice(0, n).reduce((s, v) => s + v[j], 0) / n); const w = simplex[n]
    const xr = cen.map((c, j) => c + (c - w[j])); const fr = f(xr)
    if (fr < vals[0]) { const xe = cen.map((c, j) => c + 2 * (c - w[j])); const fe = f(xe); if (fe < fr) { simplex[n] = xe; vals[n] = fe } else { simplex[n] = xr; vals[n] = fr } }
    else if (fr < vals[n - 1]) { simplex[n] = xr; vals[n] = fr }
    else { const xc = cen.map((c, j) => c + 0.5 * (w[j] - c)); const fc = f(xc); if (fc < vals[n]) { simplex[n] = xc; vals[n] = fc } else { for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j])); vals[i] = f(simplex[i]) } } } }
  const i = vals.indexOf(Math.min(...vals)); return { x: simplex[i], f: vals[i] } }
function fitBlock(P, keys, steps, sel, rounds = 4, iters = 3000, bounds = {}) {
  const loss = x => { const Q = { ...P }; keys.forEach((k, i) => Q[k] = x[i]); for (const k of keys) if (bounds[k] && (Q[k] < bounds[k][0] || Q[k] > bounds[k][1])) return 1e9; return rmsOf(Q, sel) ** 2 }
  let best = { x: keys.map(k => P[k]), f: loss(keys.map(k => P[k])) }
  for (let r = 0; r < rounds; r++) { const o = nm(loss, best.x, steps.map(s => s / (r + 1)), iters); if (o.f < best.f) best = o }
  const Q = { ...P }; keys.forEach((k, i) => Q[k] = best.x[i]); return Q
}
const show = (P, sel, label) => console.log(`${label}: n=${sel.length} rms log-odds ${rmsOf(P, sel).toFixed(4)}`)
// ---------- blocos ----------
let P = { ...P0 }
const selFhr = pts.filter(p => p.fhr != null && p.nb === undefined && !p.tr && p.hcg == null)
const selBio = pts.filter(p => (p.hcg != null || p.pappa != null) && p.fhr == null && p.nb === undefined && !p.tr)
const selNbTr = pts.filter(p => (p.nb !== undefined || p.tr) && p.fhr == null)
const selAll = pts
show(P, selFhr, 'FCF local'); show(P, selBio, 'bio local'); show(P, selNbTr, 'NB/TR local'); show(P, selAll, 'TOTAL local')
if (selFhr.length) { P = fitBlock(P, ['fhrShift', 'fhrLo', 'fhrHi', 'fhrMu21', 'fhrSd21', 'fhrMu18', 'fhrSd18', 'fhrMu13b0', 'fhrMu13b1', 'fhrSd13'], [2, 2, 3, 1, 1, 1, 1, 2, 0.1, 1], selFhr, 6, 4000, { fhrMu13b1: [-0.6, -0.2], fhrSd21: [3, 15], fhrSd18: [3, 15], fhrSd13: [3, 15], fhrLo: [-6.5, -5.5], fhrHi: [17, 20], fhrShift: [-15, 15] }); show(P, selFhr, 'FCF ajustada') }
if (selBio.length) { P = { ...P, bioFloor: 0.05 }; P = fitBlock(P, ['hcg18', 'pappa18', 'hcg13', 'pappa13', 'sdScale18', 'sdScale13', 'bioFloor', 'lrMin'], [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.01, 0.005], selBio, 5, 4000, { sdScale18: [0.5, 2.5], sdScale13: [0.5, 2.5], bioFloor: [0.0001, 0.2], lrMin: [0.01, 0.12] }); show(P, selBio, 'bio ajustada') }
if (selNbTr.length) { P = fitBlock(P, ['nbConst', 'nbNt', 'nbCrl', 'nbT21', 'nbT18', 'nbT13', 'trInt', 'trNt', 'trT21', 'trT18', 'trT13'], [0.3, 0.1, 0.02, 0.3, 0.3, 0.3, 0.5, 0.2, 0.3, 0.3, 0.3], selNbTr, 5, 4000, { trInt: [-14, 0], trNt: [0, 4], nbNt: [0, 3], nbT21: [0, 8], nbT18: [0, 8], nbT13: [0, 8], trT21: [0, 8], trT18: [0, 8], trT13: [0, 8] }); show(P, selNbTr, 'NB/TR ajustados') }
show(P, selAll, 'TOTAL após blocos')
// polimento conjunto leve
P = fitBlock(P, ['hcg18', 'pappa18', 'hcg13', 'pappa13', 'nbConst', 'nbT21', 'nbT18', 'trInt', 'trT21', 'trT18', 'trT13', 'nbT13', 'lrMin', 'bioFloor'], [0.05, 0.05, 0.05, 0.05, 0.1, 0.1, 0.1, 0.2, 0.1, 0.1, 0.1, 0.1, 0.005, 0.005], selAll, 3, 3000, { bioFloor: [0.0001, 0.2], lrMin: [0.02, 0.12], trT13: [0, 8], nbT13: [0, 8], trInt: [-14, 0], trT21: [0, 8], trT18: [0, 8], nbT21: [0, 8], nbT18: [0, 8] })
show(P, selAll, 'TOTAL polido')
console.log(JSON.stringify(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, Number(v.toFixed(6))]))))
// piores resíduos
const rows = pts.map(p => { const q = posterior(P, p); return { id: p.id, app21: p.app21, loc21: p.app21 ? Math.round(1 / q.r21) : '', app1813: p.app1813, loc1813: p.app1813 ? Math.round(1 / q.r1813) : '', d: Math.max(...resid(P, p).map(Math.abs), 0) } }).sort((a, b) => b.d - a.d)
console.log('piores 25:'); for (const r of rows.slice(0, 25)) console.log(`  ${r.id.padEnd(34)} T21 ${r.app21 ?? '-'}/${r.loc21}  13/18 ${r.app1813 ?? '-'}/${r.loc1813}  |Δlog| ${r.d.toFixed(2)}`)
const dv = rows.map(r => r.d).sort((a, b) => a - b); console.log(`|Δlog-odds| mediana ${dv[Math.floor(dv.length / 2)].toFixed(3)} p90 ${dv[Math.floor(dv.length * 0.9)].toFixed(3)} (≈ desvio relativo ${(Math.exp(dv[Math.floor(dv.length / 2)]) - 1).toFixed(2)} / ${(Math.exp(dv[Math.floor(dv.length * 0.9)]) - 1).toFixed(2)})`)
writeFileSync('joint-fit.json', JSON.stringify(P, null, 1))
if (process.env.PRINT_FHR) { const Pl = { ...P0, fhrCapAbs: 1000 }; console.log('FCF: id | app T21 / fit / local(Kagan) | app 13/18 / fit / local'); for (const p of selFhr.sort((a, b) => a.crl - b.crl || a.fhr - b.fhr)) { const qf = posterior(P, p), ql = posterior(Pl, p); console.log(`  ${p.id.padEnd(30)} ${p.app21 ?? '-'} / ${p.app21 ? Math.round(1 / qf.r21) : '-'} / ${p.app21 ? Math.round(1 / ql.r21) : '-'} | ${p.app1813 ?? '-'} / ${p.app1813 ? Math.round(1 / qf.r1813) : '-'} / ${p.app1813 ? Math.round(1 / ql.r1813) : '-'}`) } }
