import { comentariosPadrao } from '@laudousg/schemes'
import type { ExamCategory } from './abdomeTotal'
import { createSharedBladderModule, createSharedKidneyModule } from './urinaryShared'

export const viasUrinarias: ExamCategory = {
  id: 'VIAS_URINARIAS',
  name: 'Vias Urinárias',
  title: 'ULTRASSONOGRAFIA DAS VIAS URINÁRIAS',
  tecnica:
    comentariosPadrao('VIAS_URINARIAS')!,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'rim_direito', label: 'Rim direito', group: 'orgaos', module: createSharedKidneyModule('VIAS_URINARIAS', 'direito') },
    { id: 'rim_esquerdo', label: 'Rim esquerdo', group: 'orgaos', module: createSharedKidneyModule('VIAS_URINARIAS', 'esquerdo') },
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: createSharedBladderModule('VIAS_URINARIAS') },
  ],
  conclusionNormal: 'Exame ultrassonográfico das vias urinárias dentro dos limites da normalidade.',
}
