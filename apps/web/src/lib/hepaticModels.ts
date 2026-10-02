import {
  HEPATIC_CONTRACT_VERSION,
  type HepaticAssessment,
  type HepaticInterpretationConfirmation,
  type HepaticModuleKey,
} from '@laudousg/shared'
import type { HepaticMethod, HepaticQualityConfiguration } from './hepaticAssessmentWorkspace'

export const HEPATIC_WEB_MODELS = [
  { id: 'AVALIACAO_MULTIPARAMETRICA_HEPATICA', name: 'Avaliação multiparamétrica hepática', purpose: 'multiparametric' },
  { id: 'ELASTOGRAFIA_HEPATICA', name: 'Elastografia hepática', purpose: 'elastography' },
] as const

export type HepaticWebModelCode = typeof HEPATIC_WEB_MODELS[number]['id']

/** Gate independente e fail-closed. Ausente ou diferente de `true` mantém tudo invisível. */
export const HEPATIC_WEB_MODELS_ENABLED = process.env.NEXT_PUBLIC_HEPATIC_MODELS_V1 === 'true'

export function isHepaticWebModel(value: string): value is HepaticWebModelCode {
  return HEPATIC_WEB_MODELS_ENABLED && HEPATIC_WEB_MODELS.some((entry) => entry.id === value)
}

export function hepaticModelName(value: HepaticWebModelCode) {
  return HEPATIC_WEB_MODELS.find((entry) => entry.id === value)?.name ?? value
}

export function createInitialHepaticAssessment(category: HepaticWebModelCode, examId = crypto.randomUUID()): HepaticAssessment {
  const purpose = HEPATIC_WEB_MODELS.find((entry) => entry.id === category)?.purpose
  if (!purpose) throw new Error('Categoria hepática desconhecida.')
  return {
    contractVersion: HEPATIC_CONTRACT_VERSION,
    examId,
    revision: 0,
    purpose,
    modules: {
      fat: { status: 'not_performed', measurements: [], derived: [] },
      stiffness: { status: 'not_performed', measurements: [], derived: [] },
    },
  }
}

type Reference = HepaticInterpretationConfirmation['reference']
export type HepaticWorkspaceConfiguration = Record<HepaticModuleKey, {
  measurementReference: Reference
  interpretationReference: Reference
  protocolReference: Reference
  qualityByMethod: Partial<Record<HepaticMethod, HepaticQualityConfiguration>>
}>

/**
 * Proveniência de entrada e revisão não é uma diretriz clínica. Critérios de
 * qualidade ficam vazios até existir um registro aprovado por equipamento.
 */
const manualEntry: Reference = { id: 'web-manual-entry', version: 'v1', citation: 'Valor informado manualmente pelo médico' }
const physicianReview: Reference = { id: 'physician-review', version: 'v1', citation: 'Interpretação confirmada pelo médico responsável' }
const documentedProtocol: Reference = { id: 'documented-protocol', version: 'v1', citation: 'Protocolo de aquisição documentado pelo médico' }

export const HEPATIC_WORKSPACE_CONFIGURATION: HepaticWorkspaceConfiguration = {
  fat: { measurementReference: manualEntry, interpretationReference: physicianReview, protocolReference: documentedProtocol, qualityByMethod: {} },
  stiffness: { measurementReference: manualEntry, interpretationReference: physicianReview, protocolReference: documentedProtocol, qualityByMethod: {} },
}

export function hasApprovedHepaticQualityConfiguration(configuration: HepaticWorkspaceConfiguration) {
  return Object.values(configuration).some((module) => Object.keys(module.qualityByMethod).length > 0)
}

export const HEPATIC_INTEGRATED_INTERPRETATION_REFERENCE = physicianReview
