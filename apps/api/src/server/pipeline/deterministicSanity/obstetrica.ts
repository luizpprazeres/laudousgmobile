import type { ExtractedValues, SanityFlag } from './types'

/** Interpolação linear entre semanas. Retorna [min, max] ou undefined se fora de tabela. */
function weightRangeForIG(ig: number): [number, number] | undefined {
  const TABLE: Array<[number, number, number]> = [
    // [semanas, min_g, max_g]
    [8,  1,   20],
    [10, 10,  60],
    [12, 25,  130],
    [14, 60,  230],
    [16, 120, 380],
    [18, 200, 560],
    [20, 250, 780],
    [22, 380, 1100],
    [24, 520, 1500],
    [26, 700, 2000],
    [28, 950, 2600],
    [30, 1200, 3200],
    [32, 1500, 3700],
    [34, 1800, 4200],
    [36, 2100, 4600],
    [38, 2400, 5000],
    [40, 2600, 5200],
  ]

  const igR = Math.round(ig)
  const exact = TABLE.find(([w]) => w === igR)
  if (exact) return [exact[1], exact[2]]

  // Interpola entre os dois vizinhos mais próximos
  for (let i = 0; i < TABLE.length - 1; i++) {
    const current = TABLE[i]
    const next = TABLE[i + 1]
    if (!current || !next) continue
    const [w1, min1, max1] = current
    const [w2, min2, max2] = next
    if (ig >= w1 && ig <= w2) {
      const t = (ig - w1) / (w2 - w1)
      return [
        Math.round(min1 + t * (min2 - min1)),
        Math.round(max1 + t * (max2 - max1)),
      ]
    }
  }
  return undefined
}

export function checkObstetrica(v: ExtractedValues): SanityFlag[] {
  const flags: SanityFlag[] = []

  // ── Peso fetal × IG ─────────────────────────────────────────────────────
  if (v.ig_weeks !== undefined && v.fetal_weight_g !== undefined) {
    const range = weightRangeForIG(v.ig_weeks)
    if (range) {
      const [min, max] = range
      if (v.fetal_weight_g < min || v.fetal_weight_g > max) {
        flags.push({
          severity: 'warning',
          code: 'WEIGHT_IG_MISMATCH',
          message: `Peso fetal de ${v.fetal_weight_g}g parece incompatível com ${v.ig_weeks} semanas (esperado: ${min}–${max}g).`,
          suggestion: 'Verifique se o peso fetal ou a idade gestacional foram digitados corretamente.',
        })
      }
    }
  }

  // ── BCF extremo ─────────────────────────────────────────────────────────
  if (v.bcf_bpm !== undefined) {
    if (v.bcf_bpm < 100 || v.bcf_bpm > 180) {
      flags.push({
        severity: 'warning',
        code: 'BCF_EXTREME',
        message: `BCF de ${v.bcf_bpm} bpm está fora da faixa fisiológica esperada (100–180 bpm).`,
        suggestion: 'Confirme o valor dos batimentos cardíacos fetais.',
      })
    }
  }

  // ── ILA extremo ─────────────────────────────────────────────────────────
  if (v.ila_cm !== undefined) {
    if (v.ila_cm > 40) {
      flags.push({
        severity: 'warning',
        code: 'ILA_EXTREME_HIGH',
        message: `ILA de ${v.ila_cm} cm é extremamente elevado — verifique se não houve erro de digitação.`,
        suggestion: 'ILA acima de 40 cm é improvável. Confirme o valor.',
      })
    } else if (v.ila_cm < 2) {
      flags.push({
        severity: 'warning',
        code: 'ILA_EXTREME_LOW',
        message: `ILA de ${v.ila_cm} cm é extremamente baixo — verifique se não houve erro de digitação.`,
        suggestion: 'ILA abaixo de 2 cm é improvável. Confirme o valor.',
      })
    } else if (v.ila_cm > 24.9 && v.ila_qual === 'normal') {
      flags.push({
        severity: 'warning',
        code: 'ILA_CONTRADICTION_HIGH',
        message: `ILA de ${v.ila_cm} cm está elevado (>24,9 cm), mas o laudo descreve o líquido amniótico como normal.`,
        suggestion: 'Verifique se o valor do ILA ou a descrição qualitativa estão corretos.',
      })
    } else if (v.ila_cm < 8 && v.ila_qual === 'normal') {
      flags.push({
        severity: 'warning',
        code: 'ILA_CONTRADICTION_LOW',
        message: `ILA de ${v.ila_cm} cm está reduzido (<8 cm), mas o laudo descreve o líquido amniótico como normal.`,
        suggestion: 'Verifique se o valor do ILA ou a descrição qualitativa estão corretos.',
      })
    }
  }

  // ── Maior bolsão vertical extremo ───────────────────────────────────────
  if (v.mbv_cm !== undefined) {
    if (v.mbv_cm > 10) {
      flags.push({
        severity: 'warning',
        code: 'MBV_EXTREME_HIGH',
        message: `Maior bolsão vertical de ${v.mbv_cm} cm é extremamente elevado (>10 cm).`,
        suggestion: 'Confirme o valor do maior bolsão vertical.',
      })
    } else if (v.mbv_cm < 0.5) {
      flags.push({
        severity: 'warning',
        code: 'MBV_EXTREME_LOW',
        message: `Maior bolsão vertical de ${v.mbv_cm} cm é extremamente reduzido (<0,5 cm).`,
        suggestion: 'Confirme o valor do maior bolsão vertical.',
      })
    }
  }

  // ── IG: discordância DUM × CCN no 1º trimestre ─────────────────────────
  // ACOG PB 700 (2022): até 13s+6d, USG (CCN) substitui DUM se diff > 7 dias.
  if (v.ig_dum_days !== undefined && v.ig_ccn_days !== undefined) {
    const diff = Math.abs(v.ig_dum_days - v.ig_ccn_days)
    const ccnWeeks = Math.floor(v.ig_ccn_days / 7)
    if (ccnWeeks <= 13 && diff > 7) {
      const fmt = (d: number) => {
        const w = Math.floor(d / 7)
        const r = d % 7
        return `${w} sem${r > 0 ? ` e ${r} dia${r === 1 ? '' : 's'}` : ''}`
      }
      flags.push({
        severity: 'warning',
        code: 'IG_DUM_CCN_DISCORDANT',
        message: `IG por DUM (${fmt(v.ig_dum_days)}) e por CCN (${fmt(v.ig_ccn_days)}) divergem em ${diff} dias.`,
        suggestion: 'ACOG 2022: até 13s+6d, discordância >7 dias indica adotar IG pelo USG (CCN).',
      })
    }
  }

  // ── Colo uterino extremo ─────────────────────────────────────────────────
  if (v.colo_mm !== undefined) {
    if (v.colo_mm < 10) {
      flags.push({
        severity: 'warning',
        code: 'COLO_EXTREME_LOW',
        message: `Comprimento do colo uterino de ${v.colo_mm} mm é extremamente reduzido.`,
        suggestion: 'Confirme o valor do comprimento cervical.',
      })
    } else if (v.colo_mm > 65) {
      flags.push({
        severity: 'warning',
        code: 'COLO_EXTREME_HIGH',
        message: `Comprimento do colo uterino de ${v.colo_mm} mm parece improvável (>65 mm).`,
        suggestion: 'Confirme o valor do comprimento cervical.',
      })
    }
  }

  return flags
}
