import { writeFileSync } from 'node:fs'
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const dobForAge = age => fmt(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate() - 100)))
const mat = (age, extra = {}) => ({ dob: dobForAge(age), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks: 12, gaDays: 3, conception: 'Spontaneous', ...extra })
const cases = []; const add = (id, maternal, tri) => cases.push({ id, maternal, tri })
// 1) saturação do 13/18 com hCG a PAPP-A fixa (idade 38, NT 3,0) — intercalando PAPP-A para evitar estagnação
const hs = [0.3, 0.7, 1.5, 4, 8, 0.5, 2, 5, 1, 3]
for (const h of hs) for (const p of [1, 0.5, 2]) add(`S38-p${p}-h${h}`, mat(38), { crl: 60, nt: 3.0, pappaMom: p, freeBhcgMom: h })
// 2) interação osso nasal × tricúspide × bioquímica com T21 legível (idade 30, NT 1,8 e 2,5)
for (const nt of [1.8, 2.5]) {
  add(`I30-nt${nt}-base`, mat(30), { crl: 60, nt })
  add(`I30-nt${nt}-nb`, mat(30), { crl: 60, nt, nasalBone: 'Absent' })
  add(`I30-nt${nt}-tr`, mat(30), { crl: 60, nt, tricuspid: 'Yes' })
  add(`I30-nt${nt}-nb-tr`, mat(30), { crl: 60, nt, nasalBone: 'Absent', tricuspid: 'Yes' })
  add(`I30-nt${nt}-bio`, mat(30), { crl: 60, nt, pappaMom: 0.4, freeBhcgMom: 2.5 })
  add(`I30-nt${nt}-nb-bio`, mat(30), { crl: 60, nt, nasalBone: 'Absent', pappaMom: 0.4, freeBhcgMom: 2.5 })
  add(`I30-nt${nt}-tr-bio`, mat(30), { crl: 60, nt, tricuspid: 'Yes', pappaMom: 0.4, freeBhcgMom: 2.5 })
  add(`I30-nt${nt}-nb-tr-bio`, mat(30), { crl: 60, nt, nasalBone: 'Absent', tricuspid: 'Yes', pappaMom: 0.4, freeBhcgMom: 2.5 })
  add(`I30-nt${nt}-nb-tr-dvpi1.4`, mat(30), { crl: 60, nt, nasalBone: 'Absent', tricuspid: 'Yes', dvpi: 1.4 })
  add(`I30-nt${nt}-nb-dvpi1.4`, mat(30), { crl: 60, nt, nasalBone: 'Absent', dvpi: 1.4 })
}
writeFileSync('cases-tri8.json', JSON.stringify(cases, null, 1)); console.log(cases.length, 'casos')
