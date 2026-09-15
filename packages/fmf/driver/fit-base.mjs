import { readFileSync } from 'node:fs'
import { pamDeAfericoes } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/preEclampsiaFmf.ts'
const load = (cf, rf) => { const cases = Object.fromEntries(JSON.parse(readFileSync(cf, 'utf8')).map(c => [c.id, c])); return JSON.parse(readFileSync(rf, 'utf8')).filter(r => r.riskN && r.mapMom).map(r => ({ r, c: cases[r.id] })) }
const all = [...load('cases-ages.json', 'results-ages.json'), ...load('cases-terms.json', 'results-terms.json'), ...load('cases-matrix.json', 'results-matrix.json')]
const isBase = ({ c }) => c.maternal.ethnicity === 'White' && !c.maternal.smoking && c.maternal.conception === 'Spontaneous' && c.pe.parity === 'nulliparous' && !c.pe.chronicHypertension && !c.pe.diabetes1 && !c.pe.diabetes2 && !c.pe.familyHistoryPE && !c.pe.sle && !c.pe.aps && c.pe.utpi
const pts = all.filter(isBase).map(({ r, c }) => { const pam = pamDeAfericoes(c.pe.bp.map(([s, d]) => ({ sistolica: s, diastolica: d }))).pamMmHg; const ip = (c.pe.utpi[0] + c.pe.utpi[1]) / 2; return { age: r.age - 35, ga: r.gaWeeks * 7 + r.gaDays - 77, wt: Math.min(c.maternal.weight, 120) - 69, ht: c.maternal.height - 164, yMap: Math.log10(pam / r.mapMom), yIp: Math.log10(ip / r.utpiMom), id: r.id } })
console.log('pontos-base:', pts.length)
// mínimos quadrados: y = A + b*age + c*ga + (termos publicados fixos de peso/altura/interações)
function lsq(rows, cols) { // resolve normal equations (pequeno)
  const n = cols.length; const M = Array.from({ length: n }, () => Array(n).fill(0)); const v = Array(n).fill(0)
  for (const [x, y] of rows) { for (let i = 0; i < n; i++) { v[i] += x[i] * y; for (let j = 0; j < n; j++) M[i][j] += x[i] * x[j] } }
  for (let i = 0; i < n; i++) { let p = M[i][i]; for (let j = 0; j < n; j++) M[i][j] /= p; v[i] /= p; for (let k = 0; k < n; k++) if (k !== i) { const f = M[k][i]; for (let j = 0; j < n; j++) M[k][j] -= f * M[i][j]; v[k] -= f * v[i] } }
  return v
}
// IP: fixos publicados: -0.000888890*wt + 0.000006006*wt² + 0.000008322*wt*ga + 0.000015061*age*ga
const ipRows = pts.map(p => [[1, p.age, p.ga], p.yIp - (-0.000888890 * p.wt + 0.000006006 * p.wt * p.wt + 0.000008322 * p.wt * p.ga + 0.000015061 * p.age * p.ga)])
const [A, b, c] = lsq(ipRows, ['A', 'age', 'ga'])
const res = ipRows.map(([x, y]) => y - (A + b * x[1] + c * x[2]))
console.log(`IP: A=${A.toFixed(6)} (pub 0.255731426) | age=${b.toExponential(4)} (pub −1.117349e-3) | ga=${c.toExponential(4)} (pub −4.407905e-3) | resíduo máx ${Math.max(...res.map(Math.abs)).toFixed(4)} (rounding ±0.0022)`)
// IP variante: só intercepto e idade livres, ga fixo no publicado
const ipRows2 = pts.map(p => [[1, p.age], p.yIp - (-0.004407905 * p.ga - 0.000888890 * p.wt + 0.000006006 * p.wt * p.wt + 0.000008322 * p.wt * p.ga + 0.000015061 * p.age * p.ga)])
const [A2, b2] = lsq(ipRows2, ['A', 'age']); const res2 = ipRows2.map(([x, y]) => y - (A2 + b2 * x[1]))
console.log(`IP (ga fixo): A=${A2.toFixed(6)} | age=${b2.toExponential(4)} | resíduo máx ${Math.max(...res2.map(Math.abs)).toFixed(4)}`)
// MAP: fixos publicados: 0.000209037*ga − 0.000020452*ga² + 0.001193313*wt − 0.000008823*wt² − 0.000206306*ht ; livres: A, age
const mapRows = pts.map(p => [[1, p.age], p.yMap - (0.000209037 * p.ga - 0.000020452 * p.ga * p.ga + 0.001193313 * p.wt - 0.000008823 * p.wt * p.wt - 0.000206306 * p.ht)])
const [Am, bm] = lsq(mapRows, ['A', 'age']); const resm = mapRows.map(([x, y]) => y - (Am + bm * x[1]))
console.log(`MAP: A=${Am.toFixed(6)} (pub 1.943223919; local atual 1.943223919−0.003568=1.939656) | age=${bm.toExponential(4)} (pub +4.39271e-4) | resíduo máx ${Math.max(...resm.map(Math.abs)).toFixed(4)}`)
// peso: o app trunca em 120? comparar W-120 e W-140
for (const id of ['W-100', 'W-120', 'W-140']) { const p = pts.find(x => x.id === id); if (p) console.log(`  ${id}: yMap ${p.yMap.toFixed(4)} yIp ${p.yIp.toFixed(4)}`) }
