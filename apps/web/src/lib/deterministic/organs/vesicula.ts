/**
 * Órgão piloto — Vesícula biliar (categoria ABDOMEN_TOTAL).
 *
 * Espelha o mockup S29-Laudar (Estado / Conteúdo / Paredes / + Achados raros).
 * As frases são uma v1 clínica para revisão do médico — toda a redação fica
 * centralizada aqui, fácil de ajustar sem tocar na UI.
 */

import type { Field, OrganModule, OrganSchema, OrganState, OrganComposition } from '../types'

// ─── Sub-campos da colelitíase (aparecem quando "Colelitíase" é marcado) ───
const colelitiaseSubFields: Field[] = [
  {
    key: 'quantidade',
    label: 'Quantidade',
    kind: 'mini-segmented',
    options: [
      { value: 'unico', label: '1', isDefault: true },
      { value: 'multiplos', label: '2+' },
      { value: 'repleta', label: 'Repleta' },
    ],
  },
  { key: 'dimensao', label: 'Dimensão', kind: 'text', placeholder: '8 mm' },
  {
    key: 'mobilidade',
    label: 'Mobilidade',
    kind: 'mini-segmented',
    options: [
      { value: 'movel', label: 'Móvel', isDefault: true },
      { value: 'impactado', label: 'Impactado' },
    ],
  },
]

const schema: OrganSchema = {
  id: 'vesicula',
  name: 'Vesícula',
  category: 'ABDOMEN_TOTAL',
  fields: [
    {
      key: 'estado',
      label: 'Estado',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'contraida', label: 'Contraída' },
        { value: 'distendida', label: 'Distendida' },
        { value: 'ausente', label: 'Ausente' },
      ],
    },
    {
      key: 'conteudo',
      label: 'Conteúdo',
      kind: 'checklist',
      hint: 'marque se houver',
      options: [
        { value: 'anecoico', label: 'Anecoico', isDefault: true },
        { value: 'colelitiase', label: 'Colelitíase', subFields: colelitiaseSubFields },
        { value: 'lama', label: 'Lama biliar' },
        { value: 'polipos', label: 'Pólipos' },
      ],
    },
    {
      key: 'paredes',
      label: 'Paredes',
      kind: 'segmented',
      hint: 'default: finas',
      options: [
        { value: 'finas', label: 'Finas', isDefault: true },
        { value: 'espessada_aguda', label: 'Espessada · aguda' },
        { value: 'espessada_cronica', label: 'Espessada · crônica' },
      ],
    },
  ],
  rareFindings: [
    { value: 'adenomiomatose', label: 'Adenomiomatose' },
    { value: 'colesterolose', label: 'Colesterolose' },
    { value: 'porcelana', label: 'Vesícula em porcelana' },
    { value: 'polipo_adenomatoso', label: 'Pólipo adenomatoso (> 10 mm)' },
    { value: 'colecistite_alitiasica', label: 'Colecistite alitiásica' },
    { value: 'colecistostomia', label: 'Vesícula com colecistostomia' },
  ],
}

function initialState(): OrganState {
  return {
    estado: 'normal',
    conteudo: ['anecoico'],
    paredes: 'finas',
    raros: [],
    // sub-campos da colelitíase (defaults)
    'conteudo.colelitiase.quantidade': 'unico',
    'conteudo.colelitiase.dimensao': '',
    'conteudo.colelitiase.mobilidade': 'movel',
  }
}

// ─── Helpers de redação ───

function paredesFrase(paredes: string): string {
  switch (paredes) {
    case 'espessada_aguda':
      return 'de paredes espessadas, com sinais sugestivos de processo inflamatório agudo'
    case 'espessada_cronica':
      return 'de paredes espessadas, em provável relação com processo inflamatório crônico'
    case 'finas':
    default:
      return 'de paredes finas'
  }
}

function colelitiaseFrase(state: OrganState): { body: string; conclusion: string } {
  const qtd = (state['conteudo.colelitiase.quantidade'] as string) || 'unico'
  const dim = ((state['conteudo.colelitiase.dimensao'] as string) || '').trim()
  const mob = (state['conteudo.colelitiase.mobilidade'] as string) || 'movel'

  const medindo = dim ? ` medindo ${dim}` : ''
  const movel = mob === 'impactado' ? 'impactada no infundíbulo' : 'móvel à mudança de decúbito'

  let imagem: string
  let conclLabel: string
  if (qtd === 'repleta') {
    imagem = 'apresentando-se repleta de imagens hiperecogênicas com sombra acústica posterior'
    conclLabel = 'Colelitíase — vesícula repleta de cálculos'
  } else if (qtd === 'multiplos') {
    imagem = `apresentando em seu interior imagens hiperecogênicas com sombra acústica posterior${medindo}, ${movel}`
    conclLabel = `Colelitíase${dim ? ` — cálculos, o maior de ${dim}` : ' — múltiplos cálculos'}`
  } else {
    imagem = `apresentando em seu interior imagem hiperecogênica com sombra acústica posterior${medindo}, ${movel}`
    conclLabel = `Colelitíase${dim ? ` — cálculo único de ${dim}, ${mob === 'impactado' ? 'impactado' : 'móvel'}` : ' — cálculo único'}`
  }
  return { body: `${imagem}, compatível com colelitíase`, conclusion: conclLabel }
}

