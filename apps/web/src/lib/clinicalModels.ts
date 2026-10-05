import {
  CLINICAL_MODEL_CODES,
  isClinicalModelCode,
  type ClinicalModelCode,
} from '@laudousg/shared'

export const CLINICAL_WEB_MODELS = [
  { id: 'ABDOMEN_TOTAL_DOPPLER', name: 'Abdome total com Doppler', family: 'Medicina interna' },
  { id: 'DOPPLER_VENOSO_MMSS', name: 'Doppler venoso MMSS', family: 'Vascular' },
  { id: 'DOPPLER_ARTERIAL_MMSS', name: 'Doppler arterial MMSS', family: 'Vascular' },
  { id: 'TORAX', name: 'Ultrassonografia de tórax', family: 'Medicina interna' },
  { id: 'QUADRIL_INFANTIL', name: 'Quadril infantil', family: 'Outros exames' },
] as const satisfies ReadonlyArray<{ id: ClinicalModelCode; name: string; family: string }>

if (CLINICAL_WEB_MODELS.some((entry) => !CLINICAL_MODEL_CODES.includes(entry.id))) {
  throw new Error('Catálogo Web divergente do contrato compartilhado dos novos modelos clínicos.')
}

export function isClinicalWebModel(value: string): value is ClinicalModelCode {
  return isClinicalModelCode(value)
}

export function clinicalModelName(value: ClinicalModelCode) {
  return CLINICAL_WEB_MODELS.find((entry) => entry.id === value)?.name ?? value
}
