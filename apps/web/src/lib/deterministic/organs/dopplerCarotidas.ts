import type { ExamCategory } from './abdomeTotal'
import type { OrganModule, OrganState } from '../types'

function sideModule(id: 'direita' | 'esquerda'): OrganModule {
  return {
    schema: { id, name: id === 'direita' ? 'Lado direito' : 'Lado esquerdo', category: 'DOPPLER_CAROTIDAS', fields: [] },
    initialState: (): OrganState => ({
      emi: '', comum_vps: '', comum_vdf: '', interna_vps: '', interna_vdf: '',
      externa_vps: '', externa_vdf: '', vertebral_vps: '', vertebral_direcao: 'anterogrado',
      placas_ids: [],
    }),
    compose: () => ({ body: '', conclusion: [], isNormal: true }),
  }
}

const conclusionModule: OrganModule = {
  schema: { id: 'conclusao', name: 'Conclusão', category: 'DOPPLER_CAROTIDAS', fields: [] },
  initialState: (): OrganState => ({ classificacao: 'normal', lado: '', conclusao_livre: '', achados_adicionais: '' }),
  compose: () => ({ body: '', conclusion: [], isNormal: true }),
}

export const dopplerCarotidas: ExamCategory = {
  id: 'DOPPLER_CAROTIDAS',
  name: 'Doppler de carótidas e vertebrais',
  title: 'ULTRASSONOGRAFIA DOPPLER DE CARÓTIDAS E VERTEBRAIS',
  tecnica: '',
  achadosHeader: '',
  sections: [
    { id: 'direita', label: 'Lado direito', group: 'orgaos', module: sideModule('direita') },
    { id: 'esquerda', label: 'Lado esquerdo', group: 'orgaos', module: sideModule('esquerda') },
    { id: 'conclusao', label: 'Conclusão', group: 'conclusao', module: conclusionModule },
  ],
  conclusionNormal: '',
}
