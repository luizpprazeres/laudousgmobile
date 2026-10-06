'use client'

import { useEffect, useRef, useState } from 'react'
import { progressiveIntergrowthWeight } from './biometryAutomation'
import type { ChaveFemur } from '@/lib/calculators/fetalWeight'
import {
  INTERGROWTH2020_EFW_MAX_GA_DAYS,
  INTERGROWTH2020_EFW_MIN_GA_DAYS,
  INTERGROWTH2020_EFW_VERSION,
} from '@/lib/calculators/intergrowth2020'
import {
  formatarIgBiometria,
  formatarPercentilIntergrowth,
  intergrowthBiometryPreviewFromDating,
  intergrowthPreviewCurves,
  type IntergrowthBiometryPreviewResult,
  type IntergrowthCurve,
} from '@/lib/calculators/intergrowthBiometry'

type Props = {
  biometryState: Readonly<Record<string, unknown>>
  chaveFemur: ChaveFemur | null
  igState: Readonly<Record<string, unknown>>
}

const HEADING_CLASS = 'font-mono text-[10px] font-bold uppercase tracking-normal text-gray-500 dark:text-gray-400'
const LABEL_CLASS = 'font-mono text-[9.5px] font-semibold uppercase tracking-normal text-gray-500 dark:text-gray-400'

const CHART_HEIGHT = 220
const CHART_FALLBACK_WIDTH = 560
const MARGIN = { top: 10, right: 34, bottom: 34, left: 46 }

/** Curvas fixas do padrão; independem do estado. */
const CURVES = intergrowthPreviewCurves()
const CURVES_MAX_G = Math.max(...CURVES.flatMap((curve) => curve.points.map((p) => p.weightG)))

const CURVE_STYLE: Record<IntergrowthCurve['label'], { className: string; color: string; width: number; dash?: string }> = {
  P3: { className: 'stroke-gray-300 dark:stroke-gray-600', color: '#d1d5db', width: 1, dash: '4 3' },
  P10: { className: 'stroke-gray-400 dark:stroke-gray-500', color: '#9ca3af', width: 1 },
  P50: { className: 'stroke-gray-600 dark:stroke-gray-300', color: '#4b5563', width: 1.5 },
  P90: { className: 'stroke-gray-400 dark:stroke-gray-500', color: '#9ca3af', width: 1 },
  P97: { className: 'stroke-gray-300 dark:stroke-gray-600', color: '#d1d5db', width: 1, dash: '4 3' },
}

function useLarguraElemento<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setLargura(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setLargura(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, largura] as const
}

/**
 * Posição do peso Hadlock 3 calculado nas curvas P3..P97 de 18 a 40 semanas.
 * O eixo de peso cresce para incluir o ponto; nada é recortado ou extrapolado.
 */
