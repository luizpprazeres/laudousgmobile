'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BreastSchemaFinding } from '@/lib/visualSchemas/adapters'

const VIEW = { width: 1608, height: 1138, cy: 686, rightX: 435, leftX: 1208, rx: 300, ry: 325, maxCm: 6 }
const ASSET = '/schemas/breast/frontal-v5.svg'

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
  if (!finding.sizeMaxMm) return 20
  return 12 + Math.min(finding.sizeMaxMm / max, 1) * 24
}

function imageAsDataUrl(source: string, signal: AbortSignal) {
  return fetch(source, { signal })
    .then((response) => {
      if (!response.ok) throw new Error('A base anatômica das mamas não foi carregada.')
      return response.blob()
    })
    .then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('A base anatômica das mamas não foi preparada.'))
      reader.readAsDataURL(blob)
    }))
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
  const [baseImage, setBaseImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
  const internal = useRef<SVGSVGElement>(null)
  const ref = svgRef ?? internal
  const maximum = useMemo(() => Math.max(1, ...findings.map((item) => item.sizeMaxMm ?? 1)), [findings])

  useEffect(() => {
    const controller = new AbortController()
    setBaseImage(null)
    setImageError('')
    void imageAsDataUrl(ASSET, controller.signal)
      .then(setBaseImage)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setImageError(reason instanceof Error ? reason.message : 'A base anatômica das mamas não foi carregada.')
      })
    return () => controller.abort()
  }, [])

  const positions = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>()
    const buckets = new Map<string, BreastSchemaFinding[]>()
    findings.forEach((finding) => {
      const key = `${finding.side}:${finding.hour ?? 'sem-hora'}:${finding.nippleDistanceCm ?? 'sem-distancia'}`
      buckets.set(key, [...(buckets.get(key) ?? []), finding])
    })
    buckets.forEach((bucket) => bucket.forEach((finding, index) => {
      const base = point(finding)
      const offset = index === 0 ? { x: 0, y: 0 } : { x: ((index % 3) - 1) * 45, y: Math.ceil(index / 3) * 40 }
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
  return <div>
    <svg ref={ref} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} data-ready={baseImage ? 'true' : 'false'} className="h-auto w-full touch-none rounded-2xl bg-white" aria-label="Esquema mamário interativo"
      onPointerMove={(event) => { if (!dragging) return; const p = locate(event.clientX, event.clientY); if (p) onMove(dragging, fromPoint(p.x, p.y)) }}
      onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
      <rect width={VIEW.width} height={VIEW.height} fill="white" />
      {baseImage ? <image href={baseImage} x="0" y="0" width={VIEW.width} height={VIEW.height} preserveAspectRatio="none" /> : null}
      {findings.map((finding, index) => { const p = positions.get(finding.id) ?? point(finding); return <g key={finding.id} role="button" tabIndex={0} className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(finding.id) }}>
        <circle cx={p.x} cy={p.y} r={radius(finding, maximum) + 16} fill="transparent" />
        <Marker finding={finding} x={p.x} y={p.y} r={radius(finding, maximum)} />
        <text x={p.x} y={p.y - radius(finding, maximum) - 18} textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{index + 1}</text>
      </g> })}
    </svg>
    {imageError ? <p className="mt-2 text-xs text-rose-600">{imageError}</p> : null}
  </div>
}
