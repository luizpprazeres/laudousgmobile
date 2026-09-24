import type { ExamCategory } from './abdomeTotal'
import type { OrganComposition, OrganModule } from '../types'
import { createSharedBladderModule, createSharedKidneyModule } from './urinaryShared'

const limpa = (value: string): string => value.trim().replace(/\.+$/, '')

const ureteresModule: OrganModule = {
  schema: {
    id: 'ureteres',
    name: 'Ureteres',
    category: 'VIAS_URINARIAS',
    fields: [{
      key: 'dilatacao',
      label: 'Dilatação ureteral',
      kind: 'segmented',
      presentation: 'select',
      hint: 'default: ausente',
      options: [
        { value: 'nao', label: 'Ausente', isDefault: true },
        { value: 'sim', label: 'Presente', subFields: [{ key: 'desc', label: 'Lado / grau', kind: 'text', placeholder: 'ureter direito dilatado…' }] },
      ],
    }],
  },
  initialState: () => ({ dilatacao: 'nao', 'dilatacao.sim.desc': '' }),
  compose: (state): OrganComposition => {
    if (state.dilatacao === 'sim') {
      const description = limpa(String(state['dilatacao.sim.desc'] ?? ''))
      return {
        body: description ? `${description}.` : 'Dilatação ureteral.',
        conclusion: [description ? `Dilatação ureteral (${description}).` : 'Dilatação ureteral.'],
        isNormal: false,
      }
    }
    return { body: '', conclusion: ['Não há sinais de dilatação ureteral.'], isNormal: true }
  },
}

export const viasUrinarias: ExamCategory = {
  id: 'VIAS_URINARIAS',
  name: 'Vias Urinárias',
  title: 'ULTRASSONOGRAFIA DAS VIAS URINÁRIAS',
  tecnica:
    'Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes dos rins, em decúbito dorsal e ventral. Após repleção vesical foram realizados cortes da pelve com o paciente em decúbito dorsal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'rim_direito', label: 'Rim direito', group: 'orgaos', module: createSharedKidneyModule('VIAS_URINARIAS', 'direito') },
    { id: 'rim_esquerdo', label: 'Rim esquerdo', group: 'orgaos', module: createSharedKidneyModule('VIAS_URINARIAS', 'esquerdo') },
    { id: 'ureteres', label: 'Ureteres', group: 'orgaos', module: ureteresModule },
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: createSharedBladderModule('VIAS_URINARIAS') },
  ],
  conclusionNormal: 'Exame ultrassonográfico das vias urinárias dentro dos limites da normalidade.',
}
