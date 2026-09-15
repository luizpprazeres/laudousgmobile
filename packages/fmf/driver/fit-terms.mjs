// Estima, por termo, o delta em log10 da mediana esperada (PAM e IP) que o app aplica,
// comparando cada caso com o caso-base equivalente (mesmo nível de medida).
import { readFileSync } from 'node:fs'
import { pamDeAfericoes, log10MapEsperada, log10UtaPiEsperado } from '../../shared/src/calculators/preEclampsiaFmf.ts'
const load = (cf, rf) => { const cases = Object.fromEntries(JSON.parse(readFileSync(cf, 'utf8')).map(c => [c.id, c])); return JSON.parse(readFileSync(rf, 'utf8')).filter(r => r.riskN && r.mapMom).map(r => ({ r, c: cases[r.id] })) }
const all = [...load('cases-terms.json', 'results-terms.json'), ...load('cases-matrix.json', 'results-matrix.json')]
const lvl = c => `${c.pe.bp[0][0]}/${c.pe.utpi?.[0]}`
const expMap = ({ r, c }) => Math.log10(pamDeAfericoes(c.pe.bp.map(([s, d]) => ({ sistolica: s, diastolica: d }))).pamMmHg / r.mapMom)
const expIp = ({ r, c }) => c.pe.utpi ? Math.log10(((c.pe.utpi[0] + c.pe.utpi[1]) / 2) / r.utpiMom) : null
const base = {}; for (const x of all) if (/^(E-White-(lo|hi)|N01-base)$/.test(x.r.id)) base[lvl(x.c)] = x
const g0 = { idade: 30, peso: 69, altura: 164, gaDias: 84, etnia: 'branca', paridade: 'nulipara', histFamiliarPE: false, fiv: false, hipertensaoCronica: false, diabetes: false, lesSaf: false, fumante: false }
const local = (mut) => { const g = { ...g0, ...mut }; return { map: log10MapEsperada(g) - log10MapEsperada(g0), ip: log10UtaPiEsperado(g) - log10UtaPiEsperado(g0) } }
const terms = [
  ['Black', x => x.c.maternal.ethnicity === 'Black', { etnia: 'afro' }], ['South Asian', x => x.c.maternal.ethnicity === 'South Asian', { etnia: 'sul-asiatica' }], ['East Asian', x => x.c.maternal.ethnicity === 'East Asian', { etnia: 'leste-asiatica' }],
  ['White-Black', x => x.c.maternal.ethnicity === 'White - Black', {}], ['White-SouthAsian', x => x.c.maternal.ethnicity === 'White - South Asian', {}], ['White-EastAsian', x => x.c.maternal.ethnicity === 'White - East Asian', {}], ['Black-SouthAsian', x => x.c.maternal.ethnicity === 'Black - South Asian', {}], ['Black-EastAsian', x => x.c.maternal.ethnicity === 'Black - East Asian', {}], ['SouthAsian-EastAsian', x => x.c.maternal.ethnicity === 'South Asian - East Asian', {}],
  ['fumante', x => x.c.maternal.smoking, { fumante: true }], ['DM1', x => x.c.pe.diabetes1 && x.r.age === 30, { diabetes: true }], ['DM2', x => x.c.pe.diabetes2, { diabetes: true }], ['histfam', x => x.c.pe.familyHistoryPE && x.c.pe.parity === 'nulliparous', { histFamiliarPE: true }], ['HAS', x => x.c.pe.chronicHypertension && x.c.pe.parity === 'nulliparous', { hipertensaoCronica: true }], ['FIV', x => x.c.maternal.conception === 'In vitro fertilization', { fiv: true }],
]
console.log('termo | n | Δlog10 MAP app (local) | Δlog10 IP app (local)   [Δ = esperado(termo) − esperado(base), mesmo nível]')
for (const [nome, sel, mut] of terms) {
  const xs = all.filter(x => sel(x) && x.c.maternal.weight === 69 && x.c.maternal.height === 164 && x.r.gaWeeks === 12 && x.r.gaDays === 0 && base[lvl(x.c)] && !/^X01/.test(x.r.id))
  if (!xs.length) { console.log(`${nome}: sem dados`); continue }
  const dm = xs.map(x => expMap(x) - expMap(base[lvl(x.c)])), di = xs.map(x => expIp(x) - expIp(base[lvl(x.c)])).filter(Number.isFinite)
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length
  const l = local(mut)
  console.log(`${nome.padEnd(20)} | ${xs.length} | ${avg(dm).toFixed(4)} (${l.map.toFixed(4)})  faixa ${Math.min(...dm).toFixed(4)}..${Math.max(...dm).toFixed(4)} | ${di.length ? avg(di).toFixed(4) : '-'} (${l.ip.toFixed(4)})  faixa ${di.length ? Math.min(...di).toFixed(4) + '..' + Math.max(...di).toFixed(4) : ''}`)
}
// peso / altura / IG: comparação direta dos MoMs
console.log('\nvarreduras (MoM app vs local):')
for (const x of all.filter(x => /^(W-|T-|G-)/.test(x.r.id))) { const g = { ...g0, peso: x.c.maternal.weight, altura: x.c.maternal.height, gaDias: x.r.gaWeeks * 7 + x.r.gaDays }; const pam = pamDeAfericoes(x.c.pe.bp.map(([s, d]) => ({ sistolica: s, diastolica: d }))).pamMmHg; console.log(`  ${x.r.id.padEnd(8)} MAP ${x.r.mapMom} / ${(pam / 10 ** log10MapEsperada(g)).toFixed(3)}   IP ${x.r.utpiMom} / ${(1.5 / 10 ** log10UtaPiEsperado(g)).toFixed(3)}   risco app ${x.r.riskN}`) }
