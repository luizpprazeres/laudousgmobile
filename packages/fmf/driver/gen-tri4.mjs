import { writeFileSync } from 'node:fs'
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const dobForAge = age => fmt(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate() - 100)))
const mat = (age, extra = {}) => ({ dob: dobForAge(age), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks: 12, gaDays: 3, conception: 'Spontaneous', ...extra })
const cases = []; const add = (id, maternal, tri) => cases.push({ id, maternal, tri })
// 1) varredura fina de FCF (idade 30, CRL 60, NT 1.8)
add('H-crl60-base', mat(30), { crl: 60, nt: 1.8 })
for (let f = 100; f <= 200; f += 5) add(`H-crl60-fhr${f}`, mat(30), { crl: 60, nt: 1.8, fhr: f })
for (const crl of [45, 84]) { add(`H-crl${crl}-base`, mat(30), { crl, nt: 1.8 }); for (const f of [120, 150, 160, 165, 170, 180, 190]) add(`H-crl${crl}-fhr${f}`, mat(30), { crl, nt: 1.8, fhr: f }) }
// 2) combinação de marcadores (idade 38, CRL 60, NT 3.0) — investigar TM-todos-alterados
const m38 = { crl: 60, nt: 3.0 }
add('C38-base', mat(38), m38)
add('C38-nb', mat(38), { ...m38, nasalBone: 'Absent' })
add('C38-tr', mat(38), { ...m38, tricuspid: 'Yes' })
add('C38-nb-tr', mat(38), { ...m38, nasalBone: 'Absent', tricuspid: 'Yes' })
add('C38-bio', mat(38), { ...m38, pappaMom: 0.4, freeBhcgMom: 2.5 })
add('C38-nb-bio', mat(38), { ...m38, nasalBone: 'Absent', pappaMom: 0.4, freeBhcgMom: 2.5 })
add('C38-nb-tr-bio', mat(38), { ...m38, nasalBone: 'Absent', tricuspid: 'Yes', pappaMom: 0.4, freeBhcgMom: 2.5 })
add('C38-nb-tr-bio-h1', mat(38), { ...m38, nasalBone: 'Absent', tricuspid: 'Yes', pappaMom: 0.4, freeBhcgMom: 1 })
add('C38-nb-tr-dvpi1.4', mat(38), { ...m38, nasalBone: 'Absent', tricuspid: 'Yes', dvpi: 1.4 })
// 3) releitura dos pontos bioquímicos divergentes (idade 40)
for (const [p, h] of [[0.25, 1], [0.5, 0.4], [1.5, 2], [0.25, 0.4], [0.5, 3]]) add(`R40-p${p}-h${h}`, mat(40), { crl: 60, nt: 1.8, pappaMom: p, freeBhcgMom: h })
writeFileSync('cases-tri4.json', JSON.stringify(cases, null, 1)); console.log(cases.length, 'casos')
