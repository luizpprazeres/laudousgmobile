import type { ExamCategory } from './abdomeTotal'
import type { OrganComposition, OrganModule, OrganState } from '../types'

/**
 * Formulário da cervicometria ISOLADA.
 *
 * A versão complementar continua em `cervicometriaAddon.ts`, desligada por
 * padrão dentro das categorias obstétricas. Aqui não há o botão
 * "Acrescentar": escolher a categoria já significa que o exame é uma
 * cervicometria.
 */
const cervicometriaIsoladaModule: OrganModule = {
  schema: {
    id: 'cervicometria',
    name: 'Medida do colo uterino',
    category: 'CERVICOMETRIA',
    fields: [
      { key: 'colo_cm', label: 'Comprimento do colo OI–OE (cm)', kind: 'text', placeholder: '3,4' },
      {
        key: 'orificio',
        label: 'Orifício interno',
        kind: 'segmented',
        options: [
          { value: 'fechado', label: 'Fechado', isDefault: true },
          { value: 'aberto', label: 'Aberto' },
        ],
      },
      { key: 'placenta_cm', label: 'Distância da placenta ao OI (cm, opcional)', kind: 'text', placeholder: '4,2' },
      {
        key: 'placenta_distante',
        label: 'Placenta distante, sem medida',
        kind: 'segmented',
        options: [
          { value: 'nao', label: 'Não', isDefault: true },
          { value: 'sim', label: 'Sim' },
        ],
      },
      { key: 'ig_semanas', label: 'Idade gestacional (semanas, opcional)', kind: 'text', placeholder: '33' },
      {
        key: 'cerclagem',
        label: 'Cerclagem',
        kind: 'segmented',
        options: [
          { value: 'nao', label: 'Não', isDefault: true },
          { value: 'sim', label: 'Sim' },
        ],
      },
      { key: 'observacoes', label: 'Observação (opcional)', kind: 'text', placeholder: 'observação adicional' },
    ],
  },
  initialState: (): OrganState => ({
    colo_cm: '',
    orificio: 'fechado',
    placenta_cm: '',
    placenta_distante: 'nao',
    ig_semanas: '',
    cerclagem: 'nao',
    observacoes: '',
  }),
  /** A redação é exclusiva do renderer canônico. */
  compose: (): OrganComposition => ({ body: '', conclusion: [], isNormal: true }),
}

export const cervicometria: ExamCategory = {
  id: 'CERVICOMETRIA',
  name: 'Cervicometria',
  title: 'ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL',
  tecnica: '',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [{ id: 'cervicometria', label: 'Medida do colo', group: 'orgaos', module: cervicometriaIsoladaModule }],
  conclusionNormal: '',
}
