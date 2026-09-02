'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BreastSchemaFinding } from '@/lib/visualSchemas/adapters'

const VIEW = { width: 1608, height: 1240, anatomyHeight: 1138, cy: 686, rightX: 435, leftX: 1208, rx: 300, ry: 325, maxCm: 6 }
const ASSET = '/schemas/breast/frontal-v5.svg'
const RETROAREOLAR_FRACTION = 0.16

function angle(hour: number) { return (hour / 12) * Math.PI * 2 - Math.PI / 2 }
function center(side: BreastSchemaFinding['side']) { return side === 'direita' ? VIEW.rightX : VIEW.leftX }

function point(finding: BreastSchemaFinding) {
  const hour = finding.hour ?? 12
  const fraction = finding.retroareolar
    ? RETROAREOLAR_FRACTION
    : finding.nippleDistanceCm == null ? 0.55 : Math.min(finding.nippleDistanceCm / VIEW.maxCm, 0.94)
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
  return {
    side,
    hour,
    nippleDistanceCm: Math.round(fraction * VIEW.maxCm * 10) / 10,
    retroareolar: fraction <= RETROAREOLAR_FRACTION * 1.35,
  }
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
  if (finding.type === 'calcification') return <g fill="#111827">
    <circle cx={x - r * 0.55} cy={y - r * 0.25} r={r * 0.28} />
    <circle cx={x + r * 0.5} cy={y - r * 0.45} r={r * 0.22} />
    <circle cx={x + r * 0.2} cy={y + r * 0.45} r={r * 0.3} />
    <circle cx={x - r * 0.45} cy={y + r * 0.5} r={r * 0.18} />
  </g>
  if (finding.type === 'solid_lobulated') {
    const points = Array.from({ length: 48 }, (_, index) => { const a = index / 48 * Math.PI * 2; const rr = r * (1 + 0.22 * Math.sin(4 * a)); return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}` }).join(' ')
    return <polygon points={points} fill="#111827" />
  }
  if (finding.type === 'solid_spiculated') {
    const points = Array.from({ length: 32 }, (_, index) => {
      const a = index / 32 * Math.PI * 2
      const rr = index % 2 === 0 ? r * 1.45 : r * 0.78
      return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`
    }).join(' ')
    return <polygon points={points} fill="#111827" />
  }
  return <circle cx={x} cy={y} r={r} fill="#111827" />
}

const LEGEND: Array<{ type: BreastSchemaFinding['type']; label: string }> = [
  { type: 'cyst', label: 'Cisto' },
  { type: 'solid', label: 'Nódulo' },
  { type: 'solid_lobulated', label: 'Lobulado' },
  { type: 'solid_spiculated', label: 'Espiculado' },
  { type: 'calcification', label: 'Calcificação' },
]

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
      {baseImage ? <image href={baseImage} x="0" y="0" width={VIEW.width} height={VIEW.anatomyHeight} preserveAspectRatio="none" /> : null}
      {findings.map((finding, index) => { const p = positions.get(finding.id) ?? point(finding); return <g key={finding.id} role="button" tabIndex={0} aria-label={finding.visualOnly ? 'Cisto adicional somente no esquema' : `Achado ${index + 1}`} className="cursor-grab active:cursor-grabbing" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(finding.id) }}>
        <circle cx={p.x} cy={p.y} r={radius(finding, maximum) + 16} fill="transparent" />
        <Marker finding={finding} x={p.x} y={p.y} r={radius(finding, maximum)} />
        {!finding.visualOnly ? <text x={p.x} y={p.y - radius(finding, maximum) - 18} textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{findings.slice(0, index + 1).filter((item) => !item.visualOnly).length}</text> : null}
      </g> })}
      <line x1="96" x2={VIEW.width - 96} y1="1148" y2="1148" stroke="#d1d5db" strokeWidth="1.5" />
      <text x="98" y="1183" fontSize="19" fontWeight="700" fill="#374151">LEGENDA</text>
      {LEGEND.map((item, index) => {
        const x = 270 + index * 260
        const finding: BreastSchemaFinding = { id: item.type, side: 'direita', type: item.type, hour: null, quadrant: null, sizeMaxMm: null, nippleDistanceCm: null, retroareolar: false, visualOnly: false, sourceFindingId: null }
        return <g key={item.type}>
          <Marker finding={finding} x={x} y={1180} r={14} />
          <text x={x + 28} y="1187" fontSize="18" fontWeight="600" fill="#374151">{item.label}</text>
        </g>
      })}
    </svg>
    {imageError ? <p className="mt-2 text-xs text-rose-600">{imageError}</p> : null}
  </div>
}
