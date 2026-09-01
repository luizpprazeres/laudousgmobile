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
import { criarCervicometriaAddonModule } from './cervicometriaAddon'
import { criarDopplerAddonModule } from './dopplerObstetrico'
import { criarFetalGrowthModule } from './fetalGrowth'
import { preEclampsiaFmfSpec, trisomyFmfSpec } from '../../calculators/specs'

const TECNICA =
  'Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

function is3t(opts?: OrganState): boolean {
  return String(opts?.trimestre ?? '2t') === '3t'
}
function is1t(opts?: OrganState): boolean {
  return String(opts?.trimestre ?? '2t') === '1t'
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
        key: 'situacao',
        label: 'Situação fetal',
        kind: 'segmented',
        options: [
          {
            value: 'longitudinal', label: 'Longitudinal', isDefault: true,
            subFields: [{
              key: 'apresentacao', label: 'Apresentação', kind: 'mini-segmented',
              options: [
                { value: 'cefálica', label: 'Cefálica', isDefault: true },
                { value: 'pélvica', label: 'Pélvica' },
              ],
            }],
          },
          {
            value: 'transversa', label: 'Transversa/córmica',
            subFields: [{
              key: 'polo_cefalico', label: 'Posição do polo cefálico', kind: 'mini-segmented',
              options: [
                { value: 'à direita', label: 'À direita', isDefault: true },
                { value: 'à esquerda', label: 'À esquerda' },
              ],
            }],
          },
        ],
      },
      {
        key: 'dorso', label: 'Dorso (opcional)', kind: 'segmented',
        options: [
          { value: '', label: 'Não informar', isDefault: true },
          { value: 'à esquerda', label: 'À esquerda' },
          { value: 'à direita', label: 'À direita' },
          { value: 'anterior', label: 'Anterior' },
          { value: 'posterior', label: 'Posterior' },
        ],
      },
      { key: 'bcf', label: 'BCF (bpm)', kind: 'text', placeholder: '145' },
    ],
  },
  initialState: (): OrganState => ({
    situacao: 'longitudinal',
    'situacao.longitudinal.apresentacao': 'cefálica',
    'situacao.transversa.polo_cefalico': 'à direita',
    dorso: '',
    bcf: '',
  }),
  compose: (st): OrganComposition => {
    const situacao = String(st.situacao || 'longitudinal')
    const apres = String(st['situacao.longitudinal.apresentacao'] || 'cefálica')
    const polo = String(st['situacao.transversa.polo_cefalico'] || 'à direita')
    const dorso = String(st.dorso || '').trim()
    const bcf = numOrNull(st.bcf)
    const linhas = [
      situacao === 'transversa'
        ? `Feto único, em situação transversa, com polo cefálico ${polo}${dorso ? `, e dorso ${dorso}` : ''}.`
        : `Feto único, em apresentação ${apres}${dorso ? `, com dorso ${dorso}` : ''}.`,
      `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${bcf === null ? '____' : ptBr(bcf)} bpm).`,
      'Os movimentos fetais são ativos.',
    ]
    return { body: linhas.join('\n'), conclusion: [], isNormal: true }
  },
}

