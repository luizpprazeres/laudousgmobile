import type { ExtractedValues, SanityFlag } from './types'

export function checkDopplerObstetrico(v: ExtractedValues): SanityFlag[] {
  const flags: SanityFlag[] = []

  // ── IP Umbilical extremo ─────────────────────────────────────────────────
  if (v.ip_umbilical !== undefined) {
    if (v.ip_umbilical > 3.0) {
      flags.push({
        severity: 'warning',
        code: 'IP_UMB_EXTREME_HIGH',
        message: `IP da artéria umbilical de ${v.ip_umbilical} parece extremamente elevado (>3,0).`,
        suggestion: 'Confirme o valor do IP umbilical. Valores acima de 3,0 são raros e podem indicar erro de digitação.',
      })
    } else if (v.ip_umbilical < 0.3) {
      flags.push({
        severity: 'warning',
        code: 'IP_UMB_EXTREME_LOW',
        message: `IP da artéria umbilical de ${v.ip_umbilical} parece extremamente baixo (<0,3).`,
        suggestion: 'Confirme o valor do IP umbilical.',
      })
    }
  }

  // ── IP ACM extremo ───────────────────────────────────────────────────────
  if (v.ip_acm !== undefined) {
    if (v.ip_acm > 3.0) {
      flags.push({
        severity: 'warning',
        code: 'IP_ACM_EXTREME_HIGH',
        message: `IP da ACM de ${v.ip_acm} parece extremamente elevado (>3,0).`,
        suggestion: 'Confirme o valor do IP da artéria cerebral média.',
      })
    } else if (v.ip_acm < 0.5) {
      flags.push({
        severity: 'warning',
        code: 'IP_ACM_EXTREME_LOW',
        message: `IP da ACM de ${v.ip_acm} parece extremamente baixo (<0,5).`,
        suggestion: 'Confirme o valor do IP da artéria cerebral média. IP baixo pode indicar vasodilatação cerebral (centralização fetal).',
      })
    }
  }

  // ── IP Uterinas extremo ──────────────────────────────────────────────────
  if (v.ip_uterina !== undefined) {
    if (v.ip_uterina > 3.5) {
      flags.push({
        severity: 'warning',
        code: 'IP_UTERINA_EXTREME_HIGH',
        message: `IP das artérias uterinas de ${v.ip_uterina} parece extremamente elevado (>3,5).`,
        suggestion: 'Confirme o valor do IP das uterinas.',
      })
    } else if (v.ip_uterina < 0.3) {
      flags.push({
        severity: 'warning',
        code: 'IP_UTERINA_EXTREME_LOW',
        message: `IP das artérias uterinas de ${v.ip_uterina} parece extremamente baixo (<0,3).`,
        suggestion: 'Confirme o valor do IP das artérias uterinas.',
      })
    }
  }

  // ── RCP (relação cérebro-placentária) implícita ──────────────────────────
  // Se ambos estão presentes, verifica inversão de RCP com qualitativo normal
  if (v.ip_umbilical !== undefined && v.ip_acm !== undefined) {
    const rcp = v.ip_acm / v.ip_umbilical
    if (rcp < 1.0 && v.doppler_qual === 'normal') {
      flags.push({
        severity: 'warning',
        code: 'RCP_CONTRADICTION',
        message: `RCP calculada de ${rcp.toFixed(2)} (ACM ${v.ip_acm} / Umbilical ${v.ip_umbilical}) indica possível centralização, mas o laudo descreve o Doppler como normal.`,
        suggestion: 'Verifique a relação cérebro-placentária. RCP < 1,0 pode indicar redistribuição hemodinâmica fetal.',
      })
    }
  }

  // ── Fluxo ausente/reverso + doppler descrito como normal ─────────────────
  if (v.doppler_qual === 'ausente' || v.doppler_qual === 'reverso') {
    // Sem contradição aqui — só alertas se houver IP descrito como normal ao mesmo tempo
    // Este caso é raro na prática; checagem de contradição textual já é feita pelo extrator
  }

  // ── Doppler qualitativo × IP: contradição ────────────────────────────────
  if (v.doppler_qual === 'normal' && v.ip_umbilical !== undefined) {
    // IP umbilical > 1.5 geralmente é considerado elevado para gestações a termo
    if (v.ip_umbilical > 1.8) {
      flags.push({
        severity: 'warning',
        code: 'DOPPLER_IP_CONTRADICTION',
        message: `IP umbilical de ${v.ip_umbilical} está elevado, mas o laudo descreve o Doppler como normal.`,
        suggestion: 'Verifique se o IP umbilical ou a conclusão qualitativa do Doppler estão corretos.',
      })
    }
  }

  return flags
}
