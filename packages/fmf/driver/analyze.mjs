// Injeta os MoMs do app no motor local para isolar prior × mediana; estima coeficientes de idade do app.
import { readFileSync } from 'node:fs'
import { calcularPreEclampsiaFmf, pamDeAfericoes, log10MapEsperada, log10UtaPiEsperado } from '/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/preEclampsiaFmf.ts'
const ETNIA = { 'White': 'branca', 'Black': 'afro', 'South Asian': 'sul-asiatica', 'East Asian': 'leste-asiatica' }
const load = (cf, rf) => { const cases = Object.fromEntries(JSON.parse(readFileSync(cf, 'utf8')).map(c => [c.id, c])); return JSON.parse(readFileSync(rf, 'utf8')).filter(r => r.riskN).map(r => ({ r, c: cases[r.id] })) }
const toG = (c, r) => { const m = c.maternal, pe = c.pe; return { idade: r.age, peso: m.weight, altura: m.height, gaDias: r.gaWeeks * 7 + r.gaDays, etnia: ETNIA[m.ethnicity] ?? 'branca', paridade: pe.parity === 'nulliparous' ? 'nulipara' : pe.previousPE ? 'multipara-com-pe' : 'multipara-sem-pe', intervaloAnos: pe.parity === 'nulliparous' ? null : r.interval, igPartoAnterior: pe.parity === 'nulliparous' ? null : pe.deliveryGAWeeks, zEscorePesoAnterior: null, histFamiliarPE: !!pe.familyHistoryPE, fiv: m.conception === 'In vitro fertilization', hipertensaoCronica: !!pe.chronicHypertension, diabetes: !!(pe.diabetes1 || pe.diabetes2), lesSaf: !!(pe.sle || pe.aps), fumante: !!m.smoking } }
const rows = []
for (const [cf, rf] of [['cases-matrix.json', 'results-matrix.json'], ['cases-ages.json', 'results-ages.json']]) for (const { r, c } of load(cf, rf)) {
  if (!c.pe.utpi) continue
  const g = toG(c, r)
  // medidas que produzem, no modelo LOCAL, exatamente os MoMs exibidos pelo app
  const pam = r.mapMom * Math.pow(10, log10MapEsperada(g)); const ip = r.utpiMom * Math.pow(10, log10UtaPiEsperado(g))
  let inj; try { inj = calcularPreEclampsiaFmf(g, { pamMmHg: pam, utaPiMedio: ip, afericoesPam: 4 }).umEmN } catch (e) { inj = e.message.slice(0, 30) }
  const pamReal = pamDeAfericoes(c.pe.bp.map(([s, d]) => ({ sistolica: s, diastolica: d }))).pamMmHg
  const ipReal = (c.pe.utpi[0] + c.pe.utpi[1]) / 2
  rows.push({ id: r.id, app: r.riskN, localMoMapp: inj, devPrior: Number.isFinite(inj) ? ((inj / r.riskN - 1) * 100).toFixed(1) : '', mapMomApp: r.mapMom, mapMomLoc: (pamReal / Math.pow(10, log10MapEsperada(g))).toFixed(3), ipMomApp: r.utpiMom, ipMomLoc: (ipReal / Math.pow(10, log10UtaPiEsperado(g))).toFixed(3), idade: r.age })
}
console.log('=== risco local com os MoMs DO APP (isola o prior) ===')
console.table(rows.filter(x => /^A\d|N0[1-4]|N1[0-9]|N2[0-2]|M0|X01/.test(x.id)))
const dp = rows.map(x => Number(x.devPrior)).filter(Number.isFinite)
console.log(`prior: n=${dp.length} desvio médio ${(dp.reduce((a, b) => a + b, 0) / dp.length).toFixed(2)}% | máx |${Math.max(...dp.map(Math.abs)).toFixed(1)}|%`)
// coeficiente de idade implícito no app: log10(medida/MoM_app) vs idade (nulíparas brancas, 12+0, 69 kg, 164 cm)
const ages = load('cases-ages.json', 'results-ages.json')
for (const [nome, lv] of [['MAP', 'pa120'], ['MAP', 'pa140'], ['IP', 'pa120'], ['IP', 'pa140']]) {
  const pts = ages.filter(({ r }) => r.id.endsWith(lv)).map(({ r, c }) => { const pamReal = pamDeAfericoes(c.pe.bp.map(([s, d]) => ({ sistolica: s, diastolica: d }))).pamMmHg; const ipReal = (c.pe.utpi[0] + c.pe.utpi[1]) / 2; const y = nome === 'MAP' ? Math.log10(pamReal / r.mapMom) : Math.log10(ipReal / r.utpiMom); return [r.age - 35, y] })
  const n = pts.length, sx = pts.reduce((a, [x]) => a + x, 0), sy = pts.reduce((a, [, y]) => a + y, 0), sxx = pts.reduce((a, [x]) => a + x * x, 0), sxy = pts.reduce((a, [x, y]) => a + x * y, 0)
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n
  console.log(`${nome} ${lv}: log10(esperado) ≈ ${a.toFixed(5)} + ${b.toExponential(3)}·(idade−35)   [local: ${nome === 'MAP' ? '+4.393e-4' : '−1.117e-3 + 1.506e-5·ga(=7) = −1.012e-3'} por ano]`)
}
