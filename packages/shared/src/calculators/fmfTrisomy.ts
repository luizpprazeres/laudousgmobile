import { FmfTrisomyDomainError, type FmfInput, type FmfResult, type TrisomyRisk, type Ethnicity } from './fmfTrisomyTypes'
import {
  NT_MIX, DVPI_MIX, TRICUSPID, NASAL_BONE, FMF_TRISOMY_SOURCE_FINGERPRINT,
  GAUSS_MEAN_T21, GAUSS_MEAN_T18, GAUSS_MEAN_T13,
  GAUSS_SD, GAUSS_COR, GAUSS_TRUNCATION,
  LR_MIN, LR_MAX,
  NT_TLIMITS, DVPI_TLIMITS_T21, DVPI_TLIMITS_T18, DVPI_TLIMITS_T13,
} from './fmfTrisomyParams'

export const FMF_TRISOMY_MODEL_VERSION = 'FMF-R-extract-2026-06-26/v1'
export const FMF_TRISOMY_PARAMETER_FINGERPRINT = FMF_TRISOMY_SOURCE_FINGERPRINT

// ── Helpers ────────────────────────────────────────────────────────────

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x))
}

function dnorm(x: number, mu: number, sd: number): number {
  const z = (x - mu) / sd
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI))
}

/** Robinson-Fleming: CRL (mm) → GA (days) */
export function crlToGaDays(crl: number): number {
  return 23.73 + 8.052 * Math.sqrt(1.037 * crl)
}

/** Expected FHR at gestational age (Kagan 2008) */
function expectedFhr(gaDays: number): number {
  return 265.98 - 1.7631 * gaDays + 0.0064445 * gaDays * gaDays
}

/** Multivariate normal PDF for 2D or 3D (no external deps) */
function dmvnorm(x: number[], sigma: number[][]): number {
  const n = x.length
  const value = (index: number) => x[index]!
  const matrix = (row: number, column: number) => sigma[row]![column]!
  if (n === 1) return dnorm(value(0), 0, Math.sqrt(matrix(0, 0)))

  if (n === 2) {
    const det = matrix(0, 0) * matrix(1, 1) - matrix(0, 1) * matrix(1, 0)
    if (det <= 0) return 0
    const inv = [
      [matrix(1, 1) / det, -matrix(0, 1) / det],
      [-matrix(1, 0) / det, matrix(0, 0) / det],
    ]
    const inverse = (row: number, column: number) => inv[row]![column]!
    const q = inverse(0, 0) * value(0) * value(0) + (inverse(0, 1) + inverse(1, 0)) * value(0) * value(1) + inverse(1, 1) * value(1) * value(1)
    return Math.exp(-0.5 * q) / (2 * Math.PI * Math.sqrt(det))
  }

  if (n === 3) {
    const det =
      matrix(0, 0) * (matrix(1, 1) * matrix(2, 2) - matrix(1, 2) * matrix(2, 1)) -
      matrix(0, 1) * (matrix(1, 0) * matrix(2, 2) - matrix(1, 2) * matrix(2, 0)) +
      matrix(0, 2) * (matrix(1, 0) * matrix(2, 1) - matrix(1, 1) * matrix(2, 0))
    if (det <= 0) return 0

    // cofactor matrix (transposed = inverse * det)
    const inv = [
      [(matrix(1, 1)*matrix(2, 2) - matrix(1, 2)*matrix(2, 1)) / det, (matrix(0, 2)*matrix(2, 1) - matrix(0, 1)*matrix(2, 2)) / det, (matrix(0, 1)*matrix(1, 2) - matrix(0, 2)*matrix(1, 1)) / det],
      [(matrix(1, 2)*matrix(2, 0) - matrix(1, 0)*matrix(2, 2)) / det, (matrix(0, 0)*matrix(2, 2) - matrix(0, 2)*matrix(2, 0)) / det, (matrix(0, 2)*matrix(1, 0) - matrix(0, 0)*matrix(1, 2)) / det],
      [(matrix(1, 0)*matrix(2, 1) - matrix(1, 1)*matrix(2, 0)) / det, (matrix(0, 1)*matrix(2, 0) - matrix(0, 0)*matrix(2, 1)) / det, (matrix(0, 0)*matrix(1, 1) - matrix(0, 1)*matrix(1, 0)) / det],
    ]
    let q = 0
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        q += inv[i]![j]! * value(i) * value(j)
    return Math.exp(-0.5 * q) / (Math.pow(2 * Math.PI, 1.5) * Math.sqrt(det))
  }
  return 0
}

