'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import type { ChaveFemur } from '@/lib/calculators/fetalWeight'
import { INTERGROWTH2020_EFW_VERSION } from '@/lib/calculators/intergrowth2020'
import {
  formatarIgBiometria,
  formatarPercentilIntergrowth,
  intergrowthBiometryPreview,
} from '@/lib/calculators/intergrowthBiometry'
import { IntergrowthPreview } from './IntergrowthPreview'

type Props = {
  open: boolean
  biometryState: Readonly<Record<string, unknown>>
  chaveFemur: ChaveFemur | null
  igState: Readonly<Record<string, unknown>>
  onClose: () => void
}

/**
 * Mesmo padrão de `PreEclampsiaPrintSheet`: as regras de `@media print` vivem
 * dentro do portal e somem com ele ao fechar. O gráfico vem de
 * `IntergrowthPreview`; cores e fonte do SVG são fixadas aqui com seletores
 * escopados para a impressão não depender de variantes Tailwind/dark.
 */
const SHEET_CSS = `
.ig-print-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 16px;
  overflow: auto;
  background: rgba(15, 23, 42, 0.55);
}
.ig-print-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 210mm;
  max-height: calc(100vh - 32px);
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  outline: none;
}
.ig-print-shell:focus-visible { box-shadow: 0 0 0 3px #059669, 0 24px 60px rgba(15, 23, 42, 0.35); }
.ig-print-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 8px 8px 0 0;
  background: #ffffff;
}
.ig-print-toolbar-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  color: #6b7280;
}
.ig-print-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.ig-print-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #059669;
  border-radius: 6px;
  background: #059669;
  color: #ffffff;
  cursor: pointer;
}
.ig-print-btn:hover { background: #047857; border-color: #047857; }
.ig-print-btn:focus-visible { outline: 2px solid #059669; outline-offset: 2px; }
.ig-print-btn-ghost { background: #ffffff; color: #4b5563; border-color: #e5e7eb; }
.ig-print-btn-ghost:hover { background: #f3f4f6; border-color: #e5e7eb; }
.ig-print-scroll { overflow: auto; padding: 14px; background: #f3f4f6; border-radius: 0 0 8px 8px; }
.ig-sheet {
  margin: 0 auto;
  padding: 16mm 14mm;
  max-width: 210mm;
  background: #ffffff;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.ig-sheet-head { padding-bottom: 8px; border-bottom: 1.5px solid #111827; }
.ig-sheet-title { margin: 0; font-size: 14pt; font-weight: 800; letter-spacing: 0; }
.ig-sheet-subtitle { margin: 2px 0 0; font-size: 9pt; color: #4b5563; }
.ig-sheet-block { margin-top: 12px; break-inside: avoid; page-break-inside: avoid; }
.ig-sheet-block-title {
  margin: 0 0 5px;
  font-size: 8.5pt;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
  color: #6b7280;
}
.ig-sheet-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px 14px;
  margin: 0;
  font-size: 10pt;
}
.ig-sheet-grid div { min-width: 0; }
.ig-sheet-grid dt { font-size: 8.5pt; color: #6b7280; }
.ig-sheet-grid dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.ig-sheet-resultado {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  padding: 8px 12px;
  border: 1.5px solid #111827;
  border-radius: 6px;
}
.ig-sheet-valor { margin: 0; font-size: 17pt; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.ig-sheet-valor small { display: block; font-size: 8.5pt; font-weight: 500; color: #4b5563; }
[data-ig-print-root] .ig-sheet-chart section > div:first-child,
[data-ig-print-root] .ig-sheet-chart dl { display: none !important; }
[data-ig-print-root] .ig-sheet-chart section { margin: 0 !important; }
[data-ig-print-root] .ig-sheet-chart svg text { fill: #4b5563 !important; font-family: inherit !important; }
[data-ig-print-root] .ig-sheet-chart svg text[class*="fill-emerald"] { fill: #047857 !important; }
[data-ig-print-root] .ig-sheet-chart svg line { stroke: #f3f4f6 !important; }
[data-ig-print-root] .ig-sheet-chart svg line[class*="stroke-gray-300"] { stroke: #d1d5db !important; }
[data-ig-print-root] .ig-sheet-chart svg path,
[data-ig-print-root] .ig-sheet-chart ul line { stroke: #9ca3af !important; }
[data-ig-print-root] .ig-sheet-chart svg path[stroke-width="1.5"],
[data-ig-print-root] .ig-sheet-chart ul line[stroke-width="1.5"] { stroke: #374151 !important; }
[data-ig-print-root] .ig-sheet-chart svg path[stroke-dasharray],
[data-ig-print-root] .ig-sheet-chart ul line[stroke-dasharray] { stroke: #d1d5db !important; }
[data-ig-print-root] .ig-sheet-chart svg circle { fill: #059669 !important; stroke: #ffffff !important; }
[data-ig-print-root] .ig-sheet-chart ul { color: #4b5563 !important; font-size: 8.5pt !important; }
.ig-sheet-foot {
  margin-top: 14px;
  padding-top: 8px;
  border-top: 1px solid #d1d5db;
  font-size: 8pt;
  line-height: 1.45;
  color: #4b5563;
}
@media (max-width: 640px) {
  .ig-print-overlay { padding: 0; }
  .ig-print-shell { max-height: 100vh; border-radius: 0; }
  .ig-print-toolbar { border-radius: 0; }
  .ig-print-scroll { padding: 8px; border-radius: 0; }
  .ig-sheet { padding: 16px; font-size: 12.5px; }
  .ig-sheet-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media print {
  @page { size: A4; margin: 14mm; }
  html, body {
    background: #ffffff !important;
    height: auto !important;
    overflow: visible !important;
  }
  body > *:not([data-ig-print-root]) { display: none !important; }
  [data-ig-print-root] .ig-print-overlay {
    position: static !important;
    display: block !important;
    padding: 0 !important;
    overflow: visible !important;
    background: none !important;
  }
  [data-ig-print-root] .ig-print-shell {
    display: block !important;
    width: auto !important;
    max-width: none !important;
    max-height: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  [data-ig-print-root] .ig-print-toolbar { display: none !important; }
  [data-ig-print-root] .ig-print-scroll {
    padding: 0 !important;
    overflow: visible !important;
    background: #ffffff !important;
  }
  [data-ig-print-root] .ig-sheet {
    max-width: none !important;
    padding: 0 !important;
    font-size: 10.5pt !important;
  }
}
`

