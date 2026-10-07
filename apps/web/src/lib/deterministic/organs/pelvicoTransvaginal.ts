/**
 * PÉLVICO TRANSVAGINAL — categoria própria no seletor, mesma pelve por baixo.
 *
 * Não é um segundo motor: reaproveita os MÓDULOS de útero, endométrio e ovários
 * da `PELVE_FEMININA` (mesmas chaves de estado, mesmos lados) e o mesmo
 * renderer canônico, com a via fixada em transvaginal (`tv`). A redação
 * continua tendo uma fonte só — ver `catalog/migradas.ts` (CATEGORIAS_DERIVADAS).
 *
 * O que muda é o portão: o adaptador próprio (`adaptarPelveTransvaginal`)
 * bloqueia o laudo quando o estado vazio ou incompleto faria o renderer
 * afirmar normalidade sobre medida não digitada.
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganState } from '../types'
import { pelveFeminina, pelveSections } from './pelveFeminina'

export const PELVICO_TRANSVAGINAL = 'PELVICO_TRANSVAGINAL'

/** A via é fixa: os controles da pelve sem "Via do exame". */
const comVia = (opts: OrganState): OrganState => ({ ...opts, via: 'tv' })

export const pelvicoTransvaginal: ExamCategory = {
  id: PELVICO_TRANSVAGINAL,
  name: 'Pelve transvaginal',
  title: pelveFeminina.resolveTitle!(comVia({})),
  tecnica: pelveFeminina.resolveTecnica!(comVia({})),
  achadosHeader: pelveFeminina.achadosHeader,
  controls: (pelveFeminina.controls ?? []).filter((control) => control.key !== 'via'),
  resolveTitle: (opts) => pelveFeminina.resolveTitle!(comVia(opts)),
  resolveTecnica: (opts) => pelveFeminina.resolveTecnica!(comVia(opts)),
  // Transvaginal não avalia a bexiga repleta: útero, endométrio e ovários D/E.
  sections: pelveSections.filter((section) => section.id !== 'bexiga'),
  conclusionNormal: pelveFeminina.conclusionNormal,
  calculators: pelveFeminina.calculators,
}
