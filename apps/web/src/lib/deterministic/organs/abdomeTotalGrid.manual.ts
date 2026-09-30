import assert from 'node:assert/strict'
import { adaptarAbdome } from '../../catalog/abdomeParaCatalogo'
import { initialExamState } from '../compose'
import { abdomeTotal } from './abdomeTotal'
import { planAbdomeTotalVisualCards } from './abdomeTotalGrid'

const sections = abdomeTotal.sections
const cards = planAbdomeTotalVisualCards(sections)
assert.deepEqual(cards.map(({ id, size }) => [id, size]), [
  ['figado', 'regular'],
  ['vesicula-vias-biliares', 'wide'],
  ['rins', 'wide'],
  ['bexiga', 'regular'],
  ['pancreas-baco', 'wide'],
  ['vasos-abdominais', 'regular'],
])
assert.equal(cards.find((card) => card.id === 'vesicula-vias-biliares')?.label, 'Vesícula e vias biliares')

const visualSections = cards.flatMap((card) => card.sections)
const organSections = sections.filter((section) => section.group === 'orgaos')
assert.equal(visualSections.length, organSections.length, 'nenhuma seção clínica pode desaparecer')
assert.equal(new Set(visualSections.map((section) => section.id)).size, organSections.length, 'nenhuma seção clínica pode duplicar')
for (const section of visualSections) {
  assert.strictEqual(section, sections.find((original) => original.id === section.id), `${section.id}: referência clínica mudou`)
}

const state = initialExamState(abdomeTotal)
state.vesicula = {
  ...state.vesicula,
  conteudo: ['colelitiase'],
  'conteudo.colelitiase.dimensao': '8',
}
state.vias_biliares = {
  ...state.vias_biliares,
  coledoco: 'dilatado',
  'coledoco.dilatado.calibre': '9',
}
const stateSnapshot = structuredClone(state)
const before = adaptarAbdome(state)
planAbdomeTotalVisualCards(sections)
assert.deepEqual(state, stateSnapshot, 'plano visual não pode reescrever o estado')
assert.deepEqual(adaptarAbdome(state), before, 'plano visual não pode alterar o contrato do renderer')
const organs = before.dados.orgaos as Record<string, { status: string; achados: unknown[] }>
assert.equal(organs.vesicula.status, 'alterado')
assert.equal(organs.vias_biliares.status, 'alterado')
assert.ok(organs.vesicula.achados.length > 0)
assert.ok(organs.vias_biliares.achados.length > 0)
assert.equal('vesicula-vias-biliares' in state, false, 'id visual não pode virar chave clínica')

const withoutGallbladder = planAbdomeTotalVisualCards(sections.filter((section) => section.id !== 'vesicula'))
assert.deepEqual(withoutGallbladder.flatMap((card) => card.sections.map((section) => section.id)).sort(),
  sections.filter((section) => section.id !== 'vesicula').map((section) => section.id).sort())
assert.deepEqual(withoutGallbladder.find((card) => card.id === 'vias_biliares')?.sections.map((section) => section.id), ['vias_biliares'])

const withoutBladder = planAbdomeTotalVisualCards(sections.filter((section) => section.id !== 'bexiga'))
assert.equal(withoutBladder.some((card) => card.id === 'bexiga'), false)
assert.equal(withoutBladder.find((card) => card.id === 'vesicula-vias-biliares')?.sections.length, 2)

console.log('abdomeTotalGrid: 5 grupos de invariantes PASS')
