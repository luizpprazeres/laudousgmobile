/**
 * Motor de geração determinística (Modo Auxiliar Web) — entrypoint público.
 *
 * Gera laudo a partir de cliques estruturados, sem IA. Ver feedback_deterministic_pegada:
 * o que é conhecido por clique não passa pela IA.
 */

import { abdomeTotal } from './organs/abdomeTotal'
import { prostataSuprapubica } from './organs/prostataSuprapubica'
import { viasUrinarias } from './organs/viasUrinarias'
import { mamaria } from './organs/mamaria'
import { pelveFeminina } from './organs/pelveFeminina'
import { abdomeSuperior } from './organs/abdomeSuperior'
import { cervical } from './organs/cervical'
import { partesMoles } from './organs/partesMoles'
import type { ExamCategory } from './organs/abdomeTotal'

export * from './types'
export { abdomeTotal } from './organs/abdomeTotal'
export { prostataSuprapubica } from './organs/prostataSuprapubica'
export { viasUrinarias } from './organs/viasUrinarias'
export { mamaria } from './organs/mamaria'
export { pelveFeminina } from './organs/pelveFeminina'
export { abdomeSuperior } from './organs/abdomeSuperior'
export { cervical } from './organs/cervical'
export { partesMoles } from './organs/partesMoles'
export type { ExamCategory, ExamSection } from './organs/abdomeTotal'
export { vesiculaModule } from './organs/vesicula'

/**
 * Registro das categorias GENÉRICAS (compostas via composeReport). Adicionar uma
 * categoria nova = criar o módulo em organs/ e incluí-la aqui. A UI
 * (LaudarWebExperience) lê este registro — não precisa mexer no componente.
 * (Tireoide tem motor próprio — composeTireoide — e não entra aqui.)
 */
export const GENERIC_CATEGORIES: ExamCategory[] = [abdomeTotal, abdomeSuperior, prostataSuprapubica, viasUrinarias, mamaria, pelveFeminina, cervical, partesMoles]
export const CATEGORIES: Record<string, ExamCategory> = Object.fromEntries(
  GENERIC_CATEGORIES.map((c) => [c.id, c])
)
export {
  composeReport,
  initialExamState,
  appendInitials,
  type ExamState,
  type ComposedReport,
} from './compose'
export {
  composeTireoide,
  initialTireoideState,
  volumeLobo,
  tireoideSections,
  ECOGENICIDADES,
  MARGENS,
  NOTAS_DOMINGOS,
  TIRADS_VALUES,
  TIREOIDITES,
  type TireoideState,
  type LoboState,
  type LoboId,
  type NoduloTireoide,
  type TireoiditeTipo,
} from './organs/tireoide'
