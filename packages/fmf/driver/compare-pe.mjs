// Uso: node compare-pe.mjs cases.json results.json  → tabela app × motor local
import { readFileSync } from 'node:fs'
import { calcularPreEclampsiaFmf, pamDeAfericoes, mapMoM, utaPiMoM } from '../../shared/src/calculators/preEclampsiaFmf.ts'
const [,, casesFile, resultsFile] = process.argv
const cases = Object.fromEntries(JSON.parse(readFileSync(casesFile, 'utf8')).map(c => [c.id, c]))
const results = JSON.parse(readFileSync(resultsFile, 'utf8'))
const ETNIA = { 'White': 'branca', 'Black': 'afro', 'South Asian': 'sul-asiatica', 'East Asian': 'leste-asiatica', 'White - Black': 'mista', 'White - South Asian': 'mista', 'White - East Asian': 'mista', 'Black - South Asian': 'mista', 'Black - East Asian': 'mista', 'South Asian - East Asian': 'mista' }
const parseMdy = s => { const [m, d, y] = s.split('/').map(Number); return Date.UTC(y, m - 1, d) }
// idade como o app usa: decimal na DPP (exame + 280 − IG) — ver preEclampsiaFmf.ts
const idadeNaDpp = (dob, examDate, gaDias) => (Date.UTC(...examDate.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v))) + (280 - gaDias) * 86400000 - parseMdy(dob)) / (365.25 * 86400000)
const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const rows = []
for (const r of results) {
  const c = cases[r.id]; if (!c || r.error) { rows.push({ id: r.id, erro: r.error ?? 'sem caso' }); continue }
  const m = c.maternal, pe = c.pe
  const gaDias = r.gaWeeks * 7 + r.gaDays
  const examDate = c.examDate ?? '2026-09-15'
  const g = {
    idade: m.dob ? idadeNaDpp(m.dob, examDate, gaDias) : r.age, peso: m.weight, altura: m.height, gaDias, etnia: ETNIA[m.ethnicity] ?? m.ethnicity,
    paridade: pe.parity === 'nulliparous' ? 'nulipara' : pe.previousPE ? 'multipara-com-pe' : 'multipara-sem-pe',
    intervaloAnos: pe.parity === 'nulliparous' ? null : (Number.isFinite(r.interval) ? r.interval : dias(pe.deliveryDate.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'), examDate) / 365.25),
    igPartoAnterior: pe.parity === 'nulliparous' ? null : pe.deliveryGAWeeks + (pe.deliveryGADays ?? 0) / 7,
    zEscorePesoAnterior: null, histFamiliarPE: !!pe.familyHistoryPE, fiv: m.conception === 'In vitro fertilization', hipertensaoCronica: !!pe.chronicHypertension,
    diabetes: !!(pe.diabetes1 || pe.diabetes2), diabetesTipo1: !!pe.diabetes1, lesSaf: !!(pe.sle || pe.aps), fumante: !!m.smoking,
  }
  const pam = pamDeAfericoes(pe.bp.map(([s, d]) => ({ sistolica: s, diastolica: d }))).pamMmHg
  const med = { pamMmHg: pam, utaPiMedio: pe.utpi ? (pe.utpi[0] + pe.utpi[1]) / 2 : null, afericoesPam: 4 }
  let local
  try { const out = calcularPreEclampsiaFmf(g, med); local = { n: out.umEmN, mapMom: mapMoM(pam, g), utpiMom: pe.utpi ? utaPiMoM(med.utaPiMedio, g) : null } } catch (e) { local = { erro: e.message } }
  const dev = local.n && r.riskN ? ((local.n / r.riskN - 1) * 100) : null
  rows.push({ id: r.id, app: r.riskN, local: local.n ?? local.erro, 'desvio%': dev == null ? '' : dev.toFixed(1), 'MoMpam app/local': `${r.mapMom}/${local.mapMom?.toFixed(3) ?? '-'}`, 'MoMip app/local': `${r.utpiMom}/${local.utpiMom?.toFixed(3) ?? '-'}`, idade: r.age, IG: `${r.gaWeeks}+${r.gaDays}`, alto_app: r.highRisk, alto_local: local.n ? local.n < 100 : '' })
}
console.table(rows)
const devs = rows.map(r => Number(r['desvio%'])).filter(Number.isFinite)
if (devs.length) console.log(`n=${devs.length} | desvio médio ${(devs.reduce((a, b) => a + b, 0) / devs.length).toFixed(2)}% | |desvio| máx ${Math.max(...devs.map(Math.abs)).toFixed(1)}% | classificação divergente: ${rows.filter(r => r.alto_app !== '' && r.alto_local !== '' && r.alto_app !== r.alto_local).map(r => r.id).join(', ') || 'nenhuma'}`)
