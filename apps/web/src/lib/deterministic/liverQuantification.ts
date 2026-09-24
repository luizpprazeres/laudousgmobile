import type { OrganState } from './types'

export type LiverQuantificationState = OrganState

const numberFrom = (value: OrganState[string] | undefined) => {
  if (Array.isArray(value) || value === undefined || value.trim() === '') return null
  const normalized = value.trim().replace(',', '.')
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const textFrom = (value: OrganState[string] | undefined) => {
  if (Array.isArray(value)) return ''
  return (value ?? '').trim()
}

const enabled = (state: OrganState, key: string) => textFrom(state[key]) === 'sim'

const modalityLabel: Record<string, string> = {
  '2d-swe': 'elastografia bidimensional por onda de cisalhamento (2D-SWE)',
  pswe: 'elastografia por onda de cisalhamento pontual (pSWE/ARFI)',
  te: 'elastografia transitória',
}

const fatMethodLabel: Record<string, string> = {
  cap: 'CAP',
  attenuation: 'coeficiente de atenuação',
  fraction: 'fração gordurosa estimada pelo equipamento',
}

const expectedFatUnit: Record<string, string> = {
  cap: 'dB/m',
  attenuation: 'dB/cm/MHz',
  fraction: '%',
}

const add = (items: string[], value: string) => {
  if (value) items.push(value)
}

const requiredText = (state: OrganState, key: string, label: string, errors: string[]) => {
  const value = textFrom(state[key])
  if (!value) errors.push(`${label}: informe um valor.`)
  return value
}

const positive = (state: OrganState, key: string, label: string, errors: string[]) => {
  const raw = textFrom(state[key])
  const value = numberFrom(state[key])
  if (!raw) {
    errors.push(`${label}: informe um valor.`)
    return null
  }
  if (value === null || value <= 0) errors.push(`${label}: use um número maior que zero.`)
  return value
}

const nonNegative = (state: OrganState, key: string, label: string, errors: string[]) => {
  const raw = textFrom(state[key])
  const value = numberFrom(state[key])
  if (!raw) return null
  if (value === null || value < 0) errors.push(`${label}: use um número igual ou maior que zero.`)
  return value
}

export function buildLiverQuantificationBlock(state: LiverQuantificationState): { text: string; errors: string[] } {
  const errors: string[] = []
  const blocks: string[] = []

  if (enabled(state, 'elastografiaAtiva')) {
    const modality = requiredText(state, 'elastografiaModalidade', 'Modalidade de elastografia', errors)
    const unit = requiredText(state, 'rigidezUnidade', 'Unidade da rigidez', errors)
    const technique = textFrom(state.elastografiaTecnica)
    const equipment = textFrom(state.elastografiaEquipamento)
    const measurements = textFrom(state.rigidezNumeroMedicoes) ? positive(state, 'rigidezNumeroMedicoes', 'Número de medições', errors) : null
    if (measurements !== null && !Number.isInteger(measurements)) errors.push('Número de medições: use um número inteiro.')
    const median = positive(state, 'rigidezMediana', 'Mediana da rigidez', errors)
    const iqr = nonNegative(state, 'rigidezIqr', 'IQR da rigidez', errors)
    const ratio = median !== null && median > 0 && iqr !== null ? (iqr / median) * 100 : null
    if (ratio !== null && !Number.isFinite(ratio)) errors.push('Razão IQR/mediana fora da faixa numérica válida.')
    if (textFrom(state.rigidezQualidade) === 'nao-realizavel') errors.push('Elastografia: exame não realizável não pode produzir medida válida.')
    if (modality === 'te' && unit && unit !== 'kPa') errors.push('Elastografia transitória: a unidade informada não é compatível com esta modalidade.')
    if (modality && !modalityLabel[modality]) errors.push('Modalidade de elastografia: opção não reconhecida.')
    if (unit && !['kPa', 'm/s'].includes(unit)) errors.push('Unidade da rigidez: use kPa ou m/s, sem conversão automática.')

    if (!errors.length && modality && unit && median !== null) {
      const lines: string[] = []
      add(lines, `Modalidade: ${modalityLabel[modality]}.`)
      add(lines, technique ? `Técnica/protocolo: ${technique}.` : '')
      add(lines, equipment ? `Equipamento: ${equipment}.` : '')
      add(lines, measurements !== null ? `Número de medições: ${measurements}.` : '')
      add(lines, `Mediana da rigidez: ${median} ${unit}.`)
      add(lines, iqr !== null ? `IQR: ${iqr} ${unit}.` : '')
      add(lines, ratio !== null ? `Razão IQR/mediana: ${ratio.toFixed(1)}%.` : '')
      add(lines, textFrom(state.rigidezQualidade) ? `Qualidade informada: ${textFrom(state.rigidezQualidade)}.` : '')
      add(lines, textFrom(state.rigidezJejum) ? `Jejum: ${textFrom(state.rigidezJejum)}.` : '')
      add(lines, textFrom(state.interpretacaoMedica) ? `Interpretação médica: ${textFrom(state.interpretacaoMedica)}` : '')
      blocks.push(`ELASTOGRAFIA HEPÁTICA\n${lines.join('\n')}`)
    }
  }

  if (enabled(state, 'gorduraAtiva')) {
    const method = requiredText(state, 'gorduraMetodo', 'Método de quantificação de gordura', errors)
    const unit = requiredText(state, 'gorduraUnidade', 'Unidade da quantificação de gordura', errors)
    const value = method === 'fraction' ? nonNegative(state, 'gorduraValor', 'Fração gordurosa', errors) : positive(state, 'gorduraValor', 'Valor de atenuação', errors)
    if (method === 'fraction' && !textFrom(state.gorduraValor)) errors.push('Fração gordurosa: informe o valor medido.')
    const expected = expectedFatUnit[method]
    if (method && !fatMethodLabel[method]) errors.push('Método de quantificação de gordura: opção não reconhecida.')
    if (expected && unit !== expected) errors.push(`Quantificação de gordura: ${method} requer a unidade ${expected}; não há conversão automática.`)
    if (!method || !['dB/m', 'dB/cm/MHz', '%'].includes(unit)) errors.push('Unidade da quantificação de gordura: opção não reconhecida.')
    if (textFrom(state.gorduraQualidade) === 'nao-realizavel') errors.push('Quantificação de gordura: exame não realizável não pode produzir medida válida.')
    if (method === 'fraction' && (!textFrom(state.gorduraEquipamento) || !textFrom(state.gorduraTecnologia))) errors.push('Fração gordurosa: informe equipamento e tecnologia de quantificação.')
    if (unit === '%' && value !== null && value > 100) errors.push('Quantificação em %: use um valor entre 0 e 100.')
    if (!errors.length && method && unit && value !== null) {
      const lines: string[] = [`Método: ${fatMethodLabel[method]}.`, `Valor informado: ${value} ${unit}.`]
      add(lines, textFrom(state.gorduraTecnologia) ? `Tecnologia: ${textFrom(state.gorduraTecnologia)}.` : '')
      add(lines, textFrom(state.gorduraEquipamento) ? `Equipamento: ${textFrom(state.gorduraEquipamento)}.` : '')
      add(lines, textFrom(state.gorduraQualidade) ? `Qualidade informada: ${textFrom(state.gorduraQualidade)}.` : '')
      add(lines, textFrom(state.gorduraJejum) ? `Jejum: ${textFrom(state.gorduraJejum)}.` : '')
      add(lines, textFrom(state.interpretacaoMedica) ? `Interpretação médica: ${textFrom(state.interpretacaoMedica)}` : '')
      blocks.push(`QUANTIFICAÇÃO DA GORDURA HEPÁTICA\n${lines.join('\n')}`)
    }
  }

  return { text: errors.length ? '' : blocks.join('\n\n'), errors }
}
