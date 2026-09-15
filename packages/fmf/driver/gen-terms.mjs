import { writeFileSync } from 'node:fs'
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const dobForAge = age => fmt(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate() - 100)))
const L = { lo: { bp: [[120, 75], [120, 75], [120, 75], [120, 75]], utpi: [1.5, 1.5] }, hi: { bp: [[140, 90], [140, 90], [140, 90], [140, 90]], utpi: [2.0, 2.0] } }
const base = () => ({ maternal: { dob: dobForAge(30), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks: 12, gaDays: 0, conception: 'Spontaneous' }, pe: { chronicHypertension: false, diabetes1: false, diabetes2: false, familyHistoryPE: false, sle: false, aps: false, parity: 'nulliparous', ...L.lo } })
const cases = []; const add = (id, mut) => { const c = base(); mut(c); cases.push({ id, ...c }) }
for (const e of ['White', 'Black', 'South Asian', 'East Asian', 'White - Black', 'White - South Asian', 'White - East Asian', 'Black - South Asian', 'Black - East Asian', 'South Asian - East Asian']) for (const lv of ['lo', 'hi']) add(`E-${e.replace(/\s+/g, '')}-${lv}`, c => { c.maternal.ethnicity = e; Object.assign(c.pe, L[lv]) })
for (const lv of ['lo', 'hi']) { add(`S-fumante-${lv}`, c => { c.maternal.smoking = true; Object.assign(c.pe, L[lv]) }); add(`D1-${lv}`, c => { c.pe.diabetes1 = true; Object.assign(c.pe, L[lv]) }); add(`D2-${lv}`, c => { c.pe.diabetes2 = true; Object.assign(c.pe, L[lv]) }); add(`F-histfam-${lv}`, c => { c.pe.familyHistoryPE = true; Object.assign(c.pe, L[lv]) }); add(`H-has-${lv}`, c => { c.pe.chronicHypertension = true; Object.assign(c.pe, L[lv]) }); add(`V-fiv-${lv}`, c => { c.maternal.conception = 'In vitro fertilization'; Object.assign(c.pe, L[lv]) }) }
for (const [w, d] of [[11, 0], [11, 3], [12, 0], [12, 3], [13, 0], [13, 3], [14, 0]]) add(`G-${w}+${d}`, c => { c.maternal.gaWeeks = w; c.maternal.gaDays = d })
for (const wt of [45, 55, 69, 85, 100, 120, 140]) add(`W-${wt}`, c => { c.maternal.weight = wt })
for (const ht of [150, 158, 164, 172, 180]) add(`T-${ht}`, c => { c.maternal.height = ht })
for (const age of [18, 30, 40]) add(`D1age-${age}`, c => { c.pe.diabetes1 = true; c.maternal.dob = dobForAge(age) })
add('P-so-pam', c => { c.pe.utpi = null })
writeFileSync('cases-terms.json', JSON.stringify(cases, null, 1)); console.log(cases.length, 'casos de termos')
