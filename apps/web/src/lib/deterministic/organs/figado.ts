/**
 * Fígado — Abdome Total.
 */

import type { Field, OrganComposition, OrganModule, OrganSchema, OrganState } from '../types'

const lesionSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensão', kind: 'text', placeholder: '20 mm' },
  {
    key: 'local',
    label: 'Local',
    kind: 'mini-segmented',
    options: [
      { value: 'lobo_d', label: 'Lobo D', isDefault: true },
      { value: 'lobo_e', label: 'Lobo E' },
    ],
  },
]

const schema: OrganSchema = {
  id: 'figado',
  name: 'Fígado',
  category: 'ABDOMEN_TOTAL',
  fields: [
    {
      key: 'dimensoes',
      label: 'Dimensões',
      kind: 'segmented',
      hint: 'default: normais',
      options: [
        { value: 'normal', label: 'Normais', isDefault: true },
        { value: 'aumentado', label: 'Aumentado' },
      ],
    },
    {
      key: 'ecotextura',
      label: 'Ecotextura',
      kind: 'segmented',
      hint: 'default: homogênea',
      options: [
        { value: 'homogenea', label: 'Homogênea', isDefault: true },
        { value: 'esteatose_leve', label: 'Esteatose leve' },
        { value: 'esteatose_moderada', label: 'Esteatose moderada' },
        { value: 'esteatose_acentuada', label: 'Esteatose acentuada' },
        { value: 'dhc', label: 'Hepatopatia crônica' },
      ],
    },
    {
      key: 'lesoes',
      label: 'Lesões',
      kind: 'checklist',
      hint: 'marque se houver',
      options: [
        { value: 'cisto', label: 'Cisto simples', subFields: lesionSubFields },
        { value: 'hemangioma', label: 'Hemangioma', subFields: lesionSubFields },
        { value: 'nodulo', label: 'Nódulo a esclarecer', subFields: lesionSubFields },
      ],
    },
    {
      key: 'porta',
      label: 'Porta',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'dilatada', label: 'Dilatada' },
      ],
    },
  ],
  rareFindings: [
    { value: 'calcificacao', label: 'Calcificação residual' },
    { value: 'cistos_multiplos', label: 'Cistos hepáticos múltiplos' },
    { value: 'derrame', label: 'Líquido peri-hepático' },
  ],
}

function initialState(): OrganState {
  return {
    dimensoes: 'normal',
    ecotextura: 'homogenea',
    lesoes: [],
    porta: 'normal',
    raros: [],
    'lesoes.cisto.dimensao': '',
    'lesoes.cisto.local': 'lobo_d',
    'lesoes.hemangioma.dimensao': '',
    'lesoes.hemangioma.local': 'lobo_d',
    'lesoes.nodulo.dimensao': '',
    'lesoes.nodulo.local': 'lobo_d',
  }
}

function localFrase(local: string): string {
  return local === 'lobo_e' ? 'lobo esquerdo' : 'lobo direito'
}

function medida(texto: string): string {
  const dim = texto.trim()
  return dim ? `, medindo ${dim}` : ''
}

function ecotexturaFrase(ecotextura: string, conclusion: string[]): string {
  switch (ecotextura) {
    case 'esteatose_leve':
      conclusion.push('Esteatose hepática de grau leve')
      return 'ecotextura difusamente hiperecogênica com discreta atenuação posterior, compatível com esteatose hepática de grau leve'
    case 'esteatose_moderada':
      conclusion.push('Esteatose hepática de grau moderado')
      return 'ecotextura difusamente hiperecogênica com atenuação posterior e discreta perda da definição das paredes dos vasos intra-hepáticos, compatível com esteatose hepática de grau moderado'
    case 'esteatose_acentuada':
      conclusion.push('Esteatose hepática de grau acentuado')
      return 'ecotextura difusamente hiperecogênica com acentuada atenuação posterior, prejudicando a avaliação dos vasos intra-hepáticos e do diafragma, compatível com esteatose hepática de grau acentuado'
    case 'dhc':
      conclusion.push('Sinais ecográficos sugestivos de hepatopatia crônica difusa')
      return 'contornos bocelados e ecotextura difusamente heterogênea'
    case 'homogenea':
    default:
      return 'contornos regulares e ecotextura homogênea'
  }
}