/** Build covariance matrix from SDs and correlation matrix */
function buildCov(sd: readonly number[], cor: readonly (readonly number[])[]): number[][] {
  const n = sd.length
  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      cov[i]![j] = sd[i]! * cor[i]![j]! * sd[j]!
  return cov
}

// ── 1. Prior Risk (Cuckle model) ───────────────────────────────────────

interface PriorResult { u: number; t21: number; t18: number; t13: number }

function computePriorRisk(
  ma: number, gaDays: number,
  prevT21 = false, prevT18 = false, prevT13 = false
): PriorResult {
  ma = clamp(ma, 15, 50)
  const ga = gaDays

  // Cuckle model for T21 at term
  const priorProb = 0.000627 + Math.exp(-16.2395 + 0.286 * (ma - 0.5))

  // Relative prevalence at gestational age (Snijders 1999)
  const lgGA7 = Math.log10(ga / 7)
  const rpT21 = Math.pow(10, 0.9425 - 1.023 * lgGA7 + 0.2718 * lgGA7 * lgGA7)
  const rpT18 = -0.142396674 + 63.5954883 / ga
  const rpT13 = -0.032203267 + 19.09501251 / ga

  // Previous trisomy corrections
  const prevT18Coeff = 0.006 / (-0.142396674 + 63.5954883 / 84)
  const prevT13Coeff = 0.006 / (-0.032203267 + 19.09501251 / 84)
  const prevT21Coeff = 0.0042

  const priorT21 = (priorProb + (prevT21 ? 1 : 0) * prevT21Coeff) * rpT21
  const priorT18 = (priorProb + (prevT18 ? 1 : 0) * prevT18Coeff) * rpT18
  const priorT13 = (priorProb + (prevT13 ? 1 : 0) * prevT13Coeff) * rpT13
  const priorU = 1 - (priorT21 + priorT18 + priorT13)

  return { u: priorU, t21: priorT21, t18: priorT18, t13: priorT13 }
}

// ── 2. NT Mixture Model LR (Wright 2008) ──────────────────────────────

interface LRResult { t21: number; t18: number; t13: number }

function computeNtLR(nt: number, crl: number): LRResult {
  const p = NT_MIX
  const logNt = Math.log10(nt)
  const crlR = Math.round(crl * 10) / 10 // round to 0.1mm

  // Total SDs (add operator variance)
  const sr = Math.sqrt(p.sd ** 2 + p.sdOp ** 2)
  const sc = Math.sqrt(p.sdB ** 2 + p.sdOp ** 2)
  const sdT21 = Math.sqrt(p.sdT21 ** 2 + p.sdOp ** 2)
  const sdT18 = Math.sqrt(p.sdT18 ** 2 + p.sdOp ** 2)
  const sdT13 = Math.sqrt(p.sdT13 ** 2 + p.sdOp ** 2)

  // CRL-dependent mean
  const mr = p.b0 + p.b1 * crlR + p.b2 * crlR * crlR

  // Unaffected mixing proportion
  const pu = 1 / (1 + Math.exp(-(p.a0 + p.a1 * crlR)))

  // Unaffected likelihood
  const likU = (1 - pu) * dnorm(logNt, mr, sr) + pu * dnorm(logNt, p.m1, sc)

  // Get truncation limit (identical for all trisomies)
  const tlKey = Math.round(crlR * 10)
  const truncLimit = NT_TLIMITS.get(tlKey) ?? 1.01

  // Helper: compute LR with truncation
  function ntLR(pAff: number, mAff: number, sdAff: number): number {
    let likAff = (1 - pAff) * dnorm(logNt, mr, sr) + pAff * dnorm(logNt, mAff, sdAff)
    if (nt < truncLimit) {
      const logTrunc = Math.log10(truncLimit)
      const likAffTrunc = (1 - pAff) * dnorm(logTrunc, mr, sr) + pAff * dnorm(logTrunc, mAff, sdAff)
      const likUTrunc = (1 - pu) * dnorm(logTrunc, mr, sr) + pu * dnorm(logTrunc, p.m1, sc)
      likAff = (likAffTrunc / likUTrunc) * likU
    }
    return likU > 0 ? likAff / likU : 1
  }

  return {
    t21: ntLR(p.p21, p.m21, sdT21),
    t18: ntLR(p.p18, p.m18, sdT18),
    t13: ntLR(p.p13, p.m13, sdT13),
  }
}