const RARE_BODY: Record<string, string> = {
  adenomiomatose: 'apresentando espessamento parietal focal com pequenas imagens císticas intramurais e artefatos em cauda de cometa, compatível com adenomiomatose',
  colesterolose: 'apresentando pequenos focos ecogênicos parietais aderidos, sem sombra acústica, compatíveis com colesterolose',
  porcelana: 'com parede difusamente calcificada e sombra acústica posterior, compatível com vesícula em porcelana',
  polipo_adenomatoso: 'apresentando imagem polipoide séssil maior que 10 mm aderida à parede, sem mobilidade ou sombra acústica, a esclarecer',
  colecistite_alitiasica: 'com espessamento parietal e distensão, sem cálculos identificáveis, podendo corresponder a colecistite alitiásica no contexto clínico apropriado',
  colecistostomia: 'apresentando dreno de colecistostomia em seu interior',
}

const RARE_CONCLUSION: Record<string, string> = {
  adenomiomatose: 'Adenomiomatose da vesícula biliar',
  colesterolose: 'Colesterolose da vesícula biliar',
  porcelana: 'Vesícula em porcelana — recomenda-se avaliação complementar',
  polipo_adenomatoso: 'Pólipo de vesícula biliar maior que 10 mm — convém, a critério clínico, complementar a investigação',
  colecistite_alitiasica: 'Achados que podem corresponder a colecistite alitiásica, a correlacionar clinicamente',
  colecistostomia: 'Vesícula biliar com colecistostomia',
}

// ─── Composição principal ───

function compose(state: OrganState): OrganComposition {
  const estado = (state.estado as string) || 'normal'
  const conteudo = (state.conteudo as string[]) || []
  const paredes = (state.paredes as string) || 'finas'
  const raros = (state.raros as string[]) || []

  // Vesícula ausente: caso especial — nada mais se aplica.
  if (estado === 'ausente') {
    return {
      body: 'Vesícula biliar não caracterizada, em provável relação com colecistectomia prévia.',
      conclusion: ['Vesícula biliar ausente (colecistectomia prévia)'],
      isNormal: false,
    }
  }

  const conclusion: string[] = []
  const achados: string[] = []

  // Abertura (estado + paredes)
  let abertura: string
  if (estado === 'contraida') {
    abertura = 'Vesícula biliar contraída (avaliação do conteúdo parcialmente prejudicada pelo jejum incompleto)'
  } else if (estado === 'distendida') {
    abertura = `Vesícula biliar distendida, ${paredesFrase(paredes)}`
  } else {
    abertura = `Vesícula biliar de dimensões e topografia normais, ${paredesFrase(paredes)}`
  }

  // Paredes espessadas geram item de conclusão
  if (paredes === 'espessada_aguda') {
    conclusion.push('Espessamento parietal da vesícula biliar, a correlacionar com quadro de colecistite aguda')
  } else if (paredes === 'espessada_cronica') {
    conclusion.push('Espessamento parietal da vesícula biliar, em provável relação com colecistite crônica')
  }

  // Conteúdo
  if (conteudo.includes('colelitiase')) {
    const c = colelitiaseFrase(state)
    achados.push(c.body)
    conclusion.push(c.conclusion)
  }
  if (conteudo.includes('lama')) {
    achados.push('com conteúdo de aspecto ecogênico e móvel, sem sombra acústica, em provável relação com lama biliar (barro biliar)')
    conclusion.push('Lama biliar (barro biliar)')
  }
  if (conteudo.includes('polipos')) {
    achados.push('apresentando imagem ecogênica aderida à parede, sem sombra acústica e sem mobilidade, compatível com pólipo')
    conclusion.push('Pólipo de vesícula biliar')
  }

  // Achados raros
  for (const r of raros) {
    if (RARE_BODY[r]) achados.push(RARE_BODY[r])
    if (RARE_CONCLUSION[r]) conclusion.push(RARE_CONCLUSION[r])
  }

  // Conteúdo anecoico sem achados = normal
  const semAchados = achados.length === 0
  let body: string
  if (semAchados) {
    if (estado === 'contraida') {
      body = `${abertura}.`
    } else {
      body = `${abertura}, com conteúdo anecoico e sem cálculos no seu interior.`
    }
  } else {
    body = `${abertura}, ${achados.join('; ')}.`
  }

  const isNormal =
    estado === 'normal' &&
    paredes === 'finas' &&
    conteudo.length === 1 &&
    conteudo[0] === 'anecoico' &&
    raros.length === 0

  return { body, conclusion, isNormal }
}

export const vesiculaModule: OrganModule = { schema, initialState, compose }
