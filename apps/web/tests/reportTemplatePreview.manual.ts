import assert from 'node:assert/strict'
import { buildReportTemplatePreview, templateFromExamCategory } from '../src/lib/reportTemplatePreview'
import { GENERIC_CATEGORIES, initialExamState } from '../src/lib/deterministic'

const preview = buildReportTemplatePreview({
  title: 'ULTRASSONOGRAFIA DE TESTE',
  technique: 'Exame realizado com técnica de teste.',
  findingsHeader: 'ACHADOS:',
  sections: [
    { label: 'Estrutura variável' },
    { label: 'Estrutura fixa', normalBody: 'Estrutura fixa sem alterações.' },
  ],
})

assert.match(preview, /^ULTRASSONOGRAFIA DE TESTE/)
assert.match(preview, /COMENTÁRIOS:\nExame realizado com técnica de teste\./)
assert.match(preview, /Estrutura variável: \[preencher\]/)
assert.match(preview, /Estrutura fixa sem alterações\./)
assert.match(preview, /CONCLUSÃO:\n\[Será atualizada automaticamente conforme o preenchimento\.\]/)

const empty = buildReportTemplatePreview({
  title: 'EXAME',
  technique: 'Técnica.',
  findingsHeader: 'ACHADOS:',
  sections: [],
})
assert.match(empty, /\[Preencha os campos do exame\]/)

for (const category of GENERIC_CATEGORIES) {
  const categoryPreview = buildReportTemplatePreview(
    templateFromExamCategory(category, initialExamState(category)),
  )
  assert.ok(categoryPreview.startsWith(category.resolveTitle?.(initialExamState(category).__opts ?? {}) ?? category.title), category.id)
  assert.match(categoryPreview, /CONCLUSÃO:/, category.id)
  assert.ok(categoryPreview.trim().length > category.title.length, category.id)
}

console.log(`reportTemplatePreview.manual: ${GENERIC_CATEGORIES.length} categorias + casos básicos ok`)
