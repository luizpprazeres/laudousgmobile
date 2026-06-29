// BI-RADS US v2025 — ACR Breast Imaging Reporting and Data System
// Lógica determinística pura, sem chamadas de rede. < 50ms por cálculo.

export type BiRadsForma = 'oval' | 'redonda' | 'irregular'
export type BiRadsOrientacao = 'paralela' | 'nao_paralela'
export type BiRadsMargem = 'circunscrita' | 'nao_circunscrita_microlobulada' | 'nao_circunscrita_indistinta' | 'nao_circunscrita_angular' | 'espiculada'
export type BiRadsEcogenicidade = 'anecoica' | 'hiperecoica' | 'isoecoica' | 'hipoecóica' | 'heterogênea'
export type BiRadsReforcoPosterior = 'nenhum' | 'reforço' | 'sombra' | 'combinado'
export type BiRadsCalcificacao = 'ausente' | 'macrocalcificações' | 'microcalcificações_suspeitas'

export interface BiRadsInput {
  forma?: BiRadsForma
  orientacao?: BiRadsOrientacao
  margem?: BiRadsMargem
  ecogenicidade?: BiRadsEcogenicidade
  reforcoPosterior?: BiRadsReforcoPosterior
  calcificacao?: BiRadsCalcificacao
}

export type BiRadsCategory = 0 | 1 | 2 | 3 | '4A' | '4B' | '4C' | 5 | 6

export interface BiRadsResult {
  category: BiRadsCategory
  risk: string
  management: string
  reasoning: string
}

export function calcularBiRads(input: BiRadsInput): BiRadsResult | null {
  const { forma, orientacao, margem, ecogenicidade, reforcoPosterior, calcificacao } = input

  // Nenhum descritor selecionado
  if (!forma && !orientacao && !margem && !ecogenicidade) return null

  // BI-RADS 5: espiculada + hipoecóica + não-paralela — risco ≥ 95%
  if (
    margem === 'espiculada' &&
    ecogenicidade === 'hipoecóica' &&
    orientacao === 'nao_paralela'
  ) {
    return {
      category: 5,
      risk: '≥ 95%',
      management: 'Biópsia indicada',
      reasoning: 'Margem espiculada + hipoecóica + não-paralela',
    }
  }

  // BI-RADS 4C: espiculada isolada — risco 50–95%
  if (margem === 'espiculada') {
    return {
      category: '4C',
      risk: '50–95%',
      management: 'Biópsia indicada',
      reasoning: 'Margem espiculada',
    }
  }

  // BI-RADS 5: forma irregular + não-paralela + margem não-circunscrita + hipoecóica
  if (
    forma === 'irregular' &&
    orientacao === 'nao_paralela' &&
    margem !== 'circunscrita' &&
    ecogenicidade === 'hipoecóica'
  ) {
    return {
      category: 5,
      risk: '≥ 95%',
      management: 'Biópsia indicada',
      reasoning: 'Forma irregular + não-paralela + margem não-circunscrita + hipoecóica',
    }
  }

  // BI-RADS 4C: irregular + não-paralela + não-circunscrita
  if (
    forma === 'irregular' &&
    orientacao === 'nao_paralela' &&
    margem !== 'circunscrita'
  ) {
    return {
      category: '4C',
      risk: '50–95%',
      management: 'Biópsia indicada',
      reasoning: 'Forma irregular + não-paralela + margem não-circunscrita',
    }
  }

  // BI-RADS 4B: aspectos moderadamente suspeitos
  if (
    margem === 'nao_circunscrita_angular' ||
    (forma === 'irregular' && orientacao === 'paralela' && margem !== 'circunscrita') ||
    calcificacao === 'microcalcificações_suspeitas'
  ) {
    return {
      category: '4B',
      risk: '10–50%',
      management: 'Biópsia recomendada',
      reasoning:
        calcificacao === 'microcalcificações_suspeitas'
          ? 'Microcalcificações suspeitas'
          : margem === 'nao_circunscrita_angular'
          ? 'Margem angular'
          : 'Forma irregular com margem não-circunscrita',
    }
  }

  // BI-RADS 4A: microlobulada ou indistinta — risco 2–10%
  if (
    margem === 'nao_circunscrita_microlobulada' ||
    margem === 'nao_circunscrita_indistinta'
  ) {
    return {
      category: '4A',
      risk: '2–10%',
      management: 'Biópsia pode ser considerada',
      reasoning:
        margem === 'nao_circunscrita_microlobulada'
          ? 'Margem microlobulada'
          : 'Margem indistinta',
    }
  }

  // BI-RADS 3: oval + paralela + circunscrita + hipoecóica ou isoecóica
  if (
    (forma === 'oval' || forma === 'redonda') &&
    orientacao === 'paralela' &&
    margem === 'circunscrita' &&
    (ecogenicidade === 'hipoecóica' || ecogenicidade === 'isoecoica')
  ) {
    return {
      category: 3,
      risk: '< 2%',
      management: 'Controle ultrassonográfico em 6 meses',
      reasoning: `${forma} + paralela + circunscrita + ${ecogenicidade}`,
    }
  }

  // BI-RADS 2: oval/redonda + paralela + circunscrita + hiperecóica ou anecóica
  if (
    (forma === 'oval' || forma === 'redonda') &&
    orientacao === 'paralela' &&
    margem === 'circunscrita' &&
    (ecogenicidade === 'hiperecoica' || ecogenicidade === 'anecoica')
  ) {
    return {
      category: 2,
      risk: '< 2%',
      management: 'Controle de rotina',
      reasoning: `${forma} + paralela + circunscrita + ${ecogenicidade} (achado benigno)`,
    }
  }

  // BI-RADS 4A como fallback para qualquer não-circunscrita ainda não classificada
  if (margem && margem !== 'circunscrita') {
    return {
      category: '4A',
      risk: '2–10%',
      management: 'Biópsia pode ser considerada',
      reasoning: 'Margem não-circunscrita',
    }
  }

  // Descritores insuficientes para classificação definitiva
  return null
}

