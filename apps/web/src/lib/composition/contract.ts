/**
 * O CONTRATO DE TRANSPORTE da composição clínica v1, visto pela Web.
 *
 * A fonte é `@laudousg/shared` (`schemas/clinicalComposition.ts`). A Web
 * depende de UM ponto só: nenhum componente importa o shared direto, e nenhum
 * schema é redeclarado aqui — a validação do proxy e a da resposta usam os
 * mesmos schemas que o `apps/api`.
 *
 * O envelope salvo em `web_reports.exam_state` NÃO é contrato de transporte:
 * ele carrega estado de UI e rascunho, e vive em `./envelope`.
 */
export {
  CLINICAL_COMPOSITION_ASSOCIATION_CODES,
  CLINICAL_COMPOSITION_CONTRACT_VERSION,
  ClinicalCompositionRequestV1Schema,
  ClinicalCompositionResponseV1Schema,
  type ClinicalCompositionErrorV1,
  type ClinicalCompositionRequestV1,
  type ClinicalCompositionResponseV1,
  type ClinicalCompositionSuccessV1,
} from '@laudousg/shared'
import {
  CLINICAL_COMPOSITION_ASSOCIATION_CODES,
  type ClinicalCompositionAssociationCode,
  type ClinicalCompositionCategoryCode,
  type ClinicalCompositionRequestV1,
  type ClinicalCompositionSuccessV1,
} from '@laudousg/shared'

export type AssociationCode = ClinicalCompositionAssociationCode
export type CompositionCategoryCode = ClinicalCompositionCategoryCode
export type ComponentData = ClinicalCompositionRequestV1['components'][number]['data']
export type CompositionBlock = ClinicalCompositionSuccessV1['blocks'][number]

/** O que o navegador manda ao proxy: tudo, menos o estilo — o servidor lê da conta. */
export type ClinicalCompositionBrowserRequest = Omit<ClinicalCompositionRequestV1, 'writingStyle'>

export function isAssociationCode(value: unknown): value is AssociationCode {
  return typeof value === 'string' && (CLINICAL_COMPOSITION_ASSOCIATION_CODES as readonly string[]).includes(value)
}
