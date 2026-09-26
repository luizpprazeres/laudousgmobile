/**
 * ASSOCIAÇÃO DE EXAMES na Web — sessão com componentes explícitos.
 *
 * Não existe "categoria gigante": cada componente continua sendo a categoria
 * canônica que já existe (Abdome total, Próstata, Mamas e axilas, Pelve), com o
 * mesmo adaptador e o mesmo renderer. A composição só declara QUEM está junto,
 * em que contexto de aquisição, e o que é anatomicamente compartilhado.
 *
 * ## As regras que este arquivo garante
 *
 * - Só os pares com contrato suportado aparecem (`ASSOCIATIONS`).
 * - A bexiga é UMA estrutura compartilhada só em Abdome + Próstata, porque as
 *   duas são transabdominais e dividem o mesmo `acquisitionContextId`. O estado
 *   vesical vive no componente ABDOMEN_TOTAL (a origem declarada ao renderer) e
 *   é projetado, idêntico, no adaptador da próstata. Mamas + Pelve não
 *   compartilham nada — nem bexiga, nem classificação.
 * - Um componente acrescentado começa do estado INICIAL da categoria. Nunca do
 *   que ficou na memória de uma edição avulsa anterior: reaproveitar isso em
 *   silêncio poria achados de outro exame dentro deste.
 * - Remover um componente descarta o estado dele. O que sobrevive é só o que
 *   pertence ao componente restante — inclusive a bexiga, que era deste exame.
 */
import type { ExamState } from '../deterministic'
import type { AssociationCode, CompositionCategoryCode } from './contract'

export type AssociationDefinition = {
  code: AssociationCode
  categories: readonly [CompositionCategoryCode, CompositionCategoryCode]
  /** Rótulo do botão quando a outra categoria está aberta. */
  addLabel: Record<CompositionCategoryCode, string>
  /** Estrutura compartilhada, se houver, e a categoria que é sua origem. */
  sharedBladder: { sectionId: 'bexiga'; sourceCategory: CompositionCategoryCode } | null
  /** Título curto do conjunto, para o histórico. */
  label: string
}

export const ASSOCIATIONS: readonly AssociationDefinition[] = [
  {
    code: 'ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA',
    categories: ['ABDOMEN_TOTAL', 'PROSTATA_SUPRAPUBICA'],
    addLabel: {
      ABDOMEN_TOTAL: 'Associar abdome total',
      PROSTATA_SUPRAPUBICA: 'Associar próstata',
      MAMARIA: '',
      PELVE_FEMININA: '',
    },
    sharedBladder: { sectionId: 'bexiga', sourceCategory: 'ABDOMEN_TOTAL' },
    label: 'Abdome total + Próstata',
  },
  {
    code: 'MAMARIA__PELVE_FEMININA',
    categories: ['MAMARIA', 'PELVE_FEMININA'],
    addLabel: {
      ABDOMEN_TOTAL: '',
      PROSTATA_SUPRAPUBICA: '',
      MAMARIA: 'Associar mamas e axilas',
      PELVE_FEMININA: 'Associar pelve feminina',
    },
    sharedBladder: null,
    label: 'Mamas e axilas + Pelve feminina',
  },
] as const

export function associationByCode(code: AssociationCode): AssociationDefinition {
  const found = ASSOCIATIONS.find((a) => a.code === code)
  if (!found) throw new Error(`associação desconhecida: ${code}`)
  return found
}

/** As associações que podem partir da categoria aberta. */
export function associationsFor(category: string): Array<{ definition: AssociationDefinition; add: CompositionCategoryCode }> {
  return ASSOCIATIONS
    .filter((a) => (a.categories as readonly string[]).includes(category))
    .map((a) => ({ definition: a, add: a.categories.find((c) => c !== category)! }))
}

export type CompositionComponentRef = {
  componentId: string
  categoryCode: CompositionCategoryCode
  acquisitionContextId: string
}

/**
 * A sessão de composição. O estado clínico de cada componente mora em
 * `states`, chaveado por `componentId` — nunca por categoria, para que um
 * componente removido e reincluído seja outro componente, com outro id.
 */
export type CompositionSession = {
  compositionId: string
  associationCode: AssociationCode
  /** A categoria que estava aberta quando a associação começou: ela abre a grade. */
  primaryComponentId: string
  components: [CompositionComponentRef, CompositionComponentRef]
  /** `sharedStructureId` estável por sessão, quando há bexiga compartilhada. */
  sharedBladderId: string | null
  states: Record<string, ExamState>
}

