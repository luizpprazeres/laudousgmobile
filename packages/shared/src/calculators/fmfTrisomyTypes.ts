export type Ethnicity = 'white' | 'black' | 'south_asian' | 'east_asian' | 'mixed'

export interface FmfInput {
  maternalAge: number          // anos (15-50)
  crl: number                  // mm (45-84)
  nt: number                   // mm
  fhr?: number                 // bpm (80-220)
  freeBetaHcgMoM?: number     // MoM corrigido
  pappaMoM?: number           // MoM corrigido
  dvPI?: number               // DV pulsatility index
  tricuspidRegurgitation?: boolean
  nasalBoneAbsent?: boolean
  smoking?: boolean
  ethnicity?: Ethnicity
  weight?: number              // kg
  previousT21?: boolean
  previousT18?: boolean
  previousT13?: boolean
  /** Na v1, a bioquímica deve ser informada como MoM já corrigido pelo laboratório. */
  isMoMCorrected?: true
}

export interface TrisomyRisk {
  probability: number          // ex: 0.004 = 1/250
  ratio: number                // ex: 250 (denominador do 1/N)
  category: 'alto' | 'intermediario' | 'baixo'
}

export interface FmfResult {
  modelVersion: string
  parameterFingerprint: string
  clinicalStatus: 'validation-pending'
  basal: {
    t21: TrisomyRisk
    t18: TrisomyRisk
    t13: TrisomyRisk
  }
  t21: TrisomyRisk
  t18: TrisomyRisk
  t13: TrisomyRisk
  gaDays: number
  gaWeeks: number
  gaDaysRemainder: number
  markersUsed: string[]
  markersMissing: string[]
  warnings: string[]
}

export class FmfTrisomyDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FmfTrisomyDomainError'
  }
}
