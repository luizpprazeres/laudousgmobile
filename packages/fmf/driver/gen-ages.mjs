import { writeFileSync } from 'node:fs'
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const dobForAge = age => fmt(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate() - 100)))
const cases = []
for (const age of [16, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48]) for (const [tag, bp, pi] of [['pa120', [[120, 75], [120, 75], [120, 75], [120, 75]], [1.5, 1.5]], ['pa140', [[140, 90], [140, 90], [140, 90], [140, 90]], [2.0, 2.0]]])
  cases.push({ id: `A${age}-${tag}`, maternal: { dob: dobForAge(age), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks: 12, gaDays: 0, conception: 'Spontaneous' }, pe: { chronicHypertension: false, diabetes1: false, diabetes2: false, familyHistoryPE: false, sle: false, aps: false, parity: 'nulliparous', bp, utpi: pi } })
writeFileSync('cases-ages.json', JSON.stringify(cases, null, 1)); console.log(cases.length, 'casos de idade')
