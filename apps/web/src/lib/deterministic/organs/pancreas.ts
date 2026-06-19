/**
 * Pâncreas — Abdome Total.
 */

import type { Field, OrganComposition, OrganModule, OrganSchema, OrganState } from '../types'

const lesionSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensão', kind: 'text', placeholder: '20 mm' },
]

const schema: OrganSchema = {
  id: 'pancreas',
  name: 'Pâncreas',
  category: 'ABDOMEN_TOTAL',
  fields: [
    {
      key: 'visualizacao',
      label: 'Visualização',
      kind: 'segmented',
      hint: 'default: adequada',
      options: [
        { value: 'adequada', label: 'Adequada', isDefault: true },
        { value: 'prejudicada', label: 'Prejudicada' },
      ],
    },
    {
      key: 'ecotextura',
      label: 'Ecotextura',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'heterogenea', label: 'Heterogênea' },
        { value: 'lipomatose', label: 'Lipomatose' },
      ],
    },
    {
      key: 'wirsung',
      label: 'Wirsung',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'dilatado', label: 'Dilatado' },
      ],
    },
    {
      key: 'lesoes',
      label: 'Lesões',
      kind: 'checklist',
      hint: 'marque se houver',
      options: [
        { value: 'cisto', label: 'Cisto', subFields: lesionSubFields },
        { value: 'nodulo', label: 'Nódulo a esclarecer', subFields: lesionSubFields },
      ],
    },
  ],
}

function initialState(): OrganState {
  return {
    visualizacao: 'adequada',
    ecotextura: 'normal',
    wirsung: 'normal',
    lesoes: [],
    'lesoes.cisto.dimensao': '',
    'lesoes.nodulo.dimensao': '',
  }
}

function medida(texto: string): string {
  const dim = texto.trim()
  return dim ? `, medindo ${dim}` : ''
}

function compose(state: OrganState): OrganComposition {
  const visualizacao = (state.visualizacao as string) || 'adequada'
  const ecotextura = (state.ecotextura as string) || 'normal'
  const wirsung = (state.wirsung as string) || 'normal'
  const lesoes = (state.lesoes as string[]) || []
  const conclusion: string[] = []
  const achados: string[] = []

  const onlyPrejudicada =
    visualizacao === 'prejudicada' &&
    ecotextura === 'normal' &&
    wirsung === 'normal' &&
    lesoes.length === 0

  if (onlyPrejudicada) {
    return {
      body: 'Pâncreas com avaliação parcialmente prejudicada pela interposição gasosa, sem alterações evidentes nas porções visibilizadas.',
      conclusion: [],
      isNormal: false,
    }
  }

  let abertura: string
  if (visualizacao === 'prejudicada') {
    abertura = 'Pâncreas com avaliação parcialmente prejudicada pela interposição gasosa'
    if (ecotextura === 'heterogenea') {
      abertura += ', com ecotextura heterogênea nas porções visibilizadas'
    } else if (ecotextura === 'lipomatose') {
      abertura += ', com parênquima difusamente hiperecogênico, compatível com lipomatose pancreática'
      conclusion.push('Lipomatose pancreática (esteatose pancreática)')
    } else {
      abertura += ', sem alterações evidentes nas porções visibilizadas'
    }
  } else {
    if (ecotextura === 'heterogenea') {
      abertura = 'Pâncreas de dimensões normais e ecotextura heterogênea'
    } else if (ecotextura === 'lipomatose') {
      abertura = 'Pâncreas de dimensões normais, com parênquima difusamente hiperecogênico, compatível com lipomatose pancreática'
      conclusion.push('Lipomatose pancreática (esteatose pancreática)')
    } else {
      abertura = 'Pâncreas de dimensões e ecotextura normais'
    }
  }

  if (lesoes.includes('cisto')) {
    achados.push(`apresentando imagem cística${medida(((state['lesoes.cisto.dimensao'] as string) || ''))}`)
    conclusion.push('Cisto pancreático. Convém, a critério clínico, complementar com método de imagem contrastado')
  }
  if (lesoes.includes('nodulo')) {
    achados.push(`apresentando imagem nodular sólida${medida(((state['lesoes.nodulo.dimensao'] as string) || ''))}, a esclarecer`)
    conclusion.push('Nódulo pancreático a esclarecer. Convém, a critério clínico, complementar a investigação')
  }

  let body = achados.length > 0
    ? `${abertura}, ${achados.join('; ')}.`
    : `${abertura}, sem evidências de lesões focais.`

  if (wirsung === 'dilatado') {
    body += ' Ducto pancreático principal ectasiado.'
    conclusion.push('Dilatação do ducto pancreático principal, a esclarecer')
  } else {
    body += ' Ducto pancreático principal de calibre normal.'
  }

  const isNormal =
    visualizacao === 'adequada' &&
    ecotextura === 'normal' &&
    wirsung === 'normal' &&
    lesoes.length === 0

  return { body, conclusion, isNormal }
}

export const pancreasModule: OrganModule = { schema, initialState, compose }
