import { readFileSync, writeFileSync } from 'node:fs'
const load = f => Object.fromEntries(JSON.parse(readFileSync(f, 'utf8')).map(c => [c.id, c]))
const C = { ...load('cases-tri-matrix.json'), ...load('cases-tri-b40.json'), ...load('cases-tri2.json'), ...load('cases-tri5.json') }
const EXAM = new Date('2026-09-15T00:00:00Z')
const fmt = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
const dobForAge = age => fmt(new Date(Date.UTC(EXAM.getUTCFullYear() - age, EXAM.getUTCMonth(), EXAM.getUTCDate() - 100)))
const mat = (age, extra = {}) => ({ dob: dobForAge(age), height: 164, weight: 69, ethnicity: 'White', smoking: false, gaWeeks: 12, gaDays: 3, conception: 'Spontaneous', ...extra })
const out = []; const take = id => { if (!C[id]) throw new Error('sem caso ' + id); out.push({ ...C[id], id: id.replace(/^(J|K38|B40|TN|TC|TB)-/, 'R6-$1-') }) }
// suspeitas de FCF e bioquímica, intercaladas com casos de outro CRL/NT
const fhr = ['J-crl45-fhr165', 'J-crl60-fhr185', 'J-crl45-fhr180', 'J-crl84-fhr170', 'J-crl45-fhr170', 'J-crl60-fhr160', 'J-crl45-fhr185', 'J-crl60-fhr178', 'J-crl45-fhr175', 'J-crl45-fhr168']
const bio = ['K38-p0.25-h0.5', 'B40-p1-h0.4', 'K38-p0.5-h1', 'B40-p1.5-h1', 'K38-p1-h5', 'TB-p1.5-h0.7', 'K38-p2-h1', 'TB-p2-h0.4']
for (let i = 0; i < Math.max(fhr.length, bio.length); i++) { if (fhr[i]) take(fhr[i]); if (bio[i]) take(bio[i]) }
take('TN-1.5'); take('TC-80')
// onda A do DV: verificar de novo, intercalando NT distintas (leitura idêntica à base só é real se o vizinho anterior for diferente)
const dv = (nt, w, extra = {}) => out.push({ id: `R6-DV-nt${nt}-${w ?? 'base'}`, maternal: mat(40), tri: { crl: 60, nt, ...(w ? { dvAWave: w } : {}), ...extra } })
dv(1.8); dv(2.5, 'Reversed flow'); dv(1.8, 'Reversed flow'); dv(2.5); dv(1.8, 'Negative'); dv(2.5, 'Negative'); dv(1.8, 'Absent DV'); dv(2.5, 'Positive')
dv(1.8, 'Reversed flow', { dvpi: 1.2 }); dv(2.5, 'Positive', { dvpi: 1.2 }); dv(1.8, 'Positive', { dvpi: 1.2 }); dv(2.5, 'Reversed flow', { dvpi: 1.2 })
writeFileSync('cases-tri6.json', JSON.stringify(out, null, 1)); console.log(out.length, 'casos:', out.map(c => c.id).join(' '))
