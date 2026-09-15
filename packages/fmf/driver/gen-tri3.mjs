import { writeFileSync } from 'node:fs'
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const dobForAge = age => fmt(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate() - 100)))
const mat = (age, extra = {}) => ({ dob: dobForAge(age), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks: 12, gaDays: 3, conception: 'Spontaneous', ...extra })
const cases = []; const add = (id, maternal, tri) => cases.push({ id, maternal, tri })
for (const crl of [45, 60, 84]) for (const nt of [1.2, 1.8, 2.5, 3.5]) { add(`NB-crl${crl}-nt${nt}-base`, mat(40), { crl, nt }); add(`NB-crl${crl}-nt${nt}-absent`, mat(40), { crl, nt, nasalBone: 'Absent' }); add(`NB-crl${crl}-nt${nt}-present`, mat(40), { crl, nt, nasalBone: 'Present' }); add(`TR-crl${crl}-nt${nt}-yes`, mat(40), { crl, nt, tricuspid: 'Yes' }) }
for (const e of ['Black', 'South Asian', 'East Asian']) add(`NB-etnia-${e.replace(' ', '')}-absent`, mat(40, { ethnicity: e }), { crl: 60, nt: 1.8, nasalBone: 'Absent' })
add('FHR-crl60-nt1.8-170', mat(40), { crl: 60, nt: 1.8, fhr: 170 }); add('FHR-crl60-nt1.8-175', mat(40), { crl: 60, nt: 1.8, fhr: 175 }); add('FHR-crl60-nt1.8-100', mat(40), { crl: 60, nt: 1.8, fhr: 100 })
writeFileSync('cases-tri3.json', JSON.stringify(cases, null, 1)); console.log(cases.length, 'casos NB/TR/FHR')