export function IntergrowthChart({
  preview,
  percentilTexto,
  interactive = true,
  reportMode = false,
}: {
  preview: IntergrowthBiometryPreviewResult
  percentilTexto: string
  interactive?: boolean
  reportMode?: boolean
}) {
  const [ref, largura] = useLarguraElemento<HTMLDivElement>()
  const [hoverGaDays, setHoverGaDays] = useState<number | null>(null)
  const width = largura > 0 ? largura : CHART_FALLBACK_WIDTH
  const plotW = Math.max(1, width - MARGIN.left - MARGIN.right)
  const plotH = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
  const yMax = Math.ceil(Math.max(CURVES_MAX_G, preview.weightG) / 1000) * 1000
  const yStep = yMax <= 5000 ? 1000 : Math.ceil(yMax / 5000) * 1000
  const x = (gaDays: number) =>
    MARGIN.left + ((gaDays - INTERGROWTH2020_EFW_MIN_GA_DAYS) / (INTERGROWTH2020_EFW_MAX_GA_DAYS - INTERGROWTH2020_EFW_MIN_GA_DAYS)) * plotW
  const y = (weightG: number) => MARGIN.top + plotH - (weightG / yMax) * plotH
  const semanaStep = plotW >= 360 ? 2 : 4
  const semanas: number[] = []
  for (let s = INTERGROWTH2020_EFW_MIN_GA_DAYS / 7; s <= INTERGROWTH2020_EFW_MAX_GA_DAYS / 7; s += semanaStep) semanas.push(s)
  if (semanas[semanas.length - 1] !== 40) semanas.push(40)
  const pesos: number[] = []
  for (let g = 0; g <= yMax; g += yStep) pesos.push(g)
  const px = x(preview.ig.gaDays)
  const py = y(preview.weightG)
  const activeGaDays = hoverGaDays ?? preview.ig.gaDays
  const activeX = x(activeGaDays)
  const activeCurves = CURVES.map((curve) => ({
    label: curve.label,
    weightG: curve.points.find((point) => point.gaDays === activeGaDays)?.weightG ?? 0,
  }))
  const tooltipOnRight = activeX < MARGIN.left + plotW / 2
  const tooltipWidth = 112
  const tooltipHeight = 76
  const tooltipX = tooltipOnRight ? activeX + 8 : activeX - tooltipWidth - 8
  const tooltipY = MARGIN.top + 4
  const rotuloADireita = px < MARGIN.left + plotW / 2
  const ariaLabel =
    `Gráfico ${INTERGROWTH2020_EFW_VERSION}: curvas de peso fetal estimado P3, P10, P50, P90 e P97 de 18 a 40 semanas. ` +
    `Ponto: peso calculado por Hadlock CC/CA/CF de ${preview.weightRounded} g na IG ${formatarIgBiometria(preview.ig)}, ` +
    `percentil ${percentilTexto}.`

  return (
    <div ref={ref} className="min-w-0">
      <svg
        role="img"
        aria-label={ariaLabel}
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        className="block overflow-visible"
        tabIndex={interactive ? 0 : undefined}
        onFocus={interactive ? () => setHoverGaDays(preview.ig.gaDays) : undefined}
        onBlur={interactive ? () => setHoverGaDays(null) : undefined}
        onPointerLeave={interactive ? () => setHoverGaDays(null) : undefined}
        onPointerMove={interactive ? (event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          if (!rect.width) return
          const localX = ((event.clientX - rect.left) / rect.width) * width
          const ratio = Math.min(1, Math.max(0, (localX - MARGIN.left) / plotW))
          setHoverGaDays(Math.round(INTERGROWTH2020_EFW_MIN_GA_DAYS + ratio * (INTERGROWTH2020_EFW_MAX_GA_DAYS - INTERGROWTH2020_EFW_MIN_GA_DAYS)))
        } : undefined}
        onKeyDown={interactive ? (event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
          event.preventDefault()
          if (event.key === 'Home') return setHoverGaDays(INTERGROWTH2020_EFW_MIN_GA_DAYS)
          if (event.key === 'End') return setHoverGaDays(INTERGROWTH2020_EFW_MAX_GA_DAYS)
          const delta = event.key === 'ArrowLeft' ? -1 : 1
          setHoverGaDays((current) => Math.min(INTERGROWTH2020_EFW_MAX_GA_DAYS, Math.max(INTERGROWTH2020_EFW_MIN_GA_DAYS, (current ?? preview.ig.gaDays) + delta)))
        } : undefined}
      >
        {pesos.map((g) => (
          <g key={`y-${g}`}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotW}
              y1={y(g)}
              y2={y(g)}
              strokeWidth={1}
              style={reportMode ? { stroke: g === 0 ? '#d1d5db' : '#f3f4f6' } : undefined}
              className={g === 0 ? 'stroke-gray-300 dark:stroke-gray-700' : 'stroke-gray-100 dark:stroke-gray-800'}
            />
            <text x={MARGIN.left - 6} y={y(g)} dy="0.32em" textAnchor="end" className="fill-gray-500 font-mono text-[9px] tabular-nums dark:fill-gray-400">
              <tspan style={reportMode ? { fill: '#6b7280', fontSize: 9 } : undefined}>{g}</tspan>
            </text>
          </g>
        ))}
        {semanas.map((s) => (
          <text
            key={`x-${s}`}
            x={x(s * 7)}
            y={MARGIN.top + plotH + 13}
            textAnchor="middle"
            className="fill-gray-500 font-mono text-[9px] tabular-nums dark:fill-gray-400"
            style={reportMode ? { fill: '#6b7280', fontSize: 9 } : undefined}
          >
            {s}
          </text>
        ))}
        <text x={MARGIN.left + plotW / 2} y={CHART_HEIGHT - 4} textAnchor="middle" className="fill-gray-500 text-[9.5px] dark:fill-gray-400">
          <tspan style={reportMode ? { fill: '#6b7280', fontSize: 9.5 } : undefined}>Idade gestacional (semanas)</tspan>
        </text>
        <text
          transform={`translate(10 ${MARGIN.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-gray-500 text-[9.5px] dark:fill-gray-400"
          style={reportMode ? { fill: '#6b7280', fontSize: 9.5 } : undefined}
        >
          Peso (g)
        </text>
        {CURVES.map((curve) => {
          const style = CURVE_STYLE[curve.label]
          const d = curve.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.gaDays).toFixed(2)} ${y(p.weightG).toFixed(2)}`).join(' ')
          const last = curve.points[curve.points.length - 1]
          return (
            <g key={curve.label}>
              <path d={d} fill="none" strokeWidth={style.width} strokeDasharray={style.dash} className={style.className} style={reportMode ? { stroke: style.color } : undefined} />
              {last && (
                <text x={x(last.gaDays) + 4} y={y(last.weightG)} dy="0.32em" className="fill-gray-500 font-mono text-[8.5px] dark:fill-gray-400">
                  <tspan style={reportMode ? { fill: '#6b7280', fontSize: 8.5 } : undefined}>{curve.label}</tspan>
                </text>
              )}
            </g>
          )
        })}
        <circle cx={px} cy={py} r={4} strokeWidth={1.5} className="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-gray-950" style={reportMode ? { fill: '#059669', stroke: '#ffffff' } : undefined} />
        <text
          x={px + (rotuloADireita ? 8 : -8)}
          y={py}
          dy="0.32em"
          textAnchor={rotuloADireita ? 'start' : 'end'}
          className="fill-emerald-700 text-[10px] font-semibold tabular-nums dark:fill-emerald-300"
          style={reportMode ? { fill: '#047857', fontSize: 10, fontWeight: 600 } : undefined}
        >
          {preview.weightRounded} g (calculado)
        </text>
        {interactive && hoverGaDays !== null ? (
          <g aria-hidden="true" pointerEvents="none">
            <line x1={activeX} x2={activeX} y1={MARGIN.top} y2={MARGIN.top + plotH} stroke="#059669" strokeWidth={1} strokeDasharray="3 3" opacity={0.75} />
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx={5} fill="white" stroke="#d1d5db" />
            <text x={tooltipX + 7} y={tooltipY + 13} fill="#111827" fontSize={9.5} fontWeight={700}>
              {Math.floor(activeGaDays / 7)}+{activeGaDays % 7} semanas
            </text>
            {activeCurves.map((item, index) => (
              <text key={item.label} x={tooltipX + 7} y={tooltipY + 27 + index * 10} fill="#4b5563" fontSize={8.5}>
                {item.label}: {Math.round(item.weightG)} g
              </text>
            ))}
          </g>
        ) : null}
      </svg>
      <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
        <li className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" x2="18" y1="3" y2="3" strokeWidth={1.5} className="stroke-gray-600 dark:stroke-gray-300" />
          </svg>
          P50
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" x2="18" y1="3" y2="3" strokeWidth={1} className="stroke-gray-400 dark:stroke-gray-500" />
          </svg>
          P10 e P90
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" x2="18" y1="3" y2="3" strokeWidth={1} strokeDasharray="4 3" className="stroke-gray-300 dark:stroke-gray-600" />
          </svg>
          P3 e P97
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="4" className="fill-emerald-600 dark:fill-emerald-400" />
          </svg>
          Peso calculado por Hadlock CC/CA/CF (não é o peso informado)
        </li>
      </ul>
    </div>
  )
}

