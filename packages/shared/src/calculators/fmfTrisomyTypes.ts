export type Ethnicity = 'white' | 'black' | 'south_asian' | 'east_asian' | 'mixed'

export interface FmfInput {
  maternalAge: number          // anos, DECIMAL, na data do exame: (exame − nascimento)/365,25 (15-50). O motor converte para a idade na DPP como o app da FMF (15/09/2026).
  crl: number                  // mm (45-84)
  nt: number                   // mm
  fhr?: number                 // bpm (80-220)
  /** IG DATADA do exame em dias (DUM/datação manual). O app da FMF usa esta IG na FCF esperada e na bioquímica; prior e NT usam o CRL. Se ausente, usa a IG do CRL. */
  gaDaysDated?: number
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
  /** T13 e T18 combinadas (p13 + p18), como o app da FMF exibe ("Trisomy 13/18"). */
  t18t13: TrisomyRisk
  /** O app da FMF exibe risco menor que 1:10000 como "<1 in 10000"; use este teto na apresentação. */
  displayCapRatio: number
  /** O app não exibe risco maior que "1 in 2"; use este piso na apresentação. */
  displayFloorRatio: number
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
