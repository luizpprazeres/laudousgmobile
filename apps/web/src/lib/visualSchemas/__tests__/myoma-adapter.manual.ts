import assert from 'node:assert/strict'
import { createMyomaSchemeContract } from '@laudousg/schemes'
import { pelveFeminina, type OrganState } from '../../deterministic'
import { addMyomaToPelvisState, myomaFindingsFromPelvisState, updateMyomaInPelvisState } from '../myomaAdapter'

let state = addMyomaToPelvisState({})
let findings = myomaFindingsFromPelvisState(state)
assert.equal(findings.length, 1)
assert.equal(findings[0].figoConfirmed, false)
assert.equal(findings[0].location, 'not_informed')
assert.equal(createMyomaSchemeContract(findings), null)
state = updateMyomaInPelvisState(state, { ...findings[0], figo: 5, figoConfirmed: true, location: 'posterior', sizeMaxMm: 32, echo: 'hipoecoica' })
findings = myomaFindingsFromPelvisState(state)
assert.deepEqual({ figo: findings[0].figo, confirmed: findings[0].figoConfirmed, location: findings[0].location, size: findings[0].sizeMaxMm, echo: findings[0].echo }, { figo: 5, confirmed: true, location: 'posterior', size: 32, echo: 'hipoecoica' })
assert.ok(createMyomaSchemeContract(findings))
state = addMyomaToPelvisState(state)
state = addMyomaToPelvisState(state)
state = addMyomaToPelvisState(state)
findings = myomaFindingsFromPelvisState(state)
assert.equal(findings.length, 4, 'editor Web ultrapassa os três slots legados com achado extra estruturado')
assert.equal(new Set(findings.map((finding) => finding.id)).size, 4)
const extra = findings[3]!
state = updateMyomaInPelvisState(state, { ...extra, figo: 6, figoConfirmed: true, location: 'posterior', sizeMaxMm: 18, echo: 'heterogenea' })
const uterus = pelveFeminina.sections.find((section) => section.id === 'utero')!.module!
const rendered = uterus.compose(state)
assert.match(rendered.body, /maior medida de 1,8 cm/)
assert.ok(rendered.conclusion.some((line) => /FIGO 6/.test(line)), 'quarto mioma entra no laudo, não apenas no desenho')

// Arrastar no desenho não reescreve o laudo: antes trocava subseroso por
// intramural, reduzia três medidas a uma e encurtava a parede.
let form: OrganState = {
  ...uterus.initialState(), medidas: '9,0 x 5,0 x 6,0', mioma: ['sim'],
  'mioma.sim.medidas': '3,0 x 2,5 x 2,0', 'mioma.sim.classificacao': 'subseroso',
  'mioma.sim.parede': 'parede anterior e fúndica', 'mioma.sim.figo': '', 'mioma.sim.ecotextura': '',
}
const laudoAntes = uterus.compose(form)
const fromForm = myomaFindingsFromPelvisState(form)[0]!
form = updateMyomaInPelvisState(form, { ...fromForm, sagittalPoint: { x: 200, y: 200 } })
form = updateMyomaInPelvisState(form, { ...myomaFindingsFromPelvisState(form)[0]!, axialPoint: { x: 300, y: 150 } })
assert.deepEqual(uterus.compose(form), laudoAntes, 'arrastar marcador não altera corpo nem conclusão')
assert.deepEqual(myomaFindingsFromPelvisState(form)[0]!.sagittalPoint, { x: 200, y: 200 }, 'posição fica salva para o desenho')
assert.equal(form['mioma.sim.classificacao'], 'subseroso', 'FIGO não confirmado não troca a classificação marcada')

// Ação explícita no editor muda só o campo escolhido.
form = updateMyomaInPelvisState(form, { ...myomaFindingsFromPelvisState(form)[0]!, figo: 6, figoConfirmed: true })
assert.equal(form['mioma.sim.figo'], '6')
assert.equal(form['mioma.sim.classificacao'], 'subseroso', 'FIGO 6 confirmado pelo médico → família subserosa')
assert.equal(form['mioma.sim.medidas'], '3,0 x 2,5 x 2,0', 'medidas do formulário preservadas')
assert.equal(form['mioma.sim.parede'], 'parede anterior e fúndica', 'parede do formulário preservada')
console.log('myoma web adapter: OK')
