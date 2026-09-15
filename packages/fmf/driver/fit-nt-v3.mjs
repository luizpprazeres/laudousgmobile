// Ajuste conjunto do modelo de mistura da NT (euploide + T21 + T18 + T13) aos 96 LRs implícitos do app
import { readFileSync, writeFileSync } from 'node:fs'
import { NT_MIX, NT_TLIMITS } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomyParams.ts'
import { crlToGaDays } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomy.ts'
const cases = Object.fromEntries(JSON.parse(readFileSync('cases-tri2.json', 'utf8')).map(c => [c.id, c]))
const res = JSON.parse(readFileSync('results-tri2.json', 'utf8')).filter(r => /^G-/.test(r.id) && r.t21 && r.prior21)
const odds = N => (1 / N) / (1 - 1 / N)
// pesos p18/p13 do prior combinado (prevalências relativas de Snijders) para compor a LR 13/18
const w = crl => { const ga = crlToGaDays(crl); const rp18 = -0.142396674 + 63.5954883 / ga, rp13 = -0.032203267 + 19.09501251 / ga; return { w18: rp18 / (rp18 + rp13), w13: rp13 / (rp18 + rp13) } }
const pts = res.map(r => ({ nt: cases[r.id].tri.nt, crl: cases[r.id].tri.crl, lr21: odds(r.t21) / odds(r.prior21), lr1813: odds(r.t18t13) / odds(r.prior18t13), ...w(cases[r.id].tri.crl) }))
const dnorm = (x, mu, sd) => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))
const KEYS = ['tl45', 'tl60', 'tl75', 'tl84', 'a0', 'a1', 'b0', 'b1', 'b2', 'm1', 'sd', 'sdB', 'p21', 'm21', 'sdT21', 'p18', 'm18', 'sdT18', 'p13', 'm13', 'sdT13']
const toP = x => Object.fromEntries(KEYS.map((k, i) => [k, x[i]]))
const tlAt = (P, crl) => { const ks = [45, 60, 75, 84], vs = [P.tl45, P.tl60, P.tl75, P.tl84]; if (crl <= 45) return vs[0]; if (crl >= 84) return vs[3]; for (let i = 0; i < 3; i++) if (crl <= ks[i + 1]) return vs[i] + (vs[i + 1] - vs[i]) * (crl - ks[i]) / (ks[i + 1] - ks[i]) }
function lrs(P, nt, crl) {
  const logNt = Math.log10(nt); const crlR = Math.round(crl * 10) / 10
  const sr = Math.sqrt(P.sd ** 2 + NT_MIX.sdOp ** 2), sc = Math.sqrt(P.sdB ** 2 + NT_MIX.sdOp ** 2)
  const mr = P.b0 + P.b1 * crlR + P.b2 * crlR * crlR; const pu = 1 / (1 + Math.exp(-(P.a0 + P.a1 * crlR)))
  const likU = (1 - pu) * dnorm(logNt, mr, sr) + pu * dnorm(logNt, P.m1, sc)
  const tl = tlAt(P, crlR); const lt = Math.log10(tl)
  const one = (pA, mA, sA) => { const sd = Math.sqrt(sA ** 2 + NT_MIX.sdOp ** 2); let la = (1 - pA) * dnorm(logNt, mr, sr) + pA * dnorm(logNt, mA, sd); if (nt < tl) { const lat = (1 - pA) * dnorm(lt, mr, sr) + pA * dnorm(lt, mA, sd); const lut = (1 - pu) * dnorm(lt, mr, sr) + pu * dnorm(lt, P.m1, sc); la = (lat / lut) * likU } return likU > 0 ? la / likU : 1 }
  return { t21: one(P.p21, P.m21, P.sdT21), t18: one(P.p18, P.m18, P.sdT18), t13: one(P.p13, P.m13, P.sdT13) }
}
const loss = x => { const P = toP(x); for (const k of ['p21', 'p18', 'p13']) if (P[k] <= 0.2 || P[k] >= 0.9995) return 1e9; for (const k of ['tl45', 'tl60', 'tl75', 'tl84']) if (P[k] < 0.5 || P[k] > 2.5) return 1e9; for (const k of ['sd', 'sdB', 'sdT21', 'sdT18', 'sdT13']) if (P[k] <= 0.02 || P[k] > 0.7) return 1e9; let s = 0; for (const q of pts) { const l = lrs(P, q.nt, q.crl); if (!(l.t21 > 0 && l.t18 > 0 && l.t13 > 0)) return 1e9; const wq = (q.lr21 > 0.3 && q.lr21 < 30) ? 2 : 1; s += wq * (Math.log(l.t21) - Math.log(q.lr21)) ** 2; s += wq * (Math.log(q.w18 * l.t18 + q.w13 * l.t13) - Math.log(q.lr1813)) ** 2 } return s / (2 * pts.length) }
function nm(f, x0, step, iters) { let simplex = [x0, ...x0.map((_, i) => x0.map((v, j) => v + (i === j ? step[j] : 0)))]; let vals = simplex.map(f); const n = x0.length; for (let it = 0; it < iters; it++) { const idx = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]); simplex = idx.map(i => simplex[i]); vals = idx.map(i => vals[i]); const c = Array(n).fill(0).map((_, j) => simplex.slice(0, n).reduce((s, x) => s + x[j], 0) / n); const xr = c.map((v, j) => v + (v - simplex[n][j])); const fr = f(xr); if (fr < vals[0]) { const xe = c.map((v, j) => v + 2 * (v - simplex[n][j])); const fe = f(xe); if (fe < fr) { simplex[n] = xe; vals[n] = fe } else { simplex[n] = xr; vals[n] = fr } } else if (fr < vals[n - 1]) { simplex[n] = xr; vals[n] = fr } else { const xc = c.map((v, j) => v + 0.5 * (simplex[n][j] - v)); const fc = f(xc); if (fc < vals[n]) { simplex[n] = xc; vals[n] = fc } else { for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j])); vals[i] = f(simplex[i]) } } } } const b = vals.indexOf(Math.min(...vals)); return { x: simplex[b], f: vals[b] } }
const PREV = JSON.parse(readFileSync('nt-mix-fit.json', 'utf8')).params; const TL0 = { tl45: 1.01, tl60: 1.43, tl75: 1.75, tl84: 1.78 }; const x0 = KEYS.map(k => k in TL0 ? TL0[k] : PREV[k]); const step = KEYS.map(k => /^tl/.test(k) ? 0.05 : /^p/.test(k) ? 0.02 : /^sd/.test(k) ? 0.02 : k === 'a0' ? 0.2 : k === 'a1' ? 0.01 : k === 'b1' ? 0.005 : k === 'b2' ? 0.00005 : 0.05)
console.log('local: rms log-LR', Math.sqrt(loss(x0)).toFixed(3))
let best = { x: x0, f: loss(x0) }
for (let round = 0; round < 6; round++) { const r = nm(loss, best.x, step.map(s => s / (1 + round)), 5000); if (r.f < best.f) best = r; console.log(`  rodada ${round}: rms ${Math.sqrt(best.f).toFixed(4)}`) }
const P = toP(best.x); { let s2 = 0; for (const q of pts) { const l = lrs(P, q.nt, q.crl); s2 += (Math.log(l.t21) - Math.log(q.lr21)) ** 2 + (Math.log(q.w18 * l.t18 + q.w13 * l.t13) - Math.log(q.lr1813)) ** 2 } console.log('rms não ponderado:', Math.sqrt(s2 / (2 * pts.length)).toFixed(4)) } console.log('ajuste:', JSON.stringify(Object.fromEntries(KEYS.map(k => [k, Number(P[k].toFixed(5))]))))
for (const crl of [45, 60, 75, 84]) console.log(`T21  CRL ${crl}: ` + pts.filter(q => q.crl === crl).map(q => `${q.nt}:${(lrs(P, q.nt, q.crl).t21 / q.lr21).toFixed(2)}`).join(' '))
for (const crl of [45, 60, 75, 84]) console.log(`1318 CRL ${crl}: ` + pts.filter(q => q.crl === crl).map(q => { const l = lrs(P, q.nt, q.crl); return `${q.nt}:${((q.w18 * l.t18 + q.w13 * l.t13) / q.lr1813).toFixed(2)}` }).join(' '))
writeFileSync('nt-mix-fit-v3.json', JSON.stringify({ rms: Math.sqrt(best.f), params: Object.fromEntries(KEYS.map(k => [k, P[k]])) }, null, 1))
