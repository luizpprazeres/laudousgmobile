/**
 * Casos da vitrine do hero. SINTÉTICOS: nenhum paciente, nenhuma medida real.
 *
 * As frases são recortes dos modelos em packages/knowledge/snippets
 * (ABDOMEN_TOTAL, ABDOMEN_SUPERIOR, PELVE_FEMININA, TIREOIDE). Onde o modelo
 * pede uma medida, a frase só existe quando a medida é válida: o laudo de
 * exemplo nunca mostra "X cm", campo vazio ou número fora da faixa.
 */

export type MeasureSpec = {
  unit: 'cm' | 'mL'
  min: number
  max: number
  /** Texto curto para o rótulo do campo ("Maior eixo"). */
  label: string
  /** Por que existe a faixa, quando ela não é só plausibilidade. */
  rangeHint?: string
}

export type FieldOption = {
  id: string
  label: string
  /** Frase do corpo. Recebe a medida já formatada quando `measure` existe. */
  body: (value: string) => string | null
  conclusion?: (value: string) => string
  measure?: MeasureSpec
}

export type HeroField = { id: string; label: string; options: FieldOption[] }

export type HeroCase = {
  id: string
  /** Rótulo da aba: nome do exame, como aparece no seletor do produto. */
  tab: string
  title: string
  source: string
  fields: HeroField[]
  /** Linhas fixas do modelo que abrem a conclusão (ex.: volume da tireoide). */
  conclusionLead?: (allNormal: boolean) => string
  /** Roteiro da autoplay: escolhas e, quando há medida, o valor digitado. */
  script: Array<{ field: string; option: string; type?: string }>
}

const fixed = (text: string) => () => text