// ── 3. Biochemistry + FHR Gaussian LR (Kagan 2008) ───────────────────

function computeBiochemLR(
  fbhcgMoM: number | undefined, pappaMoM: number | undefined,
  fhr: number | undefined, gaDays: number
): LRResult | null {
  // Determine which markers are available
  const hasHcg = fbhcgMoM != null
  const hasPappa = pappaMoM != null
  const hasFhr = fhr != null
  if (!hasHcg && !hasPappa && !hasFhr) return null

  // Build vectors based on available markers
  const values: number[] = []
  const sdUn: number[] = []
  const sdT21: number[] = []
  const sdT18: number[] = []
  const sdT13: number[] = []
  const muT21: number[] = []
  const muT18: number[] = []
  const muT13: number[] = []
  const corIndices: number[] = []

  const gaDiff = gaDays - 77
  const meanCoeffFn = (m: { b0: number; b1: number; b2: number }) =>
    m.b0 + m.b1 * gaDiff + m.b2 * gaDiff * 2 // NOTE: ×2 not ×gaDiff² per R code

  if (hasHcg) {
    const tl = GAUSS_TRUNCATION.fbhcgT1
    const logMoM = clamp(Math.log10(clamp(fbhcgMoM!, tl.lower, tl.upper)), Math.log10(tl.lower), Math.log10(tl.upper))
    values.push(logMoM)
    sdUn.push(GAUSS_SD.un[0]); sdT21.push(GAUSS_SD.t21[0]); sdT18.push(GAUSS_SD.t18[0]); sdT13.push(GAUSS_SD.t13[0])
    muT21.push(meanCoeffFn(GAUSS_MEAN_T21.fbhcgT1))
    muT18.push(meanCoeffFn(GAUSS_MEAN_T18.fbhcgT1))
    muT13.push(meanCoeffFn(GAUSS_MEAN_T13.fbhcgT1))
    corIndices.push(0)
  }

  if (hasPappa) {
    const tl = GAUSS_TRUNCATION.pappa
    const logMoM = clamp(Math.log10(clamp(pappaMoM!, tl.lower, tl.upper)), Math.log10(tl.lower), Math.log10(tl.upper))
    values.push(logMoM)
    sdUn.push(GAUSS_SD.un[1]); sdT21.push(GAUSS_SD.t21[1]); sdT18.push(GAUSS_SD.t18[1]); sdT13.push(GAUSS_SD.t13[1])
    muT21.push(meanCoeffFn(GAUSS_MEAN_T21.pappa))
    muT18.push(meanCoeffFn(GAUSS_MEAN_T18.pappa))
    muT13.push(meanCoeffFn(GAUSS_MEAN_T13.pappa))
    corIndices.push(1)
  }

  if (hasFhr) {
    const expectedFHR = expectedFhr(gaDays)
    const deltaFhr = clamp(fhr! - expectedFHR, GAUSS_TRUNCATION.fhr.lower, GAUSS_TRUNCATION.fhr.upper)
    values.push(deltaFhr) // raw delta, not log-transformed
    sdUn.push(GAUSS_SD.un[2]); sdT21.push(GAUSS_SD.t21[2]); sdT18.push(GAUSS_SD.t18[2]); sdT13.push(GAUSS_SD.t13[2])
    muT21.push(meanCoeffFn(GAUSS_MEAN_T21.fhr))
    muT18.push(meanCoeffFn(GAUSS_MEAN_T18.fhr))
    muT13.push(meanCoeffFn(GAUSS_MEAN_T13.fhr))
    corIndices.push(2)
  }

  // Extract sub-correlation matrices for available markers
  function subCor(cor: readonly (readonly number[])[]): number[][] {
    return corIndices.map(i => corIndices.map(j => cor[i]![j]!))
  }

  const covUn = buildCov(sdUn, subCor(GAUSS_COR.un))
  const covT21 = buildCov(sdT21, subCor(GAUSS_COR.t21))
  const covT18 = buildCov(sdT18, subCor(GAUSS_COR.t18))
  const covT13 = buildCov(sdT13, subCor(GAUSS_COR.t13))

  // Unaffected: mean = 0 for all markers (log MoM)
  const likUn = dmvnorm(values, covUn)

  // Affected: shift by GA-dependent means
  const xT21 = values.map((v, i) => v - muT21[i]!)
  const xT18 = values.map((v, i) => v - muT18[i]!)
  const xT13 = values.map((v, i) => v - muT13[i]!)

  const likT21 = dmvnorm(xT21, covT21)
  const likT18 = dmvnorm(xT18, covT18)
  const likT13 = dmvnorm(xT13, covT13)

  if (likUn <= 0) return null

  return {
    t21: clamp(likT21 / likUn, LR_MIN, LR_MAX),
    t18: clamp(likT18 / likUn, LR_MIN, LR_MAX),
    t13: clamp(likT13 / likUn, LR_MIN, LR_MAX),
  }
}

