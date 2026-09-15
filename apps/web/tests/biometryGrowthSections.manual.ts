import assert from 'node:assert/strict'
import { obstetrica, morfologico, dopplerObstetrico } from '../src/lib/deterministic'
import { agruparBiometriaCrescimento, resolverSecaoAtivaAgrupada, idsConcluidosAgrupados, BIOMETRY_GROWTH_SECTION_ID } from '../src/components/laudar/biometryGrowthSections'

let cases = 0
for (const [category, opts, expected] of [
  [obstetrica, {}, true],
  [morfologico, {trimestre: '1t'}, false],
  [morfologico, {trimestre: '2t'}, true],
  [morfologico, {trimestre: '3t'}, true],
  [dopplerObstetrico, {}, true],
  [dopplerObstetrico, {somente_doppler: 'sim'}, false],
] as const) {
  const sections = category.resolveSections?.(opts) ?? category.sections
  const before = sections.map(s => s.id)
  const group = agruparBiometriaCrescimento(category.id, sections)
  assert.equal(group.sections.some(s => s.id === BIOMETRY_GROWTH_SECTION_ID), expected)
  assert.equal(new Set(group.sections.map(s => s.id)).size, group.sections.length)
  assert.deepEqual(sections.map(s => s.id), before)
  if (expected) {
    assert.equal(group.sections.length, sections.length - 1)
    for (const old of ['biometria', 'crescimento_fetal']) {
      assert.equal(resolverSecaoAtivaAgrupada(group.sections, old), BIOMETRY_GROWTH_SECTION_ID)
    }
    const state = {biometria: group.biometry!.initialState(), crescimento_fetal: group.growth!.initialState()}
    assert.equal(idsConcluidosAgrupados(group.sections, group, state).has(BIOMETRY_GROWTH_SECTION_ID), false)
    state.crescimento_fetal = {...state.crescimento_fetal, avaliar: 'sim'}
    assert.equal(idsConcluidosAgrupados(group.sections, group, state).has(BIOMETRY_GROWTH_SECTION_ID), true)
  }
  cases++
}
console.log(`Biometry/growth grouping: ${cases} category/mode cases passed`)
