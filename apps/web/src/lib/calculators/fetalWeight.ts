/**
 * PESO FETAL ESTIMADO — Hadlock 1985 (DBP/CC/CA/CF).
 *
 * Fonte: Hadlock FP et al., Am J Obstet Gynecol 1985;151(3):333-337.
 * Forma conferida em https://loinc.org/11732-5, com medidas em cm:
 *   log10(peso g) = 1,3596 − 0,00386·CA·CF + 0,0064·CC + 0,00061·DBP·CA
 *                   + 0,174·CF + 0,0424·CA
 *
 * Os campos da biometria web são mm (rótulos "(mm)"), então a conversão é
 * sempre ÷10. Não há heurística de unidade: "4,8" é 4,8 mm, nunca 4,8 cm.
 * Sem percentil, faixa de erro ou classificação — só o número.
 */

export type HadlockMedidasMm = {
  dbpMm: number
  ccMm: number
  caMm: number
  cfMm: number
}

/** Chaves do fêmur nos schemas reais: `cf` (obstétrica/Doppler) e `femur` (morfológico). */
const CHAVES_FEMUR = ['cf', 'femur'] as const
export type ChaveFemur = (typeof CHAVES_FEMUR)[number]

/**
 * Medida positiva em mm. Aceita só dígitos com um separador decimal (vírgula ou
 * ponto) e espaços nas bordas; rejeita sufixos, expoente, NaN/Infinity,
 * overflow, zero e negativo.
 */
export function parseMedidaMm(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const texto = raw.trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(texto)) return null
  const valor = Number(texto.replace(',', '.'))
  return Number.isFinite(valor) && valor > 0 ? valor : null
}

/** Peso em gramas, sem arredondamento. `null` se alguma medida ou o resultado for inválido. */
export function calcularPesoHadlock1985(medidas: HadlockMedidasMm): number | null {
  const valores = [medidas.dbpMm, medidas.ccMm, medidas.caMm, medidas.cfMm]
  if (!valores.every((v) => Number.isFinite(v) && v > 0)) return null
  const dbp = medidas.dbpMm / 10
  const cc = medidas.ccMm / 10
  const ca = medidas.caMm / 10
  const cf = medidas.cfMm / 10
  const log10Peso = 1.3596 - 0.00386 * ca * cf + 0.0064 * cc + 0.00061 * dbp * ca + 0.174 * cf + 0.0424 * ca
  const gramas = 10 ** log10Peso
  return Number.isFinite(gramas) && gramas > 0 ? gramas : null
}

/** Gramas inteiros, no formato que o campo `peso` já aceita. */
export function arredondarPesoGramas(gramas: number): string | null {
  if (!Number.isFinite(gramas) || gramas <= 0) return null
  const inteiro = Math.round(gramas)
  return inteiro > 0 && Number.isSafeInteger(inteiro) ? String(inteiro) : null
}

/** Qual chave do schema guarda o fêmur; `null` se nenhuma das conhecidas existir. */
export function chaveFemurDoSchema(fields: ReadonlyArray<{ key: string }>): ChaveFemur | null {
  return CHAVES_FEMUR.find((chave) => fields.some((field) => field.key === chave)) ?? null
}

export type PesoHadlockResultado = {
  /** Valor não arredondado, para testes e conferência. */
  gramas: number
  /** Valor arredondado exibido e aplicado ao campo `peso`. */
  valor: string
}

/** Lê DBP/CC/CA/fêmur do estado da biometria (mm) e calcula; `null` se incompleto ou inválido. */
export function pesoHadlock1985DaBiometria(
  state: Readonly<Record<string, unknown>>,
  chaveFemur: ChaveFemur | null,
): PesoHadlockResultado | null {
  if (!chaveFemur) return null
  const dbpMm = parseMedidaMm(state.dbp)
  const ccMm = parseMedidaMm(state.cc)
  const caMm = parseMedidaMm(state.ca)
  const cfMm = parseMedidaMm(state[chaveFemur])
  if (dbpMm === null || ccMm === null || caMm === null || cfMm === null) return null
  const gramas = calcularPesoHadlock1985({ dbpMm, ccMm, caMm, cfMm })
  if (gramas === null) return null
  const valor = arredondarPesoGramas(gramas)
  return valor === null ? null : { gramas, valor }
}

/** O peso digitado já equivale ao valor calculado arredondado (vírgula/ponto/espaços ignorados). */
export function pesoJaAplicado(pesoAtual: unknown, valor: string): boolean {
  const atual = parseMedidaMm(pesoAtual)
  return atual !== null && atual === Number(valor)
}