/** Figura derivada do mesmo resultado da prévia. É renderizada no laudo apenas
 * após ação explícita do médico e usa cores fixas para copiar/imprimir sem
 * depender do tema do navegador. */
export function IntergrowthReportFigure({ preview }: { preview: IntergrowthBiometryPreviewResult }) {
  const percentilTexto = formatarPercentilIntergrowth(preview.percentile)
  if (!percentilTexto) return null
  const examDate = preview.dating?.examDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const datingLabel = preview.dating && examDate
    ? `datação pela ${preview.dating.source === 'dum' ? 'DUM' : 'US precoce'} em ${examDate[3]}/${examDate[2]}/${examDate[1]}`
    : null
  return (
    <figure data-report-figure="fetal-growth-intergrowth" className="mt-7 break-inside-avoid border-t border-gray-200 pt-5 text-gray-900">
      <figcaption className="mb-3">
        <strong className="block text-[12px] uppercase tracking-wide">Crescimento fetal · {preview.version}</strong>
        <span className="text-[11px] text-gray-600">
          {preview.weightRounded} g · percentil {percentilTexto} · {formatarIgBiometria(preview.ig)}{datingLabel ? ` · ${datingLabel}` : ''}
        </span>
        <span className="mt-1 block text-[10.5px] text-gray-500">
          Peso próprio da curva, calculado por {preview.formula}; independente do peso estimado exibido no texto do laudo.
        </span>
      </figcaption>
      <IntergrowthChart preview={preview} percentilTexto={percentilTexto} interactive={false} reportMode />
    </figure>
  )
}

