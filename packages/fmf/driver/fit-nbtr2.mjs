import { readFileSync, writeFileSync } from 'node:fs'
import { NASAL_BONE, TRICUSPID } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomyParams.ts'
import { crlToGaDays } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomy.ts'
const cases = Object.fromEntries(JSON.parse(readFileSync('cases-tri3.json', 'utf8')).map(c => [c.id, c]))
const res = Object.fromEntries(JSON.parse(readFileSync('results-tri3.json', 'utf8')).filter(r => r.t21 && r.prior21).map(r => [r.id, r]))
const odds = N => (1 / N) / (1 - 1 / N)
const app = r => ({ t21: odds(r.t21) / odds(r.prior21), t1813: odds(r.t18t13) / odds(r.prior18t13), capHi: r.t21 <= 2 || r.t18t13 <= 2, capLo: r.t21 >= 10000 || r.t18t13 >= 10000 })
const w = crl => { const ga = crlToGaDays(crl); const rp18 = -0.142396674 + 63.5954883 / ga, rp13 = -0.032203267 + 19.09501251 / ga; return { w18: rp18 / (rp18 + rp13), w13: rp13 / (rp18 + rp13) } }
// pontos: LR do marcador = LR(total)/LR(base) — só onde nem base nem caso estão capados
const pts = []
for (const crl of [45, 60, 84]) for (const nt of [1.2, 1.8, 2.5, 3.5]) { const b = res[`NB-crl${crl}-nt${nt}-base`]; const ab = app(b); for (const [tag, id] of [['abs', `NB-crl${crl}-nt${nt}-absent`], ['pres', `NB-crl${crl}-nt${nt}-present`], ['tr', `TR-crl${crl}-nt${nt}-yes`]]) { const r = res[id]; const a = app(r); if (a.capHi || a.capLo || ab.capHi || ab.capLo) continue; pts.push({ tag, nt, crl, lr21: a.t21 / ab.t21, lr1813: a.t1813 / ab.t1813, ...w(crl) }) } }
console.log('pontos não capados:', pts.length, pts.map(p => p.tag).join(','))
const sig = x => 1 / (1 + Math.exp(-x))
function nbLR(P, absent, nt, crl) { const nb = absent ? 0 : 1; const lpUn = P.constant + P.nt * nt + P.crl * crl; const f = coeff => { const pUn = sig(lpUn), pAff = sig(lpUn + coeff); const likUn = pUn ** (1 - nb) * (1 - pUn) ** nb, likAff = pAff ** (1 - nb) * (1 - pAff) ** nb; return likAff / likUn }; return { t21: f(P.t21), t18: f(P.t18), t13: f(P.t13 ?? P.t18) } }
function trLR(P, nt) { const lpUn = P.intercept + P.nt * nt + P.weight * 69; const f = coeff => sig(lpUn + coeff) / sig(lpUn); return { t21: f(P.t21), t18: f(P.t18), t13: f(P.t13) } }
function nm(f, x0, step, iters) { let simplex = [x0, ...x0.map((_, i) => x0.map((v, j) => v + (i === j ? step[j] : 0)))]; let vals = simplex.map(f); const n = x0.length; for (let it = 0; it < iters; it++) { const idx = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]); simplex = idx.map(i => simplex[i]); vals = idx.map(i => vals[i]); const c = Array(n).fill(0).map((_, j) => simplex.slice(0, n).reduce((s, x) => s + x[j], 0) / n); const xr = c.map((v, j) => v + (v - simplex[n][j])); const fr = f(xr); if (fr < vals[0]) { const xe = c.map((v, j) => v + 2 * (v - simplex[n][j])); const fe = f(xe); if (fe < fr) { simplex[n] = xe; vals[n] = fe } else { simplex[n] = xr; vals[n] = fr } } else if (fr < vals[n - 1]) { simplex[n] = xr; vals[n] = fr } else { const xc = c.map((v, j) => v + 0.5 * (simplex[n][j] - v)); const fc = f(xc); if (fc < vals[n]) { simplex[n] = xc; vals[n] = fc } else { for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j])); vals[i] = f(simplex[i]) } } } } const b = vals.indexOf(Math.min(...vals)); return { x: simplex[b], f: vals[b] } }
// --- osso nasal: fit constant, nt, crl, t21, t18(=t13)
const nbPts = pts.filter(p => p.tag !== 'tr')
const nbLoss = ([constant, ntc, crlc, t21, t18]) => { const P = { constant, nt: ntc, crl: crlc, t21, t18, t13: t18 }; let s = 0; for (const p of nbPts) { const l = nbLR(P, p.tag === 'abs', p.nt, p.crl); s += (Math.log(l.t21) - Math.log(p.lr21)) ** 2 + (Math.log(p.w18 * l.t18 + p.w13 * l.t13) - Math.log(p.lr1813)) ** 2 } return s / (2 * nbPts.length) }
const nb0 = [NASAL_BONE.constant, NASAL_BONE.nt, NASAL_BONE.crl, NASAL_BONE.t21, NASAL_BONE.t18]
console.log('NB local rms', Math.sqrt(nbLoss(nb0)).toFixed(3))
let nbBest = { x: nb0, f: nbLoss(nb0) }; for (let r = 0; r < 4; r++) { const o = nm(nbLoss, nbBest.x, [0.3, 0.1, 0.02, 0.3, 0.3].map(s => s / (r + 1)), 4000); if (o.f < nbBest.f) nbBest = o }
console.log('NB ajuste: constant', nbBest.x[0].toFixed(4), 'nt', nbBest.x[1].toFixed(4), 'crl', nbBest.x[2].toFixed(5), 't21', nbBest.x[3].toFixed(4), 't18=t13', nbBest.x[4].toFixed(4), '| rms', Math.sqrt(nbBest.f).toFixed(3))
const PN = { constant: nbBest.x[0], nt: nbBest.x[1], crl: nbBest.x[2], t21: nbBest.x[3], t18: nbBest.x[4], t13: nbBest.x[4] }
for (const p of nbPts) { const l = nbLR(PN, p.tag === 'abs', p.nt, p.crl); console.log(`  NB ${p.tag} NT ${p.nt} CRL ${p.crl}: app T21 ${p.lr21.toFixed(2)} fit ${l.t21.toFixed(2)} | 13/18 app ${p.lr1813.toFixed(2)} fit ${(p.w18 * l.t18 + p.w13 * l.t13).toFixed(2)}`) }
// --- tricúspide "sim": fit intercept, nt, t21, t18, t13 (peso fixo 69); "não" → LR 1 no app
const trPts = pts.filter(p => p.tag === 'tr')
const trLoss = ([intercept, ntc, t21, t18, t13]) => { const P = { intercept, nt: ntc, weight: TRICUSPID.weight, t21, t18, t13 }; let s = 0; for (const p of trPts) { const l = trLR(P, p.nt); s += (Math.log(l.t21) - Math.log(p.lr21)) ** 2 + (Math.log(p.w18 * l.t18 + p.w13 * l.t13) - Math.log(p.lr1813)) ** 2 } return s / (2 * trPts.length) }
const tr0 = [TRICUSPID.intercept, TRICUSPID.nt, TRICUSPID.t21, TRICUSPID.t18, TRICUSPID.t13]
console.log('TR local rms', Math.sqrt(trLoss(tr0)).toFixed(3))
let trBest = { x: tr0, f: trLoss(tr0) }; for (let r = 0; r < 4; r++) { const o = nm(trLoss, trBest.x, [0.3, 0.1, 0.3, 0.3, 0.3].map(s => s / (r + 1)), 4000); if (o.f < trBest.f) trBest = o }
console.log('TR ajuste: intercept', trBest.x[0].toFixed(4), 'nt', trBest.x[1].toFixed(4), 't21', trBest.x[2].toFixed(4), 't18', trBest.x[3].toFixed(4), 't13', trBest.x[4].toFixed(4), '| rms', Math.sqrt(trBest.f).toFixed(3))
const PT = { intercept: trBest.x[0], nt: trBest.x[1], weight: TRICUSPID.weight, t21: trBest.x[2], t18: trBest.x[3], t13: trBest.x[4] }
for (const p of trPts) { const l = trLR(PT, p.nt); console.log(`  TR sim NT ${p.nt} CRL ${p.crl}: app T21 ${p.lr21.toFixed(2)} fit ${l.t21.toFixed(2)} | 13/18 app ${p.lr1813.toFixed(2)} fit ${(p.w18 * l.t18 + p.w13 * l.t13).toFixed(2)}`) }
writeFileSync('nbtr-fit.json', JSON.stringify({ nb: PN, tr: PT, nbRms: Math.sqrt(nbBest.f), trRms: Math.sqrt(trBest.f) }, null, 1))
