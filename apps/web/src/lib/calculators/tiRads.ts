// ACR TI-RADS 2017 — Thyroid Imaging Reporting and Data System
// Lógica determinística pura, sem chamadas de rede. < 50ms por cálculo.

export type TiRadsComposicao = 'cistico_esponjoso' | 'misto' | 'solido'
export type TiRadsEcogenicidade = 'anecoico_hiperecoico' | 'isoecoico' | 'hipoecóico' | 'muito_hipoecóico'
export type TiRadsForma = 'mais_largo_que_alto' | 'mais_alto_que_largo'
export type TiRadsMargens = 'lisas_mal_definidas' | 'lobuladas_irregulares' | 'extensao_extratireoidiana'
export type TiRadsFocos = 'nenhum_cauda_cometa' | 'macrocalcificacoes' | 'calcificacoes_perifericas' | 'focos_ecogenicos_puntiformes'

export interface TiRadsInput {
  composicao?: TiRadsComposicao
  ecogenicidade?: TiRadsEcogenicidade
  forma?: TiRadsForma
  margens?: TiRadsMargens
  focosEcogenicos?: TiRadsFocos
  tamanhoMm?: number
}

export type TiRadsCategory = 'TR1' | 'TR2' | 'TR3' | 'TR4' | 'TR5'

export interface TiRadsResult {
  category: TiRadsCategory
  score: number
  riskDescription: string
  management: string
  fnaThresholdMm?: number
  followupThresholdMm?: number
}

const COMPOSICAO_PONTOS: Record<TiRadsComposicao, number> = {
  cistico_esponjoso: 0,
  misto: 1,
  solido: 2,
}

const ECOGENICIDADE_PONTOS: Record<TiRadsEcogenicidade, number> = {
  anecoico_hiperecoico: 1,
  isoecoico: 1,
  hipoecóico: 2,
  muito_hipoecóico: 3,
}

const FORMA_PONTOS: Record<TiRadsForma, number> = {
  mais_largo_que_alto: 0,
  mais_alto_que_largo: 3,
}

const MARGENS_PONTOS: Record<TiRadsMargens, number> = {
  lisas_mal_definidas: 0,
  lobuladas_irregulares: 2,
  extensao_extratireoidiana: 3,
}

const FOCOS_PONTOS: Record<TiRadsFocos, number> = {
  nenhum_cauda_cometa: 0,
  macrocalcificacoes: 1,
  calcificacoes_perifericas: 1,
  focos_ecogenicos_puntiformes: 3,
}

function categoriaFromScore(score: number): TiRadsCategory {
  if (score === 0) return 'TR1'
  if (score <= 2) return 'TR2'
  if (score === 3) return 'TR3'
  if (score <= 6) return 'TR4'
  return 'TR5'
}

const RISK_LABELS: Record<TiRadsCategory, string> = {
  TR1: 'benigno',
  TR2: 'não suspeito',
  TR3: 'levemente suspeito',
  TR4: 'moderadamente suspeito',
  TR5: 'altamente suspeito',
}

interface TiRadsThresholds {
  fna: number
  followup: number
}

const THRESHOLDS: Record<TiRadsCategory, TiRadsThresholds | null> = {
  TR1: null,
  TR2: null,
  TR3: { fna: 25, followup: 15 },
  TR4: { fna: 15, followup: 10 },
  TR5: { fna: 10, followup: 5 },
}

