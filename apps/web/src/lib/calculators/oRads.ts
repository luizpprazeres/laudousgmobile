// ACR O-RADS US v2022 — Ovarian-Adnexal Reporting and Data System Ultrasound
// Algoritmo sequencial puro, sem chamadas de rede. < 50ms por cálculo.

export type ORadsMorfologia = 'puramente_cistico' | 'componente_solido' | 'predominantemente_solido'

// Rampa A: puramente cístico
export type ORadsRampaA =
  | 'unilocular_simples'
  | 'unilocular_com_debris'
  | 'multilocular_simples'
  | 'multilocular_com_debris'

// Rampa B: com componente sólido
export type ORadsNumPapilas = 0 | 1 | 2 | 3 // ≥3 = 3
export type ORadsRampaB_ComponenteSolido = 'ausente' | 'presente'

// Rampa C: predominantemente sólido
export type ORadsRampaCBordas = 'regulares' | 'irregulares'
export type ORadsRampaCEcogenicidade = 'hiperecóico' | 'isoecóico' | 'hipoecóico' | 'sombra_acustica'

// Doppler Color Score
export type ORadsColorScore = 'CS1' | 'CS2' | 'CS3' | 'CS4'

export type ORadsStatusMenopausico = 'pre' | 'pos'

export interface ORadsInput {
  // Etapa 1: alto risco imediato
  asciteImplantes?: boolean

  // Etapa 2: morfologia
  morfologia?: ORadsMorfologia

  // Etapa 3a: rampa A
  rampaA?: ORadsRampaA

  // Etapa 3b: rampa B
  numPapilas?: ORadsNumPapilas
  componenteSolidoInterno?: ORadsRampaB_ComponenteSolido

  // Etapa 3c: rampa C
  bordasSolido?: ORadsRampaCBordas
  ecogenicidadeSolido?: ORadsRampaCEcogenicidade

  // Etapa 4: Doppler
  colorScore?: ORadsColorScore

  // Etapa 5: status menopáusico
  statusMenopausico?: ORadsStatusMenopausico
}

export type ORadsCategory = 0 | 1 | 2 | 3 | 4 | 5

export interface ORadsResult {
  category: ORadsCategory
  risk: string
  management: string
  reasoning: string
}

const COLOR_SCORE_LABELS: Record<ORadsColorScore, string> = {
  CS1: 'sem fluxo',
  CS2: 'fluxo mínimo',
  CS3: 'fluxo moderado',
  CS4: 'fluxo acentuado',
}

