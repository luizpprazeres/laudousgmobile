import type { ExtractedValues, SanityFlag } from './types'

export function checkAbdomenTotal(v: ExtractedValues): SanityFlag[] {
  const flags: SanityFlag[] = []

  // ── Hepatomegalia sem hipótese ───────────────────────────────────────────
  if (
    v.higado_cm !== undefined &&
    v.higado_cm > 16 &&
    !v.menciona_hepatopatia
  ) {
    flags.push({
      severity: 'warning',
      code: 'HEPATOMEGALIA_SEM_HIPOTESE',
      message: `Fígado medindo ${v.higado_cm}cm (> 16cm) sem causa descrita.`,
      suggestion: 'Considere mencionar hipótese para hepatomegalia (esteatose, congestão, neoplasia, hepatite).',
    })
  }

  // ── VBP dilatada sem causa ──────────────────────────────────────────────
  if (
    v.vbp_mm !== undefined &&
    v.vbp_mm > 8 &&
    !v.menciona_causa_vbp
  ) {
    flags.push({
      severity: 'warning',
      code: 'VBP_DILATADA_SEM_CAUSA',
      message: `Via biliar principal de ${v.vbp_mm}mm (> 8mm) sem causa descrita.`,
      suggestion: 'VBP > 8mm sugere obstrução — descreva a causa (litíase, estenose, neoplasia).',
    })
  }

  // ── Rim pequeno sem menção de atrofia ────────────────────────────────────
  const rimDPequeno = v.rim_d_cm !== undefined && v.rim_d_cm < 8
  const rimEPequeno = v.rim_e_cm !== undefined && v.rim_e_cm < 8

  if ((rimDPequeno || rimEPequeno) && !v.menciona_atrofia_renal) {
    const side = rimDPequeno ? 'direito' : 'esquerdo'
    const val = rimDPequeno ? v.rim_d_cm! : v.rim_e_cm!
    flags.push({
      severity: 'warning',
      code: 'RIM_REDUZIDO_SEM_ATROFIA',
      message: `Rim ${side} medindo ${val}cm (< 8cm) sem menção de atrofia ou doença renal crônica.`,
      suggestion: 'Rim < 8cm pode indicar atrofia renal — considere mencionar na conclusão.',
    })
  }

  // ── Pelve renal dilatada ──────────────────────────────────────────────────
  if (
    v.pelve_renal_max_mm !== undefined &&
    v.pelve_renal_max_mm > 10
  ) {
    flags.push({
      severity: 'warning',
      code: 'PIELECSTASIA_SIGNIFICATIVA',
      message: `Pelve renal de ${v.pelve_renal_max_mm}mm (> 10mm) é sugestiva de hidronefrose.`,
      suggestion: 'Pielecstasia > 10mm merece investigação de causa obstrutiva ou malformação.',
    })
  }

  // ── Esplenomegalia sem causa ─────────────────────────────────────────────
  if (
    v.baco_cm !== undefined &&
    v.baco_cm > 13 &&
    !v.menciona_esplenomegalia_causa
  ) {
    flags.push({
      severity: 'warning',
      code: 'ESPLENOMEGALIA_SEM_CAUSA',
      message: `Baço medindo ${v.baco_cm}cm (> 13cm) sem causa descrita.`,
      suggestion: 'Esplenomegalia requer hipótese diagnóstica (hipertensão portal, hemopatia, infecção).',
    })
  }

  // ── Aneurisma de aorta abdominal ─────────────────────────────────────────
  if (
    v.aorta_mm !== undefined &&
    v.aorta_mm >= 30 &&
    !v.menciona_causa_aneurisma
  ) {
    flags.push({
      severity: 'warning',
      code: 'AORTA_ANEURISMATICA_SEM_DIAGNÓSTICO',
      message: `Aorta abdominal de ${v.aorta_mm}mm (≥ 30mm) — critério diagnóstico para aneurisma.`,
      suggestion: 'Aorta ≥ 30mm define aneurisma aórtico abdominal — descreva na conclusão e oriente seguimento.',
    })
  }

  return flags
}
