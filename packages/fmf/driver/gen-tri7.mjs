import { writeFileSync } from 'node:fs'
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const dobForAge = age => fmt(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate() - 100)))
const mat = (age, gaWeeks, gaDays) => ({ dob: dobForAge(age), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks, gaDays, conception: 'Spontaneous' })
const cases = []
// FCF: a IG esperada vem da datação (manual) ou do CRL? Mesmo CRL/FCF com datação 12+3 vs datação compatível com o CRL
cases.push({ id: 'L-crl45-dat11+1-fhr170', maternal: mat(30, 11, 1), tri: { crl: 45, nt: 1.8, fhr: 170 } })
cases.push({ id: 'L-crl84-dat14+0-fhr178', maternal: mat(30, 14, 0), tri: { crl: 84, nt: 1.8, fhr: 178 } })
cases.push({ id: 'L-crl45-dat12+3-fhr170', maternal: mat(30, 12, 3), tri: { crl: 45, nt: 1.8, fhr: 170 } })
cases.push({ id: 'L-crl84-dat12+3-fhr178', maternal: mat(30, 12, 3), tri: { crl: 84, nt: 1.8, fhr: 178 } })
cases.push({ id: 'L-crl45-dat11+1-fhr178', maternal: mat(30, 11, 1), tri: { crl: 45, nt: 1.8, fhr: 178 } })
cases.push({ id: 'L-crl84-dat14+0-fhr170', maternal: mat(30, 14, 0), tri: { crl: 84, nt: 1.8, fhr: 170 } })
cases.push({ id: 'L-crl45-dat11+1-base', maternal: mat(30, 11, 1), tri: { crl: 45, nt: 1.8 } })
cases.push({ id: 'L-crl84-dat14+0-base', maternal: mat(30, 14, 0), tri: { crl: 84, nt: 1.8 } })
// bioquímica com datação compatível (a média de T21 depende da IG)
cases.push({ id: 'L-crl45-dat11+1-bio', maternal: mat(30, 11, 1), tri: { crl: 45, nt: 1.8, pappaMom: 0.5, freeBhcgMom: 2 } })
cases.push({ id: 'L-crl45-dat12+3-bio', maternal: mat(30, 12, 3), tri: { crl: 45, nt: 1.8, pappaMom: 0.5, freeBhcgMom: 2 } })
cases.push({ id: 'L-crl84-dat14+0-bio', maternal: mat(30, 14, 0), tri: { crl: 84, nt: 1.8, pappaMom: 0.5, freeBhcgMom: 2 } })
cases.push({ id: 'L-crl84-dat12+3-bio', maternal: mat(30, 12, 3), tri: { crl: 84, nt: 1.8, pappaMom: 0.5, freeBhcgMom: 2 } })
writeFileSync('cases-tri7.json', JSON.stringify(cases, null, 1)); console.log(cases.length, 'casos')
