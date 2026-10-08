'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { CarotidPlateAnchor, CarotidVisualSide, CarotidVisualSideId, CarotidVisualState } from '@/lib/visualSchemas/carotidAdapter'

const WIDTH = 920
const HEIGHT = 600

const VESSEL_LABELS = {
  comum: 'ACC',
  interna: 'ACI',
  externa: 'ACE',
  vertebral: 'AV',
} as const

const CLASSIFICATION_LABELS: Record<string, string> = {
  normal: 'Sem alterações',
  ateromatose_sem_estenose_significativa: 'Ateromatose sem estenose significativa',
  estenose_menor_50: 'Estenose < 50%',
  estenose_50_69: 'Estenose 50–69%',
  estenose_70_99: 'Estenose 70–99%',
  oclusao: 'Oclusão',
}

const DIRECTION_LABELS: Record<string, string> = {
  anterogrado: 'anterógrado',
  retrogrado: 'retrógrado',
  ausente: 'não detectado',
}

const PLATE_COLORS: Record<string, string> = {
  calcificada: '#64748B',
  lipidica: '#D97706',
  mista: '#7C3AED',
}

const ANCHORS: Partial<Record<CarotidPlateAnchor, { x: number; y: number }>> = {
  comum: { x: 178, y: 348 },
  bulbo: { x: 178, y: 250 },
  interna: { x: 130, y: 176 },
  externa: { x: 226, y: 176 },
}

function metric(side: CarotidVisualSide, vessel: keyof typeof VESSEL_LABELS) {
  const measurement = side.measurements.find((item) => item.vessel === vessel)
  if (!measurement) return '—'
  const values = [
    measurement.psv ? `PSV ${measurement.psv}` : '',
    measurement.edv ? `VDF ${measurement.edv}` : '',
    measurement.direction ? DIRECTION_LABELS[measurement.direction] ?? measurement.direction : '',
  ].filter(Boolean)
  return values.length ? values.join(' · ') : '—'
}

function assessmentLabel(value: string) {
  if (value === 'avaliado') return 'Avaliado'
  if (value === 'limitado') return 'Avaliação limitada'
  if (value === 'nao_avaliado') return 'Não avaliado'
  return 'Avaliação pendente'
}

function SideDiagram({ side, x, y = 0, onSelect }: { side: CarotidVisualSide; x: number; y?: number; onSelect: (side: CarotidVisualSideId) => void }) {
  const disabled = side.assessment === 'nao_avaliado'
  const unmappedPlates = side.plates.filter((plate) => plate.anchor === 'unmapped')
  const stroke = disabled ? '#CBD5E1' : '#D05555'
  const vertebral = side.measurements.find((item) => item.vessel === 'vertebral')
  const reverse = vertebral?.direction === 'retrogrado'
  return <g
    role="button"
    tabIndex={0}
    aria-label={`Abrir campos do lado ${side.id}`}
    className="cursor-pointer"
    onClick={() => onSelect(side.id)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect(side.id)
      }
    }}
    transform={`translate(${x} ${y})`}
  >
    <rect x="0" y="78" width="410" height="466" rx="22" fill="#FCFCFB" stroke="#E2E8F0" strokeWidth="2" />
    <text x="24" y="112" fontSize="17" fontWeight="800" fill="#0F172A">LADO {side.id === 'direita' ? 'DIREITO' : 'ESQUERDO'}</text>
    <text x="386" y="111" textAnchor="end" fontSize="12" fontWeight="700" fill={side.assessment === 'avaliado' ? '#047857' : '#92400E'}>{assessmentLabel(side.assessment)}</text>

    <g fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M178 418 L178 262" strokeWidth="22" />
      <path d="M178 262 C166 236 142 220 126 203 L106 139" strokeWidth="18" />
      <path d="M178 262 C190 236 215 220 232 203 L254 139" strokeWidth="14" />
      <path d="M292 418 L292 142" stroke="#B85B70" strokeWidth="11" />
    </g>
    <g fill="#64748B" fontSize="12" fontWeight="800">
      <text x="178" y="444" textAnchor="middle">ACC</text>
      <text x="95" y="126" textAnchor="middle">ACI</text>
      <text x="264" y="126" textAnchor="middle">ACE</text>
      <text x="292" y="444" textAnchor="middle">AV</text>
    </g>
    {vertebral?.direction && vertebral.direction !== 'ausente' ? <path d={reverse ? 'M292 164 L292 208' : 'M292 208 L292 164'} stroke="#FFFFFF" strokeWidth="3" markerEnd="url(#carotid-arrow)" /> : null}
    {side.plates.map((plate, index) => {
      const anchor = ANCHORS[plate.anchor]
      if (!anchor) return null
      const anchorIndex = side.plates.slice(0, index).filter((candidate) => candidate.anchor === plate.anchor).length
      const offset = (anchorIndex % 3 - 1) * 13
      const stackOffset = anchorIndex * 14
      const labelParts = [plate.thickness ? `${plate.thickness} mm` : '', plate.stenosis ? `${plate.stenosis}%` : ''].filter(Boolean)
      return <g key={plate.id}>
        <circle cx={anchor.x + offset} cy={anchor.y + stackOffset} r="8" fill={PLATE_COLORS[plate.composition] ?? '#DC2626'} stroke="#FFFFFF" strokeWidth="2" />
        <text x={anchor.x + 15 + offset} y={anchor.y + 4 + stackOffset} fontSize="10" fontWeight="800" fill="#7F1D1D">P{index + 1}{labelParts.length ? ` · ${labelParts.join(' · ')}` : ''}</text>
      </g>
    })}

    <g fontSize="11" fill="#334155">
      <text x="24" y="474"><tspan fontWeight="800">ACC</tspan><tspan> · {metric(side, 'comum')}</tspan></text>
      <text x="24" y="493"><tspan fontWeight="800">ACI</tspan><tspan> · {metric(side, 'interna')}</tspan></text>
      <text x="210" y="474"><tspan fontWeight="800">ACE</tspan><tspan> · {metric(side, 'externa')}</tspan></text>
      <text x="210" y="493"><tspan fontWeight="800">AV</tspan><tspan> · {metric(side, 'vertebral')}</tspan></text>
      <text x="24" y="516"><tspan fontWeight="800">EMI</tspan><tspan> · {side.imt ? `${side.imt} mm` : '—'}</tspan></text>
      <text x="386" y="516" textAnchor="end" fontWeight="800" fill={side.classification ? '#0F766E' : '#94A3B8'}>{CLASSIFICATION_LABELS[side.classification] ?? 'Classificação pendente'}</text>
      {unmappedPlates.length ? <text x="24" y="536" fontSize="9" fontWeight="700" fill="#B45309">{unmappedPlates.length} {unmappedPlates.length === 1 ? 'placa sem posição reconhecida' : 'placas sem posição reconhecida'}</text> : null}
    </g>
  </g>
}

