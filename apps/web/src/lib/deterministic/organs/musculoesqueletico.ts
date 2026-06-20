/**
 * Categoria MUSCULOESQUELÉTICO (piloto: OMBRO) — geração determinística.
 *
 * Fonte: apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts (roteiro V2)
 * + doutrina MSK ([[doutrina-msk]]): descrever TODAS as estruturas do roteiro no
 * corpo (normais com frase canônica); CORPO = morfologia, CONCLUSÃO = diagnóstico
 * (nunca diagnóstico no corpo nem cópia do corpo na conclusão); nomenclatura
 * normalizada (polia A2, quirodáctilo, artrose→alterações degenerativas).
 *
 * Piloto = ombro (rotator cuff, o MSK mais comum). Os demais segmentos do roteiro
 * (joelho/pé/mão/punho/cotovelo/tornozelo/quadril) seguem o mesmo padrão.
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganModule, OrganState, OrganComposition } from '../types'

const TECNICA =
  'Exame realizado com transdutor linear de alta frequência (12 MHz), mediante múltiplos cortes longitudinais e transversais do segmento avaliado, com avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

/** Normalização de nomenclatura MSK (Dr. Domingos) — espelha o renderer. */
function normalizeNomenclatura(s: string): string {
  return s
    .replace(/\bpolias?\s+a\s*(\d)/gi, (_m, n) => `polia A${n}`)
    .replace(/\bartrose\b/gi, 'alterações degenerativas')
}
function limpa(s: string): string {
  return s.trim().replace(/\.+$/, '')
}

// Estrutura do roteiro do ombro: chave, label, frase normal canônica.
const OMBRO_ESTRUTURAS: { id: string; label: string; normal: string }[] = [
  { id: 'supraespinhal', label: 'Supraespinhal', normal: 'Tendão supraespinhal de espessura, continuidade e ecotextura preservadas.' },
  { id: 'infraespinhal', label: 'Infraespinhal', normal: 'Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.' },
  { id: 'subescapular', label: 'Subescapular', normal: 'Tendão subescapular de espessura, continuidade e ecotextura preservadas.' },
  { id: 'biceps', label: 'Cabo longo do bíceps', normal: 'Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.' },
  { id: 'bursa', label: 'Bursa SASD', normal: 'Bursa subacromial-subdeltoidea sem distensão.' },
  { id: 'acromioclavicular', label: 'Acromioclavicular', normal: 'Articulação acromioclavicular de aspecto preservado.' },
  { id: 'derrame', label: 'Derrame', normal: 'Não há sinais de derrame articular significativo.' },
]

function makeEstruturaModule(est: { id: string; label: string; normal: string }): OrganModule {
  return {
    schema: {
      id: est.id,
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
                { key: 'corpo', label: 'Descrição (achado)', kind: 'text', placeholder: 'tendinopatia, com espessamento e perda do padrão fibrilar' },
                { key: 'diag', label: 'Diagnóstico (conclusão)', kind: 'text', placeholder: 'Tendinopatia do supraespinhal' },
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
      const corpo = limpa(normalizeNomenclatura(String(st['estado.alterado.corpo'] ?? '')))
      const diag = limpa(normalizeNomenclatura(String(st['estado.alterado.diag'] ?? '')))
      return {
        body: corpo ? `${corpo.charAt(0).toUpperCase()}${corpo.slice(1)}.` : est.normal,
        conclusion: diag ? [`${diag.charAt(0).toUpperCase()}${diag.slice(1)}.`] : [],
        isNormal: false,
      }
    },
  }
}

const LADO_TITULO: Record<string, string> = {
  direito: 'ULTRASSONOGRAFIA DO OMBRO DIREITO',
  esquerdo: 'ULTRASSONOGRAFIA DO OMBRO ESQUERDO',
}
function ladoDe(opts?: OrganState): string {
  const l = String(opts?.lado ?? 'direito')
  return LADO_TITULO[l] ? l : 'direito'
}

export const musculoesqueletico: ExamCategory = {
  id: 'MUSCULOESQUELETICO',
  name: 'Musculoesquelético (Ombro)',
  title: 'ULTRASSONOGRAFIA DO OMBRO DIREITO',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
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
  resolveTitle: (opts) => LADO_TITULO[ladoDe(opts)] ?? LADO_TITULO.direito,
  sections: OMBRO_ESTRUTURAS.map((e) => ({
    id: e.id,
    label: e.label,
    group: 'orgaos' as const,
    module: makeEstruturaModule(e),
  })),
  // Doutrina: quando tudo normal, fechamento sintético de normalidade.
  conclusionNormal: 'Ombro sem alterações ecográficas relevantes.',
}
