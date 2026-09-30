import assert from 'node:assert/strict'
import { BREAST_VIEW, breastPositionFromPoint, pointForBreastFinding } from '../breastGeometry'
import type { BreastSchemaFinding } from '../adapters'

function atHour(hour: number, radius = 0.5) {
  const angle = hour * Math.PI / 6 - Math.PI / 2
  return {
    x: BREAST_VIEW.rightX + radius * BREAST_VIEW.rx * Math.cos(angle),
    y: BREAST_VIEW.cy + radius * BREAST_VIEW.ry * Math.sin(angle),
  }
}

for (let hour = 1; hour <= 12; hour++) {
  const point = atHour(hour)
  assert.equal(breastPositionFromPoint('direita', point.x, point.y).hour, hour, `setor ${hour} h`)
}

for (const [angle, expected] of [[6.49, 6], [6.51, 7], [11.49, 11], [11.51, 12], [12.49, 12], [12.51, 1]] as const) {
  const point = atHour(angle)
  assert.equal(breastPositionFromPoint('direita', point.x, point.y).hour, expected, `fronteira ${angle} h`)
}

const sectorPointA = atHour(6.1)
const sectorPointB = atHour(6.2)
const insideSectorA = breastPositionFromPoint('direita', sectorPointA.x, sectorPointA.y)
const insideSectorB = breastPositionFromPoint('direita', sectorPointB.x, sectorPointB.y)
assert.equal(insideSectorA.hour, insideSectorB.hour)
assert.notEqual(insideSectorA.x, insideSectorB.x, 'o marcador deve mover sem saltar entre raios horários')
assert.notEqual(insideSectorA.y, insideSectorB.y)

const nearer = breastPositionFromPoint('direita', BREAST_VIEW.rightX + 70, BREAST_VIEW.cy)
const farther = breastPositionFromPoint('direita', BREAST_VIEW.rightX + 90, BREAST_VIEW.cy)
assert.ok(farther.nippleDistanceCm > nearer.nippleDistanceCm, 'distância deve acompanhar o movimento radial')

const beyondOtherSide = breastPositionFromPoint('direita', BREAST_VIEW.leftX + 300, BREAST_VIEW.cy + 800)
assert.equal(beyondOtherSide.side, 'direita', 'arraste não deve trocar de mama')
assert.equal(beyondOtherSide.nippleDistanceCm, 6)
assert.ok(Math.hypot((beyondOtherSide.x - BREAST_VIEW.rightX) / BREAST_VIEW.rx, (beyondOtherSide.y - BREAST_VIEW.cy) / BREAST_VIEW.ry) <= 0.9400001)

assert.equal(breastPositionFromPoint('esquerda', BREAST_VIEW.leftX, BREAST_VIEW.cy, 9).hour, 9, 'no mamilo, preservar hora prévia')
assert.equal(breastPositionFromPoint('esquerda', BREAST_VIEW.leftX, BREAST_VIEW.cy).nippleDistanceCm, 0)
assert.equal(breastPositionFromPoint('direita', BREAST_VIEW.rightX + 50, BREAST_VIEW.cy).retroareolar, true)
assert.equal(breastPositionFromPoint('direita', BREAST_VIEW.rightX + 100, BREAST_VIEW.cy).retroareolar, false)

for (const side of ['direita', 'esquerda'] as const) {
  const finding: BreastSchemaFinding = {
    id: side, side, hour: 2, nippleDistanceCm: 3.4, retroareolar: false,
    quadrant: null, type: 'solid', sizeMaxMm: null, visualOnly: false, sourceFindingId: null,
  }
  const point = pointForBreastFinding(finding)
  const roundTrip = breastPositionFromPoint(side, point.x, point.y)
  assert.equal(roundTrip.hour, 2)
  assert.equal(roundTrip.nippleDistanceCm, 3.4)
  assert.equal(roundTrip.side, side)
}

console.log('Breast geometry: OK')
