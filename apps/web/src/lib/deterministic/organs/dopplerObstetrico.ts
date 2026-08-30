import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState } from '../types'
import { criarCervicometriaAddonModule } from './cervicometriaAddon'

const MEDIDAS: Field[] = [
  { key: 'ir_ut_dir', label: 'IR uterina direita', kind: 'text', placeholder: '0,59' },
  { key: 'ip_ut_dir', label: 'IP uterina direita', kind: 'text', placeholder: '0,59' },
  { key: 'ir_ut_esq', label: 'IR uterina esquerda', kind: 'text', placeholder: '0,59' },
  { key: 'ip_ut_esq', label: 'IP uterina esquerda', kind: 'text', placeholder: '0,59' },
  { key: 'ip_ut_medio', label: 'IP médio das uterinas (opcional)', kind: 'text', placeholder: '0,59' },
  { key: 'ir_umb', label: 'IR artéria umbilical', kind: 'text', placeholder: '0,58' },
  { key: 'ip_umb', label: 'IP artéria umbilical', kind: 'text', placeholder: '1,00' },
  { key: 'ir_acm', label: 'IR artéria cerebral média', kind: 'text', placeholder: '0,81' },
  { key: 'ip_acm', label: 'IP artéria cerebral média', kind: 'text', placeholder: '1,80' },
  { key: 'ir_dv', label: 'IR ducto venoso', kind: 'text', placeholder: '0,40' },
  { key: 'ip_dv', label: 'IP ducto venoso', kind: 'text', placeholder: '1,89' },
  { key: 'rcp', label: 'Relação cérebro-placentária (opcional)', kind: 'text', placeholder: '1,25' },
  { key: 'perfil', label: 'Perfil hemodinâmico (opcional)', kind: 'text', placeholder: '0,80' },
  {
    key: 'incisura', label: 'Incisuras uterinas', kind: 'segmented',
    options: [{ value: 'ausente', label: 'Ausentes', isDefault: true }, { value: 'presente', label: 'Presentes' }],
  },
  {
    key: 'centralizacao', label: 'Centralização', kind: 'segmented',
    options: [
      { value: 'ausente', label: 'Ausente', isDefault: true },
      { value: 'pre', label: 'Pré-centralização' },
      { value: 'presente', label: 'Centralização' },
    ],
  },
  {
    key: 'umbilical', label: 'Artéria umbilical', kind: 'segmented',
    options: [{ value: 'normal', label: 'Normal', isDefault: true }, { value: 'alterada', label: 'Alterada' }],
  },
  {
    key: 'acm', label: 'Artéria cerebral média', kind: 'segmented',
    options: [{ value: 'normal', label: 'Normal', isDefault: true }, { value: 'alterada', label: 'Alterada' }],
  },
]

const DEFAULTS: OrganState = {
  ir_ut_dir: '', ip_ut_dir: '', ir_ut_esq: '', ip_ut_esq: '', ip_ut_medio: '',
  ir_umb: '', ip_umb: '', ir_acm: '', ip_acm: '', ir_dv: '', ip_dv: '',
  rcp: '', perfil: '', incisura: 'ausente', centralizacao: 'ausente',
  umbilical: 'normal', acm: 'normal',
}

export function criarDopplerAddonModule(category: string): OrganModule {
  return {
    schema: {
      id: 'doppler',
      name: 'Doppler obstétrico',
      category,
      fields: [{
        key: 'realizado', label: 'Acrescentar Doppler ao laudo?', kind: 'segmented',
        options: [
          { value: 'nao', label: 'Não', isDefault: true },
          { value: 'sim', label: 'Sim', subFields: MEDIDAS },
        ],
      }],
    },
    initialState: () => ({
      realizado: 'nao',
      ...Object.fromEntries(
        Object.entries(DEFAULTS).map(([key, value]) => [`realizado.sim.${key}`, value]),
      ),
    }),
    compose: (): OrganComposition => ({ body: '', conclusion: [], isNormal: true }),
  }
}

const dopplerIsoladoModule: OrganModule = {
  schema: { id: 'doppler', name: 'Doppler obstétrico', category: 'DOPPLER_OBSTETRICO', fields: MEDIDAS },
  initialState: () => ({ ...DEFAULTS }),
  compose: (): OrganComposition => ({ body: '', conclusion: [], isNormal: true }),
}
const cervicometriaModule = criarCervicometriaAddonModule('DOPPLER_OBSTETRICO')

export const dopplerObstetrico: ExamCategory = {
  id: 'DOPPLER_OBSTETRICO',
  name: 'Doppler obstétrico',
  title: 'DOPPLERVELOCIMETRIA OBSTÉTRICA',
  tecnica: 'Avaliação das artérias maternas e fetais por Doppler pulsado e colorido.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'doppler', label: 'Índices Doppler', group: 'orgaos', module: dopplerIsoladoModule },
    { id: 'cervicometria', label: 'Cervicometria', group: 'orgaos', module: cervicometriaModule },
  ],
  conclusionNormal: 'Dados Doppler insuficientes para conclusão hemodinâmica.',
}
