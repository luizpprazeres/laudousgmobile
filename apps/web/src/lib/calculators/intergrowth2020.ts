/**
 * PESO FETAL ESTIMADO — padrão INTERGROWTH-21st 2020 (sem sexo fetal).
 *
 * Fonte: Stirnemann J, Salomon LJ, Papageorghiou AT. INTERGROWTH-21st standards
 * for Hadlock's estimation of fetal weight. Ultrasound Obstet Gynecol
 * 2020;56:946-948. https://doi.org/10.1002/uog.22000
 * Equações da Table S1 e do script R oficial (intergrowth21.com), com GA em
 * semanas exatas (t = dias/7):
 *   λ(t) = 9,43643 + 9,41579·(t/10)⁻² − 83,54220·ln(t/10)·(t/10)⁻²
 *   μ(t) = −2,42272 + 1,86478·t^0,5 − 1,93299e−5·t³
 *   σ(t) = 0,0193557 + 0,0310716·(t/10)⁻² − 0,0657587·ln(t/10)·(t/10)⁻²
 * O LMS é aplicado sobre Y = ln(peso g), não sobre o peso cru:
 *   Z = [(Y/μ)^λ − 1] / (σ·λ)        (λ = 0: Z = ln(Y/μ)/σ)
 *   ln(C) = μ·(1 + Z·σ·λ)^(1/λ)      (λ = 0: ln(C) = μ·exp(σ·Z))
 *
 * Domínio: política INTERGROWTH-21st de out/2025 recomenda EFW de 18 a 40
 * semanas; aqui só dias inteiros 126..280, sem clamp nem extrapolação.
 *
 * A curva foi construída com Hadlock HC/AC/FL (3 parâmetros). Este motor não
 * associa automaticamente o Hadlock 1985 de 4 parâmetros (fetalWeight.ts).
 */

export const INTERGROWTH2020_EFW_VERSION = 'INTERGROWTH-21st 2020' as const
export const INTERGROWTH2020_EFW_REFERENCE_FORMULA = 'Hadlock HC/AC/FL (3 parâmetros)' as const
export const INTERGROWTH2020_EFW_MIN_GA_DAYS = 126
export const INTERGROWTH2020_EFW_MAX_GA_DAYS = 280

/** Parâmetros LMS do padrão numa IG: λ (assimetria), μ (média de ln peso), σ (coef. variação). */
export type LmsParameters = {
  lambda: number
  mu: number
  sigma: number
}

/**
 * λ cruza zero perto de 29 semanas. Com expm1/log1p a forma geral já é estável;
 * abaixo deste limiar usa-se a fórmula limite (erro relativo da ordem de λ).
 */
const LAMBDA_ZERO_EPSILON = 1e-10

/** IG em dias inteiros dentro de 126..280. */
export function isIntergrowth2020EfwGaDays(gaDays: unknown): gaDays is number {
  return (
    typeof gaDays === 'number' &&
    Number.isInteger(gaDays) &&
    gaDays >= INTERGROWTH2020_EFW_MIN_GA_DAYS &&
    gaDays <= INTERGROWTH2020_EFW_MAX_GA_DAYS
  )
}

/** λ, μ e σ da Table S1; `null` fora do domínio de IG. */
export function intergrowth2020EfwParameters(gaDays: number): LmsParameters | null {
  if (!isIntergrowth2020EfwGaDays(gaDays)) return null
  const t = gaDays / 7
  const inv2 = (t / 10) ** -2
  const logT10 = Math.log(t / 10)
  const lambda = 9.43643 + 9.41579 * inv2 - 83.5422 * logT10 * inv2
  const mu = -2.42272 + 1.86478 * Math.sqrt(t) - 1.93299e-5 * t ** 3
  const sigma = 0.0193557 + 0.0310716 * inv2 - 0.0657587 * logT10 * inv2
  if (![lambda, mu, sigma].every(Number.isFinite) || mu <= 0 || sigma <= 0) return null
  return { lambda, mu, sigma }
}

function parametrosValidos(params: LmsParameters): boolean {
  return (
    Number.isFinite(params.lambda) &&
    Number.isFinite(params.mu) &&
    Number.isFinite(params.sigma) &&
    params.mu > 0 &&
    params.sigma > 0
  )
}

