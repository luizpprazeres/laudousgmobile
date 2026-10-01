import assert from 'node:assert/strict'
import { createMyomaSchemeContract } from '@laudousg/schemes'
import { pelveFeminina } from '../../deterministic'
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
console.log('myoma web adapter: OK')
