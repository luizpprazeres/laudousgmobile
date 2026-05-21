import type { ExtractedValues, SanityFlag } from './types'

export function checkPelveFeminina(v: ExtractedValues, text: string): SanityFlag[] {
  const flags: SanityFlag[] = []
  const t = text.toLowerCase()

  // ── Endométrio espessado sem hipótese diagnóstica ────────────────────────
  if (
    v.endometrio_mm !== undefined &&
    v.endometrio_mm > 16 &&
    !v.menciona_hipotese_endometrio
  ) {
    flags.push({
      severity: 'warning',
      code: 'ENDOMETRIO_ESPESSADO_SEM_HIPOTESE',
      message: `Endométrio de ${v.endometrio_mm}mm está espessado, mas não há hipótese diagnóstica na conclusão.`,
      suggestion: 'Considere incluir hipótese diagnóstica (hiperplasia, pólipo, neoplasia) na conclusão.',
    })
  }

  // ── Endométrio pós-menopausa acima do limite ────────────────────────────
  if (
    v.endometrio_mm !== undefined &&
    v.endometrio_mm > 5 &&
    v.menciona_posmenopause &&
    !v.menciona_hipotese_endometrio
  ) {
    flags.push({
      severity: 'warning',
      code: 'ENDOMETRIO_POSMENOP_ALTO',
      message: `Endométrio de ${v.endometrio_mm}mm em paciente pós-menopausa supera o limite de 5mm.`,
      suggestion: 'Endométrio > 5mm na pós-menopausa requer investigação (histeroscopia ou biópsia).',
    })
  }

  // ── Cisto grande sem classificação O-RADS ───────────────────────────────
  if (
    v.cisto_max_mm !== undefined &&
    v.cisto_max_mm > 70 &&
    v.o_rads === undefined
  ) {
    flags.push({
      severity: 'warning',
      code: 'CISTO_GRANDE_SEM_ORADS',
      message: `Cisto ovariano de ${v.cisto_max_mm}mm (> 7cm) sem classificação O-RADS.`,
      suggestion: 'Cistos ovarianos > 7cm devem ser classificados pelo sistema O-RADS ACR.',
    })
  }

  // ── O-RADS alto sem hipótese diagnóstica ────────────────────────────────
  if (
    v.o_rads !== undefined &&
    v.o_rads >= 4 &&
    !v.menciona_hipotese_ovario
  ) {
    flags.push({
      severity: 'warning',
      code: 'ORADS_ALTO_SEM_HIPOTESE',
      message: `O-RADS ${v.o_rads} (alto risco) sem hipótese diagnóstica ou conduta descrita.`,
      suggestion: 'O-RADS 4 e 5 requerem hipótese diagnóstica e conduta clara na conclusão.',
    })
  }

  // ── Ovário aumentado sem causa ───────────────────────────────────────────
  if (
    v.ovario_vol_ml !== undefined &&
    v.ovario_vol_ml > 20 &&
    !v.menciona_hipotese_ovario
  ) {
    flags.push({
      severity: 'warning',
      code: 'OVARIO_AUMENTADO_SEM_CAUSA',
      message: `Ovário com volume de ${v.ovario_vol_ml}mL (> 20mL) sem causa descrita.`,
      suggestion: 'Volume ovariano > 20mL pode indicar SOP, torção, neoplas ou outro processo — especifique a hipótese.',
    })
  }

  return flags
}