const mm = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 20 })} mm`

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

/**
 * Folha A4 do peso Hadlock CC/CA/CF e percentil INTERGROWTH-21st 2020. Tudo é
 * derivado das props a cada render pelo mesmo helper da prévia; estado inválido
 * não monta o portal, então nunca imprime um resultado anterior.
 */
export function IntergrowthPrintSheet({ open, biometryState, chaveFemur, igState, onClose }: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  const preview = open ? intergrowthBiometryPreview(biometryState, chaveFemur, igState) : null
  const percentilTexto = preview ? formatarPercentilIntergrowth(preview.percentile) : null
  const ativo = preview !== null && percentilTexto !== null

  useEffect(() => {
    if (!ativo) return
    const container = document.createElement('div')
    container.setAttribute('data-ig-print-root', '')
    document.body.appendChild(container)

    const focoAnterior = document.activeElement as HTMLElement | null
    const inertados: Element[] = []
    for (const filho of Array.from(document.body.children)) {
      if (filho === container || filho.hasAttribute('inert')) continue
      filho.setAttribute('inert', '')
      inertados.push(filho)
    }
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Tab') {
        evento.stopPropagation()
        const buttons = shellRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        if (!buttons?.length) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (evento.shiftKey && (document.activeElement === first || document.activeElement === shellRef.current)) {
          evento.preventDefault()
          last.focus()
        } else if (!evento.shiftKey && document.activeElement === last) {
          evento.preventDefault()
          first.focus()
        }
        return
      }
      if (evento.key !== 'Escape') return
      evento.preventDefault()
      evento.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', aoTeclar, true)
    setHost(container)

    return () => {
      try {
        document.removeEventListener('keydown', aoTeclar, true)
        for (const filho of inertados) filho.removeAttribute('inert')
        document.body.style.overflow = overflowAnterior
        container.remove()
      } finally {
        setHost(null)
        if (focoAnterior?.isConnected) focoAnterior.focus()
      }
    }
  }, [ativo, onClose])

  useEffect(() => {
    if (host) shellRef.current?.focus()
  }, [host])

  if (!preview || !percentilTexto || !host) return null

  return createPortal(
    <>
      <style>{SHEET_CSS}</style>
      <div
        className="ig-print-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div
          ref={shellRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          className="ig-print-shell"
        >
          <div className="ig-print-toolbar">
            <p className="ig-print-toolbar-title">Pré-visualização da folha</p>
            <div className="ig-print-actions">
              <button
                type="button"
                className="ig-print-btn"
                title="Imprimir folha"
                aria-label="Imprimir folha"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ig-print-btn ig-print-btn-ghost"
                title="Fechar"
                aria-label="Fechar"
                onClick={onClose}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="ig-print-scroll">
            <article className="ig-sheet">
              <header className="ig-sheet-head">
                <h2 id={tituloId} className="ig-sheet-title">
                  Crescimento fetal — {INTERGROWTH2020_EFW_VERSION}
                </h2>
                <p className="ig-sheet-subtitle">
                  Peso fetal calculado por {preview.formula} a partir da biometria digitada nesta consulta.
                </p>
              </header>

              <section className="ig-sheet-block">
                <h3 className="ig-sheet-block-title">Biometria usada no cálculo</h3>
                <dl className="ig-sheet-grid">
                  <Dado rotulo="IG (origem: biometria)" valor={formatarIgBiometria(preview.ig)} />
                  <Dado rotulo="Circunferência cefálica (CC)" valor={mm(preview.medidasMm.ccMm)} />
                  <Dado rotulo="Circunferência abdominal (CA)" valor={mm(preview.medidasMm.caMm)} />
                  <Dado rotulo="Comprimento do fêmur (CF)" valor={mm(preview.medidasMm.cfMm)} />
                </dl>
              </section>

              <section className="ig-sheet-block">
                <h3 className="ig-sheet-block-title">Resultado</h3>
                <div className="ig-sheet-resultado">
                  <p className="ig-sheet-valor">
                    {preview.weightRounded} g
                    <small>Peso calculado por Hadlock CC/CA/CF (não é o peso informado)</small>
                  </p>
                  <p className="ig-sheet-valor">
                    {percentilTexto}
                    <small>Percentil {INTERGROWTH2020_EFW_VERSION}</small>
                  </p>
                </div>
              </section>

              <section className="ig-sheet-block ig-sheet-chart">
                <h3 className="ig-sheet-block-title">Curvas P3, P10, P50, P90 e P97</h3>
                <IntergrowthPreview biometryState={biometryState} chaveFemur={chaveFemur} igState={igState} />
              </section>

              <footer className="ig-sheet-foot">
                Fonte: {INTERGROWTH2020_EFW_VERSION}, peso fetal estimado por Hadlock CC/CA/CF · DOI 10.1002/uog.22000 ·
                faixa de 18+0 a 40+0 semanas. Folha gerada localmente, sem identificação da paciente; apresenta
                somente medidas e cálculo, sem interpretação clínica.
              </footer>
            </article>
          </div>
        </div>
      </div>
    </>,
    host
  )
}