export const HERO_CASES: HeroCase[] = [
  {
    id: 'abdome-total',
    tab: 'Abdome total',
    title: 'Ultrassonografia do abdome total',
    source: 'ABDOMEN_TOTAL',
    fields: [
      {
        id: 'figado',
        label: 'Fígado',
        options: [
          { id: 'normal', label: 'Normal', body: fixed('Fígado de dimensões normais, contornos regulares e ecotextura homogênea.') },
          { id: 'esteatose', label: 'Esteatose leve', body: fixed('Fígado de dimensões normais, com discreto aumento da ecogenicidade parenquimatosa.'), conclusion: fixed('Esteatose hepática, grau leve.') },
        ],
      },
      {
        id: 'vesicula',
        label: 'Vesícula',
        options: [
          { id: 'normal', label: 'Normal', body: fixed('Vesícula biliar de topografia usual e de parede fina, sem cálculo.') },
          {
            id: 'litiase', label: 'Litíase',
            measure: { unit: 'cm', min: 0.3, max: 5, label: 'Maior eixo' },
            body: (v) => `Vesícula biliar de topografia usual e parede fina, apresentando imagem hiperecoica, móvel, medindo ${v} cm no seu maior eixo, ocasionando sombra acústica.`,
            conclusion: fixed('Litíase da vesícula biliar.'),
          },
        ],
      },
      {
        id: 'rim',
        label: 'Rim direito',
        options: [
          { id: 'normal', label: 'Normal', body: fixed('Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.') },
          {
            id: 'litiase', label: 'Litíase',
            measure: { unit: 'cm', min: 0.2, max: 3, label: 'Maior eixo' },
            body: (v) => `Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando imagem hiperecoica, medindo ${v} cm no seu maior eixo, situada em cálices superiores.`,
            conclusion: fixed('Litíase renal direita.'),
          },
        ],
      },
    ],
    script: [{ field: 'figado', option: 'esteatose' }, { field: 'vesicula', option: 'litiase', type: '1,2' }],
  },
  {
    id: 'abdome-superior',
    tab: 'Abdome superior',
    title: 'Ultrassonografia do abdome superior',
    source: 'ABDOMEN_SUPERIOR',
    fields: [
      {
        id: 'vesicula',
        label: 'Vesícula',
        options: [
          { id: 'normal', label: 'Normal', body: fixed('Vesícula biliar de topografia usual e de parede fina, sem cálculo.') },
          {
            id: 'multiplos', label: 'Múltiplos cálculos',
            measure: { unit: 'cm', min: 0.3, max: 3, label: 'Menor cálculo' },
            body: (v) => `Vesícula biliar de topografia usual e parede fina, apresentando múltiplas imagens hiperecoicas, a menor medindo aproximadamente ${v} cm, móveis, ocasionando sombras acústicas.`,
            conclusion: fixed('Litíase da vesícula biliar.'),
          },
        ],
      },
      {
        id: 'coledoco',
        label: 'Vias biliares',
        options: [
          { id: 'normal', label: 'Normal', body: fixed('Canal hepático e canal colédoco de calibre normal.') },
          {
            id: 'alargado', label: 'Colédoco alargado',
            // "Alargado" só é verdade acima do limite usual; abaixo, a frase mentiria.
            measure: { unit: 'cm', min: 0.7, max: 2.5, label: 'Colédoco', rangeHint: 'acima de 0,6 cm para ser alargado' },
            body: (v) => `Canal hepático de calibre normal. Canal colédoco medindo ${v} cm na porção intra-pancreática.`,
            conclusion: fixed('Canal colédoco acima dos limites usuais em sua porção intrapancreática, sem evidência de cálculos neste estudo.'),
          },
        ],
      },
      {
        id: 'baco',
        label: 'Baço',
        options: [
          { id: 'normal', label: 'Normal', body: fixed('Baço de dimensões normais e ecotextura sólida e homogênea.') },
        ],
      },
    ],
    script: [{ field: 'vesicula', option: 'multiplos', type: '0,4' }, { field: 'coledoco', option: 'alargado', type: '0,8' }],
  },
  {
    id: 'pelve',
    tab: 'Pelve TV',
    title: 'Ultrassonografia pélvica transvaginal',
    source: 'PELVE_FEMININA',
    fields: [
      {
        id: 'utero',
        label: 'Útero',
        options: [
          { id: 'avf', label: 'Anteversoflexão', body: fixed('Útero em anteversoflexão, medindo 7,2 x 3,8 x 4,6 cm.'), conclusion: fixed('Útero de volume normal (65,8 cm³).') },
          { id: 'rvf', label: 'Retroversoflexão', body: fixed('Útero em retroversoflexão, medindo 7,2 x 3,8 x 4,6 cm.'), conclusion: fixed('Útero de volume normal (65,8 cm³).') },
        ],
      },
      {
        id: 'endometrio',
        label: 'Endométrio',
        options: [
          {
            id: 'ciclo', label: 'Normal para o ciclo',
            measure: { unit: 'cm', min: 0.2, max: 1.6, label: 'Espessura', rangeHint: 'até 1,6 cm para a frase de normalidade' },
            body: (v) => `Endométrio medindo ${v} cm de espessura.`,
            conclusion: fixed('O endométrio tem espessura normal para a fase do ciclo menstrual.'),
          },
        ],
      },
      {
        id: 'colo',
        label: 'Colo uterino',
        options: [
          { id: 'normal', label: 'Sem achados', body: () => null },
          { id: 'naboth', label: 'Cistos de Naboth', body: fixed('Imagens anecoicas na topografia do colo uterino.'), conclusion: fixed('Cistos de Naboth (provável sequela de cervicite).') },
        ],
      },
    ],
    script: [{ field: 'endometrio', option: 'ciclo', type: '0,8' }, { field: 'colo', option: 'naboth' }],
  },
  {
    id: 'tireoide',
    tab: 'Tireoide',
    title: 'Ultrassonografia da tireoide',
    source: 'TIREOIDE',
    fields: [
      {
        id: 'lobo-direito',
        label: 'Lobo direito',
        options: [
          { id: 'normal', label: 'Normal', body: fixed('Lobo direito medindo 4,5 x 1,6 x 1,5 cm (volume de 5,6 ml), de ecogenicidade e ecotextura normais.') },
          {
            // Nota e TI-RADS vêm do médico; a vitrine nunca calcula classificação.
            id: 'nodulo', label: 'Nódulo, nota 3',
            measure: { unit: 'cm', min: 0.3, max: 4, label: 'Maior eixo' },
            body: (v) => `Lobo direito medindo 4,5 x 1,6 x 1,5 cm (volume de 5,6 ml), apresentando imagem hipoecoica, sólida, de margens regulares, medindo ${v} cm no maior eixo, situada no terço médio.`,
            conclusion: fixed('Lobo direito apresentando imagem hipoecoica com NOTA FINAL 3 (características provavelmente benignas), equivalente ao TI-RADS 3 ACR.'),
          },
        ],
      },
      {
        id: 'lobo-esquerdo',
        label: 'Lobo esquerdo',
        options: [
          { id: 'normal', label: 'Normal', body: fixed('Lobo esquerdo medindo 4,3 x 1,5 x 1,4 cm (volume de 4,7 ml), de ecogenicidade e ecotextura normais.') },
        ],
      },
      {
        id: 'linfonodos',
        label: 'Linfonodos',
        options: [
          { id: 'omitir', label: 'Não descrever', body: () => null },
          {
            id: 'preservados', label: 'Preservados',
            body: fixed('Adicionalmente, evidenciam-se imagens ovais com a periferia hipoecoica e o centro hiperecoico, de margens regulares, situadas em região cervical, compatíveis com linfonodos de morfologia preservada.'),
            conclusion: fixed('Linfonodos cervicais com morfologia preservada, com predomínio nos níveis I e II, sem sinais de infiltração neoplásica ao método.'),
          },
        ],
      },
    ],
    // Istmo fixo (0,3 ml) entra só no volume total: 5,6 + 4,7 + 0,3.
    conclusionLead: (allNormal) =>
      allNormal
        ? 'Tireoide de volume normal (10,6 ml), sem evidência de alteração ecotextural ou de imagem nodular.'
        : 'Tireoide de volume normal (10,6 ml).',
    script: [{ field: 'lobo-direito', option: 'nodulo', type: '0,9' }, { field: 'linfonodos', option: 'preservados' }],
  },
]

