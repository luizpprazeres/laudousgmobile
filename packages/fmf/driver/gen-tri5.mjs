import { writeFileSync } from 'node:fs'
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const dobForAge = age => fmt(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate() - 100)))
const mat = (age, extra = {}) => ({ dob: dobForAge(age), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks: 12, gaDays: 3, conception: 'Spontaneous', ...extra })
const cases = []; const add = (id, maternal, tri) => cases.push({ id, maternal, tri })
// 1) FCF intercalada (cada leitura precedida por um valor diferente → leitura estagnada fica evidente)
for (const crl of [45, 60, 84]) for (const f of [190, 165, 180, 170, 185, 175, 160, 168, 172, 178]) add(`J-crl${crl}-fhr${f}`, mat(30), { crl, nt: 1.8, fhr: f })
// 2) bioquímica focada em T13/18 (idade 38, NT 3,0 → prior 13/18 ≈ 1:46 depois da NT; piso do app fica longe)
for (const p of [0.25, 0.5, 1, 2]) for (const h of [0.3, 0.5, 1, 2, 3, 5]) add(`K38-p${p}-h${h}`, mat(38), { crl: 60, nt: 3.0, pappaMom: p, freeBhcgMom: h })
writeFileSync('cases-tri5.json', JSON.stringify(cases, null, 1)); console.log(cases.length, 'casos')
