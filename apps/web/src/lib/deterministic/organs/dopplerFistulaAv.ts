import { DOPPLER_FISTULA_AV_REQUIRED, DOPPLER_FISTULA_AV_SEGMENTS, DOPPLER_FISTULA_AV_SEGMENT_LABELS } from '@laudousg/shared'
import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field } from '../types'
import { VASCULAR_MODEL_CONTROL, vascularModule, vascularNumber, vascularSelect } from './dopplerArterialMmii'

const CONFIRM = [['no', 'Pendente de confirmação'], ['yes', 'Confirmado pelo médico']] as const
const VEINS = new Set(['juxta_anastomotic_vein', 'draining_vein_puncture', 'draining_vein_proximal', 'central_outflow'])

function segmentSection(segment: typeof DOPPLER_FISTULA_AV_SEGMENTS[number]): ExamSection {
  const name = DOPPLER_FISTULA_AV_SEGMENT_LABELS[segment]
  const fields: Field[] = [
    vascularSelect('assessment', 'Avaliação', [['model', 'Conforme modelo'], ['not_assessed', 'Não avaliado'], ['evaluated', 'Avaliado'], ['limited', 'Avaliação limitada']]),
    vascularNumber('psv_cms', 'VPS (cm/s)', '250'),
    vascularNumber('diameter_mm', 'Calibre (mm)', '6,0'),
    ...(VEINS.has(segment) ? [vascularNumber('depth_mm', 'Profundidade (mm)', '4,0')] : []),
    ...(segment === 'distal_artery' ? [vascularSelect('flow_direction', 'Sentido do fluxo', [['not_assessed', 'Não informado'], ['anterograde', 'Anterógrado'], ['retrograde', 'Retrógrado']])] : []),
    { key: 'limitation', label: 'Limitação, quando houver', kind: 'text', placeholder: 'Descreva a limitação técnica' },
    {
      key: 'alteration', label: 'Alteração', kind: 'segmented', presentation: 'select', options: [
        { value: 'none', label: 'Nenhuma', isDefault: true },
        { value: 'stenosis', label: 'Aceleração focal / estenose', subFields: [
          vascularNumber('lesion_psv_cms', 'VPS na lesão (cm/s)', '450'),
          vascularNumber('reference_psv_cms', 'VPS de referência (cm/s)', '150'),
          vascularNumber('min_diameter_mm', 'Diâmetro luminal mínimo (mm)', '2,0'),
          vascularSelect('confirmed', 'Estenose', CONFIRM),
        ] },
        { value: 'thrombus', label: 'Material intraluminal / trombo', subFields: [
          vascularSelect('extent', 'Extensão', [['partial', 'Parcial'], ['occlusive', 'Oclusivo (sem fluxo)']]),
          vascularSelect('confirmed', 'Trombose', CONFIRM),
        ] },
        { value: 'no_flow', label: 'Fluxo não detectado' },
        { value: 'aneurysm', label: 'Dilatação focal', subFields: [
          vascularNumber('max_diameter_mm', 'Calibre máximo (mm)', '18'),
          vascularSelect('confirmed', 'Dilatação aneurismática', CONFIRM),
        ] },
      ],
    },
  ]
  return { id: segment, label: name, group: 'orgaos', module: vascularModule('DOPPLER_FISTULA_AV', segment, name, fields) }
}

const accessSection: ExamSection = {
  id: 'access', label: 'Acesso e volume de fluxo', group: 'orgaos',
  module: vascularModule('DOPPLER_FISTULA_AV', 'access', 'Acesso e volume de fluxo', [
    { key: 'access_other', label: 'Tipo de acesso (quando "outro")', kind: 'text', placeholder: 'Descreva a configuração' },
    vascularNumber('flow_volume_ml_min', 'Volume de fluxo (mL/min)', '850'),
    vascularSelect('flow_site', 'Local da medida', [['feeding_artery', 'Artéria nutridora'], ['draining_vein', 'Veia de drenagem']]),
    vascularSelect('flow_classification', 'Classificação do volume', [['not_classified', 'Não classificar'], ['low', 'Reduzido'], ['high', 'Elevado']]),
    vascularSelect('flow_confirmed', 'Classificação do volume', CONFIRM),
  ]),
}

const sections: ExamSection[] = [accessSection, ...DOPPLER_FISTULA_AV_SEGMENTS.map(segmentSection)]

export const dopplerFistulaAv: ExamCategory = {
  id: 'DOPPLER_FISTULA_AV',
  name: 'Doppler de fístula AV',
  title: 'ULTRASSONOGRAFIA COM DOPPLER DE FÍSTULA ARTERIOVENOSA', tecnica: '', achadosHeader: '', conclusionNormal: '', sections,
  controls: [
    VASCULAR_MODEL_CONTROL,
    vascularSelect('side', 'Membro', [['left', 'Superior esquerdo'], ['right', 'Superior direito']]),
    vascularSelect('access_type', 'Tipo de acesso', [['radiocephalic', 'Radiocefálica'], ['brachiocephalic', 'Braquiocefálica'], ['brachiobasilic', 'Braquiobasílica'], ['graft', 'Prótese'], ['other', 'Outro']]),
    vascularSelect('optional_segments', 'Segmentos complementares', [['hide', 'Ocultar'], ['show', 'Mostrar']]),
  ],
  resolveSections: opts => sections.filter(section =>
    section.id === 'access' || DOPPLER_FISTULA_AV_REQUIRED.includes(section.id as typeof DOPPLER_FISTULA_AV_SEGMENTS[number]) || opts.optional_segments === 'show'),
}