type NewId = () => string

function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)
}

/**
 * Começa uma associação a partir do exame aberto.
 *
 * O estado do exame aberto é PRESERVADO — é o mesmo exame, agora com mais um
 * componente. O componente acrescentado nasce de `initialOf(added)`. Se houver
 * bexiga compartilhada e a origem for o componente novo, a bexiga preenchida no
 * exame aberto é levada para a origem (é a bexiga deste paciente, e o médico a
 * vê no mesmo card, uma vez só).
 */
export function startAssociation(
  definition: AssociationDefinition,
  primaryCategory: CompositionCategoryCode,
  primaryState: ExamState,
  initialOf: (category: CompositionCategoryCode) => ExamState,
  newId: NewId,
): CompositionSession {
  const added = definition.categories.find((c) => c !== primaryCategory)
  if (!added || !definition.categories.includes(primaryCategory)) {
    throw new Error(`${primaryCategory} não pertence a ${definition.code}`)
  }
  const shared = definition.sharedBladder
  const sharedContext = shared ? newId() : null
  const primary: CompositionComponentRef = {
    componentId: newId(),
    categoryCode: primaryCategory,
    acquisitionContextId: sharedContext ?? newId(),
  }
  const addedRef: CompositionComponentRef = {
    componentId: newId(),
    categoryCode: added,
    acquisitionContextId: sharedContext ?? newId(),
  }
  const primaryCopy = clone(primaryState) ?? {}
  const addedState = clone(initialOf(added)) ?? {}
  if (shared && shared.sourceCategory === added && primaryCopy[shared.sectionId]) {
    addedState[shared.sectionId] = clone(primaryCopy[shared.sectionId])
  }
  return {
    compositionId: newId(),
    associationCode: definition.code,
    primaryComponentId: primary.componentId,
    components: [primary, addedRef],
    sharedBladderId: shared ? newId() : null,
    states: { [primary.componentId]: primaryCopy, [addedRef.componentId]: addedState },
  }
}

export function componentOf(session: CompositionSession, category: CompositionCategoryCode) {
  return session.components.find((c) => c.categoryCode === category) ?? null
}

/** A seção que o componente NÃO mostra, por ser compartilhada e morar no outro. */
export function hiddenSharedSections(session: CompositionSession, componentId: string): Set<string> {
  const definition = associationByCode(session.associationCode)
  const shared = definition.sharedBladder
  const ref = session.components.find((c) => c.componentId === componentId)
  if (!shared || !ref || ref.categoryCode === shared.sourceCategory) return new Set()
  return new Set([shared.sectionId])
}

/**
 * O estado que o ADAPTADOR de cada componente recebe: o próprio, com a bexiga
 * compartilhada projetada da origem quando for o caso.
 */
export function adapterStateOf(session: CompositionSession, componentId: string): ExamState {
  const own = session.states[componentId] ?? {}
  const definition = associationByCode(session.associationCode)
  const shared = definition.sharedBladder
  const ref = session.components.find((c) => c.componentId === componentId)
  if (!shared || !ref || ref.categoryCode === shared.sourceCategory) return own
  const source = componentOf(session, shared.sourceCategory)
  if (!source) return own
  const sourceBladder = session.states[source.componentId]?.[shared.sectionId]
  return sourceBladder ? { ...own, [shared.sectionId]: sourceBladder } : own
}

/**
 * Remove um componente. Devolve a categoria que fica e o estado dela — agora um
 * exame avulso. O estado do removido é descartado; não volta se o médico
 * reassociar (uma nova associação cria outro componente, do estado inicial).
 */
export function removeComponent(
  session: CompositionSession,
  componentId: string,
): { category: CompositionCategoryCode; state: ExamState } {
  const remaining = session.components.find((c) => c.componentId !== componentId)
  const removed = session.components.find((c) => c.componentId === componentId)
  if (!remaining || !removed) throw new Error('componente não pertence à composição')
  return { category: remaining.categoryCode, state: clone(adapterStateOf(session, remaining.componentId)) ?? {} }
}

export function updateComponentState(
  session: CompositionSession,
  componentId: string,
  update: (state: ExamState) => ExamState,
): CompositionSession {
  if (!session.states[componentId]) return session
  return { ...session, states: { ...session.states, [componentId]: update(session.states[componentId]) } }
}
