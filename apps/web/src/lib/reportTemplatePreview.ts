import type { ExamState } from './deterministic/compose'
import type { ExamCategory } from './deterministic/organs/abdomeTotal'
import type { OrganState } from './deterministic/types'

export type ReportTemplateSection = {
  label: string
  normalBody?: string
}

export type ReportTemplateDefinition = {
  title: string
  technique: string
  findingsHeader: string
  sections: ReportTemplateSection[]
}

export function templateFromExamCategory(category: ExamCategory, state: ExamState): ReportTemplateDefinition {
  const opts = (state.__opts ?? {}) as OrganState
  const sections = category.resolveSections?.(opts) ?? category.sections
  return {
    title: category.resolveTitle?.(opts) ?? category.title,
    technique: category.resolveTecnica?.(opts) ?? category.tecnica,
    findingsHeader: category.achadosHeader,
    sections: sections.map((section) => ({ label: section.label, normalBody: section.normalBody })),
  }
}

/**
 * Prévia estrutural usada somente enquanto o renderer ainda não devolveu um
 * laudo completo. Os colchetes deixam explícito que não há afirmação clínica
 * pronta; salvar continua bloqueado até o renderer validar os dados.
 */
export function buildReportTemplatePreview(definition: ReportTemplateDefinition): string {
  const findings = definition.sections.length > 0
    ? definition.sections.map((section) => section.normalBody?.trim() || `${section.label}: [preencher]`)
    : ['[Preencha os campos do exame]']

  return [
    definition.title,
    `COMENTÁRIOS:\n${definition.technique}`,
    definition.findingsHeader,
    ...findings,
    'CONCLUSÃO:\n[Será atualizada automaticamente conforme o preenchimento.]',
  ].join('\n\n')
}
