/**
 * Leitura estrita de medidas digitadas nos formulários locais (próstata
 * transretal, paratireoide, glândulas salivares).
 *
 * Regra: o valor só vira número quando o campo inteiro é uma medida positiva,
 * opcionalmente com a unidade (`cm` ou `mm`). Vazio = não medido (`null`);
 * qualquer outra coisa = `'invalida'`. Nunca se adivinha um número, e a
 * medida digitada é preservada na unidade do laudo, sem arredondar além da
 * casa decimal impressa.
 */

export type Unidade = 'cm' | 'mm'

function converter(n: number, de: Unidade | undefined, para: Unidade): number {
  if (!de || de === para) return n
  return de === 'mm' ? n / 10 : n * 10
}

/** Uma medida linear. `unidade` é a unidade do laudo (e a assumida sem sufixo). */
export function lerMedida(raw: unknown, unidade: Unidade): number | null | 'invalida' {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string' && typeof raw !== 'number') return 'invalida'
  const s = String(raw).trim().toLowerCase().replace(',', '.')
  if (!s) return null
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(cm|mm)?$/)
  if (!m) return 'invalida'
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return 'invalida'
  const valor = converter(n, m[2] as Unidade | undefined, unidade)
  // Abaixo de meia casa decimal o laudo imprimiria "0,0".
  return valor < 0.05 ? 'invalida' : valor
}

/**
 * Medidas em eixos separados por "x" (ex.: "1,0 x 0,6 x 0,5" ou "12 x 9 mm").
 * Exige exatamente `eixos` valores. Um sufixo de unidade no fim vale para todos.
 */
export function lerEixos(raw: unknown, eixos: number, unidade: Unidade): number[] | null | 'invalida' {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string') return 'invalida'
  const s = raw.trim().toLowerCase().replace(/,/g, '.')
  if (!s) return null
  const sufixo = s.match(/\s*(cm|mm)$/)
  const de = sufixo ? (sufixo[1] as Unidade) : undefined
  const corpo = sufixo ? s.slice(0, sufixo.index) : s
  const partes = corpo.split(/\s*[x×]\s*/)
  if (partes.length !== eixos) return 'invalida'
  const valores: number[] = []
  for (const parte of partes) {
    if (!/^\d+(?:\.\d+)?$/.test(parte)) return 'invalida'
    const n = converter(Number(parte), de, unidade)
    if (!Number.isFinite(n) || n < 0.05) return 'invalida'
    valores.push(n)
  }
  return valores
}

export function ptBr1(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

export function formatarEixos(valores: number[], unidade: Unidade): string {
  return `${valores.map(ptBr1).join(' x ')} ${unidade}`
}

/** Texto livre do médico em uma linha, sem ponto final duplicado. */
export function textoLivre(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().replace(/\.+$/, '') : ''
}
