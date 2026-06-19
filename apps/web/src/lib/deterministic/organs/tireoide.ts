/**
 * Tireoide — categoria com modelo próprio (não segue o padrão "órgãos" do Abdome).
 *
 * Estrutura canônica do LaudoUSG (knowledge RAG TIREOIDE, published):
 *   Lobo direito / Lobo esquerdo / Istmo (medidas A×B×C → volume) → Nódulos (lista,
 *   por lobo, formato Domingos + ACR TI-RADS) → Linfonodos → Doppler (opcional) → rodapé fixo.
 *
 * REGRA TRANCADA: Nota Domingos e TI-RADS NUNCA são calculados — vêm por seleção do
 * médico e são reproduzidos no formato exato. O VOLUME, ao contrário, é fórmula pura
 * (elipsoide) e é calculado pelo sistema.
 */

// Fator do elipsoide (A×B×C×fator, medidas em cm → volume em ml).
// Aprovado com Luiz como 0,52; padrão clínico ACR ~0,523 — ajustável aqui.
const VOLUME_FACTOR = 0.52

export type LoboId = 'lobo_direito' | 'lobo_esquerdo' | 'istmo'

export interface LoboState {
  a: string
  b: string
  c: string
  ecotextura: 'normal' | 'heterogenea'
}

export interface NoduloTireoide {
  id: string
  lobo: LoboId
  ecogenicidade: string // chave em ECOGENICIDADES
  margens: string // chave em MARGENS
  dimensao: string
  notaDomingos: string // '1'..'6'
  tirads: string // '1' | '2' | '3' | '4a' | '4b' | '4c' | '5'
}

export interface TireoideState {
  doppler: boolean
  lobo_direito: LoboState
  lobo_esquerdo: LoboState
  istmo: LoboState
  nodulos: NoduloTireoide[]
  linfonodos: 'preservados' | 'suspeitos'
  picoDireito: string
  picoEsquerdo: string
}

export const ECOGENICIDADES: { value: string; label: string }[] = [
  { value: 'anecoica', label: 'Anecoica' },
  { value: 'anecoica_finos_ecos', label: 'Anecoica c/ finos ecos' },
  { value: 'hipoecoica', label: 'Hipoecoica' },
  { value: 'isoecoica', label: 'Isoecoica' },
  { value: 'hiperecoica', label: 'Hiperecoica' },
  { value: 'heterogenea', label: 'Heterogênea' },
]

export const MARGENS: { value: string; label: string }[] = [
  { value: 'regulares', label: 'Regulares' },
  { value: 'circunscritas', label: 'Circunscritas' },
  { value: 'lobuladas', label: 'Lobuladas' },
  { value: 'irregulares', label: 'Irregulares' },
]

export const NOTAS_DOMINGOS = ['1', '2', '3', '4', '5', '6']
export const TIRADS_VALUES = ['1', '2', '3', '4a', '4b', '4c', '5']

const ECO_TEXTO: Record<string, string> = {
  anecoica: 'anecoica',
  anecoica_finos_ecos: 'anecoica com finos ecos',
  hipoecoica: 'hipoecoica',
  isoecoica: 'isoecoica',
  hiperecoica: 'hiperecoica',
  heterogenea: 'heterogênea',
}

const LOBO_NOME: Record<LoboId, string> = {
  lobo_direito: 'Lobo direito',
  lobo_esquerdo: 'Lobo esquerdo',
  istmo: 'Istmo',
}

// Nota Domingos → característica clínica (snippet nodulos-com-classificacao).
function caracteristicaDaNota(nota: string): string {
  const n = parseInt(nota, 10)
  if (n <= 2) return 'características benignas'
  if (n === 3) return 'características provavelmente benignas'
  if (n === 4) return 'características intermediárias'
  if (n === 5) return 'características provavelmente malignas'
  return 'características malignas'
}

function loboEmptyState(): LoboState {
  return { a: '', b: '', c: '', ecotextura: 'normal' }
}

