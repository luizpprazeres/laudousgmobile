/**
 * Da sessão de composição ao corpo que o proxy recebe.
 *
 * Cada componente passa pelo MESMO adaptador da rota simples — não existe
 * payload clínico paralelo. O `data` de cada componente é exatamente o que
 * `/api/catalog/[category]/render` já aceita: `{ alteracoes, dados }`.
 *
 * Pendência `bloqueia` de QUALQUER componente impede a requisição inteira: um
 * componente pronto não pode sair como laudo completo enquanto o outro tem uma
 * escolha que o renderer não sabe representar.
 */
import { adaptarAbdome } from '../catalog/abdomeParaCatalogo'
import { adaptarProstataSuprapubica } from '../catalog/prostataParaCatalogo'
import { adaptarMamaria } from '../catalog/mamariaParaCatalogo'
import { adaptarPelve } from '../catalog/pelveParaCatalogo'
import type { ExamState } from '../deterministic'
import { adapterStateOf, associationByCode, componentOf, type CompositionSession } from './associations'
import {
  CLINICAL_COMPOSITION_CONTRACT_VERSION,
  type ClinicalCompositionBrowserRequest,
  type ComponentData,
  type CompositionCategoryCode,
} from './contract'

export type ComponentPendency = {
  componentId: string
  categoryCode: CompositionCategoryCode
  onde: string
  motivo: string
}

type Adapted = { dados: Record<string, unknown>; alteracoes: string[]; pendencias: Array<{ onde: string; motivo: string; bloqueia?: boolean }> }

export function adaptComponent(category: CompositionCategoryCode, state: ExamState): Adapted {
  const estado = state as Record<string, unknown>
  switch (category) {
    case 'ABDOMEN_TOTAL':
      return adaptarAbdome(estado)
    case 'PROSTATA_SUPRAPUBICA':
      return adaptarProstataSuprapubica(estado)
    case 'MAMARIA':
      return adaptarMamaria(estado)
    case 'PELVE_FEMININA':
      return adaptarPelve(estado, (estado.__opts as Record<string, string | string[]>) ?? {})
  }
}

export type BuiltComposition =
  | { ok: true; body: Omit<ClinicalCompositionBrowserRequest, 'requestId' | 'revision'> }
  | { ok: false; pendencias: ComponentPendency[] }

/**
 * Monta o corpo sem `requestId`/`revision` — estes são do hook, que conhece a
 * ordem das edições. Serializado, este corpo é a identidade do pedido: se ele
 * não mudou, não há por que perguntar de novo.
 */
export function buildCompositionBody(session: CompositionSession): BuiltComposition {
  const pendencias: ComponentPendency[] = []
  const components: ClinicalCompositionBrowserRequest['components'] = []
  for (const ref of session.components) {
    const adapted = adaptComponent(ref.categoryCode, adapterStateOf(session, ref.componentId))
    for (const p of adapted.pendencias) {
      if (p.bloqueia) pendencias.push({ componentId: ref.componentId, categoryCode: ref.categoryCode, onde: p.onde, motivo: p.motivo })
    }
    const data: ComponentData = { alteracoes: adapted.alteracoes, dados: adapted.dados }
    components.push({ componentId: ref.componentId, categoryCode: ref.categoryCode, acquisitionContextId: ref.acquisitionContextId, data })
  }
  if (pendencias.length) return { ok: false, pendencias }

  const definition = associationByCode(session.associationCode)
  const sharedStructures: ClinicalCompositionBrowserRequest['sharedStructures'] = []
  if (definition.sharedBladder) {
    const [a, b] = session.components
    const source = componentOf(session, definition.sharedBladder.sourceCategory)
    // Contexto divergente não é bexiga compartilhada — e aí o contrato não
    // representa o par. Falha fechada em vez de mandar duas bexigas.
    if (!source || !session.sharedBladderId || a.acquisitionContextId !== b.acquisitionContextId) {
      return {
        ok: false,
        pendencias: [{
          componentId: a.componentId,
          categoryCode: a.categoryCode,
          onde: 'bexiga',
          motivo: 'a bexiga compartilhada exige o mesmo contexto de aquisição transabdominal',
        }],
      }
    }
    sharedStructures.push({
      sharedStructureId: session.sharedBladderId,
      structureCode: 'URINARY_BLADDER',
      acquisitionContextId: a.acquisitionContextId,
      componentIds: [a.componentId, b.componentId],
      sourceComponentId: source.componentId,
    })
  }

  return {
    ok: true,
    body: {
      contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
      compositionId: session.compositionId,
      associationCode: session.associationCode,
      components,
      sharedStructures,
    },
  }
}
