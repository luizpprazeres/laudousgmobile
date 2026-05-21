import type { ExtractedValues, SanityFlag } from './types'

export function checkMamaria(v: ExtractedValues): SanityFlag[] {
  const flags: SanityFlag[] = []

  // ── BIRADS inválido ──────────────────────────────────────────────────────
  if (v.birads !== undefined) {
    if (!Number.isInteger(v.birads) || v.birads < 0 || v.birads > 6) {
      flags.push({
        severity: 'warning',
        code: 'BIRADS_INVALID',
        message: `Categoria BI-RADS de ${v.birads} é inválida (deve ser 0–6).`,
        suggestion: 'Verifique a categoria BI-RADS informada no laudo.',
      })
    }
  }

  // ── BIRADS × descritores suspeitos ───────────────────────────────────────
  const hasSuspectDescriptors =
    v.suspicious_descriptors !== undefined && v.suspicious_descriptors.length > 0

  if (v.birads !== undefined && v.birads <= 2 && hasSuspectDescriptors) {
    flags.push({
      severity: 'warning',
      code: 'BIRADS_LOW_WITH_SUSPECTS',
      message: `BI-RADS ${v.birads} (benigno/negativo) foi atribuído, mas o laudo contém descritores suspeitos: ${v.suspicious_descriptors!.join(', ')}.`,
      suggestion: 'Verifique se a categoria BI-RADS está coerente com os achados descritos.',
    })
  }

  // ── BIRADS alto × qualitativo benigno ────────────────────────────────────
  if (v.birads !== undefined && v.birads >= 4 && v.birads_qual === 'benigno') {
    flags.push({
      severity: 'warning',
      code: 'BIRADS_HIGH_QUAL_BENIGNO',
      message: `BI-RADS ${v.birads} (suspeito/maligno) foi atribuído, mas o laudo descreve os achados como benignos.`,
      suggestion: 'Verifique a coerência entre a categoria BI-RADS e a descrição qualitativa dos achados.',
    })
  }

  // ── BIRADS 0 sem justificativa ───────────────────────────────────────────
  if (v.birads === 0) {
    flags.push({
      severity: 'warning',
      code: 'BIRADS_ZERO',
      message: 'BI-RADS 0 indica avaliação incompleta — necessita de complementação diagnóstica.',
      suggestion: 'Se BI-RADS 0 for intencional, certifique-se de que o laudo indica o exame complementar recomendado.',
    })
  }

  // ── Múltiplos descritores suspeitos sem BIRADS ≥ 4 ──────────────────────
  if (
    hasSuspectDescriptors &&
    v.suspicious_descriptors!.length >= 3 &&
    v.birads !== undefined &&
    v.birads < 4
  ) {
    flags.push({
      severity: 'warning',
      code: 'SUSPECTS_WITHOUT_HIGH_BIRADS',
      message: `${v.suspicious_descriptors!.length} descritores suspeitos encontrados (${v.suspicious_descriptors!.join(', ')}), mas BI-RADS é ${v.birads}.`,
      suggestion: 'Múltiplos achados suspeitos geralmente justificam BI-RADS ≥ 4. Revise a categorização.',
    })
  }

  return flags
}
