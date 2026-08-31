export const WRITING_STYLE_IDS = {
  CLASSICO_COMPLETO: '11111111-1111-4111-8111-111111111111',
  OBJETIVO: '44444444-4444-4444-8444-444444444444',
} as const

export type WritingStyleCode = keyof typeof WRITING_STYLE_IDS
export type WritingStyleId = (typeof WRITING_STYLE_IDS)[WritingStyleCode]

export function codigoDoEstilo(id: unknown): WritingStyleCode {
  return id === WRITING_STYLE_IDS.OBJETIVO ? 'OBJETIVO' : 'CLASSICO_COMPLETO'
}

export function idDeEstiloValido(id: unknown): id is WritingStyleId {
  return id === WRITING_STYLE_IDS.CLASSICO_COMPLETO || id === WRITING_STYLE_IDS.OBJETIVO
}
