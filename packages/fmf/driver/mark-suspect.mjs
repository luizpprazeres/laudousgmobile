// Marca como suspeitas as leituras idênticas à do caso imediatamente anterior (entradas diferentes) — leitura estagnada
import { readFileSync, writeFileSync } from 'node:fs'
const [,, casesFile, resFile] = process.argv
const cases = Object.fromEntries(JSON.parse(readFileSync(casesFile, 'utf8')).map(c => [c.id, c]))
const res = JSON.parse(readFileSync(resFile, 'utf8'))
let prev = null, n = 0, ids = []
for (const r of res) {
  const c = cases[r.id]
  if (prev && c && cases[prev.id] && JSON.stringify(c.tri) !== JSON.stringify(cases[prev.id].tri) && r.t21 === prev.t21 && r.t18t13 === prev.t18t13 && r.prior21 === prev.prior21 && !r.error) { r.suspect = true; n++; ids.push(r.id) }
  if (!r.error) prev = r
}
writeFileSync(resFile, JSON.stringify(res, null, 1)); console.log(`${resFile}: ${n} suspeitas`, ids.join(' '))
