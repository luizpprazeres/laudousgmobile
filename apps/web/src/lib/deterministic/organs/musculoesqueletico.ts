/**
 * Categoria MUSCULOESQUELÉTICO — geração determinística (8 segmentos).
 *
 * Fonte: apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts (roteiro V2)
 * + doutrina MSK ([[doutrina-msk]]): descrever TODAS as estruturas do roteiro no
 * corpo (normais com frase canônica); CORPO = morfologia, CONCLUSÃO = diagnóstico
 * (nunca diagnóstico no corpo nem cópia do corpo na conclusão); nomenclatura
 * normalizada (polia A2, artrose→alterações degenerativas).
 *
 * Um único exame = um segmento (seletor) + lado. As seções (estruturas) trocam
 * conforme o segmento via resolveSections.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { OrganModule, OrganState, OrganComposition } from '../types'

const TECNICA =
  'Exame realizado com transdutor linear de alta frequência (12 MHz), mediante múltiplos cortes longitudinais e transversais do segmento avaliado, com avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

function normalizeNomenclatura(s: string): string {
  return s
    .replace(/\bpolias?\s+a\s*(\d)/gi, (_m, n) => `polia A${n}`)
    .replace(/\bartrose\b/gi, 'alterações degenerativas')
}
function limpa(s: string): string {
  return s.trim().replace(/\.+$/, '')
}
function frase(s: string): string {
  const t = limpa(s)
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : ''
}

type Estrutura = { id: string; label: string; normal: string }
type SegmentoDef = { titulo: string; label: string; estruturas: Estrutura[] }

const SEGMENTOS: Record<string, SegmentoDef> = {
  ombro: {
    titulo: 'DO OMBRO',
    label: 'Ombro',
    estruturas: [
      { id: 'supraespinhal', label: 'Supraespinhal', normal: 'Tendão supraespinhal de espessura, continuidade e ecotextura preservadas.' },
      { id: 'infraespinhal', label: 'Infraespinhal', normal: 'Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.' },
      { id: 'subescapular', label: 'Subescapular', normal: 'Tendão subescapular de espessura, continuidade e ecotextura preservadas.' },
      { id: 'biceps', label: 'Cabo longo do bíceps', normal: 'Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.' },
      { id: 'bursa', label: 'Bursa SASD', normal: 'Bursa subacromial-subdeltoidea sem distensão.' },
      { id: 'acromioclavicular', label: 'Acromioclavicular', normal: 'Articulação acromioclavicular de aspecto preservado.' },
      { id: 'derrame', label: 'Derrame', normal: 'Não há sinais de derrame articular significativo.' },
    ],
  },
  joelho: {
    titulo: 'DO JOELHO',
    label: 'Joelho',
    estruturas: [
      { id: 'quadricipital', label: 'Quadricipital', normal: 'Tendão quadricipital de espessura, continuidade e ecotextura preservadas.' },
      { id: 'patelar', label: 'Patelar', normal: 'Tendão patelar de espessura, continuidade e ecotextura preservadas.' },
      { id: 'pata_de_ganso', label: 'Pata de ganso', normal: 'Tendões da pata de ganso de espessura e ecotextura preservadas.' },
      { id: 'derrame', label: 'Derrame', normal: 'Ausência de derrame articular significativo.' },
      { id: 'baker', label: 'Cisto de Baker', normal: 'Fossa poplítea sem coleções ou cisto de Baker.' },
      { id: 'partes_moles', label: 'Partes moles', normal: 'Planos musculares e subcutâneos avaliados sem alterações relevantes.' },
    ],
  },
  pe: {
    titulo: 'DO PÉ',
    label: 'Pé',
    estruturas: [
      { id: 'fascia_plantar', label: 'Fáscia plantar', normal: 'Fáscia plantar com espessura e ecotextura preservadas.' },
      { id: 'tendoes', label: 'Tendões', normal: 'Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.' },
      { id: 'geral', label: 'Geral', normal: 'Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.' },
    ],
  },
  mao: {
    titulo: 'DA MÃO',
    label: 'Mão',
    estruturas: [
      { id: 'flexores_extensores', label: 'Flexores/extensores', normal: 'Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.' },
      { id: 'polias', label: 'Polias', normal: 'Polias digitais sem espessamento sinovial.' },
      { id: 'geral', label: 'Geral', normal: 'Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas no segmento avaliado.' },
    ],
  },
  punho: {
    titulo: 'DO PUNHO',
    label: 'Punho',
    estruturas: [
      { id: 'flexores', label: 'Flexores', normal: 'Tendões flexores e retináculo dos flexores de aspecto preservado.' },
      { id: 'extensores', label: 'Extensores', normal: 'Compartimentos extensores de aspecto preservado.' },
      { id: 'nervo_mediano', label: 'Nervo mediano', normal: 'Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo.' },
      { id: 'geral', label: 'Geral', normal: 'Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.' },
    ],
  },
  cotovelo: {
    titulo: 'DO COTOVELO',
    label: 'Cotovelo',
    estruturas: [
      { id: 'extensores', label: 'Extensores (epicôndilo lat.)', normal: 'Tendões extensores comuns (epicôndilo lateral) de espessura e ecotextura preservadas.' },
      { id: 'flexores', label: 'Flexores (epicôndilo med.)', normal: 'Tendões flexores comuns (epicôndilo medial) de espessura e ecotextura preservadas.' },
      { id: 'biceps_triceps', label: 'Bíceps/tríceps distais', normal: 'Tendões distais do bíceps e do tríceps de aspecto preservado.' },
      { id: 'derrame', label: 'Derrame', normal: 'Ausência de derrame articular ou coleções.' },
    ],
  },
  tornozelo: {
    titulo: 'DO TORNOZELO',
    label: 'Tornozelo',
    estruturas: [
      { id: 'aquiles', label: 'Aquiles', normal: 'Tendão calcâneo (de Aquiles) de espessura, continuidade e ecotextura preservadas.' },
      { id: 'tibial_posterior', label: 'Tibial posterior', normal: 'Tendão tibial posterior de espessura e ecotextura preservadas.' },
      { id: 'fibulares', label: 'Fibulares', normal: 'Tendões fibulares de espessura e ecotextura preservadas.' },
      { id: 'tibial_anterior', label: 'Tibial anterior', normal: 'Tendão tibial anterior de espessura e ecotextura preservadas.' },
      { id: 'recesso', label: 'Recesso tibiotalar', normal: 'Recesso articular tibiotalar sem coleções ou derrame.' },
      { id: 'geral', label: 'Geral', normal: 'Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.' },
    ],
  },
  quadril: {
    titulo: 'DO QUADRIL',
    label: 'Quadril',
    estruturas: [
      { id: 'coxofemoral', label: 'Coxofemoral', normal: 'Articulação coxofemoral sem derrame ou coleções.' },
      { id: 'gluteos', label: 'Glúteos', normal: 'Tendões glúteo médio e mínimo de espessura e ecotextura preservadas.' },
      { id: 'bursa_trocanterica', label: 'Bursa trocantérica', normal: 'Bursa trocantérica sem distensão.' },
      { id: 'iliopsoas', label: 'Iliopsoas', normal: 'Tendão iliopsoas de aspecto preservado.' },
    ],
  },
}

function makeEstruturaModule(sectionId: string, est: Estrutura): OrganModule {
  return {
    schema: {
      id: sectionId,
      name: est.label,
      category: 'MUSCULOESQUELETICO',
      fields: [
        {
          key: 'estado',
          label: est.label,
          kind: 'segmented',
          hint: 'default: normal',
          options: [
            { value: 'normal', label: 'Normal', isDefault: true },
            {
              value: 'alterado',
              label: 'Alterado',
              subFields: [
                { key: 'corpo', label: 'Descrição (achado)', kind: 'text', placeholder: 'espessamento com perda do padrão fibrilar, sem rotura' },
                { key: 'diag', label: 'Diagnóstico (conclusão)', kind: 'text', placeholder: 'Tendinopatia' },
              ],
            },
          ],
        },
      ],
    },
    initialState: (): OrganState => ({ estado: 'normal', 'estado.alterado.corpo': '', 'estado.alterado.diag': '' }),
    compose: (st): OrganComposition => {
      if ((st.estado as string) !== 'alterado') {
        return { body: est.normal, conclusion: [], isNormal: true }
      }
      const corpo = frase(normalizeNomenclatura(String(st['estado.alterado.corpo'] ?? '')))
      const diag = frase(normalizeNomenclatura(String(st['estado.alterado.diag'] ?? '')))
      return { body: corpo || est.normal, conclusion: diag ? [diag] : [], isNormal: false }
    },
  }
}

const SEG_KEYS = Object.keys(SEGMENTOS)
function segDe(opts?: OrganState): string {
  const s = String(opts?.segmento ?? 'ombro')
  return SEGMENTOS[s] ? s : 'ombro'
}
function ladoDe(opts?: OrganState): string {
  return String(opts?.lado ?? 'direito') === 'esquerdo' ? 'esquerdo' : 'direito'
}

// UNIÃO de todas as seções (ids prefixados pelo segmento); resolveSections filtra.
const ALL_SECTIONS: ExamSection[] = SEG_KEYS.flatMap((seg) =>
  SEGMENTOS[seg]!.estruturas.map((e) => {
    const id = `${seg}__${e.id}`
    return { id, label: e.label, group: 'orgaos' as const, module: makeEstruturaModule(id, e) }
  }),
)

export const musculoesqueletico: ExamCategory = {
  id: 'MUSCULOESQUELETICO',
  name: 'Musculoesquelético',
  title: 'ULTRASSONOGRAFIA DO OMBRO DIREITO',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    {
      key: 'segmento',
      label: 'Segmento',
      kind: 'segmented',
      options: SEG_KEYS.map((s, i) => ({ value: s, label: SEGMENTOS[s]!.label, ...(i === 0 ? { isDefault: true } : {}) })),
    },
    {
      key: 'lado',
      label: 'Lado',
      kind: 'segmented',
      options: [
        { value: 'direito', label: 'Direito', isDefault: true },
        { value: 'esquerdo', label: 'Esquerdo' },
      ],
    },
  ],
  resolveTitle: (opts) => `ULTRASSONOGRAFIA ${SEGMENTOS[segDe(opts)]!.titulo} ${ladoDe(opts).toUpperCase()}`,
  resolveSections: (opts) => {
    const seg = segDe(opts)
    return ALL_SECTIONS.filter((s) => s.id.startsWith(`${seg}__`))
  },
  sections: ALL_SECTIONS,
  conclusionNormal: 'Exame ultrassonográfico do segmento avaliado sem alterações ecográficas relevantes.',
}