// ── 4. Ductus Venosus PI LR ──────────────────────────────────────────

function computeDvLR(dvpi: number, crl: number, isBlack: boolean): LRResult {
  const p = DVPI_MIX
  const eth = isBlack ? 1 : 0
  const crlR = Math.round(crl * 10) / 10

  const sr = Math.sqrt(p.sd ** 2 + p.sdOp ** 2)
  const sc = Math.sqrt(p.sdB ** 2 + p.sdOp ** 2)
  const sdT21 = Math.sqrt(p.sdT21 ** 2 + p.sdOp ** 2)
  const sdT18 = Math.sqrt(p.sdT18 ** 2 + p.sdOp ** 2)
  const sdT13 = Math.sqrt(p.sdT13 ** 2 + p.sdOp ** 2)

  const mr = p.b0 + p.b1 * crlR + p.b2 * crlR * crlR + p.b3 * eth
  const pu = 1 / (1 + Math.exp(-(p.a0 + p.a1 * (crlR - 65) + p.a2 * eth)))

  const tlKey = Math.round(crlR * 10)

  function dvLR(pAff: number, mAff: number, sdAff: number, tlMap: Map<number, number>): number {
    const trunc = tlMap.get(tlKey) ?? 0.88
    const x = Math.max(dvpi, trunc) // truncate below
    const likAff = (1 - pAff) * dnorm(x, mr, sr) + pAff * dnorm(x, mAff, sdAff)
    const likU = (1 - pu) * dnorm(x, mr, sr) + pu * dnorm(x, p.mc, sc)
    return likU > 0 ? clamp(likAff / likU, LR_MIN, LR_MAX) : 1
  }

  return {
    t21: dvLR(p.p21, p.m21, sdT21, DVPI_TLIMITS_T21),
    t18: dvLR(p.p18, p.m18, sdT18, DVPI_TLIMITS_T18),
    t13: dvLR(p.p13, p.m13, sdT13, DVPI_TLIMITS_T13),
  }
}

// ── 5. Tricuspid Regurgitation LR ─────────────────────────────────────

function computeTricuspidLR(tr: boolean, nt: number, smoking: boolean, weight: number): LRResult {
  const p = TRICUSPID
  const trVal = tr ? 1 : 0
  const lpUn = p.intercept + p.nt * nt + p.smoker * (smoking ? 1 : 0) + p.weight * weight

  function trLR(coeff: number): number {
    const lpAff = lpUn + coeff
    const pUn = 1 / (1 + Math.exp(-lpUn))
    const pAff = 1 / (1 + Math.exp(-lpAff))
    const likUn = Math.pow(pUn, trVal) * Math.pow(1 - pUn, 1 - trVal)
    const likAff = Math.pow(pAff, trVal) * Math.pow(1 - pAff, 1 - trVal)
    return likUn > 0 ? likAff / likUn : 1
  }

  return { t21: trLR(p.t21), t18: trLR(p.t18), t13: trLR(p.t13) }
}

// ── 6. Nasal Bone LR ─────────────────────────────────────────────────