export function calcularTiRads(input: TiRadsInput): TiRadsResult {
  let score = 0
  if (input.composicao) score += COMPOSICAO_PONTOS[input.composicao]
  if (input.ecogenicidade) score += ECOGENICIDADE_PONTOS[input.ecogenicidade]
  if (input.forma) score += FORMA_PONTOS[input.forma]
  if (input.margens) score += MARGENS_PONTOS[input.margens]
  if (input.focosEcogenicos) score += FOCOS_PONTOS[input.focosEcogenicos]

  const category = categoriaFromScore(score)
  const thresholds = THRESHOLDS[category]
  const tamanho = input.tamanhoMm

  let management: string
  if (!thresholds) {
    management = 'Nenhuma ação recomendada pelo TI-RADS'
  } else if (!tamanho) {
    management = `Informe o tamanho para obter a conduta (FNA ≥ ${thresholds.fna}mm; seguimento ≥ ${thresholds.followup}mm)`
  } else if (tamanho >= thresholds.fna) {
    management = `FNA indicada (tamanho ${tamanho}mm ≥ ${thresholds.fna}mm)`
  } else if (tamanho >= thresholds.followup) {
    management = `Seguimento ultrassonográfico recomendado (tamanho ${tamanho}mm ≥ ${thresholds.followup}mm)`
  } else {
    management = `Nenhuma ação pelo TI-RADS (tamanho ${tamanho}mm < ${thresholds.followup}mm)`
  }

  return {
    category,
    score,
    riskDescription: RISK_LABELS[category],
    management,
    fnaThresholdMm: thresholds?.fna,
    followupThresholdMm: thresholds?.followup,
  }
}

const COMPOSICAO_LABELS: Record<TiRadsComposicao, string> = {
  cistico_esponjoso: 'cística/esponjosa',
  misto: 'mista',
  solido: 'sólida',
}

const ECO_LABELS: Record<TiRadsEcogenicidade, string> = {
  anecoico_hiperecoico: 'anecoica/hiperecoica',
  isoecoico: 'isoecoica',
  hipoecóico: 'hipoecóica',
  muito_hipoecóico: 'muito hipoecóica',
}

const FORMA_LABELS: Record<TiRadsForma, string> = {
  mais_largo_que_alto: 'mais largo que alto',
  mais_alto_que_largo: 'mais alto que largo',
}

const MARGENS_LABELS: Record<TiRadsMargens, string> = {
  lisas_mal_definidas: 'lisas/mal definidas',
  lobuladas_irregulares: 'lobuladas/irregulares',
  extensao_extratireoidiana: 'extensão extratireoidiana',
}

const FOCOS_LABELS: Record<TiRadsFocos, string> = {
  nenhum_cauda_cometa: 'nenhum/cauda de cometa',
  macrocalcificacoes: 'macrocalcificações',
  calcificacoes_perifericas: 'calcificações periféricas',
  focos_ecogenicos_puntiformes: 'focos ecogênicos puntiformes',
}

export function formatarBlocoTiRads(input: TiRadsInput, result: TiRadsResult): string {
  const partes: string[] = []
  if (input.composicao) partes.push(`Composição: ${COMPOSICAO_LABELS[input.composicao]} (${COMPOSICAO_PONTOS[input.composicao]}pts)`)
  if (input.ecogenicidade) partes.push(`Ecogenicidade: ${ECO_LABELS[input.ecogenicidade]} (${ECOGENICIDADE_PONTOS[input.ecogenicidade]}pts)`)
  if (input.forma) partes.push(`Forma: ${FORMA_LABELS[input.forma]} (${FORMA_PONTOS[input.forma]}pts)`)
  if (input.margens) partes.push(`Margens: ${MARGENS_LABELS[input.margens]} (${MARGENS_PONTOS[input.margens]}pts)`)
  if (input.focosEcogenicos) partes.push(`Focos ecogênicos: ${FOCOS_LABELS[input.focosEcogenicos]} (${FOCOS_PONTOS[input.focosEcogenicos]}pts)`)

  const tamanhoStr = input.tamanhoMm ? `Tamanho: ${input.tamanhoMm}mm — ` : ''

  return [
    'TI-RADS:',
    partes.join(' | '),
    `Total: ${result.score} pts — ACR ${result.category} (${result.riskDescription})`,
    `${tamanhoStr}Conduta: ${result.management}`,
    '(ACR TI-RADS 2017)',
  ].join('\n')
}
