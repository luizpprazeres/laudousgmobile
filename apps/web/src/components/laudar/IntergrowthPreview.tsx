'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChaveFemur } from '@/lib/calculators/fetalWeight'
import {
  INTERGROWTH2020_EFW_MAX_GA_DAYS,
  INTERGROWTH2020_EFW_MIN_GA_DAYS,
  INTERGROWTH2020_EFW_VERSION,
} from '@/lib/calculators/intergrowth2020'
import {
  formatarIgBiometria,
  formatarPercentilIntergrowth,
  intergrowthBiometryPreview,
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

const CURVE_STYLE: Record<IntergrowthCurve['label'], { className: string; width: number; dash?: string }> = {
  P3: { className: 'stroke-gray-300 dark:stroke-gray-600', width: 1, dash: '4 3' },
  P10: { className: 'stroke-gray-400 dark:stroke-gray-500', width: 1 },
  P50: { className: 'stroke-gray-600 dark:stroke-gray-300', width: 1.5 },
  P90: { className: 'stroke-gray-400 dark:stroke-gray-500', width: 1 },
  P97: { className: 'stroke-gray-300 dark:stroke-gray-600', width: 1, dash: '4 3' },
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
function IntergrowthChart({ preview, percentilTexto }: { preview: IntergrowthBiometryPreviewResult; percentilTexto: string }) {
  const [ref, largura] = useLarguraElemento<HTMLDivElement>()
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
      >
        {pesos.map((g) => (
          <g key={`y-${g}`}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotW}
              y1={y(g)}
              y2={y(g)}
              strokeWidth={1}
              className={g === 0 ? 'stroke-gray-300 dark:stroke-gray-700' : 'stroke-gray-100 dark:stroke-gray-800'}
            />
            <text x={MARGIN.left - 6} y={y(g)} dy="0.32em" textAnchor="end" className="fill-gray-500 font-mono text-[9px] tabular-nums dark:fill-gray-400">
              {g}
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
          >
            {s}
          </text>
        ))}
        <text x={MARGIN.left + plotW / 2} y={CHART_HEIGHT - 4} textAnchor="middle" className="fill-gray-500 text-[9.5px] dark:fill-gray-400">
          Idade gestacional (semanas)
        </text>
        <text
          transform={`translate(10 ${MARGIN.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-gray-500 text-[9.5px] dark:fill-gray-400"
        >
          Peso (g)
        </text>
        {CURVES.map((curve) => {
          const style = CURVE_STYLE[curve.label]
          const d = curve.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.gaDays).toFixed(2)} ${y(p.weightG).toFixed(2)}`).join(' ')
          const last = curve.points[curve.points.length - 1]
          return (
            <g key={curve.label}>
              <path d={d} fill="none" strokeWidth={style.width} strokeDasharray={style.dash} className={style.className} />
              {last && (
                <text x={x(last.gaDays) + 4} y={y(last.weightG)} dy="0.32em" className="fill-gray-500 font-mono text-[8.5px] dark:fill-gray-400">
                  {curve.label}
                </text>
              )}
            </g>
          )
        })}
        <circle cx={px} cy={py} r={4} strokeWidth={1.5} className="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-gray-950" />
        <text
          x={px + (rotuloADireita ? 8 : -8)}
          y={py}
          dy="0.32em"
          textAnchor={rotuloADireita ? 'start' : 'end'}
          className="fill-emerald-700 text-[10px] font-semibold tabular-nums dark:fill-emerald-300"
        >
          {preview.weightRounded} g (calculado)
        </text>
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

/**
 * Prévia somente leitura do padrão INTERGROWTH-21st 2020: calcula o peso
 * Hadlock de 3 parâmetros (CC/CA/CF) a partir da biometria e mostra seu
 * percentil na IG informada. Não altera peso, percentil nem laudo e não
 * classifica o crescimento. Tudo é derivado das props a cada render, então um
 * estado inválido nunca exibe o resultado anterior.
 */
export function IntergrowthPreview({ biometryState, chaveFemur, igState }: Props) {
  const preview = intergrowthBiometryPreview(biometryState, chaveFemur, igState)
  const percentilTexto = preview ? formatarPercentilIntergrowth(preview.percentile) : null

  return (
    <section className="mb-4 min-w-0" aria-label={`Prévia ${INTERGROWTH2020_EFW_VERSION}`}>
      <div className="mb-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className={HEADING_CLASS}>{INTERGROWTH2020_EFW_VERSION}</h3>
        <span className={LABEL_CLASS}>Prévia · somente leitura</span>
      </div>
      {preview && percentilTexto ? (
        <div className="min-w-0 space-y-2">
          <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
            <div className="min-w-0">
              <dt className={LABEL_CLASS}>Fórmula</dt>
              <dd className="text-[12px] text-gray-900 dark:text-gray-100">{preview.formula}</dd>
            </div>
            <div className="min-w-0">
              <dt className={LABEL_CLASS}>IG da biometria</dt>
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
          Dados incompletos: informe CC, CA e CF em mm e IG entre 18+0 e 40+0 semanas.
        </p>
      )}
    </section>
  )
}