/**
 * Prévia somente leitura do padrão INTERGROWTH-21st 2020: calcula o peso
 * Hadlock de 3 parâmetros (CC/CA/CF) a partir da biometria e mostra seu
 * percentil na IG estabelecida pela datação. Não altera peso, percentil nem laudo e não
 * classifica o crescimento. Tudo é derivado das props a cada render, então um
 * estado inválido nunca exibe o resultado anterior.
 */
export function IntergrowthPreview({ biometryState, chaveFemur, igState }: Props) {
  const preview = intergrowthBiometryPreviewFromDating(biometryState, chaveFemur, igState)
  const progressiveWeight = progressiveIntergrowthWeight(biometryState, chaveFemur)
  const percentilTexto = preview ? formatarPercentilIntergrowth(preview.percentile) : null

  return (
    <section className="mb-4 min-w-0" aria-label={`Prévia ${INTERGROWTH2020_EFW_VERSION}`}>
      <div className="mb-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className={HEADING_CLASS}>{INTERGROWTH2020_EFW_VERSION}</h3>
        <span className={LABEL_CLASS}>Prévia · somente leitura</span>
      </div>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">A IG vem da datação por DUM ou ultrassonografia precoce; não é estimada pela biometria atual. Peso e percentil são calculados automaticamente, sem alterar os valores manuais do laudo.</p>
      {preview && percentilTexto ? (
        <div className="min-w-0 space-y-2">
          <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
            <div className="min-w-0">
              <dt className={LABEL_CLASS}>Fórmula</dt>
              <dd className="text-[12px] text-gray-900 dark:text-gray-100">{preview.formula}</dd>
            </div>
            <div className="min-w-0">
              <dt className={LABEL_CLASS}>IG pela datação</dt>
              <dd className="text-[12px] tabular-nums text-gray-900 dark:text-gray-100">{formatarIgBiometria(preview.ig)}</dd>
            </div>
            <div className="min-w-0">
              <dt className={LABEL_CLASS}>Peso calculado</dt>
              <dd className="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">{preview.weightRounded} g</dd>
            </div>
            <div className="min-w-0">
              <dt className={LABEL_CLASS}>Percentil</dt>
              <dd className="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">{percentilTexto}</dd>
            </div>
          </dl>
          <IntergrowthChart preview={preview} percentilTexto={percentilTexto} />
        </div>
      ) : (
        <p role="status" className="text-[12px] text-gray-400 dark:text-gray-500">
          {progressiveWeight
            ? `Peso Hadlock CC/CA/CF: ${progressiveWeight} g. Para percentil e gráfico, informe a datação por DUM ou ultrassonografia precoce, com data do exame.`
            : 'Para calcular o peso da curva, informe CC, CA e CF válidos em mm. Percentil e gráfico também precisam da datação por DUM ou ultrassonografia precoce.'}
        </p>
      )}
    </section>
  )
}
