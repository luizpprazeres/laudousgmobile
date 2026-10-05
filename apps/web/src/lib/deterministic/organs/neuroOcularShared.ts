/**
 * Utilitários conservadores de medida e idade para TRANSFONTANELA e OCULAR.
 *
 * Valor vazio → null (o campo é opcional e some do texto).
 * Valor ilegível ou fora da faixa → '____' (o médico vê a lacuna; nada é inventado).
 */

import type { Field, FieldOption } from '../types'

export const LACUNA = '____'

export function ptBr(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
}

/** Medida em mm. Aceita "4,2", "4.2 mm" ou "0,42 cm" (convertido). */
export function parseMm(raw: unknown): number | null {
  const text = String(raw ?? '').trim().toLowerCase()
  if (!text) return null
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(mm|cm)?$/)
  if (!match) return NaN
  const value = Number(match[1]!.replace(',', '.')) * (match[2] === 'cm' ? 10 : 1)
  return value > 0 && value < 100 ? value : NaN
}

/** Texto da medida: null quando vazio, '____' quando inválido. */
export function mmText(raw: unknown): string | null {
  const value = parseMm(raw)
  if (value === null) return null
  return Number.isNaN(value) ? LACUNA : `${ptBr(value)} mm`
}

/** Idade gestacional "32", "32+4", "32s4d", "32 4". */
export function igText(raw: unknown, minWeeks: number, maxWeeks: number): string | null {
  const text = String(raw ?? '').trim().toLowerCase()
  if (!text) return null
  const match = text.match(/^(\d{1,2})\s*(?:(?:\+|s|sem|semanas)\s*)?(?:e\s*)?(?:(\d)\s*(?:d|dias?)?)?$/)
  if (!match) return LACUNA
  const weeks = Number(match[1])
  const days = match[2] === undefined ? 0 : Number(match[2])
  if (weeks < minWeeks || weeks > maxWeeks || days > 6) return LACUNA
  return days ? `${weeks} semanas e ${days} ${days === 1 ? 'dia' : 'dias'}` : `${weeks} semanas`
}

export function intText(raw: unknown, max: number): string | null {
  const text = String(raw ?? '').trim()
  if (!text) return null
  if (!/^\d+$/.test(text) || Number(text) > max) return LACUNA
  return text
}

export const opt = (value: string, label: string, extra: Partial<FieldOption> = {}): FieldOption => ({ value, label, ...extra })

export const segmented = (key: string, label: string, options: FieldOption[], hint?: string): Field => ({
  key, label, kind: 'segmented', options, ...(hint ? { hint } : {}),
})

export const mini = (key: string, label: string, options: FieldOption[], halfWidth = false): Field => ({
  key, label, kind: 'mini-segmented', options, ...(halfWidth ? { halfWidth } : {}),
})

export const text = (key: string, label: string, placeholder: string, halfWidth = true): Field => ({
  key, label, kind: 'text', placeholder, halfWidth,
})

export const SIM_NAO = [opt('nao', 'Não', { isDefault: true }), opt('sim', 'Sim')]

/** Estado inicial a partir dos defaults, inclusive de subcampos (`campo.opção.sub`). */
export function initialFromFields(fields: Field[]): Record<string, string> {
  const state: Record<string, string> = {}
  for (const field of fields) {
    state[field.key] = field.options?.find((option) => option.isDefault)?.value ?? ''
    for (const option of field.options ?? []) {
      for (const sub of option.subFields ?? []) {
        state[`${field.key}.${option.value}.${sub.key}`] = sub.options?.find((o) => o.isDefault)?.value ?? ''
      }
    }
  }
  return state
}

/** Lê um subcampo da opção ativa. */
export function sub(state: Record<string, string | string[]>, field: string, option: string, key: string): string {
  return String(state[`${field}.${option}.${key}`] ?? '').trim()
}

export function ladoFrase(lado: string): string {
  if (lado === 'direito') return 'à direita'
  if (lado === 'esquerdo') return 'à esquerda'
  if (lado === 'bilateral') return 'bilateralmente'
  return LACUNA
}

export function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}
