'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { RefObject } from 'react'
import type { BreastSchemaFinding } from '@/lib/visualSchemas/adapters'
import { BREAST_VIEW, breastPositionFromPoint, pointForBreastFinding } from '@/lib/visualSchemas/breastGeometry'
import type { BreastPlacement, BreastPosition } from '@/lib/visualSchemas/breastGeometry'

const ASSET = '/schemas/breast/frontal-v5.svg'

function samePosition(a: Pick<BreastSchemaFinding, 'side' | 'hour' | 'nippleDistanceCm' | 'retroareolar'>, b: BreastPosition) {
  return a.side === b.side && a.hour === b.hour
    && a.nippleDistanceCm === b.nippleDistanceCm
    && a.retroareolar === b.retroareolar
}

function positionLabel(position: BreastPosition) {
  return `${position.hour} h · ${position.nippleDistanceCm.toFixed(1).replace('.', ',')} cm do mamilo`
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

export function BreastSchema({ findings, svgRef, onMove }: { findings: BreastSchemaFinding[]; svgRef: RefObject<SVGSVGElement>; onMove: (id: string, position: BreastPosition) => void }) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [visualPositions, setVisualPositions] = useState<Record<string, BreastPlacement>>({})
  const [announcement, setAnnouncement] = useState('')
  const [baseImage, setBaseImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
  const instructionsId = useId()
  const internal = useRef<SVGSVGElement>(null)
  const ref = svgRef ?? internal
  const activePointer = useRef<{ id: string; side: BreastPosition['side']; pointerId: number; offsetX: number; offsetY: number; moved: boolean; last: BreastPosition } | null>(null)
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
      const base = pointForBreastFinding(finding)
      const offset = index === 0 ? { x: 0, y: 0 } : { x: ((index % 3) - 1) * 45, y: Math.ceil(index / 3) * 40 }
      const bounded = breastPositionFromPoint(finding.side, base.x + offset.x, base.y + offset.y)
      result.set(finding.id, { x: bounded.x, y: bounded.y })
    }))
    return result
  }, [findings])

  const locate = useCallback((clientX: number, clientY: number) => {
    const svg = ref.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return { x: (clientX - rect.left) * BREAST_VIEW.width / rect.width, y: (clientY - rect.top) * BREAST_VIEW.height / rect.height }
  }, [ref])

  function publish(id: string, placement: BreastPlacement, previous: Pick<BreastSchemaFinding, 'side' | 'hour' | 'nippleDistanceCm' | 'retroareolar'>) {
    setVisualPositions((current) => ({ ...current, [id]: placement }))
    if (!samePosition(previous, placement)) {
      onMove(id, {
        side: placement.side,
        hour: placement.hour,
        nippleDistanceCm: placement.nippleDistanceCm,
        retroareolar: placement.retroareolar,
      })
    }
  }

  function movePointer(event: PointerEvent<SVGSVGElement>) {
    const active = activePointer.current
    if (!active || active.pointerId !== event.pointerId) return
    const cursor = locate(event.clientX, event.clientY)
    if (!cursor) return
    const placement = breastPositionFromPoint(active.side, cursor.x - active.offsetX, cursor.y - active.offsetY, active.last.hour)
    active.moved = true
    publish(active.id, placement, active.last)
    active.last = placement
  }

  function endPointer(event: PointerEvent<SVGSVGElement>, cancelled: boolean) {
    const active = activePointer.current
    if (!active || active.pointerId !== event.pointerId) return
    if (!cancelled && active.moved) movePointer(event)
    activePointer.current = null
    setDragging(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function moveWithKeyboard(event: KeyboardEvent<SVGGElement>, finding: BreastSchemaFinding, current: { x: number; y: number }) {
    const step = event.shiftKey ? 24 : 8
    const delta = event.key === 'ArrowLeft' ? { x: -step, y: 0 }
      : event.key === 'ArrowRight' ? { x: step, y: 0 }
        : event.key === 'ArrowUp' ? { x: 0, y: -step }
          : event.key === 'ArrowDown' ? { x: 0, y: step } : null
    if (!delta) return
    event.preventDefault()
    const placement = breastPositionFromPoint(finding.side, current.x + delta.x, current.y + delta.y, finding.hour ?? 12)
    publish(finding.id, placement, finding)
    setAnnouncement(`${finding.side}: ${positionLabel(placement)}`)
  }

  return <div>
    <p id={instructionsId} className="sr-only">Selecione um marcador e use as setas para ajustar a posição. Segure Shift para mover mais rápido.</p>
    <svg ref={ref} viewBox={`0 0 ${BREAST_VIEW.width} ${BREAST_VIEW.height}`} data-ready={baseImage ? 'true' : 'false'} className="h-auto w-full touch-none rounded-2xl bg-white" aria-label="Esquema mamário interativo"
      onPointerMove={movePointer} onPointerUp={(event) => endPointer(event, false)} onPointerCancel={(event) => endPointer(event, true)}
      onLostPointerCapture={() => { activePointer.current = null; setDragging(null) }}>
      <rect width={BREAST_VIEW.width} height={BREAST_VIEW.height} fill="white" />
      {baseImage ? <image href={baseImage} x="0" y="0" width={BREAST_VIEW.width} height={BREAST_VIEW.anatomyHeight} preserveAspectRatio="none" /> : null}
      {findings.map((finding, index) => {
        const local = visualPositions[finding.id]
        const p = local && (dragging === finding.id || focused === finding.id || samePosition(finding, local)) ? local : positions.get(finding.id) ?? pointForBreastFinding(finding)
        const derived = breastPositionFromPoint(finding.side, p.x, p.y, finding.hour ?? 12)
        const placement = local && (dragging === finding.id || focused === finding.id || samePosition(finding, local))
          ? local : {
            ...derived,
            hour: finding.hour ?? derived.hour,
            nippleDistanceCm: finding.nippleDistanceCm ?? derived.nippleDistanceCm,
            retroareolar: finding.retroareolar,
          }
        const showFeedback = dragging === finding.id || focused === finding.id
        const feedbackX = p.x + 42 + 320 <= BREAST_VIEW.width ? p.x + 42 : p.x - 362
        const feedbackY = Math.max(18, p.y - 98)
        return <g key={finding.id} role="button" tabIndex={0} aria-describedby={instructionsId}
          aria-label={`${finding.visualOnly ? 'Cisto adicional somente no esquema' : `Achado ${findings.slice(0, index + 1).filter((item) => !item.visualOnly).length}`}, mama ${finding.side}, ${positionLabel(placement)}`}
          className="cursor-grab focus:outline-none active:cursor-grabbing"
          onFocus={() => setFocused(finding.id)} onBlur={() => setFocused(null)}
          onKeyDown={(event) => moveWithKeyboard(event, finding, p)}
          onPointerDown={(event) => {
            if (activePointer.current || (event.pointerType === 'mouse' && event.button !== 0)) return
            const svg = ref.current
            const cursor = locate(event.clientX, event.clientY)
            if (!svg || !cursor) return
            event.preventDefault()
            activePointer.current = {
              id: finding.id, side: finding.side, pointerId: event.pointerId,
              offsetX: cursor.x - p.x, offsetY: cursor.y - p.y, moved: false,
              last: { side: finding.side, hour: finding.hour ?? placement.hour, nippleDistanceCm: finding.nippleDistanceCm ?? placement.nippleDistanceCm, retroareolar: finding.retroareolar },
            }
            svg.setPointerCapture(event.pointerId)
            setDragging(finding.id)
          }}>
          <circle cx={p.x} cy={p.y} r={radius(finding, maximum) + 16} fill="transparent" />
          {focused === finding.id ? <circle cx={p.x} cy={p.y} r={radius(finding, maximum) + 12} fill="none" stroke="#059669" strokeWidth="5" /> : null}
          <Marker finding={finding} x={p.x} y={p.y} r={radius(finding, maximum)} />
          {!finding.visualOnly ? <text x={p.x} y={p.y - radius(finding, maximum) - 18} textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{findings.slice(0, index + 1).filter((item) => !item.visualOnly).length}</text> : null}
          {showFeedback ? <g pointerEvents="none" transform={`translate(${feedbackX} ${feedbackY})`}>
            <rect width="320" height="58" rx="12" fill="#111827" />
            <text x="16" y="38" fontSize="25" fontWeight="700" fill="white">{positionLabel(placement)}</text>
          </g> : null}
        </g>
      })}
      <line x1="96" x2={BREAST_VIEW.width - 96} y1="1148" y2="1148" stroke="#d1d5db" strokeWidth="1.5" />
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
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {imageError ? <p className="mt-2 text-xs text-rose-600">{imageError}</p> : null}
  </div>
}
