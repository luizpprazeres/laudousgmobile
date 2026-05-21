import type { ExtractedValues, SanityFlag } from './types'

export function checkTireoide(v: ExtractedValues): SanityFlag[] {
  const flags: SanityFlag[] = []

  // ── TI-RADS alto sem conduta (PAAF ou seguimento) ───────────────────────
  if (
    v.tirads_cat !== undefined &&
    ['TR4', 'TR5'].includes(v.tirads_cat) &&
    !v.tem_paaf_conduta &&
    !v.tem_seguimento
  ) {
    const label = v.tirads_cat === 'TR5' ? '5' : '4'
    flags.push({
      severity: 'warning',
      code: 'TIRADS_ALTO_SEM_CONDUTA',
      message: `TI-RADS ${label} identificado, mas nenhuma conduta (PAAF ou seguimento) está descrita.`,
      suggestion: 'TI-RADS 4 e 5 requerem conduta conforme tamanho: PAAF (≥15mm para TR4; ≥10mm para TR5).',
    })
  }

  // ── TI-RADS 3 sem seguimento ─────────────────────────────────────────────
  if (
    v.tirads_cat === 'TR3' &&
    !v.tem_seguimento &&
    !v.tem_paaf_conduta
  ) {
    flags.push({
      severity: 'warning',
      code: 'TIRADS3_SEM_SEGUIMENTO',
      message: 'TI-RADS 3 identificado sem recomendação de seguimento.',
      suggestion: 'TI-RADS 3: recomenda-se seguimento em 1–2 anos para nódulos ≥ 15mm ou controle em 3–5 anos.',
    })
  }

  // ── Nódulo pequeno com TI-RADS alto (improvável) ─────────────────────────
  if (
    v.nodulo_max_mm !== undefined &&
    v.nodulo_max_mm < 5 &&
    v.tirads_cat !== undefined &&
    ['TR4', 'TR5'].includes(v.tirads_cat)
  ) {
    flags.push({
      severity: 'warning',
      code: 'NODULO_PEQUENO_TIRADS_ALTO',
      message: `TI-RADS ${v.tirads_cat.replace('TR', '')} para nódulo de apenas ${v.nodulo_max_mm}mm — classificação improvável.`,
      suggestion: 'Nódulos < 5mm raramente atingem TR4/TR5 e não têm indicação de PAAF pelo sistema ACR TI-RADS.',
    })
  }

  // ── Volume tireoidiano acima do normal sem menção ─────────────────────────
  if (
    v.tireoide_vol_ml !== undefined &&
    v.tireoide_vol_ml > 25
  ) {
    flags.push({
      severity: 'warning',
      code: 'BÓCIO_SEM_HIPOTESE',
      message: `Volume tireoidiano de ${v.tireoide_vol_ml}mL está acima do limite normal (25mL).`,
      suggestion: 'Considere mencionar bócio ou outra hipótese diagnóstica para o aumento do volume tireoidiano.',
    })
  }

  // ── Calcificações puntiformes sem TI-RADS ────────────────────────────────
  if (
    v.calc_puntiformes &&
    v.tirads_cat === undefined
  ) {
    flags.push({
      severity: 'warning',
      code: 'CALCIF_PUNTIFORMES_SEM_TIRADS',
      message: 'Calcificações puntiformes identificadas, mas o laudo não apresenta classificação TI-RADS.',
      suggestion: 'Calcificações puntiformes são um critério de suspeição no ACR TI-RADS — classifique o nódulo.',
    })
  }

  return flags
}