export type MeasureCheck =
  | { kind: 'empty' }
  | { kind: 'partial' }
  | { kind: 'invalid' }
  | { kind: 'out-of-range' }
  | { kind: 'ok'; value: number; text: string }

/** Formata no padrão do laudo: vírgula decimal, sem zeros inúteis. */
export function formatMeasure(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false })
}

/**
 * Aceita "1,2", "1.2", "0,85". "1," e "0" (rumo a "0,9") são digitação em
 * andamento (partial), não erro. Mais de duas casas, letras ou dois
 * separadores são inválidos.
 */
export function checkMeasure(raw: string, spec: MeasureSpec): MeasureCheck {
  const s = raw.trim()
  if (!s) return { kind: 'empty' }
  if (/^\d+[.,]$/.test(s)) return { kind: 'partial' }
  if (!/^\d{1,4}([.,]\d{1,2})?$/.test(s)) return { kind: 'invalid' }
  const value = Number(s.replace(',', '.'))
  if (!Number.isFinite(value) || value > spec.max) return { kind: 'out-of-range' }
  if (value < spec.min) {
    // "0" a caminho de "0,9" ainda está sendo digitado: erro só quando mais
    // uma casa decimal já não alcança o mínimo.
    const decimals = s.split(/[.,]/)[1]?.length ?? 0
    const reachable = decimals === 0 || (decimals === 1 && value + 0.09 >= spec.min)
    return { kind: reachable ? 'partial' : 'out-of-range' }
  }
  return { kind: 'ok', value, text: formatMeasure(value) }
}

export function rangeMessage(spec: MeasureSpec): string {
  return spec.rangeHint
    ? `Use ${spec.rangeHint}.`
    : `Use entre ${formatMeasure(spec.min)} e ${formatMeasure(spec.max)} ${spec.unit}.`
}

export type FieldValue = { option: string; input: string }
export type CaseValues = Record<string, FieldValue>

export function baselineValues(heroCase: HeroCase): CaseValues {
  return Object.fromEntries(heroCase.fields.map((f) => [f.id, { option: f.options[0].id, input: '' }]))
}

export type ComposedLine =
  | { field: string; kind: 'text'; text: string }
  | { field: string; kind: 'pending'; label: string }

/** Prévia parcial: corpo por estrutura + conclusão, sem frase com medida inválida. */
export function composeCase(heroCase: HeroCase, values: CaseValues) {
  const body: ComposedLine[] = []
  const conclusion: string[] = []
  let pending = 0
  let altered = false
  for (const field of heroCase.fields) {
    const value = values[field.id] ?? { option: field.options[0].id, input: '' }
    const option = field.options.find((o) => o.id === value.option) ?? field.options[0]
    if (option.id !== field.options[0].id) altered = true
    let measured = ''
    if (option.measure) {
      const check = checkMeasure(value.input, option.measure)
      if (check.kind !== 'ok') {
        pending += 1
        body.push({ field: field.id, kind: 'pending', label: `${field.label}: aguardando ${option.measure.label.toLowerCase()}` })
        continue
      }
      measured = check.text
    }
    const text = option.body(measured)
    if (text) body.push({ field: field.id, kind: 'text', text })
    if (option.conclusion) conclusion.push(option.conclusion(measured))
  }
  if (heroCase.conclusionLead) conclusion.unshift(heroCase.conclusionLead(!altered))
  if (!conclusion.length) conclusion.push('Estruturas demonstradas sem alterações.')
  return { body, conclusion, pending, complete: pending === 0 }
}

/** Texto que o botão Copiar grava. Só é chamado por clique explícito. */
export function buildClipboardText(heroCase: HeroCase, values: CaseValues): string {
  const doc = composeCase(heroCase, values)
  return [
    'EXEMPLO ILUSTRATIVO PARCIAL. DADOS SINTÉTICOS, NÃO É LAUDO DE PACIENTE.',
    '',
    heroCase.title.toUpperCase(),
    '',
    'ACHADOS:',
    ...doc.body.filter((l) => l.kind === 'text').map((l) => (l as { text: string }).text),
    '',
    'CONCLUSÃO:',
    ...doc.conclusion.map((c, i) => `${i + 1}) ${c}`),
  ].join('\n')
}
