/**
 * Categoria MORFOLOGICO — geração determinística (2º/3º trimestre, feto único).
 *
 * Fonte: apps/api/src/server/renderer/categories/MORFOLOGICO.ts (render2t3t) +
 * fundação de IG (lib/ig/computeIG) + lógica ILA segura do boletim. Reusa o
 * igModule e helpers de [[organs/obstetrica]].
 *
 * Escopo: feto único, 2º/3º trimestre (controle), com anatomia por sistema (toggle
 * normal/alterado — quando alterado, a conclusão deixa de ser "sem evidência" e
 * passa ao diagnóstico). PENDENTE: 1º trimestre (CCN), gemelar, percentil de peso.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { OrganModule, OrganState, OrganComposition } from '../types'
import { igModule, numOrNull, ptBr, mm, classeILA } from './obstetrica'

const TECNICA =
  'Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

function is3t(opts?: OrganState): boolean {
  return String(opts?.trimestre ?? '2t') === '3t'
}
function genitaliaFmt(g: string): string {
  if (/masculin/i.test(g)) return 'masculina'
  if (/feminin/i.test(g)) return 'feminina'
  return 'não avaliada'
}

// ── Feto + anatomia fetal (survey normal padrão) ──────────────────────────────
const fetoModule: OrganModule = {
  schema: {
    id: 'feto',
    name: 'Feto',
    category: 'MORFOLOGICO',
    fields: [
      {
        key: 'apresentacao',
        label: 'Apresentação',
        kind: 'segmented',
        options: [
          { value: 'cefálica', label: 'Cefálica', isDefault: true },
          { value: 'pélvica', label: 'Pélvica' },
          { value: 'córmica', label: 'Córmica/transversa' },
        ],
      },
      { key: 'dorso', label: 'Dorso (opcional)', kind: 'text', placeholder: 'à esquerda' },
      { key: 'bcf', label: 'BCF (bpm)', kind: 'text', placeholder: '145' },
    ],
  },
  initialState: (): OrganState => ({ apresentacao: 'cefálica', dorso: '', bcf: '' }),
  compose: (st): OrganComposition => {
    const apres = String(st.apresentacao || 'cefálica')
    const dorso = String(st.dorso || '').trim()
    const bcf = numOrNull(st.bcf)
    const linhas = [
      `Feto único, em apresentação ${apres}${dorso ? `, com dorso ${dorso}` : ''}.`,
      `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${bcf === null ? '____' : ptBr(bcf)} bpm).`,
      'Os movimentos fetais são ativos.',
    ]
    return { body: linhas.join('\n'), conclusion: [], isNormal: true }
  },
}

// ── Anatomia fetal por sistema (normal por default; alterado → corpo + diagnóstico)
// Padrão MSK: cada sistema normal emite a frase canônica; se alterado, o médico
// descreve no corpo e o diagnóstico vai à conclusão (que deixa de ser "sem
// evidência de alteração"). Genitália é campo à parte (não é normal/alterado).
const ANATOMIA_SISTEMAS: { id: string; label: string; normal: string }[] = [
  { id: 'snc', label: 'Crânio / SNC / coluna', normal: 'As estruturas cranianas e da coluna vertebral são normais.' },
  { id: 'face', label: 'Face', normal: 'Nariz e narinas presentes. Lábio superior sem solução de continuidade.' },
  { id: 'coracao', label: 'Coração', normal: 'Coração com quatro câmaras visíveis.' },
  { id: 'visceras', label: 'Vísceras / aorta', normal: 'O estômago, a bexiga e os rins foram bem identificados e com ecotextura homogênea. A aorta abdominal fetal apresenta calibre normal.' },
]

const anatomiaModule: OrganModule = {
  schema: {
    id: 'anatomia',
    name: 'Anatomia fetal',
    category: 'MORFOLOGICO',
    fields: [
      ...ANATOMIA_SISTEMAS.map((s) => ({
        key: s.id,
        label: s.label,
        kind: 'segmented' as const,
        hint: 'default: normal',
        options: [
          { value: 'normal', label: 'Normal', isDefault: true },
          {
            value: 'alterado',
            label: 'Alterado',
            subFields: [
              { key: 'corpo', label: 'Descrição (achado)', kind: 'text' as const, placeholder: 'descrição do achado' },
              { key: 'diag', label: 'Diagnóstico (conclusão)', kind: 'text' as const, placeholder: 'diagnóstico' },
            ],
          },
        ],
      })),
      {
        key: 'genitalia',
        label: 'Genitália externa',
        kind: 'segmented',
        options: [
          { value: 'na', label: 'Não avaliada', isDefault: true },
          { value: 'masculina', label: 'Masculina' },
          { value: 'feminina', label: 'Feminina' },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({
    ...Object.fromEntries(ANATOMIA_SISTEMAS.map((s) => [s.id, 'normal'])),
    genitalia: 'na',
  }),
  compose: (st): OrganComposition => {
    const body: string[] = ['As considerações sobre a anatomia fetal são as seguintes:']
    const diagnosticos: string[] = []
    for (const s of ANATOMIA_SISTEMAS) {
      if (String(st[s.id]) === 'alterado') {
        const corpo = String(st[`${s.id}.alterado.corpo`] ?? '').trim()
        const diag = String(st[`${s.id}.alterado.diag`] ?? '').trim()
        body.push(corpo ? `${corpo.charAt(0).toUpperCase()}${corpo.slice(1).replace(/\.+$/, '')}.` : s.normal)
        if (diag) diagnosticos.push(`${diag.charAt(0).toUpperCase()}${diag.slice(1).replace(/\.+$/, '')}.`)
      } else {
        body.push(s.normal)
      }
    }
    body.push(`Genitália externa ${genitaliaFmt(String(st.genitalia || 'na'))}.`)
    const alterado = diagnosticos.length > 0
    return {
      body: body.join('\n'),
      conclusion: alterado ? diagnosticos : ['Morfologia fetal sem evidência de alteração detectável pelo método.'],
      isNormal: !alterado,
    }
  },
}

// ── Biometria detalhada (binocular só no 2º trimestre) ────────────────────────
const biometriaModule: OrganModule = {
  schema: {
    id: 'biometria',
    name: 'Biometria',
    category: 'MORFOLOGICO',
    fields: [
      { key: 'dbp', label: 'DBP (mm)', kind: 'text', placeholder: '48' },
      { key: 'cc', label: 'CC (mm)', kind: 'text', placeholder: '175' },
      { key: 'cerebelo', label: 'Cerebelo (mm)', kind: 'text', placeholder: '20' },
      { key: 'cisterna', label: 'Cisterna magna (mm)', kind: 'text', placeholder: '5' },
      { key: 'binocular', label: 'Distância binocular (mm) — 2º tri', kind: 'text', placeholder: '30' },
      { key: 'ca', label: 'CA (mm)', kind: 'text', placeholder: '152' },
      { key: 'femur', label: 'Fêmur (mm)', kind: 'text', placeholder: '33' },
      { key: 'tibia', label: 'Tíbia (mm)', kind: 'text', placeholder: '28' },
      { key: 'fibula', label: 'Fíbula (mm)', kind: 'text', placeholder: '27' },
      { key: 'umero', label: 'Úmero (mm)', kind: 'text', placeholder: '32' },
      { key: 'radio', label: 'Rádio (mm)', kind: 'text', placeholder: '27' },
      { key: 'ulna', label: 'Ulna (mm)', kind: 'text', placeholder: '29' },
      { key: 'peso', label: 'Peso estimado (g)', kind: 'text', placeholder: '320' },
    ],
  },
  initialState: (): OrganState => ({ dbp: '', cc: '', cerebelo: '', cisterna: '', binocular: '', ca: '', femur: '', tibia: '', fibula: '', umero: '', radio: '', ulna: '', peso: '' }),
  compose: (st, opts): OrganComposition => {
    const g = (k: string) => mm(numOrNull(st[k]))
    const linhas = [
      'A biometria fetal é a seguinte:',
      `Diâmetro biparietal (DBP) de ${g('dbp')} mm.`,
      `Circunferência da cabeça (CC) de ${g('cc')} mm.`,
      `Cerebelo mede ${g('cerebelo')} mm.`,
      `Cisterna magna mede ${g('cisterna')} mm.`,
      ...(is3t(opts) ? [] : [`Distância binocular de ${g('binocular')} mm.`]),
      `Circunferência abdominal (CA) de ${g('ca')} mm.`,
      `Comprimento do fêmur direito de ${g('femur')} mm.`,
      `Comprimento do fêmur esquerdo de ${g('femur')} mm.`,
      `Comprimento da tíbia direita de ${g('tibia')} mm.`,
      `Comprimento da tíbia esquerda de ${g('tibia')} mm.`,
      `Comprimento da fíbula direita de ${g('fibula')} mm.`,
      `Comprimento da fíbula esquerda de ${g('fibula')} mm.`,
      `Comprimento do úmero direito de ${g('umero')} mm.`,
      `Comprimento do úmero esquerdo de ${g('umero')} mm.`,
      `Comprimento do rádio direito de ${g('radio')} mm.`,
      `Comprimento do rádio esquerdo de ${g('radio')} mm.`,
      `Comprimento da ulna direita de ${g('ulna')} mm.`,
      `Comprimento da ulna esquerda de ${g('ulna')} mm.`,
      `Peso fetal estimado em ${g('peso')} g.`,
    ]
    return { body: linhas.join('\n'), conclusion: [], isNormal: true }
  },
}

// ── Análise extra-fetal (cordão + placenta + ILA + colo) + conclusão final ────
const extraFetalModule: OrganModule = {
  schema: {
    id: 'extrafetal',
    name: 'Extra-fetal',
    category: 'MORFOLOGICO',
    fields: [
      { key: 'placenta_loc', label: 'Placenta — localização', kind: 'text', placeholder: 'posterior' },
      { key: 'placenta_grau', label: 'Placenta — grau (0/I/II/III)', kind: 'text', placeholder: 'I' },
      { key: 'ila', label: 'ILA (cm)', kind: 'text', placeholder: '12' },
    ],
  },
  initialState: (): OrganState => ({ placenta_loc: '', placenta_grau: '', ila: '' }),
  compose: (st, opts): OrganComposition => {
    const terceiro = is3t(opts)
    const loc = String(st.placenta_loc || '').trim() || '____'
    const grauRaw = String(st.placenta_grau || '').trim().replace(/^grau\s*/i, '')
    const romano: Record<string, string> = { '0': '0', '1': 'I', '2': 'II', '3': 'III' }
    const grau = grauRaw ? `, grau ${romano[grauRaw] ?? grauRaw}` : ''
    const eco = terceiro ? 'heterogênea, de acordo com a fase da gestação' : 'homogênea'
    const ilaV = numOrNull(st.ila)

    const linhas = [
      'Análise extra-fetal:',
      'Cordão umbilical com duas artérias e uma veia.',
      `Placenta de localização ${loc}${grau}, com ecotextura ${eco}.`,
      `Índice do líquido amniótico de ${ilaV === null ? '____' : ptBr(ilaV)} cm.`,
      ...(terceiro ? [] : ['Orifício interno do colo uterino encontra-se fechado.']),
    ]
    // Conclusão: líquido (classificado quando há ILA) + morfologia normal.
    const liquidoConcl =
      ilaV === null
        ? 'Líquido amniótico de quantidade normal.'
        : `${classeILA(ilaV).conclusao} (ILA de ${ptBr(ilaV)} cm).`
    // A conclusão de morfologia ("sem evidência" ou diagnósticos) vem do
    // anatomiaModule. Aqui só o líquido.
    return { body: linhas.join('\n'), conclusion: [liquidoConcl], isNormal: true }
  },
}

