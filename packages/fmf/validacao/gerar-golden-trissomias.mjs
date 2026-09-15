/**
 * GOLDEN VECTORS da calculadora de TRISSOMIAS (motor `packages/shared/src/calculators/fmfTrisomy.ts`,
 * calibrado ao app da FMF em 15/09/2026 — cal-2026-09-15c).
 * Qualquer porte (Swift, Kotlin) tem de reproduzir estes números com tolerância relativa 1e-9.
 *
 * Rodar:  node_modules/.bin/tsx packages/fmf/validacao/gerar-golden-trissomias.mjs > packages/fmf/validacao/golden-trissomias.json
 */
import { calcularTrissomias, FMF_TRISOMY_MODEL_VERSION } from '../../shared/src/calculators/fmfTrisomy.ts'

let s = 0x7a3c19d1
const u = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = a => a[Math.floor(u() * a.length)]
const num = (lo, hi, casas = 0) => Number((lo + u() * (hi - lo)).toFixed(casas))
const maybe = (p, f) => (u() < p ? f() : undefined)
const ETN = ['white', 'black', 'south_asian', 'east_asian', 'mixed']

const casos = []
const add = (id, entrada) => {
  try {
    const r = calcularTrissomias(entrada)
    casos.push({ id, entrada, esperado: { erroDeDominio: false, gaDays: r.gaDays, gaWeeks: r.gaWeeks, gaDaysRemainder: r.gaDaysRemainder,
      basal: { t21: r.basal.t21.probability, t18: r.basal.t18.probability, t13: r.basal.t13.probability },
      t21: r.t21.probability, t18: r.t18.probability, t13: r.t13.probability, t18t13: r.t18t13.probability,
      categoriaT21: r.t21.category, categoriaT18t13: r.t18t13.category, markersUsed: r.markersUsed, warnings: r.warnings.length } })
  } catch (e) {
    casos.push({ id, entrada, esperado: { erroDeDominio: true, mensagem: e.message } })
  }
}
// 1) casos fixos (os mesmos medidos no app, ver docs/fmf-comparacao-resultados-2026-09-14.md rodada 7)
add('fixo-nt-only-30', { maternalAge: 30.19, crl: 60, nt: 1.8 })
add('fixo-nt3-38', { maternalAge: 38.19, crl: 60, nt: 3.0 })
add('fixo-bio-40', { maternalAge: 40.19, crl: 60, nt: 1.8, pappaMoM: 0.5, freeBetaHcgMoM: 2, isMoMCorrected: true })
add('fixo-fhr-datada', { maternalAge: 30.19, crl: 45, nt: 1.8, fhr: 170, gaDaysDated: 78 })
add('fixo-fhr-crl', { maternalAge: 30.19, crl: 45, nt: 1.8, fhr: 170 })
add('fixo-nb-tr', { maternalAge: 38.19, crl: 60, nt: 3.0, nasalBoneAbsent: true, tricuspidRegurgitation: true, weight: 69 })
add('fixo-tr-nao', { maternalAge: 30.19, crl: 60, nt: 1.8, tricuspidRegurgitation: false, weight: 69 })
add('fixo-dvpi', { maternalAge: 40.19, crl: 60, nt: 1.8, dvPI: 1.2 })
add('fixo-todos', { maternalAge: 38.19, crl: 60, nt: 3.0, fhr: 165, nasalBoneAbsent: true, tricuspidRegurgitation: true, dvPI: 1.4, pappaMoM: 0.4, freeBetaHcgMoM: 2.5, isMoMCorrected: true, weight: 80, smoking: true, ethnicity: 'black', previousT21: true })
add('fixo-piso-total', { maternalAge: 40.19, crl: 60, nt: 1.8, pappaMoM: 1.5, freeBetaHcgMoM: 2, isMoMCorrected: true, nasalBoneAbsent: false, tricuspidRegurgitation: false, dvPI: 1.0, weight: 69 })
add('fixo-nt-alta', { maternalAge: 25.5, crl: 84, nt: 6.0 })
add('fixo-nt-baixa', { maternalAge: 45.2, crl: 45, nt: 0.8 })
// 2) aleatórios válidos
for (let i = 0; i < 260; i++) {
  const bio = u() < 0.5
  const tr = maybe(0.5, () => u() < 0.4)
  add(`rand-${i}`, {
    maternalAge: num(15, 50, 2), crl: num(45, 84, 1), nt: num(0.8, 6.5, 1),
    fhr: maybe(0.5, () => num(120, 200, 0)),
    gaDaysDated: maybe(0.3, () => num(77, 98, 0)),
    freeBetaHcgMoM: bio ? num(0.1, 8, 2) : undefined, pappaMoM: bio ? num(0.1, 3, 2) : undefined, isMoMCorrected: bio ? true : undefined,
    dvPI: maybe(0.4, () => num(0.6, 2.5, 2)),
    tricuspidRegurgitation: tr, nasalBoneAbsent: maybe(0.5, () => u() < 0.4),
    smoking: maybe(0.5, () => u() < 0.3), ethnicity: maybe(0.7, () => pick(ETN)), weight: tr !== undefined ? num(40, 130, 0) : maybe(0.6, () => num(40, 130, 0)), // tricúspide exige peso
    previousT21: maybe(0.3, () => u() < 0.3), previousT18: maybe(0.2, () => u() < 0.3), previousT13: maybe(0.2, () => u() < 0.3),
  })
}
// 3) recusas (fora de faixa / bioquímica sem confirmação)
add('erro-idade-baixa', { maternalAge: 14, crl: 60, nt: 1.8 })
add('erro-idade-alta', { maternalAge: 51, crl: 60, nt: 1.8 })
add('erro-crl-baixo', { maternalAge: 30, crl: 44, nt: 1.8 })
add('erro-crl-alto', { maternalAge: 30, crl: 85, nt: 1.8 })
add('erro-nt-zero', { maternalAge: 30, crl: 60, nt: 0 })
add('erro-nt-negativa', { maternalAge: 30, crl: 60, nt: -1 })
add('erro-bio-sem-confirmacao', { maternalAge: 30, crl: 60, nt: 1.8, pappaMoM: 1 })
add('erro-fhr-baixa', { maternalAge: 30, crl: 60, nt: 1.8, fhr: 50 })
add('erro-fhr-alta', { maternalAge: 30, crl: 60, nt: 1.8, fhr: 250 })
add('erro-dvpi-zero', { maternalAge: 30, crl: 60, nt: 1.8, dvPI: 0 })
add('erro-peso-baixo', { maternalAge: 30, crl: 60, nt: 1.8, weight: 30, tricuspidRegurgitation: true })
add('erro-tr-sem-peso', { maternalAge: 30, crl: 60, nt: 1.8, tricuspidRegurgitation: true })
add('erro-peso-alto', { maternalAge: 30, crl: 60, nt: 1.8, weight: 250 })
add('erro-nan', { maternalAge: NaN, crl: 60, nt: 1.8 })
process.stdout.write(JSON.stringify({ versao: FMF_TRISOMY_MODEL_VERSION, geradoEm: '2026-09-15', total: casos.length, recusas: casos.filter(c => c.esperado.erroDeDominio).length, casos }, null, 1))
