/**
 * Vias biliares — Abdome Total.
 */

import type { Field, OrganComposition, OrganModule, OrganSchema, OrganState } from '../types'

const coledocoSubFields: Field[] = [
  { key: 'calibre', label: 'Calibre', kind: 'text', placeholder: '9 mm' },
]

const coledocolitiaseSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensão', kind: 'text', placeholder: '6 mm' },
]

const schema: OrganSchema = {
  id: 'vias_biliares',
  name: 'Vias biliares',
  category: 'ABDOMEN_TOTAL',
  fields: [
    {
      key: 'intra',
      label: 'Intra-hepáticas',
      kind: 'segmented',
      hint: 'default: normais',
      options: [
        { value: 'normais', label: 'Normais', isDefault: true },
        { value: 'dilatadas', label: 'Dilatadas' },
      ],
    },
    {
      key: 'coledoco',
      label: 'Colédoco',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'dilatado', label: 'Dilatado', subFields: coledocoSubFields },
      ],
    },
    {
      key: 'conteudo',
      label: 'Conteúdo',
      kind: 'checklist',
      hint: 'marque se houver',
      options: [
        { value: 'coledocolitiase', label: 'Coledocolitíase', subFields: coledocolitiaseSubFields },
      ],
    },
  ],
}

function initialState(): OrganState {
  return {
    intra: 'normais',
    coledoco: 'normal',
    conteudo: [],
    'coledoco.dilatado.calibre': '',
    'conteudo.coledocolitiase.dimensao': '',
  }
}

function compose(state: OrganState): OrganComposition {
  const intra = (state.intra as string) || 'normais'
  const coledoco = (state.coledoco as string) || 'normal'
  const conteudo = (state.conteudo as string[]) || []
  const calibre = ((state['coledoco.dilatado.calibre'] as string) || '').trim()
  const dimensao = ((state['conteudo.coledocolitiase.dimensao'] as string) || '').trim()
  const conclusion: string[] = []

  if (intra === 'normais' && coledoco === 'normal' && conteudo.length === 0) {
    return {
      body: 'Vias biliares intra e extra-hepáticas de calibre normal, sem sinais de dilatação.',
      conclusion: [],
      isNormal: true,
    }
  }

  const partes: string[] = []
  if (intra === 'dilatadas') partes.push('Vias biliares intra-hepáticas dilatadas')
  if (coledoco === 'dilatado') partes.push(`colédoco ectasiado${calibre ? `, medindo ${calibre}` : ''}`)

  let body = partes.join(' e ')
  if (body) {
    conclusion.push('Dilatação das vias biliares, a esclarecer. Convém, a critério clínico, complementar com colangiorressonância.')
  } else {
    body = 'Vias biliares intra e extra-hepáticas sem sinais de dilatação'
  }

  if (conteudo.includes('coledocolitiase')) {
    body += `${body.endsWith('.') ? '' : ', '}com imagem hiperecogênica e sombra acústica no interior do colédoco${dimensao ? `, medindo ${dimensao}` : ''}, compatível com coledocolitíase`
    conclusion.push('Coledocolitíase')
  }

  return { body: `${body}.`, conclusion, isNormal: false }
}

export const viasBiliaresModule: OrganModule = { schema, initialState, compose }
