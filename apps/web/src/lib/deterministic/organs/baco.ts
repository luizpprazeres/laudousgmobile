/**
 * Baço — Abdome Total.
 */

import type { Field, OrganComposition, OrganModule, OrganSchema, OrganState } from '../types'

const aumentadoSubFields: Field[] = [
  { key: 'eixo', label: 'Maior eixo', kind: 'text', placeholder: '13 cm' },
]

const cistoSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensão', kind: 'text', placeholder: '20 mm' },
]

const schema: OrganSchema = {
  id: 'baco',
  name: 'Baço',
  category: 'ABDOMEN_TOTAL',
  fields: [
    {
      key: 'dimensoes',
      label: 'Dimensões',
      kind: 'segmented',
      hint: 'default: normais',
      options: [
        { value: 'normal', label: 'Normais', isDefault: true },
        { value: 'aumentado', label: 'Aumentado', subFields: aumentadoSubFields },
      ],
    },
    {
      key: 'ecotextura',
      label: 'Ecotextura',
      kind: 'segmented',
      hint: 'default: homogênea',
      options: [
        { value: 'homogenea', label: 'Homogênea', isDefault: true },
        { value: 'heterogenea', label: 'Heterogênea' },
      ],
    },
    {
      key: 'lesoes',
      label: 'Lesões',
      kind: 'checklist',
      hint: 'marque se houver',
      options: [
        { value: 'cisto', label: 'Cisto', subFields: cistoSubFields },
        { value: 'calcificacao', label: 'Calcificação' },
        { value: 'acessorio', label: 'Baço acessório' },
      ],
    },
  ],
}

function initialState(): OrganState {
  return {
    dimensoes: 'normal',
    ecotextura: 'homogenea',
    lesoes: [],
    'dimensoes.aumentado.eixo': '',
    'lesoes.cisto.dimensao': '',
  }
}

function compose(state: OrganState): OrganComposition {
  const dimensoes = (state.dimensoes as string) || 'normal'
  const ecotextura = (state.ecotextura as string) || 'homogenea'
  const lesoes = (state.lesoes as string[]) || []
  const eixo = ((state['dimensoes.aumentado.eixo'] as string) || '').trim()
  const cistoDim = ((state['lesoes.cisto.dimensao'] as string) || '').trim()
  const conclusion: string[] = []
  const achados: string[] = []

  let abertura = dimensoes === 'aumentado'
    ? `Baço aumentado de dimensões${eixo ? `, com maior eixo medindo ${eixo}` : ''} (esplenomegalia)`
    : 'Baço de dimensões normais'
  if (dimensoes === 'aumentado') conclusion.push('Esplenomegalia')

  abertura += ecotextura === 'heterogenea' ? ' e ecotextura heterogênea' : ' e ecotextura homogênea'

  if (lesoes.includes('cisto')) {
    achados.push(`apresentando imagem anecoica de paredes finas${cistoDim ? `, medindo ${cistoDim}` : ''}, compatível com cisto`)
    conclusion.push('Cisto esplênico')
  }
  if (lesoes.includes('calcificacao')) {
    achados.push('apresentando foco hiperecogênico com sombra acústica, compatível com calcificação (provável granuloma residual)')
    conclusion.push('Calcificação esplênica (provável granuloma residual)')
  }
  if (lesoes.includes('acessorio')) {
    achados.push('apresentando imagem nodular homogênea junto ao hilo esplênico, compatível com baço acessório')
  }

  const body = achados.length > 0 ? `${abertura}, ${achados.join('; ')}.` : `${abertura}.`
  const isNormal = dimensoes === 'normal' && ecotextura === 'homogenea' && lesoes.length === 0

  return { body, conclusion, isNormal }
}

export const bacoModule: OrganModule = { schema, initialState, compose }
