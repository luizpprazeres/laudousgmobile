'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BreastSchemaFinding } from '@/lib/visualSchemas/adapters'

const VIEW = { width: 640, height: 342, cy: 184, rightX: 168, leftX: 472, rx: 101, ry: 118, maxCm: 6 }

function angle(hour: number) { return (hour / 12) * Math.PI * 2 - Math.PI / 2 }
function center(side: BreastSchemaFinding['side']) { return side === 'direita' ? VIEW.rightX : VIEW.leftX }

function point(finding: BreastSchemaFinding) {
  const hour = finding.hour ?? 12
  const fraction = finding.nippleDistanceCm == null ? 0.55 : Math.min(finding.nippleDistanceCm / VIEW.maxCm, 0.94)
  const a = angle(hour)
  return { x: center(finding.side) + fraction * VIEW.rx * Math.cos(a), y: VIEW.cy + fraction * VIEW.ry * Math.sin(a) }
}

function fromPoint(x: number, y: number) {
  const side: BreastSchemaFinding['side'] = x < VIEW.width / 2 ? 'direita' : 'esquerda'
  const cx = center(side)
  const dx = x - cx
  const dy = y - VIEW.cy
  let hour = Math.round((((Math.atan2(dy / VIEW.ry, dx / VIEW.rx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 12)
  if (hour === 0) hour = 12
  const fraction = Math.min(Math.hypot(dx / VIEW.rx, dy / VIEW.ry), 0.94)
  return { side, hour, nippleDistanceCm: Math.round(fraction * VIEW.maxCm * 10) / 10 }
}

function radius(finding: BreastSchemaFinding, max: number) {
  if (!finding.sizeMaxMm) return 8
  return 5 + Math.min(finding.sizeMaxMm / max, 1) * 9
}

function Breast({ cx, side }: { cx: number; side: BreastSchemaFinding['side'] }) {
  const hours = Array.from({ length: 12 }, (_, index) => index + 1)
  const q = side === 'direita'
    ? [['Q.S.L.', -52, -50], ['Q.S.M.', 52, -50], ['Q.I.L.', -52, 52], ['Q.I.M.', 52, 52]]
    : [['Q.S.M.', -52, -50], ['Q.S.L.', 52, -50], ['Q.I.M.', -52, 52], ['Q.I.L.', 52, 52]]
  return <g>
    <ellipse cx={cx} cy={VIEW.cy} rx={VIEW.rx} ry={VIEW.ry} fill="white" stroke="#111827" strokeWidth="2" />
    <line x1={cx - VIEW.rx} x2={cx + VIEW.rx} y1={VIEW.cy} y2={VIEW.cy} stroke="#6b7280" strokeDasharray="4 4" />
    <line x1={cx} x2={cx} y1={VIEW.cy - VIEW.ry} y2={VIEW.cy + VIEW.ry} stroke="#6b7280" strokeDasharray="4 4" />
    <circle cx={cx} cy={VIEW.cy} r="19" fill="white" stroke="#111827" strokeWidth="2" />
    <circle cx={cx} cy={VIEW.cy} r="6" fill="#111827" />
    {hours.map((hour) => { const a = angle(hour); return <text key={hour} x={cx + 132 * Math.cos(a)} y={VIEW.cy + 132 * Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#4b5563">{String(hour).padStart(2, '0')}</text> })}
    {q.map(([label, dx, dy]) => <text key={String(label)} x={cx + Number(dx)} y={VIEW.cy + Number(dy)} textAnchor="middle" fontSize="8" fill="#9ca3af">{label}</text>)}
    <text x={cx} y="22" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">MAMA {side === 'direita' ? 'DIREITA' : 'ESQUERDA'}</text>
  </g>
}

function Marker({ finding, x, y, r }: { finding: BreastSchemaFinding; x: number; y: number; r: number }) {
  if (finding.type === 'cyst') return <circle cx={x} cy={y} r={r} fill="white" stroke="#111827" strokeWidth="2" />
  if (finding.type === 'calcification') return <rect x={x - r / 1.5} y={y - r / 1.5} width={r * 1.3} height={r * 1.3} fill="#111827" transform={`rotate(45 ${x} ${y})`} />
  if (finding.type === 'solid_lobulated') {
    const points = Array.from({ length: 48 }, (_, index) => { const a = index / 48 * Math.PI * 2; const rr = r * (1 + 0.22 * Math.sin(4 * a)); return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}` }).join(' ')
    return <polygon points={points} fill="#111827" />
  }
  return <circle cx={x} cy={y} r={r} fill="#111827" />
}

export function BreastSchema({ findings, svgRef, onMove }: { findings: BreastSchemaFinding[]; svgRef: RefObject<SVGSVGElement>; onMove: (id: string, position: ReturnType<typeof fromPoint>) => void }) {
  const [dragging, setDragging] = useState<string | null>(null)
  const internal = useRef<SVGSVGElement>(null)
  const ref = svgRef ?? internal
  const maximum = useMemo(() => Math.max(1, ...findings.map((item) => item.sizeMaxMm ?? 1)), [findings])
  const positions = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>()
    const buckets = new Map<string, BreastSchemaFinding[]>()
    findings.forEach((finding) => {
      const key = `${finding.side}:${finding.hour ?? 'sem-hora'}:${finding.nippleDistanceCm ?? 'sem-distancia'}`
      buckets.set(key, [...(buckets.get(key) ?? []), finding])
    })
    buckets.forEach((bucket) => bucket.forEach((finding, index) => {
      const base = point(finding)
      const offset = index === 0 ? { x: 0, y: 0 } : { x: ((index % 3) - 1) * 18, y: Math.ceil(index / 3) * 16 }
      result.set(finding.id, { x: base.x + offset.x, y: base.y + offset.y })
    }))
    return result
  }, [findings])
  const locate = useCallback((clientX: number, clientY: number) => {
    const svg = ref.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    return { x: (clientX - rect.left) * VIEW.width / rect.width, y: (clientY - rect.top) * VIEW.height / rect.height }
  }, [ref])
  return <svg ref={ref} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="h-auto w-full touch-none rounded-2xl bg-white" aria-label="Esquema mamário interativo"
    onPointerMove={(event) => { if (!dragging) return; const p = locate(event.clientX, event.clientY); if (p) onMove(dragging, fromPoint(p.x, p.y)) }}
    onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
    <rect width={VIEW.width} height={VIEW.height} fill="white" />
    <Breast cx={VIEW.rightX} side="direita" /><Breast cx={VIEW.leftX} side="esquerda" />
    {findings.map((finding, index) => { const p = positions.get(finding.id) ?? point(finding); return <g key={finding.id} role="button" tabIndex={0} className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(finding.id) }}>
      <circle cx={p.x} cy={p.y} r={radius(finding, maximum) + 6} fill="transparent" />
      <Marker finding={finding} x={p.x} y={p.y} r={radius(finding, maximum)} />
      <text x={p.x} y={p.y - radius(finding, maximum) - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="#111827">{index + 1}</text>
    </g> })}
  </svg>
}