function lesaoFrase(state: OrganState, tipo: string): { body: string; conclusion: string } {
  const local = localFrase((state[`lesoes.${tipo}.local`] as string) || 'lobo_d')
  const dim = medida(((state[`lesoes.${tipo}.dimensao`] as string) || ''))
  if (tipo === 'cisto') {
    return {
      body: `apresentando imagem anecoica de paredes finas e reforço acústico posterior, no ${local}${dim}, compatível com cisto simples`,
      conclusion: 'Cisto hepático simples',
    }
  }
  if (tipo === 'hemangioma') {
    return {
      body: `apresentando imagem nodular hiperecogênica, homogênea e de contornos bem definidos, no ${local}${dim}, com aspecto sugestivo de hemangioma`,
      conclusion: 'Imagem sugestiva de hemangioma hepático',
    }
  }
  return {
    body: `apresentando imagem nodular sólida no ${local}${dim}, a esclarecer`,
    conclusion: 'Nódulo hepático a esclarecer. Convém, a critério clínico, complementar a investigação com método contrastado (RM, TC ou ultrassom com contraste)',
  }
}

const RARE_BODY: Record<string, string> = {
  calcificacao: 'apresentando foco hiperecogênico com sombra acústica, compatível com calcificação residual',
  cistos_multiplos: 'apresentando múltiplas imagens anecoicas de permeio ao parênquima, compatíveis com cistos simples',
  derrame: 'Observa-se lâmina líquida peri-hepática.',
}

const RARE_CONCLUSION: Record<string, string> = {
  calcificacao: 'Calcificação hepática residual',
  cistos_multiplos: 'Cistos hepáticos múltiplos',
  derrame: 'Líquido livre peri-hepático',
}

function compose(state: OrganState): OrganComposition {
  const dimensoes = (state.dimensoes as string) || 'normal'
  const ecotextura = (state.ecotextura as string) || 'homogenea'
  const lesoes = (state.lesoes as string[]) || []
  const porta = (state.porta as string) || 'normal'
  const raros = (state.raros as string[]) || []
  const conclusion: string[] = []
  const achados: string[] = []

  const abertura =
    dimensoes === 'aumentado'
      ? 'Fígado aumentado de dimensões (hepatomegalia)'
      : 'Fígado de dimensões normais'
  if (dimensoes === 'aumentado') conclusion.push('Hepatomegalia')

  for (const lesao of lesoes) {
    const item = lesaoFrase(state, lesao)
    achados.push(item.body)
    conclusion.push(item.conclusion)
  }

  for (const raro of raros) {
    if (RARE_BODY[raro]) achados.push(RARE_BODY[raro])
    if (RARE_CONCLUSION[raro]) conclusion.push(RARE_CONCLUSION[raro])
  }

  const eco = ecotexturaFrase(ecotextura, conclusion)
  const bodyMain =
    achados.length > 0
      ? `${abertura}, ${eco}, ${achados.join('; ')}.`
      : `${abertura}, ${eco}, sem evidências de lesões focais.`

  let portaBody: string
  if (porta === 'dilatada') {
    portaBody = 'Veia porta de calibre aumentado, sugerindo hipertensão portal.'
    conclusion.push('Sinais sugestivos de hipertensão portal')
  } else {
    portaBody = 'Veia porta de calibre normal.'
  }

  const isNormal =
    dimensoes === 'normal' &&
    ecotextura === 'homogenea' &&
    lesoes.length === 0 &&
    porta === 'normal' &&
    raros.length === 0

  return { body: `${bodyMain} ${portaBody}`, conclusion, isNormal }
}

export const figadoModule: OrganModule = { schema, initialState, compose }
