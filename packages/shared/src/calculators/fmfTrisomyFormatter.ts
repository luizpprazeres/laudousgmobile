import type { FmfInput, FmfResult } from './fmfTrisomyTypes'

function formatRatio(ratio: number): string {
  return `1/${ratio.toLocaleString('pt-BR')}`
}

function categoryLabel(cat: 'alto' | 'intermediario' | 'baixo'): string {
  if (cat === 'alto') return 'alto risco'
  if (cat === 'intermediario') return 'risco intermediário'
  return 'baixo risco'
}

export function formatarBlocoTrissomias(input: FmfInput, result: FmfResult): string {
  const lines: string[] = ['RASTREAMENTO COMBINADO DO PRIMEIRO TRIMESTRE:']

  lines.push(`Idade materna: ${input.maternalAge} anos`)
  lines.push(`IG: ${result.gaWeeks}s${result.gaDaysRemainder}d (CCN: ${input.crl}mm)`)
  lines.push(`TN: ${input.nt}mm`)

  if (input.fhr != null) lines.push(`FCF: ${input.fhr} bpm`)

  // Biochemistry line
  const biochemParts: string[] = []
  if (input.freeBetaHcgMoM != null) biochemParts.push(`Free β-hCG: ${input.freeBetaHcgMoM} MoM`)
  if (input.pappaMoM != null) biochemParts.push(`PAPP-A: ${input.pappaMoM} MoM`)
  if (biochemParts.length > 0) lines.push(biochemParts.join(' | '))

  // Advanced markers line
  const advParts: string[] = []
  if (input.dvPI != null) advParts.push(`Ducto venoso: IP ${input.dvPI}`)
  if (input.tricuspidRegurgitation != null) advParts.push(`Tricúspide: ${input.tricuspidRegurgitation ? 'regurgitação' : 'normal'}`)
  if (input.nasalBoneAbsent != null) advParts.push(`Osso nasal: ${input.nasalBoneAbsent ? 'ausente' : 'presente'}`)
  if (advParts.length > 0) lines.push(advParts.join(' | '))

  lines.push('') // blank line before risks
  lines.push(`Trissomia 21: risco basal ${formatRatio(result.basal.t21.ratio)}; risco corrigido ${formatRatio(result.t21.ratio)} (${categoryLabel(result.t21.category)}).`)
  lines.push(`Trissomia 18: risco basal ${formatRatio(result.basal.t18.ratio)}; risco corrigido ${formatRatio(result.t18.ratio)} (${categoryLabel(result.t18.category)}).`)
  lines.push(`Trissomia 13: risco basal ${formatRatio(result.basal.t13.ratio)}; risco corrigido ${formatRatio(result.t13.ratio)} (${categoryLabel(result.t13.category)}).`)

  lines.push(`Marcadores utilizados: ${result.markersUsed.join(', ')}.`)
  if (result.markersMissing.length > 0) {
    lines.push(`Marcadores não informados/não utilizados: ${result.markersMissing.join(', ')}.`)
  }
  if (result.warnings.length > 0) {
    lines.push(`Avisos: ${result.warnings.join(' ')}`)
  }
  lines.push(`Modelo ${result.modelVersion}; validação clínica externa pendente.`)
  lines.push('Rastreamento, não diagnóstico. Interpretar em conjunto com avaliação clínica e aconselhamento apropriado.')

  return lines.join('\n')
}