const achadosModule: OrganModule = {
  schema: {
    id: 'achados',
    name: 'Achados adicionais',
    category: 'MORFOLOGICO',
    fields: [{ key: 'texto', label: 'Achados adicionais (opcional)', kind: 'text', placeholder: 'observação livre — vai ao corpo' }],
  },
  initialState: (): OrganState => ({ texto: '' }),
  compose: (st): OrganComposition => {
    const t = String(st.texto || '').trim()
    return { body: t || '', conclusion: [], isNormal: true }
  },
}

const SECTIONS: ExamSection[] = [
  { id: 'ig', label: 'IG e datas', group: 'orgaos', module: igModule },
  { id: 'feto', label: 'Feto', group: 'orgaos', module: fetoModule },
  { id: 'anatomia', label: 'Anatomia fetal', group: 'orgaos', module: anatomiaModule },
  { id: 'biometria', label: 'Biometria', group: 'orgaos', module: biometriaModule },
  { id: 'extrafetal', label: 'Extra-fetal', group: 'orgaos', module: extraFetalModule },
  { id: 'achados', label: 'Achados adicionais', group: 'orgaos', module: achadosModule },
]

export const morfologico: ExamCategory = {
  id: 'MORFOLOGICO',
  name: 'Morfológica',
  title: 'ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    {
      key: 'trimestre',
      label: 'Trimestre',
      kind: 'segmented',
      options: [
        { value: '2t', label: '2º trimestre', isDefault: true },
        { value: '3t', label: '3º trimestre' },
      ],
    },
  ],
  resolveTitle: (opts) =>
    is3t(opts)
      ? 'ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE'
      : 'ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE',
  sections: SECTIONS,
  conclusionNormal: 'Morfologia fetal sem evidência de alteração detectável pelo método.',
}
