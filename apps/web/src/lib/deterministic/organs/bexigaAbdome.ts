import type { OrganComposition, OrganModule, OrganState } from '../types'

function initialState(): OrganState {
  return {
    replecao: 'adequada',
    parede: 'normal',
    conteudo: [],
    volume_pre: '',
    espessura_parede: '',
    residuo: '',
  }
}

function compose(state: OrganState): OrganComposition {
  const replecao = (state.replecao as string) || 'adequada'
  const parede = (state.parede as string) || 'normal'
  const conteudo = (state.conteudo as string[]) || []
  const volume = String(state.volume_pre || '').trim()
  const espessura = String(state.espessura_parede || '').trim()
  const residuo = String(state.residuo || '').trim()
  const body: string[] = []
  const conclusion: string[] = []

  if (replecao === 'insuficiente') {
    body.push('Bexiga com repleção insuficiente no momento do exame, prejudicando a sua adequada avaliação.')
    conclusion.push('Bexiga com repleção insuficiente para adequada avaliação.')
  } else {
    const paredeTxt = parede === 'espessada' ? 'paredes espessadas' : parede === 'trabeculada' ? 'paredes trabeculadas' : 'paredes regulares e finas'
    const conteudoTxt = conteudo.length === 0 ? 'conteúdo anecoico e homogêneo' : conteudo.map((item) => ({
      debris: 'ecos em suspensão (debris)',
      calculo: 'imagem hiperecogênica móvel com sombra acústica posterior, compatível com cálculo',
      sonda: 'balão de sonda vesical em seu interior',
      diverticulo: 'imagem sacular comunicante com a luz vesical, compatível com divertículo',
    })[item] || item).join('; ')
    body.push(`Bexiga com adequada repleção, ${paredeTxt}, apresentando ${conteudoTxt}.`)
    if (parede === 'espessada') conclusion.push('Espessamento da parede vesical.')
    if (parede === 'trabeculada') conclusion.push('Trabeculação da parede vesical.')
    if (conteudo.includes('debris')) conclusion.push('Debris no interior da bexiga.')
    if (conteudo.includes('calculo')) conclusion.push('Cálculo vesical.')
    if (conteudo.includes('diverticulo')) conclusion.push('Divertículo vesical.')
  }

  if (replecao !== 'insuficiente' && volume) body.push(`Volume pré-miccional de ${volume} mL.`)
  if (replecao !== 'insuficiente' && espessura) body.push(`Espessura da parede vesical de aproximadamente ${espessura} mm.`)
  if (replecao !== 'insuficiente' && residuo) {
    body.push(`Resíduo pós-miccional de ${residuo} mL.`)
    conclusion.push(`Resíduo pós-miccional de ${residuo} mL.`)
  }

  const isNormal = replecao === 'adequada' && parede === 'normal' && conteudo.length === 0 && !residuo
  return { body: body.join('\n'), conclusion, isNormal }
}

export const bexigaAbdomeModule: OrganModule = {
  schema: {
    id: 'bexiga',
    name: 'Bexiga',
    category: 'ABDOMEN_TOTAL',
    fields: [
      { key: 'replecao', label: 'Repleção', kind: 'segmented', options: [
        { value: 'adequada', label: 'Adequada', isDefault: true },
        { value: 'insuficiente', label: 'Insuficiente' },
      ] },
      { key: 'parede', label: 'Parede', kind: 'segmented', options: [
        { value: 'normal', label: 'Regular e fina', isDefault: true },
        { value: 'espessada', label: 'Espessada' },
        { value: 'trabeculada', label: 'Trabeculada' },
      ] },
      { key: 'conteudo', label: 'Conteúdo e alterações', kind: 'checklist', hint: 'marque se houver', options: [
        { value: 'debris', label: 'Debris' },
        { value: 'calculo', label: 'Cálculo' },
        { value: 'sonda', label: 'Sonda vesical' },
        { value: 'diverticulo', label: 'Divertículo' },
      ] },
      { key: 'volume_pre', label: 'Volume pré-miccional (mL)', kind: 'text', placeholder: '250' },
      { key: 'espessura_parede', label: 'Espessura da parede (mm)', kind: 'text', placeholder: '3' },
      { key: 'residuo', label: 'Resíduo pós-miccional (mL)', kind: 'text', placeholder: '20' },
    ],
  },
  initialState,
  compose,
}
