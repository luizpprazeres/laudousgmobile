import { DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES, DOPPLER_ARTERIAS_TEMPORAIS_BRANCH_LABELS } from '@laudousg/shared'
import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field } from '../types'
import { arterialSectionId, VASCULAR_MODEL_CONTROL, vascularModule, vascularNumber, vascularSelect, type VascularWebSide } from './dopplerArterialMmii'

const CATEGORY = 'DOPPLER_ARTERIAS_TEMPORAIS'
export const temporalSectionId = arterialSectionId

function branchSection(side: VascularWebSide, branch: typeof DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES[number]): ExamSection {
  const id = temporalSectionId(side, branch)
  const label = DOPPLER_ARTERIAS_TEMPORAIS_BRANCH_LABELS[branch]
  const name = `${label.charAt(0).toUpperCase()}${label.slice(1)} · ${side === 'right' ? 'direita' : 'esquerda'}`
  const fields: Field[] = [
    vascularSelect('assessment', 'Avaliação', [['model', 'Conforme modelo'], ['not_assessed', 'Não avaliado'], ['evaluated', 'Avaliado'], ['limited', 'Avaliação limitada']]),
    vascularSelect('flow', 'Fluxo', [['model', 'Conforme modelo'], ['detected', 'Detectável'], ['not_detected', 'Não detectado'], ['not_assessed', 'Não informado']]),
    vascularSelect('halo', 'Halo parietal', [['model', 'Conforme modelo'], ['absent', 'Ausente'], ['present', 'Presente'], ['indeterminate', 'Indeterminado'], ['not_assessed', 'Não pesquisado']]),
    vascularSelect('compression', 'Sinal de compressão', [['not_tested', 'Não testado'], ['negative', 'Negativo'], ['positive', 'Positivo']]),
    vascularNumber('wall_mm', 'Espessura parietal (mm)', '0,3'),
    vascularNumber('psv_cms', 'VPS (cm/s)', '40'),
    { key: 'limitation', label: 'Limitação, quando houver', kind: 'text', placeholder: 'Descreva a limitação técnica' },
  ]
  return { id, label: name, group: 'orgaos', module: vascularModule(CATEGORY, id, name, fields) }
}

const contextSection: ExamSection = {
  id: 'context', label: 'Contexto e hipótese diagnóstica', group: 'orgaos',
  module: vascularModule(CATEGORY, 'context', 'Contexto e hipótese diagnóstica', [
    vascularSelect('corticosteroid', 'Uso prévio de corticoide', [['not_informed', 'Não informado'], ['no', 'Não'], ['yes', 'Sim']]),
    vascularNumber('corticosteroid_days', 'Tempo de uso (dias)', '7'),
    vascularSelect('hypothesis', 'Hipótese de arterite na conclusão', [['no', 'Não incluir'], ['include', 'Incluir']]),
    vascularSelect('hypothesis_confirmed', 'Confirmação médica da hipótese', [['no', 'Pendente de confirmação'], ['yes', 'Confirmada pelo médico']]),
  ]),
}

const sections: ExamSection[] = [
  ...(['right', 'left'] as const).flatMap(side => DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES.map(branch => branchSection(side, branch))),
  contextSection,
]

export const dopplerArteriasTemporais: ExamCategory = {
  id: CATEGORY,
  name: 'Doppler de artérias temporais',
  title: 'ULTRASSONOGRAFIA COM DOPPLER DAS ARTÉRIAS TEMPORAIS SUPERFICIAIS', tecnica: '', achadosHeader: '', conclusionNormal: '', sections,
  controls: [
    VASCULAR_MODEL_CONTROL,
    vascularSelect('laterality', 'Lateralidade', [['bilateral', 'Bilateral'], ['right', 'Direita'], ['left', 'Esquerda']]),
  ],
  resolveSections: opts => sections.filter(section => {
    if (section.id === 'context') return true
    const side = section.id.startsWith('right_') ? 'right' : 'left'
    return !opts.laterality || opts.laterality === 'bilateral' || opts.laterality === side
  }),
}
