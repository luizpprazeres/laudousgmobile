/**
 * Categoria ABDOME SUPERIOR — geração determinística.
 *
 * Clinicamente compartilha os órgãos do abdome total, exceto rins/bexiga: fígado,
 * vesícula, vias biliares, pâncreas, baço. REUSA os módulos já validados do abdome
 * (organs/figado, vesicula, viasBiliares, pancreas, baco) — mesma redação. Só muda
 * o título e a técnica (jejum, sem repleção vesical).
 *
 * Fonte: apps/api/src/server/renderer/categories/ABDOMEN_SUPERIOR.ts.
 */

import type { ExamCategory } from './abdomeTotal'
import { bacoModule } from './baco'
import { figadoModule } from './figado'
import { pancreasModule } from './pancreas'
import { vesiculaModule } from './vesicula'
import { viasBiliaresModule } from './viasBiliares'

export const abdomeSuperior: ExamCategory = {
  id: 'ABDOMEN_SUPERIOR',
  name: 'Abdome Superior',
  title: 'ULTRASSONOGRAFIA DO ABDOME SUPERIOR',
  tecnica:
    'Exame realizado com transdutor convexo de 4.0 MHz, com o paciente em jejum, mediante múltiplos cortes do andar superior do abdome em decúbito dorsal e laterais. Documentação fotográfica conforme protocolo.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'figado', label: 'Fígado', group: 'orgaos', module: figadoModule },
    { id: 'vesicula', label: 'Vesícula', group: 'orgaos', module: vesiculaModule },
    { id: 'vias_biliares', label: 'Vias biliares', group: 'orgaos', module: viasBiliaresModule },
    { id: 'pancreas', label: 'Pâncreas', group: 'orgaos', module: pancreasModule },
    { id: 'baco', label: 'Baço', group: 'orgaos', module: bacoModule },
  ],
  conclusionNormal: 'Exame ultrassonográfico do abdome superior dentro dos limites da normalidade.',
  conclusionClosing: 'Demais estruturas do abdome superior sem alterações ecográficas.',
}
