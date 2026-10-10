/**
 * W12 — miomas na web: localização ↔ categoria FIGO vinculadas nos dois sentidos (tabela única do
 * `@laudousg/schemes`), topografia em lista, valor antigo "outro" e conflito que bloqueia o laudo.
 */
import assert from 'node:assert/strict'
import { FIGO_LOCALIZACOES } from '@laudousg/schemes'
import { adaptarPelve } from '../src/lib/catalog/pelveParaCatalogo'
import { CATEGORIES, initialExamState } from '../src/lib/deterministic'
import { allowedValues, siblingKey, syncPatch } from '../src/lib/deterministic/fieldSync'
import type { Field, OrganState } from '../src/lib/deterministic/types'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

const utero = CATEGORIES.PELVE_FEMININA!.sections.find((s) => s.id === 'utero')!.module!
const subs = utero.schema.fields.find((f) => f.key === 'mioma')!.options![0]!.subFields as Field[]
const campo = (k: string) => subs.find((f) => f.key === k)!

test('localização, FIGO e topografia são listas suspensas', () => {
  for (const k of ['classificacao', 'figo', 'parede']) assert.equal(campo(k).presentation, 'select', k)
  assert.deepEqual(campo('figo').options!.map((o) => o.value), FIGO_LOCALIZACOES.map((l) => l.figo))
  assert.ok(campo('parede').options!.some((o) => o.value === 'região fúndica'))
})

test('irmão do subcampo', () => {
  assert.equal(siblingKey('mioma2.sim.figo', 'classificacao'), 'mioma2.sim.classificacao')
})

test('escolher a FIGO preenche a localização', () => {
  assert.deepEqual(syncPatch(campo('figo'), 'mioma.sim.figo', '5', {}), {
    'mioma.sim.figo': '5', 'mioma.sim.classificacao': 'subseroso com mais de 50% intramural',
  })
})

test('escolher a localização da tabela preenche a FIGO', () => {
  assert.deepEqual(syncPatch(campo('classificacao'), 'mioma.sim.classificacao', 'intramural', {}), {
    'mioma.sim.classificacao': 'intramural', 'mioma.sim.figo': '4',
  })
})

test('família genérica restringe a FIGO e limpa a incompatível', () => {
  const st: OrganState = { 'mioma.sim.figo': '4' }
  assert.deepEqual(syncPatch(campo('classificacao'), 'mioma.sim.classificacao', 'subseroso', st), {
    'mioma.sim.classificacao': 'subseroso', 'mioma.sim.figo': '',
  })
  const depois: OrganState = { 'mioma.sim.classificacao': 'subseroso' }
  assert.deepEqual([...allowedValues(campo('figo'), 'mioma.sim.figo', subs, depois)!].sort(), ['5', '6', '7'])
  // compatível fica
  assert.deepEqual(syncPatch(campo('classificacao'), 'mioma.sim.classificacao', 'subseroso', { 'mioma.sim.figo': '6' }), {
    'mioma.sim.classificacao': 'subseroso',
  })
})

test('sem localização escolhida, a lista FIGO não é restringida', () => {
  assert.equal(allowedValues(campo('figo'), 'mioma.sim.figo', subs, {}), null)
})

function estadoCom(mioma: Record<string, string>) {
  const st = initialExamState(CATEGORIES.PELVE_FEMININA!)
  const u = { ...(st.utero as OrganState), medidas: '9,0 x 5,0 x 6,0', mioma: ['sim'], 'mioma.sim.medidas': '2,0 x 1,8 x 1,5' }
  for (const [k, v] of Object.entries(mioma)) (u as Record<string, string>)[`mioma.sim.${k}`] = v
  return { ...st, utero: u }
}
const miomaDe = (r: ReturnType<typeof adaptarPelve>) => (r.dados as { miomas: { classificacao: string | null; figo: string | null; parede: string | null }[] }).miomas[0]!

test('formulário → adaptador leva localização, FIGO e topografia', () => {
  const r = adaptarPelve(estadoCom({ classificacao: 'subseroso com menos de 50% intramural', figo: '6', parede: 'região fúndica' }), {})
  assert.deepEqual(miomaDe(r), { ...miomaDe(r), classificacao: 'subseroso com menos de 50% intramural', figo: '6', parede: 'região fúndica' })
  assert.equal(r.pendencias.filter((p) => p.onde === 'miomas').length, 0)
})

test('valor antigo "outro" vira localização atípica', () => {
  assert.equal(miomaDe(adaptarPelve(estadoCom({ classificacao: 'outro' }), {})).classificacao, 'de localização atípica')
})

test('localização e FIGO incompatíveis bloqueiam o laudo, sem correção', () => {
  const r = adaptarPelve(estadoCom({ classificacao: 'submucoso', figo: '4' }), {})
  const p = r.pendencias.filter((x) => x.onde === 'miomas')
  assert.equal(p.length, 1)
  assert.equal(p[0]!.bloqueia, true)
  assert.match(p[0]!.motivo, /não confere com a categoria FIGO 4/)
  assert.equal(miomaDe(r).classificacao, 'submucoso')
})

test('localização e FIGO vizinhas (decisão do Luiz, 10/10) não bloqueiam', () => {
  const r = adaptarPelve(estadoCom({ classificacao: 'intramural', figo: '5' }), {})
  assert.equal(r.pendencias.filter((x) => x.onde === 'miomas').length, 0)
})

console.log(`w12FigoMiomas: ${cases} casos ok`)