function computeNasalBoneLR(
  nbAbsent: boolean, nt: number, crl: number,
  pappaMoM: number | undefined, fbhcgMoM: number | undefined,
  ethnicity: Ethnicity, smoking: boolean
): LRResult {
  const p = NASAL_BONE
  const nb = nbAbsent ? 0 : 1
  const logPappa = Math.log10(pappaMoM ?? 1)
  const logFbhcg = Math.log10(fbhcgMoM ?? 1)

  let ethCoeff = 0
  if (ethnicity === 'black') ethCoeff = p.black
  else if (ethnicity === 'south_asian') ethCoeff = p.asian
  else if (ethnicity === 'mixed') ethCoeff = p.mixed
  else if (ethnicity === 'east_asian') ethCoeff = p.oriental

  const lpUn = p.constant + p.sm * (smoking ? 1 : 0) + p.nt * nt + p.crl * crl
    + p.pLmom * logPappa + p.fLmom * logFbhcg + ethCoeff

  function nbLR(coeff: number): number {
    const lpAff = lpUn + coeff
    const pUn = 1 / (1 + Math.exp(-lpUn))
    const pAff = 1 / (1 + Math.exp(-lpAff))
    // NB inversion: absent (nb=0) = higher risk
    const likUn = Math.pow(pUn, 1 - nb) * Math.pow(1 - pUn, nb)
    const likAff = Math.pow(pAff, 1 - nb) * Math.pow(1 - pAff, nb)
    return likUn > 0 ? likAff / likUn : 1
  }

  return { t21: nbLR(p.t21), t18: nbLR(p.t18), t13: nbLR(p.t13) }
}

// ── Main Calculator ───────────────────────────────────────────────────

function classifyRiskT21(prob: number): TrisomyRisk['category'] {
  const ratio = 1 / prob
  if (ratio <= 100) return 'alto'
  if (ratio <= 1000) return 'intermediario'
  return 'baixo'
}

function classifyRiskT18T13(prob: number): TrisomyRisk['category'] {
  return (1 / prob) <= 100 ? 'alto' : 'baixo'
}

function makeRisk(prob: number, classifier: (p: number) => TrisomyRisk['category']): TrisomyRisk {
  const safeProp = Math.max(prob, 1e-10)
  return {
    probability: safeProp,
    ratio: Math.round(1 / safeProp),
    category: classifier(safeProp),
  }
}

export function calcularTrissomias(input: FmfInput): FmfResult {
  validarEntrada(input)
  const gaDays = crlToGaDays(input.crl)
  const roundedGaDays = Math.round(gaDays)
  const gaWeeks = Math.floor(roundedGaDays / 7)
  const gaDaysRemainder = roundedGaDays % 7
  const markersUsed: string[] = ['Idade materna', 'TN']
  const warnings: string[] = []
  const ethnicity = input.ethnicity ?? 'white'

  // 1. Prior risk
  const prior = computePriorRisk(
    input.maternalAge, gaDays,
    input.previousT21, input.previousT18, input.previousT13
  )
  const basal = {
    t21: makeRisk(prior.t21, classifyRiskT21),
    t18: makeRisk(prior.t18, classifyRiskT18T13),
    t13: makeRisk(prior.t13, classifyRiskT18T13),
  }

  // 2. NT LR
  const ntLR = computeNtLR(input.nt, input.crl)

  // Combined LRs start with NT
  let lrT21 = ntLR.t21
  let lrT18 = ntLR.t18
  let lrT13 = ntLR.t13

  // 3. Biochemistry + FHR
  let fhr = input.fhr
  if (fhr != null) markersUsed.push('FCF')

  const biochemLR = computeBiochemLR(
    input.freeBetaHcgMoM, input.pappaMoM, fhr, gaDays
  )
  if (input.freeBetaHcgMoM != null && (input.freeBetaHcgMoM < GAUSS_TRUNCATION.fbhcgT1.lower || input.freeBetaHcgMoM > GAUSS_TRUNCATION.fbhcgT1.upper)) {
    warnings.push(`Free β-hCG foi truncada para o intervalo ${GAUSS_TRUNCATION.fbhcgT1.lower}–${GAUSS_TRUNCATION.fbhcgT1.upper} MoM.`)
  }
  if (input.pappaMoM != null && (input.pappaMoM < GAUSS_TRUNCATION.pappa.lower || input.pappaMoM > GAUSS_TRUNCATION.pappa.upper)) {
    warnings.push(`PAPP-A foi truncada para o intervalo ${GAUSS_TRUNCATION.pappa.lower}–${GAUSS_TRUNCATION.pappa.upper} MoM.`)
  }
  if (input.fhr != null) {
    const delta = input.fhr - expectedFhr(gaDays)
    if (delta < GAUSS_TRUNCATION.fhr.lower || delta > GAUSS_TRUNCATION.fhr.upper) {
      warnings.push('A diferença da FCF foi truncada ao limite previsto pelo modelo.')
    }
  }
  if (biochemLR) {
    lrT21 *= biochemLR.t21
    lrT18 *= biochemLR.t18
    lrT13 *= biochemLR.t13
    if (input.freeBetaHcgMoM != null) markersUsed.push('Free β-hCG')
    if (input.pappaMoM != null) markersUsed.push('PAPP-A')
  }

  // 4. Ductus Venosus
  if (input.dvPI != null) {
    const dvLR = computeDvLR(input.dvPI, input.crl, ethnicity === 'black')
    lrT21 *= dvLR.t21
    lrT18 *= dvLR.t18
    lrT13 *= dvLR.t13
    markersUsed.push('Ducto venoso')
  }

  // 5. Tricuspid
  if (input.tricuspidRegurgitation != null) {
    const trLR = computeTricuspidLR(
      input.tricuspidRegurgitation, input.nt,
      input.smoking ?? false, input.weight ?? 69
    )
    lrT21 *= trLR.t21
    lrT18 *= trLR.t18
    lrT13 *= trLR.t13
    markersUsed.push('Tricúspide')
  }

  // 6. Nasal Bone
  if (input.nasalBoneAbsent != null) {
    const nbLR = computeNasalBoneLR(
      input.nasalBoneAbsent, input.nt, input.crl,
      input.pappaMoM, input.freeBetaHcgMoM,
      ethnicity, input.smoking ?? false
    )
    lrT21 *= nbLR.t21
    lrT18 *= nbLR.t18
    lrT13 *= nbLR.t13
    markersUsed.push('Osso nasal')
  }

  // 7. Posterior probabilities
  const postT21 = prior.t21 * lrT21
  const postT18 = prior.t18 * lrT18
  const postT13 = prior.t13 * lrT13
  const total = prior.u + postT21 + postT18 + postT13

  const riskT21 = postT21 / total
  const riskT18 = postT18 / total
  const riskT13 = postT13 / total

  const allOptionalMarkers = ['FCF', 'Free β-hCG', 'PAPP-A', 'Ducto venoso', 'Tricúspide', 'Osso nasal']
  const markersMissing = allOptionalMarkers.filter(marker => !markersUsed.includes(marker))

  return {
    modelVersion: FMF_TRISOMY_MODEL_VERSION,
    parameterFingerprint: FMF_TRISOMY_PARAMETER_FINGERPRINT,
    clinicalStatus: 'validation-pending',
    basal,
    t21: makeRisk(riskT21, classifyRiskT21),
    t18: makeRisk(riskT18, classifyRiskT18T13),
    t13: makeRisk(riskT13, classifyRiskT18T13),
    gaDays: roundedGaDays,
    gaWeeks,
    gaDaysRemainder,
    markersUsed,
    markersMissing,
    warnings,
  }
}

