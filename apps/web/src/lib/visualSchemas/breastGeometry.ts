import type { BreastSchemaFinding } from './adapters'

export const BREAST_VIEW = {
  width: 1608,
  height: 1240,
  anatomyHeight: 1138,
  cy: 686,
  rightX: 435,
  leftX: 1208,
  rx: 300,
  ry: 325,
  maxCm: 6,
} as const

const LIMIT = 0.94
const RETROAREOLAR_CM = 1.3

export type BreastPosition = {
  side: BreastSchemaFinding['side']
  hour: number
  nippleDistanceCm: number
  retroareolar: boolean
}

export type BreastPlacement = BreastPosition & { x: number; y: number }

function center(side: BreastPosition['side']) {
  return side === 'direita' ? BREAST_VIEW.rightX : BREAST_VIEW.leftX
}

export function pointForBreastFinding(finding: BreastSchemaFinding): { x: number; y: number } {
  const hour = finding.hour ?? 12
  const distance = finding.nippleDistanceCm ?? (finding.retroareolar ? 1 : 3.3)
  const radius = Math.min(Math.max(distance, 0) / BREAST_VIEW.maxCm, 1) * LIMIT
  const angle = (hour / 12) * Math.PI * 2 - Math.PI / 2
  return {
    x: center(finding.side) + radius * BREAST_VIEW.rx * Math.cos(angle),
    y: BREAST_VIEW.cy + radius * BREAST_VIEW.ry * Math.sin(angle),
  }
}

export function breastPositionFromPoint(side: BreastPosition['side'], x: number, y: number, centerHour = 12): BreastPlacement {
  const cx = center(side)
  const dx = x - cx
  const dy = y - BREAST_VIEW.cy
  const ellipticalRadius = Math.hypot(dx / BREAST_VIEW.rx, dy / BREAST_VIEW.ry)
  const scale = ellipticalRadius > LIMIT ? LIMIT / ellipticalRadius : 1
  const boundedX = cx + dx * scale
  const boundedY = BREAST_VIEW.cy + dy * scale
  const clockAngle = (Math.atan2(dy / BREAST_VIEW.ry, dx / BREAST_VIEW.rx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)
  const roundedHour = Math.round(clockAngle * 12 / (Math.PI * 2)) % 12
  const hour = ellipticalRadius < 0.001 ? centerHour : roundedHour || 12
  const nippleDistanceCm = Math.round(Math.min(ellipticalRadius / LIMIT, 1) * BREAST_VIEW.maxCm * 10) / 10
  return {
    x: boundedX,
    y: boundedY,
    side,
    hour,
    nippleDistanceCm,
    retroareolar: nippleDistanceCm <= RETROAREOLAR_CM,
  }
}
