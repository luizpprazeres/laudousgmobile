import type { FmfInput, FmfResult, TrisomyRisk } from './fmfTrisomyTypes'

/**
 * Arredonda para 2 algarismos significativos, como o app oficial da FMF
 * exibe o denominador N de "1 in N" (ex.: 3.287 → 3.300, 549 → 550, 63 → 63).
 * Abaixo de 10 o próprio algoritmo já preserva o inteiro (ex.: 5 → 5).
 */
export function arredondarDoisAlgarismos(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return n
  const expoente = Math.floor(Math.log10(n))
  const fator = Math.pow(10, expoente - 1)
  return Math.round(n / fator) * fator
}

/**
 * Formata uma razão de risco como "1 em N", igual ao app oficial da FMF:
 * teto "< 1 em {cap}" quando a razão excede `cap`, piso "1 em {floor}"
 * quando fica abaixo de `floor`, senão "1 em N" com N arredondado a 2
 * algarismos significativos e separador de milhar pt-BR (ex.: 1 em 3.300).
 */
export function formatarRazaoTrissomia(ratio: number, cap: number, floor: number): string {
  if (ratio > cap) return `< 1 em ${cap.toLocaleString('pt-BR')}`
  if (ratio < floor) return `1 em ${floor.toLocaleString('pt-BR')}`
  return `1 em ${arredondarDoisAlgarismos(ratio).toLocaleString('pt-BR')}`
}

/**
 * Risco BASAL combinado T13/18 (soma das probabilidades basais de T13 e
 * T18), para exibir ao lado do basal de T21 — o motor só expõe a
 * combinação PÓS-marcadores em `result.t18t13`.
 */
export function basalRatioT18T13(result: FmfResult): number {
  const probabilidade = result.basal.t18.probability + result.basal.t13.probability
  return Math.round(1 / Math.max(probabilidade, 1e-10))
}

function linhaClassificacaoT21(categoria: TrisomyRisk['category']): string {
  if (categoria === 'alto') {
    return 'Alto risco para trissomia 21 (≥ 1 em 100): recomenda-se aconselhamento genético e oferta de teste diagnóstico invasivo, a critério do médico assistente.'
  }
  if (categoria === 'intermediario') {
    return 'Risco intermediário para trissomia 21 (entre 1 em 101 e 1 em 1.000): pode-se considerar DNA fetal livre no sangue materno, a critério do médico assistente.'
  }
  return 'Baixo risco para trissomia 21 (< 1 em 1.000).'
}

/**
 * Bloco enxuto do rastreio combinado de trissomias para o laudo — não repete
 * dados já registrados no laudo (idade, IG, CCN, TN, FCF, bioquímica) nem
 * lista marcadores utilizados/não utilizados: só os riscos basal e ajustado
 * e a recomendação clínica.
 */
export function formatarBlocoTrissomias(input: FmfInput, result: FmfResult): string {
  // `input` é mantido na assinatura por compatibilidade com os chamadores
  // existentes (web/mobile chamam com (input, result)); o bloco enxuto só
  // depende do `result`, já que idade/CCN/TN/FCF/bioquímica já aparecem no
  // laudo por outras vias.
  const cap = result.displayCapRatio
  const floor = result.displayFloorRatio
  const basalT18T13 = basalRatioT18T13(result)
  const marcadores = result.markersUsed.filter((marcador) => marcador !== 'Idade materna')
  const marcadoresLabel = marcadores.length > 0 ? ` (${marcadores.join(', ')})` : ''

  const lines: string[] = ['RASTREIO COMBINADO DE TRISSOMIAS (1º trimestre, FMF)']

  lines.push(
    `Risco basal, pela idade materna e idade gestacional: trissomia 21 — ${formatarRazaoTrissomia(result.basal.t21.ratio, cap, floor)}; trissomias 13/18 — ${formatarRazaoTrissomia(basalT18T13, cap, floor)}.`,
  )

  lines.push(
    `Risco ajustado pelos marcadores${marcadoresLabel}: trissomia 21 — ${formatarRazaoTrissomia(result.t21.ratio, cap, floor)}; trissomias 13/18 — ${formatarRazaoTrissomia(result.t18t13.ratio, cap, floor)}.`,
  )

  lines.push(linhaClassificacaoT21(result.t21.category))

  if (result.t18t13.category === 'alto') {
    lines.push(
      'Alto risco para trissomias 13/18 (≥ 1 em 100): recomenda-se aconselhamento genético e avaliação morfológica detalhada.',
    )
  }

  if (result.warnings.length > 0) {
    lines.push(`Observação: ${result.warnings.join(' ')}`)
  }

  return lines.join('\n')
}
