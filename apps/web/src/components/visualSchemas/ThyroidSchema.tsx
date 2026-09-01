'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { ThyroidSchemaFinding } from '@/lib/visualSchemas/adapters'

const VIEW = { width: 760, height: 430 }
const FRONTAL = { rightX: 145, leftX: 255, cy: 240, rx: 46, ry: 94, isthmusX: 200, isthmusY: 252 }
const TRANSVERSE = { rightX: 500, leftX: 630, cy: 178, rx: 58, ry: 68, isthmusX: 565, isthmusY: 188 }
const ASSETS = ['/schemas/thyroid/frontal-v2.png', '/schemas/thyroid/transverse-v2.png'] as const

const yFor = (third: ThyroidSchemaFinding['third']) => third === 'superior' ? 188 : third === 'inferior' ? 292 : 240
const frontalX = (side: ThyroidSchemaFinding['side']) => side === 'direito' ? FRONTAL.rightX : side === 'esquerdo' ? FRONTAL.leftX : FRONTAL.isthmusX
const transverseX = (side: ThyroidSchemaFinding['side']) => side === 'direito' ? TRANSVERSE.rightX : side === 'esquerdo' ? TRANSVERSE.leftX : TRANSVERSE.isthmusX

function insideEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.2
}

function fromPoint(x: number, y: number, preservedThird: ThyroidSchemaFinding['third']): { side: ThyroidSchemaFinding['side']; third: ThyroidSchemaFinding['third'] } | null {
  if (x < 370) {
    if (x >= 176 && x <= 224 && y >= 230 && y <= 276) return { side: 'istmo', third: null }
    const side = x < 200 ? 'direito' : 'esquerdo'
    const cx = frontalX(side)
    if (!insideEllipse(x, y, cx, FRONTAL.cy, FRONTAL.rx, FRONTAL.ry)) return null
    return { side, third: y < 216 ? 'superior' : y > 268 ? 'inferior' : 'medio' }
  }

  if (x >= 538 && x <= 592 && y >= 164 && y <= 208) return { side: 'istmo', third: null }
  const side = x < TRANSVERSE.isthmusX ? 'direito' : 'esquerdo'
  const cx = transverseX(side)
  if (!insideEllipse(x, y, cx, TRANSVERSE.cy, TRANSVERSE.rx, TRANSVERSE.ry)) return null
  return { side, third: preservedThird ?? 'medio' }
}

function markerRadius(size: number | null, max: number) { return size ? 5 + Math.min(size / max, 1) * 8 : 8 }

function imageAsDataUrl(source: string, signal: AbortSignal) {
  return fetch(source, { signal })
    .then((response) => {
      if (!response.ok) throw new Error('A base anatômica da tireoide não foi carregada.')
      return response.blob()
    })
    .then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('A base anatômica da tireoide não foi preparada.'))
      reader.readAsDataURL(blob)
    }))
}