export function CarotidSchema({ state, svgRef, onSelectSide }: { state: CarotidVisualState; svgRef: RefObject<SVGSVGElement>; onSelectSide: (side: CarotidVisualSideId) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  const plateCount = [...state.sides.direita.plates, ...state.sides.esquerda.plates]
    .filter((plate) => plate.anchor !== 'unmapped').length
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const update = () => setCompact(node.clientWidth < 680)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const viewWidth = compact ? 460 : WIDTH
  const viewHeight = compact ? 1080 : HEIGHT
  return <div ref={containerRef} className="w-full">
    <svg ref={svgRef} data-ready="true" viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="h-auto w-full rounded-2xl bg-white" role="group" aria-label="Esquema bilateral das artérias carótidas e vertebrais">
    <defs><marker id="carotid-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#FFFFFF" /></marker></defs>
    <rect width={WIDTH} height={HEIGHT} fill="#FFFFFF" />
    <text x="26" y="36" fontSize={compact ? 17 : 20} fontWeight="800" fill="#0A6E4E">MAPA DE CARÓTIDAS E VERTEBRAIS</text>
    <text x="26" y="58" fontSize={compact ? 10 : 12} fill="#64748B">Medidas e achados projetados dos campos do laudo, sem classificação automática.</text>
    <SideDiagram side={state.sides.direita} x={compact ? 25 : 26} onSelect={onSelectSide} />
    <SideDiagram side={state.sides.esquerda} x={compact ? 25 : 484} y={compact ? 480 : 0} onSelect={onSelectSide} />
    <g transform={`translate(26 ${compact ? 1050 : 568})`} fontSize="10" fill="#64748B">
      <circle cx="7" cy="-3" r="6" fill="#64748B" /><text x="19" y="1">calcificada</text>
      <circle cx="102" cy="-3" r="6" fill="#D97706" /><text x="114" y="1">lipídica</text>
      <circle cx="184" cy="-3" r="6" fill="#7C3AED" /><text x="196" y="1">mista</text>
      <text x={compact ? 408 : 878} y="1" textAnchor="end">{plateCount ? `${plateCount} ${plateCount === 1 ? 'placa projetada' : 'placas projetadas'}` : 'Nenhuma placa projetada'}</text>
    </g>
    </svg>
  </div>
}