/** Z-score LMS de um valor já transformado (aqui Y = ln peso). `null` se Y ≤ 0 ou não finito. */
export function lmsZScore(value: number, params: LmsParameters): number | null {
  if (!Number.isFinite(value) || value <= 0 || !parametrosValidos(params)) return null
  const { lambda, mu, sigma } = params
  const logRatio = Math.log(value / mu)
  const z =
    Math.abs(lambda) < LAMBDA_ZERO_EPSILON
      ? logRatio / sigma
      : Math.expm1(lambda * logRatio) / (sigma * lambda)
  return Number.isFinite(z) ? z : null
}

/** Valor LMS (aqui Y = ln peso) para um Z; `null` se 1 + Z·σ·λ ≤ 0 ou resultado inválido. */
export function lmsQuantile(z: number, params: LmsParameters): number | null {
  if (!Number.isFinite(z) || !parametrosValidos(params)) return null
  const { lambda, mu, sigma } = params
  let value: number
  if (Math.abs(lambda) < LAMBDA_ZERO_EPSILON) {
    value = mu * Math.exp(sigma * z)
  } else {
    const base = z * sigma * lambda
    if (base <= -1) return null
    value = mu * Math.exp(Math.log1p(base) / lambda)
  }
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Z-score do peso (g) na IG (dias inteiros 126..280). `null` em domínio inválido. */
export function intergrowth2020EfwZScore(weightG: number, gaDays: number): number | null {
  if (typeof weightG !== 'number' || !Number.isFinite(weightG) || weightG <= 0) return null
  const params = intergrowth2020EfwParameters(gaDays)
  if (!params) return null
  return lmsZScore(Math.log(weightG), params)
}

/** Peso (g) correspondente a um Z na IG. `null` em domínio inválido. */
export function intergrowth2020EfwQuantile(z: number, gaDays: number): number | null {
  if (typeof z !== 'number') return null
  const params = intergrowth2020EfwParameters(gaDays)
  if (!params) return null
  const logWeight = lmsQuantile(z, params)
  if (logWeight === null) return null
  const weightG = Math.exp(logWeight)
  return Number.isFinite(weightG) && weightG > 0 ? weightG : null
}

/** Percentil 0..100 sem arredondamento. `null` em domínio inválido. */
export function intergrowth2020EfwPercentile(weightG: number, gaDays: number): number | null {
  const z = intergrowth2020EfwZScore(weightG, gaDays)
  if (z === null) return null
  const p = standardNormalCdf(z)
  return p === null ? null : 100 * p
}

export type Intergrowth2020EfwResult = {
  version: typeof INTERGROWTH2020_EFW_VERSION
  gaDays: number
  weightG: number
  zScore: number
  percentile: number
}

/** Z e percentil juntos, com rótulo de versão; `null` em domínio inválido. */
export function intergrowth2020Efw(weightG: number, gaDays: number): Intergrowth2020EfwResult | null {
  const zScore = intergrowth2020EfwZScore(weightG, gaDays)
  const percentile = intergrowth2020EfwPercentile(weightG, gaDays)
  if (zScore === null || percentile === null) return null
  return { version: INTERGROWTH2020_EFW_VERSION, gaDays, weightG, zScore, percentile }
}

/**
 * CDF normal padrão Φ(z). Não havia implementação local no web; sem
 * dependências novas. Série de Marsaglia (J Stat Softw 2004;11(4)):
 *   Φ(z) = 1/2 + φ(z)·(z + z³/3 + z⁵/(3·5) + …)
 * Nas caudas |z| >= 4, fracao continua de Laplace para a razao de Mills
 * evita o cancelamento de 0.5 - soma. Fora de |z| < 9 retorna
 * 0 ou 1 (Φ(−9) ≈ 1,1e−19). `null` para não finitos.
 */
export function standardNormalCdf(z: number): number | null {
  if (typeof z !== 'number' || !Number.isFinite(z)) return null
  if (z <= -9) return 0
  if (z >= 9) return 1
  const a = Math.abs(z)
  if (a >= 4) {
    let denominator = 0
    for (let n = 200; n >= 1; n--) denominator = n / (a + denominator)
    const tail = Math.exp(-0.5 * a * a - 0.91893853320467274178) / (a + denominator)
    return z < 0 ? tail : 1 - tail
  }
  const q = z * z
  let sum = z
  let term = z
  let previous = Number.NaN
  for (let i = 1, n = 0; sum !== previous && n < 1000; n++) {
    previous = sum
    i += 2
    term *= q / i
    sum = previous + term
  }
  const p = 0.5 + sum * Math.exp(-0.5 * q - 0.91893853320467274178)
  return Math.min(1, Math.max(0, p))
}