function Marker({ finding, index, x, y, maximum, onPointerDown }: { finding: ThyroidSchemaFinding; index: number; x: number; y: number; maximum: number; onPointerDown: React.PointerEventHandler<SVGGElement> }) {
  const r = markerRadius(finding.sizeMaxMm, maximum)
  return <g role="button" tabIndex={0} className="cursor-grab active:cursor-grabbing" onPointerDown={onPointerDown}>
    <circle cx={x} cy={y} r={r + 7} fill="transparent" />
    {finding.type === 'calcification'
      ? <polygon points={`${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}`} fill="#111827" />
      : finding.type === 'cystic'
        ? <ellipse cx={x} cy={y} rx={finding.shape === 'oval' ? r * 1.35 : r} ry={finding.shape === 'oval' ? r * .75 : r} fill="white" stroke="#111827" strokeWidth="2" strokeDasharray={finding.shape === 'lobulated' ? '3 2' : undefined} />
        : <ellipse cx={x} cy={y} rx={finding.shape === 'oval' ? r * 1.35 : r} ry={finding.shape === 'oval' ? r * .75 : r} fill="#111827" stroke="#111827" strokeWidth="2" strokeDasharray={finding.shape === 'lobulated' ? '3 2' : undefined} />}
    {finding.hasCalcifications ? <g fill={finding.type === 'cystic' ? '#111827' : 'white'}><circle cx={x - 3} cy={y - 2} r="1.2" /><circle cx={x + 3} cy={y + 2} r="1.2" /><circle cx={x + 1} cy={y - 4} r="1.2" /></g> : null}
    <text x={x} y={y-r-8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#111827">{index + 1}</text>
  </g>
}

export function ThyroidSchema({ findings, svgRef, onMove }: { findings: ThyroidSchemaFinding[]; svgRef: RefObject<SVGSVGElement>; onMove: (id: string, position: NonNullable<ReturnType<typeof fromPoint>>) => void }) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [images, setImages] = useState<[string, string] | null>(null)
  const [imageError, setImageError] = useState('')
  const maximum = useMemo(() => Math.max(1, ...findings.map((item) => item.sizeMaxMm ?? 1)), [findings])

  useEffect(() => {
    const controller = new AbortController()
    setImages(null)
    setImageError('')
    void Promise.all(ASSETS.map((source) => imageAsDataUrl(source, controller.signal)))
      .then(([frontal, transverse]) => setImages([frontal, transverse]))
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setImageError(reason instanceof Error ? reason.message : 'As bases anatômicas da tireoide não foram carregadas.')
      })
    return () => controller.abort()
  }, [])

  const locate = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    return { x: (clientX - rect.left) * VIEW.width / rect.width, y: (clientY - rect.top) * VIEW.height / rect.height }
  }, [svgRef])

  const frontalPositions = useMemo(() => {
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
        x: frontalX(finding.side) + (column - (columns - 1) / 2) * 18,
        y: (finding.side === 'istmo' ? FRONTAL.isthmusY : yFor(finding.third)) + row * 18,
      })
    }))
    return result
  }, [findings])

  const transversePositions = useMemo(() => {
    const buckets = new Map<string, ThyroidSchemaFinding[]>()
    findings.forEach((finding) => buckets.set(finding.side, [...(buckets.get(finding.side) ?? []), finding]))
    const result = new Map<string, { x: number; y: number }>()
    buckets.forEach((bucket) => bucket.forEach((finding, index) => {
      const columns = Math.min(3, bucket.length)
      const row = Math.floor(index / columns)
      const column = index % columns
      result.set(finding.id, {
        x: transverseX(finding.side) + (column - (columns - 1) / 2) * 20,
        y: (finding.side === 'istmo' ? TRANSVERSE.isthmusY : TRANSVERSE.cy) + row * 19,
      })
    }))
    return result
  }, [findings])

  const beginDrag = (id: string): React.PointerEventHandler<SVGGElement> => (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(id)
  }

  return <div>
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      data-ready={images ? 'true' : 'false'}
      className="h-auto max-h-[58vh] w-full touch-none rounded-2xl bg-white"
      aria-label="Esquema tireoidiano interativo em vistas frontal e transversa"
      onPointerMove={(event) => {
        if (!dragging) return
        const point = locate(event.clientX, event.clientY)
        const finding = findings.find((item) => item.id === dragging)
        if (!point || !finding) return
        const hit = fromPoint(point.x, point.y, finding.third)
        if (hit) onMove(dragging, hit)
      }}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
    >
      <rect width={VIEW.width} height={VIEW.height} fill="white" />
      <text x="200" y="28" textAnchor="middle" fontSize="14" fontWeight="700" fill="#111827">VISTA FRONTAL</text>
      <text x="565" y="28" textAnchor="middle" fontSize="14" fontWeight="700" fill="#111827">VISTA TRANSVERSA</text>
      <line x1="380" x2="380" y1="35" y2="390" stroke="#d1d5db" />
      {images ? <>
        <image href={images[0]} x="30" y="38" width="340" height="330" preserveAspectRatio="xMidYMid meet" />
        <image href={images[1]} x="395" y="65" width="340" height="226" preserveAspectRatio="xMidYMid meet" />
      </> : null}
      {[216, 268].map((y) => <g key={y}><line x1="105" x2="185" y1={y} y2={y} stroke="#9ca3af" strokeDasharray="4 4" /><line x1="215" x2="295" y1={y} y2={y} stroke="#9ca3af" strokeDasharray="4 4" /></g>)}
      <text x="145" y="386" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827">LOBO DIREITO</text>
      <text x="255" y="386" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827">LOBO ESQUERDO</text>
      <text x="565" y="54" textAnchor="middle" fontSize="9" fill="#6b7280">ANTERIOR</text>
      <text x="485" y="315" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">DIREITO</text>
      <text x="645" y="315" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">ESQUERDO</text>
      <text x="565" y="346" textAnchor="middle" fontSize="10" fill="#6b7280">A vista transversa indica o lobo, sem inferir profundidade.</text>
      {findings.map((finding, index) => {
        const frontal = frontalPositions.get(finding.id) ?? { x: frontalX(finding.side), y: finding.side === 'istmo' ? FRONTAL.isthmusY : yFor(finding.third) }
        const transverse = transversePositions.get(finding.id) ?? { x: transverseX(finding.side), y: finding.side === 'istmo' ? TRANSVERSE.isthmusY : TRANSVERSE.cy }
        return <g key={finding.id}>
          <Marker finding={finding} index={index} x={frontal.x} y={frontal.y} maximum={maximum} onPointerDown={beginDrag(finding.id)} />
          <Marker finding={finding} index={index} x={transverse.x} y={transverse.y} maximum={maximum} onPointerDown={beginDrag(finding.id)} />
        </g>
      })}
    </svg>
    {imageError ? <p className="mt-2 text-xs text-rose-600">{imageError}</p> : null}
  </div>
}
