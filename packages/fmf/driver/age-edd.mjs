// Hipótese: o app usa a idade (decimal) na DPP no prior. Testa com os MoMs do app injetados.
import { readFileSync } from 'node:fs'
import { calcularPreEclampsiaFmf, log10MapEsperada, log10UtaPiEsperado } from '../../shared/src/calculators/preEclampsiaFmf.ts'
const cases = Object.fromEntries(JSON.parse(readFileSync('cases-ages.json', 'utf8')).map(c => [c.id, c]))
const results = JSON.parse(readFileSync('results-ages.json', 'utf8')).filter(r => r.riskN)
const EXAM = new Date('2026-09-15T00:00:00Z')
const parse = s => { const [m, d, y] = s.split('/').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
for (const shift of [0, 0.3, 0.55, 0.6, 0.7]) {
  const devs = []
  for (const r of results) {
    const c = cases[r.id]; const dob = parse(c.maternal.dob)
    const ageExact = (EXAM - dob) / (365.25 * 86400000)
    const g0 = { idade: r.age, peso: 69, altura: 164, gaDias: 84, etnia: 'branca', paridade: 'nulipara', histFamiliarPE: false, fiv: false, hipertensaoCronica: false, diabetes: false, lesSaf: false, fumante: false }
    const pam = r.mapMom * Math.pow(10, log10MapEsperada(g0)); const ip = r.utpiMom * Math.pow(10, log10UtaPiEsperado(g0))
    const g = { ...g0, idade: shift === 0 ? r.age : ageExact + shift }
    let n; try { n = calcularPreEclampsiaFmf(g, { pamMmHg: pam, utaPiMedio: ip, afericoesPam: 4 }).umEmN } catch (e) { n = NaN }
    devs.push([r.age, r.id.endsWith('pa120') ? 'lo' : 'hi', r.riskN, n, ((n / r.riskN - 1) * 100)])
  }
  const d = devs.map(x => x[4]).filter(Number.isFinite)
  console.log(`idade = ${shift === 0 ? 'inteira no exame' : `exata no exame + ${shift} ano`}: desvio médio ${(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2)}% | máx |${Math.max(...d.map(Math.abs)).toFixed(1)}|% | ≥35: ${devs.filter(x => x[0] >= 35).map(x => `${x[0]}${x[1]}:${x[4].toFixed(1)}`).join(' ')}`)
}
