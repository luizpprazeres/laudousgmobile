'use client'

import { useCallback, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { ThyroidSchemaFinding } from '@/lib/visualSchemas/adapters'

const VIEW = { width: 480, height: 480, rightX: 130, leftX: 350, cy: 250, rx: 62, ry: 112 }
const yFor = (third: ThyroidSchemaFinding['third']) => third === 'superior' ? 190 : third === 'inferior' ? 320 : 250
const xFor = (side: ThyroidSchemaFinding['side']) => side === 'direito' ? VIEW.rightX : side === 'esquerdo' ? VIEW.leftX : 240
function fromPoint(x: number, y: number): { side: ThyroidSchemaFinding['side']; third: ThyroidSchemaFinding['third'] } | null {
  if (x >= 198 && x <= 282 && y >= 232 && y <= 286) return { side: 'istmo', third: null }
  const side = x < 240 ? 'direito' : 'esquerdo'
  const cx = xFor(side)
  if (((x - cx) / VIEW.rx) ** 2 + ((y - VIEW.cy) / VIEW.ry) ** 2 > 1.2) return null
  return { side, third: y < 222 ? 'superior' : y > 295 ? 'inferior' : 'medio' }
}
function markerRadius(size: number | null, max: number) { return size ? 5 + Math.min(size / max, 1) * 8 : 8 }

export function ThyroidSchema({ findings, svgRef, onMove }: { findings: ThyroidSchemaFinding[]; svgRef: RefObject<SVGSVGElement>; onMove: (id: string, position: NonNullable<ReturnType<typeof fromPoint>>) => void }) {
  const [dragging, setDragging] = useState<string | null>(null)
  const maximum = useMemo(() => Math.max(1, ...findings.map((item) => item.sizeMaxMm ?? 1)), [findings])
  const locate = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    return { x: (clientX - rect.left) * VIEW.width / rect.width, y: (clientY - rect.top) * VIEW.height / rect.height }
  }, [svgRef])
  const positions = useMemo(() => {
    const buckets = new Map<string, ThyroidSchemaFinding[]>()
    findings.forEach((finding) => {
      const key = `${finding.side}:${finding.third ?? 'istmo'}`
      buckets.set(key, [...(buckets.get(key) ?? []), finding])
    })
    const result = new Map<string, { x: number; y: number }>()
    buckets.forEach((bucket) => bucket.forEach((finding, index) => {
      const columns = Math.min(3, bucket.length)
      const row = Math.floor(index / columns)
      const column = index % columns
      result.set(finding.id, {
        x: xFor(finding.side) + (column - (columns - 1) / 2) * 22,
        y: (finding.side === 'istmo' ? 260 : yFor(finding.third)) + row * 20,
      })
    }))
    return result
  }, [findings])
  return <svg ref={svgRef} viewBox="0 0 480 480" className="h-auto max-h-[58vh] w-full touch-none rounded-2xl bg-white" aria-label="Esquema tireoidiano interativo"
    onPointerMove={(event) => { if (!dragging) return; const p = locate(event.clientX, event.clientY); if (!p) return; const hit = fromPoint(p.x, p.y); if (hit) onMove(dragging, hit) }}
    onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
    <rect width="480" height="480" fill="white" />
    <path d="M195 60 L215 50 L240 75 L265 50 L285 60 L295 95 L295 135 L185 135 L185 95 Z" fill="white" stroke="#111827" strokeWidth="2" />
    <rect x="218" y="350" width="44" height="95" rx="5" fill="white" stroke="#111827" strokeWidth="2" />
    {[372, 392, 412, 432].map((y) => <line key={y} x1="218" x2="262" y1={y} y2={y} stroke="#9ca3af" />)}
    <path d="M158 152 C130 148 95 168 78 200 C62 235 62 285 80 320 C100 355 138 372 168 365 C188 360 198 340 198 308 L198 230 C200 198 192 168 178 156 C170 150 164 150 158 152 Z" fill="white" stroke="#111827" strokeWidth="2" />
    <path d="M322 152 C350 148 385 168 402 200 C418 235 418 285 400 320 C380 355 342 372 312 365 C292 360 282 340 282 308 L282 230 C280 198 288 168 302 156 C310 150 316 150 322 152 Z" fill="white" stroke="#111827" strokeWidth="2" />
    <rect x="198" y="240" width="84" height="40" rx="6" fill="white" stroke="#111827" strokeWidth="2" />
    {[222, 295].map((y) => <g key={y}><line x1="75" x2="195" y1={y} y2={y} stroke="#9ca3af" strokeDasharray="4 4" /><line x1="285" x2="405" y1={y} y2={y} stroke="#9ca3af" strokeDasharray="4 4" /></g>)}
    <text x="130" y="395" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">LOBO DIREITO</text><text x="350" y="395" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">LOBO ESQUERDO</text>
    {findings.map((finding, index) => { const position = positions.get(finding.id) ?? { x: xFor(finding.side), y: finding.side === 'istmo' ? 260 : yFor(finding.third) }; const { x, y } = position; const r = markerRadius(finding.sizeMaxMm, maximum); return <g key={finding.id} className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(finding.id) }}>
      <circle cx={x} cy={y} r={r + 7} fill="transparent" />
      {finding.type === 'calcification' ? <polygon points={`${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}`} fill="#111827" /> : finding.type === 'cystic' ? <ellipse cx={x} cy={y} rx={finding.shape === 'oval' ? r * 1.35 : r} ry={finding.shape === 'oval' ? r * .75 : r} fill="white" stroke="#111827" strokeWidth="2" strokeDasharray={finding.shape === 'lobulated' ? '3 2' : undefined} /> : <ellipse cx={x} cy={y} rx={finding.shape === 'oval' ? r * 1.35 : r} ry={finding.shape === 'oval' ? r * .75 : r} fill="#111827" stroke="#111827" strokeWidth="2" strokeDasharray={finding.shape === 'lobulated' ? '3 2' : undefined} />}
      {finding.hasCalcifications ? <g fill={finding.type === 'cystic' ? '#111827' : 'white'}><circle cx={x - 3} cy={y - 2} r="1.2" /><circle cx={x + 3} cy={y + 2} r="1.2" /><circle cx={x + 1} cy={y - 4} r="1.2" /></g> : null}
      <text x={x} y={y-r-8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#111827">{index + 1}</text>
    </g> })}
  </svg>
}
