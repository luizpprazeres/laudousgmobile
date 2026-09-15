import assert from 'node:assert/strict'
import {
  INTERGROWTH2020_EFW_MAX_GA_DAYS,
  INTERGROWTH2020_EFW_MIN_GA_DAYS,
  INTERGROWTH2020_EFW_VERSION,
  intergrowth2020Efw,
  intergrowth2020EfwParameters,
  intergrowth2020EfwPercentile,
  intergrowth2020EfwQuantile,
  intergrowth2020EfwZScore,
  isIntergrowth2020EfwGaDays,
  lmsQuantile,
  lmsZScore,
  standardNormalCdf,
} from '../src/lib/calculators/intergrowth2020'

let cases = 0

const near = (actual: number | null, expected: number, tol: number, msg: string) => {
  assert.ok(actual !== null, `${msg}: null`)
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${actual} vs ${expected} (tol ${tol})`)
}
const nearRel = (actual: number | null, expected: number, tol: number, msg: string) =>
  near(actual, expected, tol * Math.abs(expected), msg)

/** Transcrição literal do script R oficial (semanas exatas, potência crua). */
const Mu = (t: number): number => -2.42272 + 1.86478 * t ** 0.5 - 1.93299e-5 * t ** 3
const Nu = (t: number): number => 9.43643 + 9.41579 * (t / 10) ** -2 - 83.5422 * Math.log(t / 10) * (t / 10) ** -2
const Sigma = (t: number): number =>
  0.0193557 + 0.0310716 * (t / 10) ** -2 - 0.0657587 * Math.log(t / 10) * (t / 10) ** -2
const R = {
  Mu,
  Nu,
  Sigma,
  Q: (Z: number, t: number): number => Math.exp(Mu(t) * (Z * Sigma(t) * Nu(t) + 1) ** (1 / Nu(t))),
  IG2_Z: (W: number, t: number): number => (1 / (Sigma(t) * Nu(t))) * ((Math.log(W) / Mu(t)) ** Nu(t) - 1),
}

const dias: number[] = []
for (let d = INTERGROWTH2020_EFW_MIN_GA_DAYS; d <= INTERGROWTH2020_EFW_MAX_GA_DAYS; d++) dias.push(d)

// Versão e ausência de sexo fetal na assinatura.
assert.equal(INTERGROWTH2020_EFW_VERSION, 'INTERGROWTH-21st 2020')
assert.equal(intergrowth2020EfwZScore.length, 2)
assert.equal(intergrowth2020EfwQuantile.length, 2)
assert.equal(intergrowth2020EfwPercentile.length, 2)
cases++

// Exemplos do script R: 2000 g em 32+3 (227 d) e Z = 0,5 em 28+4 (200 d).
// Esperados calculados à mão; conferência precisa fica com o coordenador.
{
  const z = intergrowth2020EfwZScore(2000, 32 * 7 + 3)
  near(z, 0.5645, 0.01, 'R example_Z')
  near(z, R.IG2_Z(2000, 32 + 3 / 7), 1e-9, 'R example_Z literal')
  assert.equal(Math.round(intergrowth2020EfwPercentile(2000, 227)!), 71)
  const q = intergrowth2020EfwQuantile(0.5, 28 * 7 + 4)
  near(q, 1269.6, 1, 'R example_quantile')
  nearRel(q, R.Q(0.5, 28 + 4 / 7), 1e-10, 'R example_quantile literal')
  const r = intergrowth2020Efw(2000, 227)!
  assert.equal(r.version, INTERGROWTH2020_EFW_VERSION)
  assert.equal(r.zScore, z)
  assert.equal(r.percentile, intergrowth2020EfwPercentile(2000, 227))
  cases++
}

// Todos os dias 126..280 conferidos contra a transcrição literal do R.
for (const d of dias) {
  const t = d / 7
  const p = intergrowth2020EfwParameters(d)!
  nearRel(p.lambda, R.Nu(t), 1e-12, `λ ${d}`)
  nearRel(p.mu, R.Mu(t), 1e-12, `μ ${d}`)
  nearRel(p.sigma, R.Sigma(t), 1e-12, `σ ${d}`)
  for (const z of [-2, -1, 1, 2]) nearRel(intergrowth2020EfwQuantile(z, d), R.Q(z, t), 1e-9, `Q ${z} ${d}`)
  for (const w of [500, 1500, 3000]) near(intergrowth2020EfwZScore(w, d), R.IG2_Z(w, t), 1e-7, `Z ${w} ${d}`)
  cases++
}

// μ é ln do p50: quantil(0) = exp(μ), Z(exp(μ)) = 0, percentil 50.
{
  let anterior = 0
  for (const d of dias) {
    const { mu } = intergrowth2020EfwParameters(d)!
    const p50 = intergrowth2020EfwQuantile(0, d)!
    nearRel(p50, Math.exp(mu), 1e-14, `p50 ${d}`)
    near(intergrowth2020EfwZScore(Math.exp(mu), d), 0, 1e-12, `Z p50 ${d}`)
    near(intergrowth2020EfwPercentile(Math.exp(mu), d), 50, 1e-9, `centil p50 ${d}`)
    assert.ok(p50 > anterior, `p50 crescente ${d}`)
    anterior = p50
  }
  // Não é LMS sobre peso cru: μ está na escala ln (≈ 7,5 em 32 semanas, não ≈ 1900).
  const { mu } = intergrowth2020EfwParameters(227)!
  assert.ok(mu > 7 && mu < 8)
  cases++
}

// Inversão Z ↔ peso e monotonia em Z.
for (const d of dias) {
  let anterior = 0
  for (let z = -4; z <= 4; z += 0.5) {
    const w = intergrowth2020EfwQuantile(z, d)!
    near(intergrowth2020EfwZScore(w, d), z, 1e-9, `Z(Q(${z})) ${d}`)
    assert.ok(w > anterior, `Q crescente em Z ${d}`)
    anterior = w
  }
  for (const w of [300, 1000, 2500, 4000]) {
    nearRel(intergrowth2020EfwQuantile(intergrowth2020EfwZScore(w, d)!, d), w, 1e-9, `Q(Z(${w})) ${d}`)
  }
  cases++
}

// λ cruza zero perto de 29 semanas; forma geral estável e contínua.
{
  assert.ok(intergrowth2020EfwParameters(196)!.lambda < 0)
  assert.ok(intergrowth2020EfwParameters(210)!.lambda > 0)
  const menor = dias.reduce((a, b) =>
    Math.abs(intergrowth2020EfwParameters(a)!.lambda) <= Math.abs(intergrowth2020EfwParameters(b)!.lambda) ? a : b,
  )
  assert.ok(menor >= 196 && menor <= 210, `menor |λ| em ${menor}`)
  assert.ok(Math.abs(intergrowth2020EfwParameters(menor)!.lambda) < 0.05)

  // Fórmula limite exata em λ = 0.
  const mu = 7.2
  const sigma = 0.015
  const y = Math.log(1500)
  const zero = { lambda: 0, mu, sigma }
  assert.equal(lmsZScore(y, zero), Math.log(y / mu) / sigma)
  assert.equal(lmsQuantile(1.3, zero), mu * Math.exp(sigma * 1.3))
  // λ desprezível cai no limite; λ pequeno ±1e−6 converge ao limite.
  nearRel(lmsZScore(y, { lambda: 1e-13, mu, sigma }), Math.log(y / mu) / sigma, 1e-12, 'Z λ 1e-13')
  for (const lambda of [1e-6, -1e-6, 1e-4, -1e-4]) {
    const p = { lambda, mu, sigma }
    const z = lmsZScore(y, p)!
    nearRel(z, Math.log(y / mu) / sigma, 10 * Math.abs(lambda), `Z λ ${lambda}`)
    nearRel(lmsQuantile(1.3, p), mu * Math.exp(sigma * 1.3), 10 * Math.abs(lambda), `Q λ ${lambda}`)
    nearRel(lmsQuantile(z, p), y, 1e-12, `inversão λ ${lambda}`)
  }
  // Base 1 + Z·σ·λ ≤ 0 não tem quantil.
  assert.equal(lmsQuantile(-1 / (sigma * 0.5), { lambda: 0.5, mu, sigma }), null)
  assert.equal(intergrowth2020EfwQuantile(1e6, 126), null)
  assert.equal(intergrowth2020EfwQuantile(-1e6, 280), null)
  cases++
}

// Limites de IG: dias inteiros 126..280, sem clamp.
{
  for (const d of [126, 280]) {
    assert.ok(isIntergrowth2020EfwGaDays(d))
    assert.ok(intergrowth2020EfwParameters(d) !== null)
    assert.ok(intergrowth2020EfwZScore(1000, d) !== null)
    assert.ok(intergrowth2020EfwQuantile(0, d) !== null)
    assert.ok(intergrowth2020EfwPercentile(1000, d) !== null)
    cases++
  }
  const invalidos: unknown[] = [
    125, 281, 0, -200, 18, 40, 200.5, 125.9999, 280.0001, Number.NaN,
    Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '200', null, undefined, [200],
  ]
  for (const d of invalidos) {
    const ga = d as number
    assert.equal(isIntergrowth2020EfwGaDays(d), false, `IG ${String(d)}`)
    assert.equal(intergrowth2020EfwParameters(ga), null)
    assert.equal(intergrowth2020EfwZScore(1000, ga), null)
    assert.equal(intergrowth2020EfwQuantile(0, ga), null)
    assert.equal(intergrowth2020EfwPercentile(1000, ga), null)
    assert.equal(intergrowth2020Efw(1000, ga), null)
    cases++
  }
}

// Peso: positivo e finito; ln(peso) precisa ser > 0.
for (const w of [0, -0, -1, -2000, 1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '2000', null]) {
  const peso = w as number
  assert.equal(intergrowth2020EfwZScore(peso, 227), null, `peso ${String(w)}`)
  assert.equal(intergrowth2020EfwPercentile(peso, 227), null)
  assert.equal(intergrowth2020Efw(peso, 227), null)
  cases++
}
for (const z of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '0']) {
  assert.equal(intergrowth2020EfwQuantile(z as number, 227), null, `z ${String(z)}`)
  cases++
}
assert.equal(lmsZScore(1, { lambda: 1, mu: 0, sigma: 0.01 }), null)
assert.equal(lmsZScore(1, { lambda: 1, mu: 7, sigma: 0 }), null)
assert.equal(lmsQuantile(0, { lambda: Number.NaN, mu: 7, sigma: 0.01 }), null)
cases++

// CDF normal local: valores de referência, simetria, monotonia e caudas.
{
  assert.equal(standardNormalCdf(0), 0.5)
  for (const [z, p] of [
    [1, 0.8413447460685429],
    [-1, 0.15865525393145707],
    [-1.96, 0.024997895148220435],
    [1.959963984540054, 0.975],
    [1.6448536269514722, 0.95],
    [-2.3263478740408408, 0.01],
    [-3, 0.0013498980316300946],
  ] as const) {
    near(standardNormalCdf(z), p, 1e-9, `Φ(${z})`)
  }
  let anterior = -1
  for (let z = -8.5; z <= 8.5; z += 0.25) {
    const p = standardNormalCdf(z)!
    near(p + standardNormalCdf(-z)!, 1, 1e-14, `simetria ${z}`)
    // Tolerância para ruído de arredondamento na cauda (Φ < 1e−16).
    assert.ok(p >= anterior - 1e-15 && p >= 0 && p <= 1, `monotonia ${z}`)
    anterior = p
  }
  assert.equal(standardNormalCdf(-9.5), 0)
  assert.equal(standardNormalCdf(9.5), 1)
  for (const z of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(standardNormalCdf(z), null)
  }
  cases++
}

// Cached results from official intergrowth_hadlock_efw_calculator_1.xlsx,
// sheet1 row 6: GA E6=171, weight AI6, z AM6 and probability AN6.
near(intergrowth2020EfwZScore(870.16177215199957, 171), 2.5499428963771749, 1e-12, 'official XLSX z')
near(intergrowth2020EfwPercentile(870.16177215199957, 171), 99.461297176800756, 1e-10, 'official XLSX percentile')
for (const [z, p] of [[-4, 0.000031671241833119965], [-6, 9.865876450377012e-10], [-8, 6.220960574271819e-16]] as const) {
  near(standardNormalCdf(z)! / p, 1, 1e-12, `relative tail ${z}`)
}
cases += 5
console.log(`${INTERGROWTH2020_EFW_VERSION} EFW: ${cases} cases passed (R literal, inversion, p50, λ≈0, limits, invalid, CDF, official XLSX)`)