export function formatarBlocosBiRads(input: BiRadsInput, result: BiRadsResult): string {
  const descritores: string[] = []
  if (input.forma) descritores.push(input.forma)
  if (input.orientacao) descritores.push(input.orientacao === 'paralela' ? 'paralela' : 'não-paralela')
  if (input.margem) {
    const margemLabels: Record<BiRadsMargem, string> = {
      circunscrita: 'circunscrita',
      nao_circunscrita_microlobulada: 'microlobulada',
      nao_circunscrita_indistinta: 'indistinta',
      nao_circunscrita_angular: 'angular',
      espiculada: 'espiculada',
    }
    descritores.push(margemLabels[input.margem])
  }
  if (input.ecogenicidade) {
    const ecoLabels: Record<BiRadsEcogenicidade, string> = {
      anecoica: 'anecoica',
      hiperecoica: 'hiperecoica',
      isoecoica: 'isoecoica',
      hipoecóica: 'hipoecóica',
      heterogênea: 'heterogênea',
    }
    descritores.push(ecoLabels[input.ecogenicidade])
  }
  if (input.reforcoPosterior && input.reforcoPosterior !== 'nenhum') {
    const rpLabels: Record<string, string> = {
      reforço: 'reforço posterior',
      sombra: 'sombra acústica',
      combinado: 'padrão misto posterior',
    }
    descritores.push(rpLabels[input.reforcoPosterior])
  }
  if (input.calcificacao && input.calcificacao !== 'ausente') {
    descritores.push(input.calcificacao === 'macrocalcificações' ? 'macrocalcificações' : 'microcalcificações suspeitas')
  }

  return [
    'BI-RADS US:',
    `Descritores: ${descritores.join(', ')}`,
    `Classificação: BI-RADS ${result.category} — risco ${result.risk}`,
    `Conduta: ${result.management}`,
    '(ACR BI-RADS v2025 — ferramenta de apoio, classificação final é responsabilidade do médico)',
  ].join('\n')
}
