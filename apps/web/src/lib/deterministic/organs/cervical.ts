/**
 * Categoria CERVICAL (cadeias linfonodais cervicais — níveis de Robbins).
 * Fonte: apps/api/src/server/renderer/categories/CERVICAL.ts (clássico).
 *
 * Normal → frase única cobrindo todos os níveis. Alterado → linfonodo com nível/
 * medidas/forma/hilo/vascularização + item de conclusão (suspeito vs reacional).
 * Grosso: 1 linfonodo alterado. Glândulas salivares/tireoide → curadoria futura.
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganModule, OrganState, OrganComposition } from '../types'

function ptBr1(n: number): string {
  return n.toFixed(1).replace('.', ',')
}
function medidas3(raw: unknown): string {
  const rawStr = String(raw ?? '').toLowerCase()
  const isMm = rawStr.includes('mm')
  const parts = rawStr.split(/[x×]/i).map((p) => {
    const s = p.trim().replace(',', '.')
    const m = s.match(/-?\d+(\.\d+)?/)
    return m ? Number(m[0]) : null
  })
  const vals = [0, 1, 2].map((i) => {
    let n = parts[i]
    if (n == null || !Number.isFinite(n)) return '____'
    if (isMm) n = n / 10
    return ptBr1(n)
  })
  return `${vals.join(' x ')} cm`
}

const FORMA: Record<string, string> = { oval: 'de forma oval', arredondada: 'de forma arredondada' }
const HILO: Record<string, string> = { presente: 'com periferia hipoecoica e centro hiperecoico', ausente: 'sem hilo ecogênico identificável' }
const VASC: Record<string, string> = {
  ausente: 'sem vascularização significativa',
  hilar: 'com vascularização hilar',
  periferica: 'com vascularização periférica',
  mista: 'com vascularização mista (hilar e periférica)',
  aumentada: 'com aumento da vascularização',
}

const ASPECTOS_NORMAL =
  'Cadeias ganglionares cervicais sem evidência de alterações ecográficas nos níveis IA, IB, IIA, IIB, III, IV, VA, VB e VI.'
const FRASE_DEMAIS_NIVEIS =
  'Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada.'
const CONCLUSAO_NORMAL = 'Ausência de alterações detectáveis pelo método.'

const NIVEIS = ['IA', 'IB', 'IIA', 'IIB', 'III', 'IV', 'VA', 'VB', 'VI']

const cervicalModule: OrganModule = {
  schema: {
    id: 'cervical',
    name: 'Cadeias cervicais',
    category: 'CERVICAL',
    fields: [
      {
        key: 'linfonodo',
        label: 'Linfonodo alterado',
        kind: 'segmented',
        hint: 'default: cadeias normais',
        options: [
          { value: 'nenhum', label: 'Normais', isDefault: true },
          {
            value: 'alterado',
            label: 'Alterado',
            subFields: [
              { key: 'nivel', label: 'Nível (Robbins)', kind: 'mini-segmented', options: NIVEIS.map((n, i) => ({ value: n, label: n, isDefault: i === 4 })) },
              { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '1,5 x 1,0 x 0,8' },
              { key: 'forma', label: 'Forma', kind: 'mini-segmented', options: [{ value: 'oval', label: 'Oval', isDefault: true }, { value: 'arredondada', label: 'Arredondada' }] },
              { key: 'hilo', label: 'Hilo', kind: 'mini-segmented', options: [{ value: 'presente', label: 'Presente', isDefault: true }, { value: 'ausente', label: 'Ausente' }] },
              { key: 'vasc', label: 'Vascularização', kind: 'mini-segmented', options: [
                { value: 'ausente', label: 'Ausente', isDefault: true }, { value: 'hilar', label: 'Hilar' }, { value: 'periferica', label: 'Periférica' }, { value: 'mista', label: 'Mista' }, { value: 'aumentada', label: 'Aumentada' },
              ] },
              { key: 'suspeito', label: 'Suspeição', kind: 'checklist', options: [{ value: 'sim', label: 'Aspecto suspeito' }] },
            ],
          },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({
    linfonodo: 'nenhum',
    'linfonodo.alterado.nivel': 'III',
    'linfonodo.alterado.medidas': '',
    'linfonodo.alterado.forma': 'oval',
    'linfonodo.alterado.hilo': 'presente',
    'linfonodo.alterado.vasc': 'ausente',
    'linfonodo.alterado.suspeito': [],
  }),
  compose: (st): OrganComposition => {
    if ((st.linfonodo as string) !== 'alterado') {
      return { body: ASPECTOS_NORMAL, conclusion: [CONCLUSAO_NORMAL], isNormal: true }
    }
    const nivel = String(st['linfonodo.alterado.nivel'] || 'III')
    const forma = FORMA[String(st['linfonodo.alterado.forma'] || 'oval')]
    const hilo = HILO[String(st['linfonodo.alterado.hilo'] || 'presente')]
    const vasc = VASC[String(st['linfonodo.alterado.vasc'] || 'ausente')]
    const suspeito = ((st['linfonodo.alterado.suspeito'] as string[]) || []).includes('sim')

    const partes = [`Linfonodo de dimensões aumentadas no nível ${nivel}`, `medindo ${medidas3(st['linfonodo.alterado.medidas'])}`]
    if (forma) partes.push(forma)
    if (hilo) partes.push(hilo)
    if (vasc) partes.push(`${vasc} ao Doppler colorido`)
    const body = `${partes.join(', ')}.\n${FRASE_DEMAIS_NIVEIS}`

    const conclusion = suspeito
      ? [`Linfonodo de aspecto suspeito no nível ${nivel}. Correlacionar com achados clínicos.`]
      : [`Linfonodo proeminente de aspecto reacional no nível ${nivel}.`]

    return { body, conclusion, isNormal: false }
  },
}

export const cervical: ExamCategory = {
  id: 'CERVICAL',
  name: 'Cervical',
  title: 'ULTRASSONOGRAFIA CERVICAL',
  tecnica:
    'Exame realizado com transdutor de 12 MHz, abrangendo a avaliação das cadeias ganglionares cervicais. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [{ id: 'cervical', label: 'Cadeias cervicais', group: 'orgaos', module: cervicalModule }],
  conclusionNormal: CONCLUSAO_NORMAL,
}
