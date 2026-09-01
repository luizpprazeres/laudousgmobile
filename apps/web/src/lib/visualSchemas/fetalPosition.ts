import type { OrganState } from '@/lib/deterministic'

export type FetalPositionVariant =
  | 'longitudinal_cefalica'
  | 'longitudinal_pelvica'
  | 'transversa_polo_direita'
  | 'transversa_polo_esquerda'

export type FetalPositionSchema = {
  variant: FetalPositionVariant
  imageSrc: string
  situation: 'longitudinal' | 'transversa'
  presentation: 'cefálica' | 'pélvica' | null
  headPole: 'à direita' | 'à esquerda' | null
  dorsum: string | null
  title: string
}

const ASSET: Record<FetalPositionVariant, string> = {
  longitudinal_cefalica: '/schemas/fetal/longitudinal-cefalica-v1.png',
  longitudinal_pelvica: '/schemas/fetal/longitudinal-pelvica-v1.png',
  transversa_polo_direita: '/schemas/fetal/transversa-polo-direita-v1.png',
  transversa_polo_esquerda: '/schemas/fetal/transversa-polo-esquerda-v1.png',
}

export function fetalPositionFromState(state: OrganState): FetalPositionSchema {
  const situation = state.situacao === 'transversa' ? 'transversa' : 'longitudinal'
  const dorsum = String(state.dorso ?? '').trim() || null
  if (situation === 'transversa') {
    const headPole = state['situacao.transversa.polo_cefalico'] === 'à esquerda' ? 'à esquerda' : 'à direita'
    const variant: FetalPositionVariant = headPole === 'à esquerda'
      ? 'transversa_polo_esquerda'
      : 'transversa_polo_direita'
    return {
      variant,
      imageSrc: ASSET[variant],
      situation,
      presentation: null,
      headPole,
      dorsum,
      title: `Situação transversa · polo cefálico ${headPole}`,
    }
  }
  const presentation = state['situacao.longitudinal.apresentacao'] === 'pélvica' ? 'pélvica' : 'cefálica'
  const variant: FetalPositionVariant = presentation === 'pélvica'
    ? 'longitudinal_pelvica'
    : 'longitudinal_cefalica'
  return {
    variant,
    imageSrc: ASSET[variant],
    situation,
    presentation,
    headPole: null,
    dorsum,
    title: `Situação longitudinal · apresentação ${presentation}`,
  }
}

export function supportsFetalPositionSchema(category: string, trimester: unknown) {
  if (category === 'OBSTETRICA') return true
  return category === 'MORFOLOGICO' && (trimester === '2t' || trimester === '3t')
}
