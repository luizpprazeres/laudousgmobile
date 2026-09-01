/**
 * Rins — Abdome Total.
 */

import type { Field, OrganComposition, OrganModule, OrganSchema, OrganState } from '../types'

type Lado = 'direito' | 'esquerdo'

const calculoSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensão', kind: 'text', placeholder: '5 mm' },
  {
    key: 'polo',
    label: 'Polo',
    kind: 'mini-segmented',
    options: [
      { value: 'sup', label: 'Polo sup.', isDefault: true },
      { value: 'medio', label: 'Médio' },
      { value: 'inf', label: 'Polo inf.' },
    ],
  },
]

const cistoSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensões (mm)', kind: 'text', placeholder: '20 x 18 x 16' },
]

const lesaoSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensões (mm)', kind: 'text', placeholder: '12 x 10 x 9' },
  {
    key: 'polo',
    label: 'Localização',
    kind: 'mini-segmented',
    options: [
      { value: 'sup', label: 'Polo sup.', isDefault: true },
      { value: 'medio', label: 'Terço médio' },
      { value: 'inf', label: 'Polo inf.' },
    ],
  },
]

function poloFrase(polo: string): string {
  if (polo === 'medio') return 'no terço médio'
  if (polo === 'inf') return 'no polo inferior'
  return 'no polo superior'
}

// "grau" é masculino: moderada/acentuada → moderado/acentuado.
function grauMasc(grau: string): string {
  if (grau === 'moderada') return 'moderado'
  if (grau === 'acentuada') return 'acentuado'
  return 'leve'
}

function criarSchema(lado: Lado): OrganSchema {
  const adj = lado
  return {
    id: `rim_${lado}`,
    name: `Rim ${adj}`,
    category: 'ABDOMEN_TOTAL',
    fields: [
      {
        key: 'dimensoes',
        label: 'Dimensões',
        kind: 'segmented',
        hint: 'default: normais',
        options: [
          { value: 'normal', label: 'Normais', isDefault: true },
          { value: 'reduzido', label: 'Reduzido' },
        ],
      },
      {
        key: 'diferenciacao',
        label: 'Diferenciação',
        kind: 'segmented',
        hint: 'default: preservada',
        options: [
          { value: 'preservada', label: 'Preservada', isDefault: true },
          { value: 'reduzida', label: 'Reduzida' },
        ],
      },
      {
        key: 'litiase',
        label: 'Litíase',
        kind: 'checklist',
        hint: 'marque se houver',
        options: [
          { value: 'calculo', label: 'Cálculo', subFields: calculoSubFields },
        ],
      },
      {
        key: 'dilatacao',
        label: 'Dilatação',
        kind: 'segmented',
        hint: 'default: ausente',
        options: [
          { value: 'ausente', label: 'Ausente', isDefault: true },
          { value: 'leve', label: 'Leve' },
          { value: 'moderada', label: 'Moderada' },
          { value: 'acentuada', label: 'Acentuada' },
        ],
      },
      {
        key: 'cistos',
        label: 'Cistos',
        kind: 'checklist',
        hint: 'marque se houver',
        options: [
          { value: 'simples', label: 'Cisto simples', subFields: cistoSubFields },
          { value: 'multiplos', label: 'Cistos múltiplos' },
        ],
      },
      {
        key: 'lesoes',
        label: 'Outras lesões',
        kind: 'checklist',
        hint: 'marque se houver',
        options: [
          { value: 'angiomiolipoma', label: 'Angiomiolipoma', subFields: lesaoSubFields },
          { value: 'cisto_complexo', label: 'Cisto complexo', subFields: lesaoSubFields },
        ],
      },
      { key: 'medidas', label: 'Medidas do rim (L x AP x T cm)', kind: 'text', placeholder: '10,2 x 4,8 x 5,1' },
      { key: 'espessura', label: 'Espessura do parênquima (cm)', kind: 'text', placeholder: '1,6' },
    ],
    rareFindings: [
      { value: 'nefrocalcinose', label: 'Nefrocalcinose' },
    ],
  }
}

function initialState(): OrganState {
  return {
    dimensoes: 'normal',
    diferenciacao: 'preservada',
    litiase: [],
    dilatacao: 'ausente',
    cistos: [],
    lesoes: [],
    raros: [],
    'litiase.calculo.dimensao': '',
    'litiase.calculo.polo': 'sup',
    'cistos.simples.dimensao': '',
    'lesoes.angiomiolipoma.dimensao': '',
    'lesoes.angiomiolipoma.polo': 'sup',
    'lesoes.cisto_complexo.dimensao': '',
    'lesoes.cisto_complexo.polo': 'sup',
    medidas: '',
    espessura: '',
  }
}

