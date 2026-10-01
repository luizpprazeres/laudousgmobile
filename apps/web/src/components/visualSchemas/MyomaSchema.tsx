'use client'

import { useRef, type PointerEvent, type RefObject } from 'react'
import { canonicalAxialPoint, canonicalSagittalPoint, FIGO_FAMILY_COLORS, myomaFamily, type MyomaFinding } from '@laudousg/schemes'

const W = 820, H = 560
const sag = (p: { x: number; y: number }) => ({ x: 44 + p.x * (320 / 420), y: 78 + p.y * (355 / 520) })
const axial = (p: { x: number; y: number }) => ({ x: 430 + p.x * (330 / 560), y: 105 + p.y * (300 / 400) })

type Props = {
  findings: MyomaFinding[]
  selectedId: string | null
  svgRef: RefObject<SVGSVGElement>
  onSelect: (id: string) => void
  onMove: (id: string, plane: 'sagittal' | 'axial', point: { x: number; y: number }) => void
}
export function MyomaSchema({ findings, selectedId, svgRef, onSelect, onMove }: Props) {
  const drag = useRef<{ id: string; plane: 'sagittal' | 'axial'; pointerId: number } | null>(null)
  function coordinates(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height }
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return
    const p = coordinates(event)
    if (drag.current.plane === 'sagittal') onMove(drag.current.id, 'sagittal', { x: Math.max(70, Math.min(370, (p.x - 44) / (320 / 420))), y: Math.max(40, Math.min(480, (p.y - 78) / (355 / 520))) })
    else onMove(drag.current.id, 'axial', { x: Math.max(50, Math.min(510, (p.x - 430) / (330 / 560))), y: Math.max(20, Math.min(380, (p.y - 105) / (300 / 400))) })
  }
  const markers = (plane: 'sagittal' | 'axial') => findings.map((finding) => {
    const raw = plane === 'sagittal' ? finding.sagittalPoint ?? canonicalSagittalPoint(finding.figo) : finding.axialPoint ?? canonicalAxialPoint(finding.location)
    const p = plane === 'sagittal' ? sag(raw) : axial(raw)
    const radius = Math.max(13, Math.min(26, 10 + (finding.sizeMaxMm ?? 18) * .24))
    return <g key={`${plane}-${finding.id}`} role="button" tabIndex={0} aria-label={`Mioma ${finding.figoConfirmed ? `FIGO ${finding.figo}` : 'com FIGO pendente'}`} className="cursor-grab active:cursor-grabbing" onClick={() => onSelect(finding.id)} onPointerDown={(event) => { event.preventDefault(); onSelect(finding.id); drag.current = { id: finding.id, plane, pointerId: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId) }}>
      {selectedId === finding.id ? <circle cx={p.x} cy={p.y} r={radius + 8} fill="none" stroke="#059669" strokeWidth="4" /> : null}
      <circle cx={p.x} cy={p.y} r={radius} fill={FIGO_FAMILY_COLORS[myomaFamily(finding.figo)]} stroke="white" strokeWidth="3" />
      <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize="17" fontWeight="800" fill="white">{finding.figoConfirmed ? finding.figo : '?'}</text>
    </g>
  })
  return <svg ref={svgRef} data-ready="true" viewBox={`0 0 ${W} ${H}`} onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} className="h-auto w-full touch-none rounded-2xl bg-white" role="img" aria-label="Esquema de miomas em cortes longitudinal e transversal">
    <rect width={W} height={H} fill="#fff" />
    <text x="28" y="38" fontSize="20" fontWeight="800" fill="#0A6E4E">ESQUEMA DE MIOMAS — FIGO 0–8</text>
    <text x="142" y="68" fontSize="13" fontWeight="700" fill="#334155">LONGITUDINAL</text><text x="548" y="68" fontSize="13" fontWeight="700" fill="#334155">TRANSVERSAL</text>
    <rect x="24" y="76" width="362" height="380" rx="18" fill="#FAF8F4" stroke="#E3DDD1" />
    <rect x="410" y="76" width="386" height="380" rx="18" fill="#FAF8F4" stroke="#E3DDD1" />
    <path d="M204 112 C125 120 105 190 124 271 C134 316 170 351 177 407 L177 438 C177 458 243 458 243 438 L243 407 C250 351 286 316 296 271 C315 190 295 120 216 112 Z" fill="#FBF7EE" stroke="#B9A98C" strokeWidth="3" />
    <path d="M180 155 C197 143 223 143 240 155 C227 195 215 245 210 420 C205 245 193 195 180 155 Z" fill="#E7F4EE" stroke="#0F9B6E" strokeWidth="2" />
    <ellipse cx="596" cy="260" rx="136" ry="112" fill="#FBF7EE" stroke="#B9A98C" strokeWidth="3" />
    <path d="M546 257 C570 246 622 246 646 257 C622 270 570 270 546 257 Z" fill="#E7F4EE" stroke="#0F9B6E" strokeWidth="2" />
    {markers('sagittal')}{markers('axial')}
    <line x1="28" x2="792" y1="475" y2="475" stroke="#E2E8F0" />
    <text x="28" y="510" fontSize="14" fontWeight="700" fill="#475569">Arraste o marcador no corte correspondente. A posição é aproximada e não substitui a descrição do laudo.</text>
  </svg>
}