// ── Morfológico do primeiro trimestre ───────────────────────────────────────
const primeiroTrimestreModule: OrganModule = {
  schema: {
    id: 'primeiro_trimestre',
    name: 'Feto e marcadores',
    category: 'MORFOLOGICO',
    fields: [
      { key: 'bcf', label: 'BCF (bpm)', kind: 'text', placeholder: '150' },
      { key: 'ccn', label: 'CCN (mm)', kind: 'text', placeholder: '64' },
      { key: 'tn', label: 'Translucência nucal (mm)', kind: 'text', placeholder: '1,5' },
      {
        key: 'osso_nasal', label: 'Osso nasal', kind: 'segmented',
        options: [
          { value: 'presente', label: 'Presente', isDefault: true },
          { value: 'ausente', label: 'Ausente' },
          { value: 'na', label: 'Não avaliado' },
        ],
      },
      {
        key: 'tricuspide', label: 'Regurgitação tricúspide', kind: 'segmented',
        options: [
          { value: 'na', label: 'Não avaliada', isDefault: true },
          { value: 'ausente', label: 'Ausente' },
          { value: 'presente', label: 'Presente' },
        ],
      },
      {
        key: 'ducto_venoso', label: 'Ducto venoso', kind: 'segmented',
        options: [
          { value: 'normal', label: 'Normal', isDefault: true },
          { value: 'alterado', label: 'Onda A reversa' },
          { value: 'na', label: 'Não avaliado' },
        ],
      },
      { key: 'placenta_loc', label: 'Placenta — localização (opcional)', kind: 'text', placeholder: 'posterior' },
    ],
  },
  initialState: (): OrganState => ({
    bcf: '', ccn: '', tn: '', osso_nasal: 'presente', tricuspide: 'na',
    ducto_venoso: 'normal', placenta_loc: '',
  }),
  compose: (st): OrganComposition => {
    const bcf = numOrNull(st.bcf)
    const ccn = numOrNull(st.ccn)
    const tn = numOrNull(st.tn)
    const osso = String(st.osso_nasal || 'presente')
    const tricuspide = String(st.tricuspide || 'na')
    const ducto = String(st.ducto_venoso || 'normal')
    const placenta = String(st.placenta_loc || '').trim()
    const body = [
      'Feto único, em situação variável.',
      `Batimentos cardíacos presentes (BCF = ${bcf === null ? '____' : ptBr(bcf)} bpm).`,
      'Movimentos fetais presentes.',
      `Comprimento cabeça-nádega (CCN) de ${mm(ccn)} mm.`,
      `Translucência nucal de ${mm(tn)} mm.`,
      osso === 'na' ? 'Osso nasal não avaliado.' : `Osso nasal ${osso}.`,
      tricuspide === 'na'
        ? 'Regurgitação tricúspide não avaliada.'
        : `Regurgitação tricúspide ${tricuspide}.`,
      ducto === 'normal'
        ? 'Ducto venoso com fluxo trifásico e onda A positiva.'
        : ducto === 'alterado'
          ? 'Ducto venoso com onda A reversa.'
          : 'Ducto venoso não avaliado.',
      ...(placenta ? [`Placenta de localização ${placenta}.`] : []),
      'Líquido amniótico de quantidade normal.',
    ]
    const altered = osso === 'ausente' || tricuspide === 'presente' || ducto === 'alterado'
    const conclusion = [
      'Líquido amniótico de quantidade normal.',
      ducto === 'normal'
        ? 'Dopplervelocimetria do ducto venoso normal.'
        : ducto === 'alterado'
          ? 'Dopplervelocimetria do ducto venoso alterada, com onda A reversa.'
          : 'Ducto venoso não avaliado.',
      altered
        ? 'Marcador ultrassonográfico de aneuploidia identificado; correlacionar com o rastreamento combinado.'
        : 'Morfologia fetal sem evidência de alteração detectável nesta fase da gestação.',
    ]
    return { body: body.join('\n'), conclusion, isNormal: !altered }
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

const cervicometriaModule = criarCervicometriaAddonModule('MORFOLOGICO')
const dopplerModule = criarDopplerAddonModule('MORFOLOGICO')
const dopplerPrimeiroTrimestreModule = criarDopplerAddonModule('MORFOLOGICO', { apenasIpUterinas: true })
const fetalGrowthModule = criarFetalGrowthModule('MORFOLOGICO')

const SECTIONS: ExamSection[] = [
  { id: 'ig', label: 'IG e datas', group: 'orgaos', module: igModule },
  { id: 'feto', label: 'Feto', group: 'orgaos', module: fetoModule },
  { id: 'anatomia', label: 'Anatomia fetal', group: 'orgaos', module: anatomiaModule },
  { id: 'biometria', label: 'Biometria', group: 'orgaos', module: biometriaModule },
  { id: 'extrafetal', label: 'Extra-fetal', group: 'orgaos', module: extraFetalModule },
  { id: 'cervicometria', label: 'Cervicometria', group: 'orgaos', module: cervicometriaModule },
  { id: 'doppler', label: 'Doppler', group: 'orgaos', module: dopplerModule },
  { id: 'crescimento_fetal', label: 'Crescimento fetal', group: 'orgaos', module: fetalGrowthModule },
  { id: 'achados', label: 'Achados adicionais', group: 'orgaos', module: achadosModule },
]

const FIRST_TRIMESTER_SECTIONS: ExamSection[] = [
  { id: 'ig', label: 'IG e datas', group: 'orgaos', module: igModule },
  { id: 'primeiro_trimestre', label: 'Feto e marcadores', group: 'orgaos', module: primeiroTrimestreModule },
  { id: 'cervicometria', label: 'Cervicometria', group: 'orgaos', module: cervicometriaModule },
  { id: 'doppler', label: 'Doppler uterino', group: 'orgaos', module: dopplerPrimeiroTrimestreModule },
  { id: 'achados', label: 'Achados adicionais', group: 'orgaos', module: achadosModule },
]

// União necessária para inicializar e preservar o estado ao trocar o trimestre.
const ALL_SECTIONS = [...SECTIONS, FIRST_TRIMESTER_SECTIONS[1]!]

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
        { value: '1t', label: '1º trimestre' },
        { value: '2t', label: '2º trimestre', isDefault: true },
        { value: '3t', label: '3º trimestre' },
      ],
    },
  ],
  resolveTitle: (opts) =>
    is1t(opts)
      ? 'ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE'
      : is3t(opts)
        ? 'ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE'
        : 'ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE',
  sections: ALL_SECTIONS,
  resolveSections: (opts) => is1t(opts) ? FIRST_TRIMESTER_SECTIONS : SECTIONS,
  resolveCalculators: (opts) => is1t(opts)
    ? [
        preEclampsiaFmfSpec,
        ...(process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION === 'true' ? [trisomyFmfSpec] : []),
      ]
    : [],
  conclusionNormal: 'Morfologia fetal sem evidência de alteração detectável pelo método.',
}
