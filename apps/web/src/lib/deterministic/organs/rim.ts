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
  { key: 'dimensao', label: 'Dimensão', kind: 'text', placeholder: '20 mm' },
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
    ],
    rareFindings: [
      { value: 'angiomiolipoma', label: 'Angiomiolipoma (imagem hiperecogênica)' },
      { value: 'cisto_complexo', label: 'Cisto complexo (Bosniak ≥ II)' },
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
    raros: [],
    'litiase.calculo.dimensao': '',
    'litiase.calculo.polo': 'sup',
    'cistos.simples.dimensao': '',
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

    if (raros.includes('angiomiolipoma')) {
      achados.push('apresentando pequena imagem nodular hiperecogênica, homogênea, sugestiva de angiomiolipoma')
      conclusion.push(`Imagem sugestiva de angiomiolipoma ${lat}`)
    }
    if (raros.includes('cisto_complexo')) {
      achados.push('apresentando imagem cística com septos/conteúdo espesso (Bosniak ≥ II)')
      conclusion.push(`Cisto renal complexo ${lat} (Bosniak ≥ II). Convém, a critério clínico, complementar com método contrastado`)
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