export function criarRimModule(lado: Lado): OrganModule {
  const adj = lado
  const lat = lado === 'direito' ? 'à direita' : 'à esquerda'
  const schema = criarSchema(lado)

  function compose(state: OrganState): OrganComposition {
    const dimensoes = (state.dimensoes as string) || 'normal'
    const diferenciacao = (state.diferenciacao as string) || 'preservada'
    const litiase = (state.litiase as string[]) || []
    const dilatacao = (state.dilatacao as string) || 'ausente'
    const cistos = (state.cistos as string[]) || []
    const lesoes = (state.lesoes as string[]) || []
    const raros = (state.raros as string[]) || []
    const conclusion: string[] = []
    const achados: string[] = []

    const nefropatiaConclusoes = new Set<string>()
    let abertura = dimensoes === 'reduzido'
      ? `Rim ${adj} de dimensões reduzidas e contornos regulares`
      : `Rim ${adj} tópico, de dimensões normais e contornos regulares`
    if (dimensoes === 'reduzido') nefropatiaConclusoes.add(`Sinais sugestivos de nefropatia crônica ${lat}`)

    abertura += diferenciacao === 'reduzida'
      ? ', com redução da diferenciação corticomedular'
      : ', com boa diferenciação corticomedular'
    if (diferenciacao === 'reduzida') nefropatiaConclusoes.add(`Sinais sugestivos de nefropatia parenquimatosa ${lat}`)

    if (litiase.includes('calculo')) {
      const dim = ((state['litiase.calculo.dimensao'] as string) || '').trim()
      const polo = poloFrase((state['litiase.calculo.polo'] as string) || 'sup')
      achados.push(`apresentando imagem hiperecogênica com sombra acústica posterior ${polo}${dim ? `, medindo ${dim}` : ''}, compatível com cálculo`)
      conclusion.push(`Litíase renal ${lat}${dim ? ` — cálculo de ${dim}` : ''}`)
    }

    if (dilatacao !== 'ausente') {
      const grau = grauMasc(dilatacao)
      achados.push(`com dilatação pielocalicinal de grau ${grau} (hidronefrose)`)
      conclusion.push(`Hidronefrose de grau ${grau} ${lat}, a esclarecer`)
    }

    if (cistos.includes('simples')) {
      const dim = ((state['cistos.simples.dimensao'] as string) || '').trim()
      achados.push(`apresentando imagem anecoica de paredes finas e reforço acústico posterior${dim ? `, medindo ${dim}` : ''}, compatível com cisto simples (Bosniak I)`)
      conclusion.push(`Cisto renal simples ${lat} (Bosniak I)`)
    }
    if (cistos.includes('multiplos')) {
      achados.push(`apresentando múltiplas imagens anecoicas corticais no rim ${adj}, compatíveis com cistos simples`)
      conclusion.push(`Cistos renais simples ${lat}`)
    }

    if (lesoes.includes('angiomiolipoma') || raros.includes('angiomiolipoma')) {
      const dim = ((state['lesoes.angiomiolipoma.dimensao'] as string) || '').trim()
      const polo = poloFrase((state['lesoes.angiomiolipoma.polo'] as string) || 'sup')
      achados.push(`apresentando imagem nodular hiperecogênica e homogênea ${polo}${dim ? `, medindo ${dim}` : ''}, sugestiva de angiomiolipoma`)
      conclusion.push(`Imagem sugestiva de angiomiolipoma ${lat}`)
    }
    if (lesoes.includes('cisto_complexo') || raros.includes('cisto_complexo')) {
      const dim = ((state['lesoes.cisto_complexo.dimensao'] as string) || '').trim()
      const polo = poloFrase((state['lesoes.cisto_complexo.polo'] as string) || 'sup')
      achados.push(`apresentando imagem cística complexa ${polo}${dim ? `, medindo ${dim}` : ''}`)
      conclusion.push(`Imagem cística complexa ${lat}, de natureza indeterminada ao método. Convém, a critério clínico, complementar a investigação com método contrastado`)
    }
    if (raros.includes('nefrocalcinose')) {
      achados.push('com calcificações nas pirâmides medulares, compatível com nefrocalcinose')
      conclusion.push(`Nefrocalcinose ${lat}`)
    }

    conclusion.unshift(...nefropatiaConclusoes)

    const isNormal =
      dimensoes === 'normal' &&
      diferenciacao === 'preservada' &&
      litiase.length === 0 &&
      dilatacao === 'ausente' &&
      cistos.length === 0 &&
      lesoes.length === 0 &&
      raros.length === 0

    if (isNormal) {
      return {
        body: `Rim ${adj} tópico, de dimensões normais, contornos regulares e boa diferenciação corticomedular, sem litíase ou dilatação pielocalicinal.`,
        conclusion: [],
        isNormal: true,
      }
    }

    const body = achados.length > 0 ? `${abertura}, ${achados.join('; ')}.` : `${abertura}.`
    return { body, conclusion, isNormal: false }
  }

  return { schema, initialState, compose }
}

export const rimDireitoModule: OrganModule = criarRimModule('direito')
export const rimEsquerdoModule: OrganModule = criarRimModule('esquerdo')