export function initialTireoideState(): TireoideState {
  return {
    doppler: false,
    lobo_direito: loboEmptyState(),
    lobo_esquerdo: loboEmptyState(),
    istmo: loboEmptyState(),
    nodulos: [],
    linfonodos: 'preservados',
    picoDireito: '',
    picoEsquerdo: '',
  }
}

// Sub-nav (mesma estrutura visual das outras categorias).
export const tireoideSections = [
  { id: 'lobo_direito', label: 'Lobo direito', group: 'orgaos' as const },
  { id: 'lobo_esquerdo', label: 'Lobo esquerdo', group: 'orgaos' as const },
  { id: 'istmo', label: 'Istmo', group: 'orgaos' as const },
  { id: 'nodulos', label: 'Nódulos', group: 'orgaos' as const },
  { id: 'linfonodos', label: 'Linfonodos', group: 'conclusao' as const },
]

// ─── Volume ───

function parseMedida(v: string): number | null {
  const n = parseFloat(v.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Volume do elipsoide em ml, ou null se alguma medida faltar. */
export function volumeLobo(lobo: LoboState): number | null {
  const a = parseMedida(lobo.a)
  const b = parseMedida(lobo.b)
  const c = parseMedida(lobo.c)
  if (a === null || b === null || c === null) return null
  return a * b * c * VOLUME_FACTOR
}

function fmtVol(v: number): string {
  return v.toFixed(1).replace('.', ',')
}

function fmtMedidas(lobo: LoboState): string | null {
  const a = lobo.a.trim()
  const b = lobo.b.trim()
  const c = lobo.c.trim()
  return a && b && c ? `${a} x ${b} x ${c} cm` : null
}

// ─── Composição ───

function noduloCorpo(n: NoduloTireoide): string {
  const eco = ECO_TEXTO[n.ecogenicidade] ?? 'nodular'
  const margens = n.margens ? ` de margens ${n.margens}` : ''
  const dim = n.dimensao.trim() ? `, medindo ${n.dimensao.trim()}` : ''
  return `imagem ${eco}${margens}${dim}`
}

function noduloConclusao(n: NoduloTireoide): string {
  const eco = ECO_TEXTO[n.ecogenicidade] ?? 'nodular'
  const carac = caracteristicaDaNota(n.notaDomingos)
  return `imagem ${eco} com NOTA FINAL ${n.notaDomingos} (${carac}), equivalente ao TI-RADS ${n.tirads} ACR`
}

function loboFraseCorpo(loboId: LoboId, lobo: LoboState, nodulos: NoduloTireoide[], doppler: boolean): string {
  const nome = LOBO_NOME[loboId]
  const medidas = fmtMedidas(lobo)
  const vol = volumeLobo(lobo)
  const abertura = medidas && vol !== null
    ? `${nome} medindo ${medidas} (volume de ${fmtVol(vol)} ml)`
    : `${nome} de dimensões habituais`

  // Vascularização só com Doppler e apenas para os lobos (não istmo).
  const incluiVasc = doppler && loboId !== 'istmo'
  let descricao: string
  if (lobo.ecotextura === 'heterogenea') {
    descricao = incluiVasc
      ? 'de ecogenicidade heterogênea e vascularização preservada'
      : 'de ecogenicidade e ecotextura heterogêneas'
  } else {
    descricao = incluiVasc
      ? 'de ecogenicidade, ecotextura e vascularização normais'
      : 'de ecogenicidade e ecotextura normais'
  }

  const meus = nodulos.filter((n) => n.lobo === loboId)
  if (meus.length === 0) return `${abertura}, ${descricao}.`
  const lista = meus.map(noduloCorpo).join('; e ')
  return `${abertura}, apresentando ${lista}.`
}

export interface ComposedReport {
  text: string
  conclusion: string[]
  alteredCount: number
}

const RODAPE =
  '*ESCORE DE NÓDULO TIREOIDEANO - Domingos Correia da Rocha - Material baseado em 2588 nódulos puncionados - 2003 | Atualizada em 2013 - Total de 5134 nódulos puncionados. ACR - American College of Radiology*'

const COMENTARIOS =
  'Exame realizado com transdutor de 12 MHz, abrangendo todos os segmentos da glândula tireoide, como também a cadeia ganglionar cervical de I a V. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

export function composeTireoide(state: TireoideState): ComposedReport {
  const titulo = state.doppler
    ? 'ULTRASSONOGRAFIA DE TIREOIDE COM DOPPLER'
    : 'ULTRASSONOGRAFIA DE TIREOIDE'

  // Corpo — lobos e istmo (com nódulos embutidos por lobo).
  const corpo: string[] = [
    loboFraseCorpo('lobo_direito', state.lobo_direito, state.nodulos, state.doppler),
    loboFraseCorpo('lobo_esquerdo', state.lobo_esquerdo, state.nodulos, state.doppler),
    loboFraseCorpo('istmo', state.istmo, state.nodulos, state.doppler),
  ]

  if (state.doppler && (state.picoDireito.trim() || state.picoEsquerdo.trim())) {
    if (state.picoDireito.trim())
      corpo.push(`Pico sistólico da artéria tireoidiana inferior direita de ${state.picoDireito.trim()} cm/s.`)
    if (state.picoEsquerdo.trim())
      corpo.push(`Pico sistólico da artéria tireoidiana inferior esquerda de ${state.picoEsquerdo.trim()} cm/s.`)
  }

  if (state.linfonodos === 'preservados') {
    corpo.push(
      'Adicionalmente, evidenciam-se imagens ovais com a periferia hipoecoica e o centro hiperecoico, de margens regulares, situadas em região cervical, compatíveis com linfonodos de morfologia preservada.',
    )
  } else {
    corpo.push(
      'Adicionalmente, evidenciam-se linfonodos cervicais de aspecto atípico (perda do hilo ecogênico e/ou morfologia arredondada), a esclarecer.',
    )
  }

  // Conclusão.
  const conclusion: string[] = []
  const volTotal =
    (volumeLobo(state.lobo_direito) ?? 0) +
    (volumeLobo(state.lobo_esquerdo) ?? 0) +
    (volumeLobo(state.istmo) ?? 0)
  const semNodulos = state.nodulos.length === 0
  if (volTotal > 0) {
    conclusion.push(
      semNodulos
        ? `Tireoide de volume normal (${fmtVol(volTotal)} ml), sem evidência de alteração ecotextural ou de imagem nodular`
        : `Tireoide de volume normal (${fmtVol(volTotal)} ml)`,
    )
  } else if (semNodulos) {
    conclusion.push('Tireoide sem evidência de alteração ecotextural ou de imagem nodular')
  }

  // Nódulos agrupados por lobo, formato exato.
  for (const loboId of ['lobo_direito', 'lobo_esquerdo', 'istmo'] as LoboId[]) {
    const meus = state.nodulos.filter((n) => n.lobo === loboId)
    if (meus.length === 0) continue
    const lista = meus.map(noduloConclusao).join('; e ')
    conclusion.push(`${LOBO_NOME[loboId]} apresentando ${lista}`)
  }

  if (state.linfonodos === 'preservados') {
    conclusion.push(
      'Linfonodos cervicais com morfologia preservada, com predomínio nos níveis I e II, sem sinais de infiltração neoplásica ao método',
    )
  } else {
    conclusion.push('Linfonodos cervicais de aspecto atípico, a esclarecer')
  }

  const conclusionBlock = conclusion.map((c, i) => `${i + 1}. ${c}.`).join('\n')

  const text = [
    titulo,
    `COMENTÁRIOS: ${COMENTARIOS}`,
    'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
    ...corpo,
    `CONCLUSÃO:\n${conclusionBlock}`,
    RODAPE,
  ].join('\n\n')

  return { text, conclusion, alteredCount: state.nodulos.length }
}