function validarEntrada(input: FmfInput): void {
  validarFaixa(input.maternalAge, 15, 50, 'idade materna')
  validarFaixa(input.crl, 45, 84, 'CCN')
  validarFaixa(input.nt, 0.5, 10, 'translucência nucal')
  validarOpcional(input.fhr, 80, 220, 'frequência cardíaca fetal')
  validarPositivo(input.freeBetaHcgMoM, 'Free β-hCG')
  validarPositivo(input.pappaMoM, 'PAPP-A')
  validarPositivo(input.dvPI, 'IP do ducto venoso')

  if ((input.freeBetaHcgMoM != null || input.pappaMoM != null) && input.isMoMCorrected !== true) {
    throw new FmfTrisomyDomainError('A bioquímica deve ser informada como MoM já corrigido pelo laboratório.')
  }
  if (input.tricuspidRegurgitation != null) {
    validarFaixa(input.weight, 35, 200, 'peso materno para o marcador tricúspide')
  } else if (input.weight != null) {
    validarFaixa(input.weight, 35, 200, 'peso materno')
  }
}

function validarFaixa(value: number | undefined, min: number, max: number, field: string): void {
  if (value == null || !Number.isFinite(value) || value < min || value > max) {
    throw new FmfTrisomyDomainError(`${field}: informe um valor entre ${min} e ${max}.`)
  }
}

function validarOpcional(value: number | undefined, min: number, max: number, field: string): void {
  if (value != null) validarFaixa(value, min, max, field)
}

function validarPositivo(value: number | undefined, field: string): void {
  if (value != null && (!Number.isFinite(value) || value <= 0)) {
    throw new FmfTrisomyDomainError(`${field}: informe um valor maior que zero.`)
  }
}
