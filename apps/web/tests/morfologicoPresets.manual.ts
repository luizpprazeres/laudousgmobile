import assert from 'node:assert/strict'
import { CATEGORIES, initialExamState, morfologicoPresetDe } from '../src/lib/deterministic'
import { categoriaDeRender, categoriaMigrada } from '../src/lib/catalog/migradas'
import { adaptarMorfologico } from '../src/lib/catalog/morfologicoParaCatalogo'
import { CATEGORY_GROUPS } from '../src/components/laudar/categoryGroups'
import { STRUCTURED_WEB_CATEGORY_CODES } from '../src/lib/writerCategories'

const expected = [
  ['MORFOLOGICO_1T', '1t'],
  ['MORFOLOGICO_2T', '2t'],
  ['MORFOLOGICO_3T', '3t'],
] as const

for (const [id, trimester] of expected) {
  const category = CATEGORIES[id]
  assert.ok(category, id)
  assert.equal(morfologicoPresetDe(id)?.trimestre, trimester)
  assert.equal(categoriaMigrada(id), true)
  assert.equal(categoriaDeRender(id), 'MORFOLOGICO')
  assert.ok(STRUCTURED_WEB_CATEGORY_CODES.includes(id as never))
  assert.ok(CATEGORY_GROUPS.find((group) => group.id === 'obstetricia')?.categories.includes(id))

  const initial = initialExamState(category)
  assert.equal(category.controls?.length, 0)
  const sections = category.resolveSections?.({}) ?? []
  if (trimester === '1t') assert.ok(sections.some((section) => section.id === 'primeiro_trimestre'))
  else assert.ok(sections.some((section) => section.id === 'anatomia'))

  const adapted = adaptarMorfologico(initial, { trimestre: trimester })
  assert.equal(adapted.dados.trimestre, trimester)
}

console.log('morfologicoPresets.manual: 3 atalhos estruturados OK')
