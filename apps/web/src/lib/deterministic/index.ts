/**
 * Motor de geração determinística (Modo Auxiliar Web) — entrypoint público.
 *
 * Gera laudo a partir de cliques estruturados, sem IA. Ver feedback_deterministic_pegada:
 * o que é conhecido por clique não passa pela IA.
 */

export * from './types'
export { abdomeTotal, CATEGORIES } from './organs/abdomeTotal'
export type { ExamCategory, ExamSection } from './organs/abdomeTotal'
export { vesiculaModule } from './organs/vesicula'
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
  type TireoideState,
  type LoboState,
  type LoboId,
  type NoduloTireoide,
} from './organs/tireoide'
