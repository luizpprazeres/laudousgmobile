/**
 * TRANSFONTANELA — MVP determinístico local para revisão clínica.
 * Base: modelo da casa em `_extraction/from-laudousg-original/03-models-by-category/TRANSFONTANELA.md`.
 *
 * Regras conservadoras:
 * - parênquima, ventrículos e região periventricular moram no MESMO módulo, para
 *   que uma alteração suprima a frase normal da estrutura que ela contradiz;
 * - nenhuma graduação automática de ventriculomegalia por limiar (a referência
 *   depende da idade, que o MVP não interpreta);
 * - o grau de Papile é derivado da extensão marcada e só entra com confirmação;
 * - medida obrigatória ausente ou ilegível vira '____';
 * - recomendação só entra quando o achado que a sustenta está marcado.
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganComposition, OrganModule, OrganState } from '../types'
import {
  LACUNA, SIM_NAO, igText, initialFromFields, intText, joinPt, ladoFrase, mini, mmText, opt, segmented, sub, text,
} from './neuroOcularShared'

const LADO = [opt('direito', 'Direito'), opt('esquerdo', 'Esquerdo'), opt('bilateral', 'Bilateral')]

// ---------------------------------------------------------------- dados neonatais

const dadosFields = [
  text('dias_vida', 'Dias de vida', '10'),
  text('ig_nascimento', 'IG ao nascimento', '32+4'),
  text('ig_corrigida', 'IG corrigida', '34+1'),
  segmented('janela', 'Janela acústica', [
    opt('adequada', 'Adequada', { isDefault: true }),
    opt('limitada', 'Limitada', { subFields: [text('motivo', 'Motivo (opcional)', 'fontanela anterior pequena', false)] }),
  ]),
]

const dadosModule: OrganModule = {
  schema: { id: 'dados_neonatais', name: 'Dados neonatais', category: 'TRANSFONTANELA', fields: dadosFields },
  initialState: () => initialFromFields(dadosFields),
  compose: (st): OrganComposition => {
    const dados: string[] = []
    const dias = intText(st.dias_vida, 730)
    if (dias) dados.push(dias === '1' ? '1 dia de vida' : `${dias} dias de vida`)
    const nascimento = igText(st.ig_nascimento, 22, 44)
    if (nascimento) dados.push(`idade gestacional ao nascimento de ${nascimento}`)
    const corrigida = igText(st.ig_corrigida, 22, 60)
    if (corrigida) dados.push(`idade gestacional corrigida de ${corrigida}`)

    const lines: string[] = []
    if (dados.length) lines.push(`Dados informados: ${dados.join('; ')}.`)
    const conclusion: string[] = []
    if (st.janela === 'limitada') {
      const motivo = sub(st, 'janela', 'limitada', 'motivo')
      lines.push(`Estudo com janela acústica limitada${motivo ? ` (${motivo})` : ''}.`)
      conclusion.push('Estudo limitado pela janela acústica.')
    }
    return { body: lines.join('\n'), conclusion, isNormal: conclusion.length === 0 }
  },
}

// ------------------------------------------------- parênquima e sistema ventricular

const EXTENSAO = [
  opt('matriz', 'Matriz germinativa'),
  opt('iv_sem_dilatacao', 'Intraventricular sem dilatação'),
  opt('iv_com_dilatacao', 'Intraventricular com dilatação'),
  opt('parenquimatosa', 'Com lesão parenquimatosa'),
]
const PAPILE: Record<string, string> = { matriz: 'I', iv_sem_dilatacao: 'II', iv_com_dilatacao: 'III', parenquimatosa: 'IV' }

const ventriculosFields = [
  segmented('parenquima', 'Parênquima', [opt('normal', 'Habitual', { isDefault: true }), opt('nao_avaliado', 'Não avaliado')]),
  segmented('laterais', 'Ventrículos laterais', [
    opt('normal', 'Normais', { isDefault: true }),
    opt('dilatados', 'Dilatados', {
      subFields: [
        mini('lado', 'Lado', LADO.map((o) => ({ ...o, isDefault: o.value === 'bilateral' }))),
        mini('intensidade', 'Intensidade (opcional)', [
          opt('nao_graduar', 'Não graduar', { isDefault: true }), opt('leve', 'Leve'), opt('moderada', 'Moderada'), opt('acentuada', 'Acentuada'),
        ]),
      ],
    }),
    opt('nao_avaliado', 'Sistema ventricular não avaliado'),
  ]),
  text('levene_d', 'Índice de Levene D (mm)', '10'),
  text('levene_e', 'Índice de Levene E (mm)', '10'),
  text('terceiro_mm', '3º ventrículo (mm)', '2'),
  segmented('hemorragia', 'Hemorragia peri-intraventricular', [
    opt('ausente', 'Ausente', { isDefault: true }),
    opt('presente', 'Presente', {
      subFields: [
        mini('lado', 'Lado', LADO),
        mini('extensao', 'Extensão', EXTENSAO),
        mini('regiao', 'Região parenquimatosa', [opt('frontal', 'Frontal'), opt('parietal', 'Parietal'), opt('occipital', 'Occipital')]),
        text('medidas', 'Medidas da lesão (cm, opcional)', '1,0 x 0,6'),
        mini('grau', 'Grau de Papile', [opt('nao_incluir', 'Não incluir', { isDefault: true }), opt('incluir', 'Incluir grau derivado')]),
      ],
    }),
  ], 'grau derivado da extensão; só entra se confirmado'),
  segmented('periventricular', 'Região periventricular', [
    opt('normal', 'Habitual', { isDefault: true }),
    opt('hiperecogenica', 'Hiperecogenicidade', {
      subFields: [
        mini('lado', 'Lado', LADO.map((o) => ({ ...o, isDefault: o.value === 'bilateral' }))),
        mini('regiao', 'Região', [opt('frontal', 'Frontal'), opt('parieto_occipital', 'Parieto-occipital')]),
        mini('controle', 'Sugerir controle evolutivo', SIM_NAO),
      ],
    }),
    opt('cistica', 'Imagens císticas', {
      subFields: [
        mini('lado', 'Lado', LADO.map((o) => ({ ...o, isDefault: o.value === 'bilateral' }))),
        mini('controle', 'Sugerir controle evolutivo', SIM_NAO),
      ],
    }),
  ]),
  segmented('cistos', 'Cistos subependimários', [
    opt('ausente', 'Ausentes', { isDefault: true }),
    opt('presente', 'Presentes', {
      subFields: [
        mini('lado', 'Lado', LADO),
        mini('quantidade', 'Quantidade', [opt('unico', 'Único', { isDefault: true }), opt('multiplos', 'Múltiplos')]),
        text('medida', 'Maior medida (mm)', '3'),
      ],
    }),
  ]),
  segmented('calcificacoes', 'Focos hiperecogênicos (calcificações)', [
    opt('ausente', 'Ausentes', { isDefault: true }),
    opt('presente', 'Presentes', {
      subFields: [
        mini('local', 'Localização', [
          opt('periventriculares', 'Periventriculares'), opt('nucleos_base', 'Tálamos/núcleos da base'), opt('difusos', 'Difusos'),
        ]),
        mini('sorologias', 'Sugerir correlação sorológica', SIM_NAO),
      ],
    }),
  ]),
]

const ladoVentriculo = (lado: string) =>
  lado === 'direito' ? 'do ventrículo lateral direito' : lado === 'esquerdo' ? 'do ventrículo lateral esquerdo' : 'dos ventrículos laterais'

function leveneText(st: OrganState, lados: string[], obrigatorio: boolean): string {
  const parts = lados.map((lado) => {
    const raw = lado === 'direito' ? st.levene_d : st.levene_e
    const value = mmText(raw) ?? (obrigatorio ? `${LACUNA} mm` : null)
    return value ? `${value} à ${lado === 'direito' ? 'direita' : 'esquerda'}` : null
  }).filter(Boolean) as string[]
  return parts.length ? ` (índice de Levene: ${parts.join(' e ')})` : ''
}

const ventriculosModule: OrganModule = {
  schema: { id: 'parenquima_ventriculos', name: 'Parênquima e sistema ventricular', category: 'TRANSFONTANELA', fields: ventriculosFields },
  initialState: () => initialFromFields(ventriculosFields),
  compose: (st): OrganComposition => {
    const lines: string[] = []
    const conclusion: string[] = []
    let altered = false

    const hemorragia = st.hemorragia === 'presente'
    const hLado = hemorragia ? sub(st, 'hemorragia', 'presente', 'lado') : ''
    const hExt = hemorragia ? sub(st, 'hemorragia', 'presente', 'extensao') : ''
    const peri = String(st.periventricular)
    const calc = st.calcificacoes === 'presente'
    const calcLocal = calc ? sub(st, 'calcificacoes', 'presente', 'local') : ''

    // Parênquima: a frase normal sai quando há lesão parenquimatosa descrita abaixo.
    const lesaoParenquima = hExt === 'parenquimatosa' || peri !== 'normal' || calc
    if (st.parenquima === 'nao_avaliado') {
      lines.push('Parênquima cerebral não avaliado.')
      conclusion.push('Parênquima cerebral não avaliado.')
      altered = true
    } else if (!lesaoParenquima) {
      lines.push('Parênquima cerebral de ecogenicidade habitual, sem evidências de lesões focais ou difusas.')
    }

    // Ventrículos laterais.
    const ladosHemorragiaDilatada = hExt === 'iv_com_dilatacao'
      ? (hLado === 'bilateral' ? ['direito', 'esquerdo'] : hLado ? [hLado] : [])
      : []
    const marcados = st.laterais === 'dilatados'
      ? (() => {
          const lado = sub(st, 'laterais', 'dilatados', 'lado') || 'bilateral'
          return lado === 'bilateral' ? ['direito', 'esquerdo'] : [lado]
        })()
      : []
    const dilatados = ['direito', 'esquerdo'].filter((lado) => marcados.includes(lado) || ladosHemorragiaDilatada.includes(lado))
    const ventriculosNaoAvaliados = st.laterais === 'nao_avaliado' && dilatados.length === 0
    if (ventriculosNaoAvaliados) {
      lines.push('Sistema ventricular não avaliado.')
      conclusion.push('Sistema ventricular não avaliado.')
      altered = true
    } else if (dilatados.length === 0) {
      lines.push(`Ventrículos laterais de calibre normal e simétricos${leveneText(st, ['direito', 'esquerdo'], false)}.`)
    } else {
      const intensidade = sub(st, 'laterais', 'dilatados', 'intensidade')
      const adverbio = st.laterais === 'dilatados'
        ? ({ leve: 'levemente ', moderada: 'moderadamente ', acentuada: 'acentuadamente ' } as Record<string, string>)[intensidade] ?? ''
        : ''
      if (dilatados.length === 2) {
        lines.push(`Ventrículos laterais com calibre ${adverbio}aumentado${leveneText(st, ['direito', 'esquerdo'], true)}.`)
      } else {
        const lado = dilatados[0]!
        const outro = lado === 'direito' ? 'esquerdo' : 'direito'
        lines.push(`Ventrículo lateral ${lado} com calibre ${adverbio}aumentado${leveneText(st, [lado], true)}.`)
        lines.push(`Ventrículo lateral ${outro} de calibre normal${leveneText(st, [outro], false)}.`)
      }
      if (st.laterais === 'dilatados') {
        const lado = dilatados.length === 2 ? 'bilateral' : dilatados[0]!
        const grau = adverbio ? `, de grau ${intensidade}` : ''
        conclusion.push(`Dilatação ${ladoVentriculo(lado)}${grau}.`)
      }
      altered = true
    }

    if (!ventriculosNaoAvaliados) {
      const terceiro = mmText(st.terceiro_mm)
      lines.push(`Terceiro ventrículo de dimensões normais${terceiro ? ` (${terceiro})` : ''}.`)
      lines.push('Quarto ventrículo de morfologia e dimensões habituais.')
    }

    // Tálamos e núcleos caudados (sulco caudotalâmico).
    if (calcLocal !== 'nucleos_base') {
      lines.push('Tálamos de ecogenicidade habitual e simétricos.')
      if (!hemorragia) lines.push('Núcleos caudados de contornos e ecogenicidade normais.')
      else if (hLado === 'direito') lines.push('Núcleo caudado esquerdo de contornos e ecogenicidade normais.')
      else if (hLado === 'esquerdo') lines.push('Núcleo caudado direito de contornos e ecogenicidade normais.')
    }

    // Hemorragia peri-intraventricular.
    if (hemorragia) {
      altered = true
      const onde = ladoFrase(hLado)
      const ventriculo = hLado === 'bilateral' ? 'dos ventrículos laterais' : hLado ? `do ventrículo lateral ${hLado}` : `do ventrículo lateral ${LACUNA}`
      const medidas = sub(st, 'hemorragia', 'presente', 'medidas')
      const medidaTxt = medidas ? `, medindo ${medidas.replace(/\s*cm$/i, '')} cm` : ''
      const corpo: Record<string, string> = {
        matriz: `Imagem hiperecogênica no sulco caudotalâmico ${onde}${medidaTxt}.`,
        iv_sem_dilatacao: `Imagem hiperecogênica no sulco caudotalâmico ${onde}, com conteúdo ecogênico no interior ${ventriculo}, sem dilatação ventricular associada${medidaTxt}.`,
        iv_com_dilatacao: `Imagem hiperecogênica no sulco caudotalâmico ${onde}, com conteúdo ecogênico no interior ${ventriculo}, que se apresenta dilatado${medidaTxt}.`,
        parenquimatosa: `Conteúdo ecogênico no interior ${ventriculo}, associado a área hiperecogênica no parênquima periventricular ${regiaoTxt(sub(st, 'hemorragia', 'presente', 'regiao'))} ${onde}${medidaTxt}.`,
      }
      lines.push(corpo[hExt] ?? `Imagem hiperecogênica periventricular ${onde}, com extensão ${LACUNA}.`)
      const grau = sub(st, 'hemorragia', 'presente', 'grau') === 'incluir' ? PAPILE[hExt] : undefined
      if (hExt === 'parenquimatosa') {
        conclusion.push(grau
          ? `Hemorragia peri-intraventricular com acometimento parenquimatoso periventricular (grau IV de Papile) ${onde}.`
          : `Hemorragia peri-intraventricular com acometimento parenquimatoso periventricular ${onde}.`)
      } else if (hExt) {
        const descricao: Record<string, string> = {
          matriz: 'restrita à matriz germinativa',
          iv_sem_dilatacao: 'com extensão intraventricular, sem dilatação ventricular',
          iv_com_dilatacao: 'com extensão intraventricular e dilatação ventricular',
        }
        conclusion.push(grau
          ? `Hemorragia peri-intraventricular grau ${grau} de Papile ${onde}.`
          : `Hemorragia peri-intraventricular ${descricao[hExt]} ${onde}.`)
      } else {
        conclusion.push(`Hemorragia peri-intraventricular ${onde}, extensão ${LACUNA}.`)
      }
    }

    // Região periventricular.
    if (peri === 'normal' && hExt !== 'parenquimatosa') {
      lines.push('Região periventricular de ecogenicidade habitual, sem sinais de leucomalácia.')
    } else if (peri === 'hiperecogenica') {
      altered = true
      const lado = sub(st, 'periventricular', 'hiperecogenica', 'lado') || 'bilateral'
      const regiao = sub(st, 'periventricular', 'hiperecogenica', 'regiao')
      const regiaoFrase = regiao === 'frontal' ? ', em região frontal' : regiao === 'parieto_occipital' ? ', em região parieto-occipital' : ''
      lines.push(`Aumento da ecogenicidade do parênquima periventricular ${distribuicao(lado)}${regiaoFrase}.`)
      const controle = sub(st, 'periventricular', 'hiperecogenica', 'controle') === 'sim' ? ' Controle ultrassonográfico evolutivo a critério clínico.' : ''
      conclusion.push(`Aumento da ecogenicidade periventricular ${distribuicao(lado)}.${controle}`)
    } else if (peri === 'cistica') {
      altered = true
      const lado = sub(st, 'periventricular', 'cistica', 'lado') || 'bilateral'
      lines.push(`Imagens císticas no parênquima periventricular ${distribuicao(lado)}.`)
      const controle = sub(st, 'periventricular', 'cistica', 'controle') === 'sim' ? ' Controle ultrassonográfico evolutivo a critério clínico.' : ''
      conclusion.push(`Achados sugestivos de leucomalácia periventricular cística ${distribuicao(lado)}.${controle}`)
    }

    // Cistos subependimários.
    if (st.cistos === 'presente') {
      altered = true
      const lado = sub(st, 'cistos', 'presente', 'lado')
      const multiplos = sub(st, 'cistos', 'presente', 'quantidade') === 'multiplos'
      const medida = mmText(sub(st, 'cistos', 'presente', 'medida'))
      lines.push(multiplos
        ? `Imagens císticas subependimárias no sulco caudotalâmico ${ladoFrase(lado)}${medida ? `, a maior medindo ${medida}` : ''}.`
        : `Imagem cística subependimária no sulco caudotalâmico ${ladoFrase(lado)}${medida ? `, medindo ${medida}` : ''}.`)
      conclusion.push(`${multiplos ? 'Cistos subependimários' : 'Cisto subependimário'} ${ladoFrase(lado)}.`)
    }

    // Focos hiperecogênicos.
    if (calc) {
      altered = true
      const local: Record<string, string> = {
        periventriculares: 'periventriculares',
        nucleos_base: 'nos tálamos/núcleos da base',
        difusos: 'difusos pelo parênquima',
      }
      const onde = local[calcLocal] ?? LACUNA
      lines.push(`Focos hiperecogênicos puntiformes ${onde}.`)
      const sorologias = sub(st, 'calcificacoes', 'presente', 'sorologias') === 'sim'
        ? ' Correlacionar com sorologias maternas e neonatais para infecções congênitas.'
        : ''
      conclusion.push(`Focos hiperecogênicos ${onde}, que podem corresponder a calcificações.${sorologias}`)
    }

    return { body: lines.join('\n'), conclusion, isNormal: !altered }
  },
}

function distribuicao(lado: string): string {
  if (lado === 'direito') return 'à direita'
  if (lado === 'esquerdo') return 'à esquerda'
  return 'de distribuição bilateral'
}

function regiaoTxt(regiao: string): string {
  return regiao || LACUNA
}

// ------------------------------------------------- linha média e fossa posterior

const linhaMediaFields = [
  segmented('linha_media', 'Linha média', [opt('normal', 'Habitual', { isDefault: true }), opt('nao_avaliada', 'Não avaliada')]),
  segmented('fossa_posterior', 'Fossa posterior', [opt('normal', 'Habitual', { isDefault: true }), opt('nao_avaliada', 'Não avaliada')]),
  text('cisterna_magna_mm', 'Cisterna magna (mm)', '5'),
]

const linhaMediaModule: OrganModule = {
  schema: { id: 'linha_media', name: 'Linha média e fossa posterior', category: 'TRANSFONTANELA', fields: linhaMediaFields },
  initialState: () => initialFromFields(linhaMediaFields),
  compose: (st): OrganComposition => {
    const lines: string[] = []
    const naoAvaliados: string[] = []
    if (st.linha_media === 'nao_avaliada') {
      naoAvaliados.push('estruturas da linha média')
    } else {
      lines.push(
        'Corpo caloso presente, de morfologia e ecogenicidade normais.',
        'Cavo do septo pelúcido presente.',
      )
    }
    if (st.fossa_posterior === 'nao_avaliada') {
      naoAvaliados.push('fossa posterior')
    } else {
      const cisterna = mmText(st.cisterna_magna_mm)
      lines.push(
        'Cerebelo de dimensões e ecogenicidade normais, com vermis de aspecto habitual.',
        `Cisterna magna de dimensões normais${cisterna ? ` (${cisterna})` : ''}.`,
      )
    }
    // Sem idade interpretada, a frase não afirma adequação à idade gestacional.
    lines.push('Sulcos e giros de aspecto habitual.')
    if (st.linha_media !== 'nao_avaliada') lines.push('Estruturas da linha média centradas.')
    if (naoAvaliados.length) {
      const frase = `${joinPt(naoAvaliados).replace(/^./, (c) => c.toUpperCase())} não ${naoAvaliados.length > 1 || naoAvaliados[0] === 'estruturas da linha média' ? 'avaliadas' : 'avaliada'}.`
      lines.push(frase)
      return { body: lines.join('\n'), conclusion: [frase], isNormal: false }
    }
    return { body: lines.join('\n'), conclusion: [], isNormal: true }
  },
}

export const transfontanela: ExamCategory = {
  id: 'TRANSFONTANELA',
  name: 'Transfontanelar',
  title: 'ULTRASSONOGRAFIA TRANSFONTANELAR',
  tecnica:
    'Exame realizado com transdutor microconvexo de 7,5 MHz, por via transfontanelar anterior, com obtenção de cortes coronais e sagitais sistemáticos. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'dados_neonatais', label: 'Dados neonatais', group: 'cabecalho', module: dadosModule },
    { id: 'parenquima_ventriculos', label: 'Parênquima e sistema ventricular', group: 'orgaos', module: ventriculosModule },
    { id: 'linha_media', label: 'Linha média e fossa posterior', group: 'orgaos', module: linhaMediaModule },
  ],
  conclusionNormal: 'Ultrassonografia transfontanelar dentro dos limites da normalidade.',
  conclusionClosing: 'Demais estruturas avaliadas sem alterações ecográficas.',
}
