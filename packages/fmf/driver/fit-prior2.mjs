import { readFileSync } from 'node:fs'
import { crlToGaDays } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/fmfTrisomy.ts'
const cases = Object.fromEntries(JSON.parse(readFileSync('cases-tri-matrix.json', 'utf8')).map(c => [c.id, c]))
const res = JSON.parse(readFileSync('results-tri-matrix.json', 'utf8')).filter(r => r.prior21 && (/^TA-\d+$/.test(r.id) || /^TC-/.test(r.id)))
const EXAM = Date.UTC(2026, 8, 15); const ageAt = dob => { const [m, d, y] = dob.split('/').map(Number); return (EXAM - Date.UTC(y, m - 1, d)) / (365.25 * 86400000) }
const pts = res.map(r => { const ga = crlToGaDays(cases[r.id].tri.crl); const l = Math.log10(ga / 7); const rp = 10 ** (0.9425 - 1.023 * l + 0.2718 * l * l); return { edd: ageAt(cases[r.id].maternal.dob) + (280 - ga) / 365.25, p: 1 / r.prior21 / rp, id: r.id } })
let best = null
for (let A = 0.0005; A <= 0.0010; A += 0.00001) for (let B = -16.45; B <= -16.05; B += 0.005) { const err = pts.map(q => Math.log((A + Math.exp(B + 0.286 * q.edd)) / q.p)); const rms = Math.sqrt(err.reduce((s, e) => s + e * e, 0) / err.length); if (!best || rms < best.rms) best = { A, B, rms, mx: Math.max(...err.map(Math.abs)) } }
console.log(`melhor (C=0,286 fixo, ${pts.length} pontos incl. CRL): A=${best.A.toFixed(5)} B=${best.B.toFixed(3)} rms ${(best.rms * 100).toFixed(1)}% máx ${(best.mx * 100).toFixed(1)}%`)
for (const [A, B] of [[0.000627, -16.2395], [0.0007, -16.2395], [best.A, best.B]]) { const err = pts.map(q => Math.log((A + Math.exp(B + 0.286 * q.edd)) / q.p)); console.log(`  A=${A} B=${B.toFixed(4)}: rms ${(Math.sqrt(err.reduce((s, e) => s + e * e, 0) / err.length) * 100).toFixed(1)}% máx ${(Math.max(...err.map(Math.abs)) * 100).toFixed(1)}%`) }