export function calcularORads(input: ORadsInput): ORadsResult | null {
  // Etapa 1: achados de alto risco imediato → O-RADS 5
  if (input.asciteImplantes) {
    return {
      category: 5,
      risk: '≥ 50%',
      management: 'Avaliação oncológica urgente',
      reasoning: 'Ascite e/ou implantes peritoneais identificados',
    }
  }

  // Sem morfologia definida ainda
  if (!input.morfologia) return null

  // === Rampa C: predominantemente sólido ===
  if (input.morfologia === 'predominantemente_solido') {
    if (!input.colorScore) return null

    // Sombra acústica → sugere fibroma/teratoma → categoria menor
    if (input.ecogenicidadeSolido === 'sombra_acustica') {
      return {
        category: 2,
        risk: '< 1%',
        management: 'Avaliação de rotina',
        reasoning: 'Massa sólida com sombra acústica (provável fibroma ou teratoma)',
      }
    }

    const csNum = parseInt(input.colorScore.replace('CS', ''))

    if (input.bordasSolido === 'regulares') {
      if (csNum <= 2) {
        return {
          category: 3,
          risk: '~ 5–10%',
          management: 'Avaliação especializada; considerar RM pélvica',
          reasoning: 'Massa predominantemente sólida, bordas regulares, fluxo baixo',
        }
      }
      return {
        category: 4,
        risk: '~ 10–50%',
        management: 'Avaliação especializada urgente; considerar RM e cirurgia',
        reasoning: 'Massa predominantemente sólida, bordas regulares, fluxo moderado/acentuado',
      }
    }

    // Bordas irregulares com fluxo moderado/acentuado → O-RADS 5
    if (csNum >= 3) {
      return {
        category: 5,
        risk: '≥ 50%',
        management: 'Avaliação oncológica urgente',
        reasoning: 'Massa predominantemente sólida, bordas irregulares, fluxo moderado/acentuado',
      }
    }

    return {
      category: 4,
      risk: '~ 10–50%',
      management: 'Avaliação especializada urgente; considerar RM e cirurgia',
      reasoning: 'Massa predominantemente sólida, bordas irregulares',
    }
  }

  // === Rampa A: puramente cístico ===
  if (input.morfologia === 'puramente_cistico') {
    if (!input.rampaA) return null

    if (input.rampaA === 'unilocular_simples') {
      const cat: ORadsCategory = input.statusMenopausico === 'pos' ? 2 : 1
      return {
        category: cat,
        risk: cat === 1 ? '< 1% (quase certamente benigno)' : '< 1%',
        management: cat === 1 ? 'Nenhuma ação necessária' : 'Avaliação de rotina',
        reasoning: 'Cisto unilocular simples' + (input.statusMenopausico === 'pos' ? ' em pós-menopausa' : ''),
      }
    }

    if (input.rampaA === 'unilocular_com_debris') {
      return {
        category: 2,
        risk: '< 1%',
        management: 'Avaliação de rotina',
        reasoning: 'Cisto unilocular com debris (provável endometrioma ou cisto hemorrágico)',
      }
    }

    if (input.rampaA === 'multilocular_simples') {
      if (!input.colorScore) return null
      const csNum = parseInt(input.colorScore.replace('CS', ''))
      return {
        category: csNum <= 2 ? 2 : 3,
        risk: csNum <= 2 ? '< 1%' : '~ 5–10%',
        management: csNum <= 2 ? 'Avaliação de rotina' : 'Avaliação especializada; considerar RM pélvica',
        reasoning: `Cisto multilocular simples, ${COLOR_SCORE_LABELS[input.colorScore!]}`,
      }
    }

    if (input.rampaA === 'multilocular_com_debris') {
      if (!input.colorScore) return null
      const csNum = parseInt(input.colorScore.replace('CS', ''))
      return {
        category: csNum <= 2 ? 3 : 4,
        risk: csNum <= 2 ? '~ 5–10%' : '~ 10–50%',
        management: csNum <= 2 ? 'Avaliação especializada; considerar RM pélvica' : 'Avaliação especializada urgente',
        reasoning: `Cisto multilocular com debris, ${COLOR_SCORE_LABELS[input.colorScore!]}`,
      }
    }
  }

  // === Rampa B: com componente sólido ===
  if (input.morfologia === 'componente_solido') {
    if (input.numPapilas === undefined || !input.colorScore) return null

    const csNum = parseInt(input.colorScore.replace('CS', ''))
    const papilas = input.numPapilas

    if (papilas === 0 && input.componenteSolidoInterno !== 'presente') {
      // Apenas septos, sem papilas nem componente sólido interno
      return {
        category: csNum <= 1 ? 2 : 3,
        risk: csNum <= 1 ? '< 1%' : '~ 5–10%',
        management: csNum <= 1 ? 'Avaliação de rotina' : 'Avaliação especializada; considerar RM pélvica',
        reasoning: `Cisto com septos, sem papilas, ${COLOR_SCORE_LABELS[input.colorScore]}`,
      }
    }

    if (papilas === 1) {
      return {
        category: csNum <= 1 ? 2 : 3,
        risk: csNum <= 1 ? '< 1%' : '~ 5–10%',
        management: csNum <= 1 ? 'Avaliação de rotina' : 'Avaliação especializada; considerar RM pélvica',
        reasoning: `1 papila, ${COLOR_SCORE_LABELS[input.colorScore]}`,
      }
    }

    if (papilas === 2) {
      return {
        category: csNum <= 2 ? 3 : 4,
        risk: csNum <= 2 ? '~ 5–10%' : '~ 10–50%',
        management: csNum <= 2 ? 'Avaliação especializada; considerar RM pélvica' : 'Avaliação especializada urgente',
        reasoning: `2 papilas, ${COLOR_SCORE_LABELS[input.colorScore]}`,
      }
    }

    if (papilas >= 3 || input.componenteSolidoInterno === 'presente') {
      if (csNum <= 2) {
        return {
          category: 4,
          risk: '~ 10–50%',
          management: 'Avaliação especializada urgente; considerar RM e cirurgia',
          reasoning: `${papilas >= 3 ? '≥ 3 papilas' : 'componente sólido interno'}, ${COLOR_SCORE_LABELS[input.colorScore]}`,
        }
      }
      return {
        category: 5,
        risk: '≥ 50%',
        management: 'Avaliação oncológica urgente',
        reasoning: `${papilas >= 3 ? '≥ 3 papilas' : 'componente sólido interno'}, ${COLOR_SCORE_LABELS[input.colorScore]}`,
      }
    }
  }

  return null
}

export function formatarBlocoORads(input: ORadsInput, result: ORadsResult): string {
  const partes: string[] = []

  if (input.morfologia) {
    const mLabels: Record<ORadsMorfologia, string> = {
      puramente_cistico: 'puramente cístico',
      componente_solido: 'com componente sólido',
      predominantemente_solido: 'predominantemente sólido',
    }
    partes.push(`Morfologia: ${mLabels[input.morfologia]}`)
  }

  if (input.rampaA) {
    const rLabels: Record<ORadsRampaA, string> = {
      unilocular_simples: 'unilocular simples',
      unilocular_com_debris: 'unilocular com debris',
      multilocular_simples: 'multilocular simples',
      multilocular_com_debris: 'multilocular com debris',
    }
    partes.push(`Característica: ${rLabels[input.rampaA]}`)
  }

  if (input.numPapilas !== undefined) partes.push(`Papilas: ${input.numPapilas >= 3 ? '≥ 3' : input.numPapilas}`)
  if (input.colorScore) partes.push(`Doppler: ${input.colorScore} (${COLOR_SCORE_LABELS[input.colorScore]})`)
  if (input.statusMenopausico) partes.push(`Status: ${input.statusMenopausico === 'pre' ? 'pré-menopausa' : 'pós-menopausa'}`)

  return [
    'O-RADS US:',
    partes.join(' | '),
    `Classificação: O-RADS ${result.category} — risco ${result.risk}`,
    `Conduta: ${result.management}`,
    '(ACR O-RADS US v2022)',
  ].join('\n')
}
