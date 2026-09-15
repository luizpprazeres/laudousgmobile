import { writeFileSync } from 'node:fs'
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const minusDays = (d, n) => new Date(d.getTime() - n * 86400000)
const dobForAge = age => fmt(minusDays(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate())), 100))
const deliveryFor = years => fmt(minusDays(EXAM, Math.round(years * 365.25)))
const base = () => ({ maternal: { dob: dobForAge(30), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks: 12, gaDays: 0, conception: 'Spontaneous' }, pe: { chronicHypertension: false, diabetes1: false, diabetes2: false, familyHistoryPE: false, sle: false, aps: false, parity: 'nulliparous', bp: [[120, 75], [120, 75], [120, 75], [120, 75]], utpi: [1.5, 1.5] } })
const cases = []
const add = (id, mut) => { const c = base(); mut(c); cases.push({ id, ...c }) }
add('N01-base', () => {})
add('N02-idade18', c => { c.maternal.dob = dobForAge(18) }); add('N03-idade40', c => { c.maternal.dob = dobForAge(40) }); add('N04-idade45', c => { c.maternal.dob = dobForAge(45) })
add('N05-peso45', c => { c.maternal.weight = 45 }); add('N06-peso110', c => { c.maternal.weight = 110 }); add('N07-peso140', c => { c.maternal.weight = 140 })
add('N08-alt150', c => { c.maternal.height = 150 }); add('N09-alt185', c => { c.maternal.height = 185 })
add('N10-black', c => { c.maternal.ethnicity = 'Black' }); add('N11-southasian', c => { c.maternal.ethnicity = 'South Asian' }); add('N12-eastasian', c => { c.maternal.ethnicity = 'East Asian' }); add('N13-white-black', c => { c.maternal.ethnicity = 'White - Black' })
add('N14-fumante', c => { c.maternal.smoking = true }); add('N15-fiv', c => { c.maternal.conception = 'In vitro fertilization' })
add('N16-histfam', c => { c.pe.familyHistoryPE = true }); add('N17-dm1', c => { c.pe.diabetes1 = true }); add('N18-dm2', c => { c.pe.diabetes2 = true }); add('N19-les', c => { c.pe.sle = true }); add('N20-saf', c => { c.pe.aps = true })
add('N21-has', c => { c.pe.chronicHypertension = true }); add('N22-has-pa150', c => { c.pe.chronicHypertension = true; c.pe.bp = [[150, 95], [150, 95], [150, 95], [150, 95]] })
add('N23-pam-alta', c => { c.pe.bp = [[145, 95], [145, 95], [145, 95], [145, 95]] }); add('N24-pam-baixa', c => { c.pe.bp = [[95, 55], [95, 55], [95, 55], [95, 55]] })
add('N25-ip-baixo', c => { c.pe.utpi = [0.6, 0.6] }); add('N26-ip-alto', c => { c.pe.utpi = [3.0, 3.0] }); add('N27-so-pam', c => { c.pe.utpi = null })
add('N28-ig11+0', c => { c.maternal.gaWeeks = 11; c.maternal.gaDays = 0 }); add('N29-ig13+6', c => { c.maternal.gaWeeks = 13; c.maternal.gaDays = 6 }); add('N30-ig14+0', c => { c.maternal.gaWeeks = 14; c.maternal.gaDays = 0 }); add('N31-ig14+1', c => { c.maternal.gaWeeks = 14; c.maternal.gaDays = 1 })
const parous = (c, pe, years, ga) => { c.pe.parity = 'parous'; c.pe.previousPE = pe; c.pe.deliveryDate = deliveryFor(years); c.pe.deliveryGAWeeks = ga; c.pe.deliveryGADays = 0 }
add('M01-int0.5', c => parous(c, false, 0.5, 39)); add('M02-int1', c => parous(c, false, 1, 39)); add('M03-int5', c => parous(c, false, 5, 39)); add('M04-int15', c => parous(c, false, 15, 39))
add('M05-parto34', c => parous(c, false, 3, 34)); add('M06-parto42', c => parous(c, false, 3, 42))
add('M07-pe-int1-36', c => parous(c, true, 1, 36)); add('M08-pe-int10-28', c => parous(c, true, 10, 28)); add('M09-pe-parto24', c => parous(c, true, 3, 24))
add('M10-pe-has', c => { parous(c, true, 3, 34); c.pe.chronicHypertension = true }); add('M11-sempe-dm2-histfam', c => { parous(c, false, 3, 39); c.pe.diabetes2 = true; c.pe.familyHistoryPE = true })
add('X01-combo-alto', c => { c.maternal.dob = dobForAge(38); c.maternal.weight = 95; c.maternal.ethnicity = 'Black'; c.maternal.conception = 'In vitro fertilization'; c.pe.chronicHypertension = true; c.pe.bp = [[135, 88], [135, 88], [135, 88], [135, 88]]; c.pe.utpi = [2.2, 2.2] })
add('N01-base-repeat', () => {})
writeFileSync('cases-matrix.json', JSON.stringify(cases, null, 1)); console.log(cases.length, 'casos')
