/**
 * Categoria PARTES MOLES — geração determinística.
 * Fonte: apps/api/src/server/renderer/categories/PARTES_MOLES.ts (clássico).
 *
 * Normal → planos musculares/subcutâneos normais. Lesão focal: tipo (nódulo
 * sólido/lipoma/cisto/coleção/linfonodo/corpo estranho/hérnia) + ecogenicidade/
 * contornos/plano/doppler/medidas/localização. Grosso: 1 lesão.
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganModule, OrganState, OrganComposition } from '../types'

function ptBr1(n: number): string {
  return n.toFixed(1).replace('.', ',')
}
function parseN(p: string): number | null {
  const s = p.trim().replace(',', '.')
  const m = s.match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}
function medidas3(raw: unknown): string {
  const rawStr = String(raw ?? '').toLowerCase()
  const isMm = rawStr.includes('mm')
  const parts = rawStr.split(/[x×]/i).map(parseN)
  const vals = [0, 1, 2].map((i) => {
    let n = parts[i]
    if (n == null || !Number.isFinite(n)) return '____'
    if (isMm) n = n / 10
    return ptBr1(n)
  })
  return `${vals.join(' x ')} cm`
}
function medidaUnica(raw: unknown): string {
  const rawStr = String(raw ?? '').toLowerCase()
  const isMm = rawStr.includes('mm')
  let n = parseN(rawStr)
  if (n == null) return '____ cm'
  if (isMm) n = n / 10
  return `${ptBr1(n)} cm`
}
function limpa(s: string): string {
  return s.trim().replace(/\.+$/, '')
}

const ECO: Record<string, string> = { anecoica: 'anecoica', hipoecoica: 'hipoecoica', isoecoica: 'isoecoica', hiperecoica: 'hiperecoica', heterogenea: 'heterogênea' }
const CONTORNOS: Record<string, string> = { regulares: 'de contornos regulares', irregulares: 'de contornos irregulares' }
const PLANO: Record<string, string> = { subcutaneo: 'no tecido celular subcutâneo', muscular: 'no plano muscular', interface: 'na interface dermo-hipodérmica' }
const DOPPLER: Record<string, string> = { com_fluxo: 'com fluxo ao Doppler colorido', sem_fluxo: 'sem fluxo ao Doppler colorido' }

const ASPECTOS_NORMAIS =
  'Planos musculares e tecidos subcutâneos com ecogenicidade e ecotextura normais.\nNão há evidência de coleção, massa ou alteração focal.'
const CONCLUSAO_NORMAL = 'Ausência de alterações detectáveis pelo método.'

function planoLocal(st: OrganState, p: string): string {
  const plano = PLANO[String(st[`${p}.plano`] || 'subcutaneo')] ?? PLANO.subcutaneo
  const local = limpa(String(st[`${p}.local`] ?? ''))
  return `localizada ${plano}${local ? ` ${local}` : ''}`
}

const ecoField: Field = { key: 'eco', label: 'Ecogenicidade', kind: 'mini-segmented', options: [
  { value: 'anecoica', label: 'Ane' }, { value: 'hipoecoica', label: 'Hipo', isDefault: true }, { value: 'isoecoica', label: 'Iso' }, { value: 'hiperecoica', label: 'Hiper' }, { value: 'heterogenea', label: 'Heterog' },
] }
const contornosField: Field = { key: 'contornos', label: 'Contornos', kind: 'mini-segmented', options: [{ value: 'regulares', label: 'Regulares', isDefault: true }, { value: 'irregulares', label: 'Irregulares' }] }
const planoField: Field = { key: 'plano', label: 'Plano', kind: 'mini-segmented', options: [{ value: 'subcutaneo', label: 'Subcutâneo', isDefault: true }, { value: 'muscular', label: 'Muscular' }, { value: 'interface', label: 'Dermo-hipo' }] }
const dopplerField: Field = { key: 'doppler', label: 'Doppler', kind: 'mini-segmented', options: [{ value: 'na', label: '—', isDefault: true }, { value: 'com_fluxo', label: 'Com fluxo' }, { value: 'sem_fluxo', label: 'Sem fluxo' }] }
const medidasField: Field = { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '2,0 x 1,5 x 1,0' }
const localField: Field = { key: 'local', label: 'Localização', kind: 'text', placeholder: 'na região do antebraço direito' }

const solidoSubs = [medidasField, ecoField, contornosField, planoField, dopplerField, localField]
const cistoSubs = [medidasField, ecoField, { key: 'conteudo', label: 'Conteúdo', kind: 'text', placeholder: 'com ecos internos' } as Field, { key: 'paredes', label: 'Paredes', kind: 'text', placeholder: 'de paredes finas' } as Field, planoField, localField]
const colecaoSubs = [medidasField, { key: 'conteudo', label: 'Conteúdo', kind: 'text', placeholder: 'com ecos internos' } as Field, { key: 'natureza', label: 'Natureza', kind: 'text', placeholder: 'abscesso / hematoma' } as Field, planoField, dopplerField, localField]
const corpoSubs = [medidasField, planoField, localField]
const herniaSubs = [
  { key: 'medidas', label: 'Anel (cm)', kind: 'text', placeholder: '1,5' } as Field,
  { key: 'parede', label: 'Parede', kind: 'text', placeholder: 'aponeurose' } as Field,
  { key: 'conteudo_h', label: 'Conteúdo herniário', kind: 'text', placeholder: 'gordura / alça' } as Field,
  { key: 'reducao', label: 'Redutibilidade', kind: 'text', placeholder: 'redutível à compressão' } as Field,
  { key: 'tipo_h', label: 'Tipo', kind: 'text', placeholder: 'umbilical / incisional' } as Field,
  localField,
]

const lesaoModule: OrganModule = {
  schema: {
    id: 'partes_moles',
    name: 'Partes moles',
    category: 'PARTES_MOLES',
    fields: [
      {
        key: 'lesao',
        label: 'Lesão focal',
        kind: 'segmented',
        hint: 'default: sem lesão',
        options: [
          { value: 'nenhuma', label: 'Sem lesão', isDefault: true },
          { value: 'nodulo_solido', label: 'Nódulo sólido', subFields: solidoSubs },
          { value: 'lipoma', label: 'Lipoma', subFields: solidoSubs },
          { value: 'cisto', label: 'Cisto', subFields: cistoSubs },
          { value: 'colecao', label: 'Coleção', subFields: colecaoSubs },
          { value: 'linfonodo', label: 'Linfonodo', subFields: solidoSubs },
          { value: 'corpo_estranho', label: 'Corpo estranho', subFields: corpoSubs },
          { value: 'hernia', label: 'Hérnia', subFields: herniaSubs },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({ lesao: 'nenhuma' }),
  compose: (st): OrganComposition => {
    const tipo = String(st.lesao || 'nenhuma')
    if (tipo === 'nenhuma') {
      return { body: ASPECTOS_NORMAIS, conclusion: [CONCLUSAO_NORMAL], isNormal: true }
    }
    const p = `lesao.${tipo}`
    const g = (k: string) => st[`${p}.${k}`]
    const eco = ECO[String(g('eco') || 'hipoecoica')]
    const contornos = g('contornos') ? CONTORNOS[String(g('contornos'))] : ''
    const doppler = g('doppler') && g('doppler') !== 'na' ? DOPPLER[String(g('doppler'))] : ''
    const local = limpa(String(g('local') ?? ''))
    const locConcl = local ? ` ${local}` : ' na região avaliada'

    let body: string
    let conclusion: string
    switch (tipo) {
      case 'nodulo_solido': {
        const partes = [`Imagem nodular sólida, ${eco}`]
        if (contornos) partes.push(contornos)
        partes.push(`medindo ${medidas3(g('medidas'))}`, planoLocal(st, p))
        if (doppler) partes.push(doppler)
        body = `${partes.join(', ')}.`
        conclusion = `Imagem nodular sólida${locConcl}, a esclarecer. Correlacionar com dados clínicos.`
        break
      }
      case 'lipoma': {
        const partes = [`Imagem nodular ${ECO[String(g('eco') || 'hiperecoica')]}, homogênea`]
        if (contornos) partes.push(contornos)
        partes.push(`medindo ${medidas3(g('medidas'))}`, planoLocal(st, p))
        body = `${partes.join(', ')}.`
        conclusion = `Achados compatíveis com lipoma${locConcl}.`
        break
      }
      case 'cisto': {
        const partes = [`Imagem cística ${ECO[String(g('eco') || 'anecoica')]}`]
        if (g('conteudo')) partes.push(limpa(String(g('conteudo'))))
        if (g('paredes')) partes.push(limpa(String(g('paredes'))))
        partes.push(`medindo ${medidas3(g('medidas'))}`, planoLocal(st, p))
        body = `${partes.join(', ')}.`
        conclusion = `Imagem cística${locConcl}, podendo corresponder a cisto de inclusão epidérmica. Correlacionar com dados clínicos.`
        break
      }
      case 'colecao': {
        const head = g('conteudo') ? `Coleção ${limpa(String(g('conteudo')))}` : 'Coleção'
        const partes = [head, `medindo ${medidas3(g('medidas'))}`, planoLocal(st, p)]
        if (doppler) partes.push(doppler)
        body = `${partes.join(', ')}.`
        const nat = limpa(String(g('natureza') ?? ''))
        conclusion = nat
          ? `Coleção${locConcl}, podendo corresponder a ${nat}. Correlacionar com dados clínicos.`
          : `Coleção${locConcl}, a esclarecer. Correlacionar com dados clínicos.`
        break
      }
      case 'linfonodo': {
        const partes = ['Linfonodo']
        if (g('eco')) partes.push(ECO[String(g('eco'))]!)
        if (contornos) partes.push(contornos)
        partes.push(`medindo ${medidas3(g('medidas'))}`, `situado ${planoLocal(st, p).replace(/^localizada /, '')}`)
        if (doppler) partes.push(doppler)
        body = `${partes.join(', ')}.`
        conclusion = `Linfonodo${locConcl}. Correlacionar com dados clínicos.`
        break
      }
      case 'corpo_estranho': {
        body = `Imagem linear hiperecoica com reverberação posterior, medindo aproximadamente ${medidaUnica(g('medidas'))}, ${planoLocal(st, p)}.`
        conclusion = `Imagem compatível com corpo estranho${locConcl}.`
        break
      }
      case 'hernia': {
        const parede = g('parede') ? `da ${limpa(String(g('parede')))}` : 'da parede'
        const partes = [`Solução de continuidade ${parede}${local ? ` ${local}` : ''}`, `medindo ${medidaUnica(g('medidas'))}`]
        if (g('conteudo_h')) partes.push(`com herniação de ${limpa(String(g('conteudo_h')))}`)
        if (g('reducao')) partes.push(limpa(String(g('reducao'))))
        body = `${partes.join(', ')}.`
        const th = g('tipo_h') ? `${limpa(String(g('tipo_h')))} ` : ''
        conclusion = `Hérnia ${th}${locConcl.trim()}.`.replace(/\s+/g, ' ')
        break
      }
      default:
        body = ASPECTOS_NORMAIS
        conclusion = CONCLUSAO_NORMAL
    }
    return { body, conclusion: [conclusion], isNormal: false }
  },
}

export const partesMoles: ExamCategory = {
  id: 'PARTES_MOLES',
  name: 'Partes Moles',
  title: 'ULTRASSONOGRAFIA DE PARTES MOLES',
  tecnica:
    'Exame realizado com transdutor de 12 MHz, abrangendo a região solicitada. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [{ id: 'partes_moles', label: 'Partes moles', group: 'orgaos', module: lesaoModule }],
  conclusionNormal: CONCLUSAO_NORMAL,
}
