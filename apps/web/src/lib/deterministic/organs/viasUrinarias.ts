import type { ExamCategory } from './abdomeTotal'
import { createSharedBladderModule, createSharedKidneyModule } from './urinaryShared'

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
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: createSharedBladderModule('VIAS_URINARIAS') },
  ],
  conclusionNormal: 'Exame ultrassonográfico das vias urinárias dentro dos limites da normalidade.',
}
