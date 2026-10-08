'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { calcularDopplerParcial, DOPPLER_BARCELONA_REFERENCE, type DopplerChartVessel, type VesselResult } from '@laudousg/shared'
import { IntergrowthChart } from './IntergrowthPreview'
import { formatarIgBiometria, formatarPercentilIntergrowth, type IntergrowthBiometryPreviewResult } from '@/lib/calculators/intergrowthBiometry'
import type { StoredPriorGrowthExam } from '@/lib/calculators/growthChartPersistence'
import { formatarRiscoExibicao } from '@/lib/calculators/trisomyFmf'
import { DOPPLER_CHART_VESSELS, dopplerReferenceCurve, hasClinicalCharts, type ClinicalCharts } from '@/lib/calculators/clinicalCharts'

export type ClinicalGrowth = { preview: IntergrowthBiometryPreviewResult; priorExams: readonly StoredPriorGrowthExam[] }

const LABEL: Record<DopplerChartVessel, string> = {
  arteriasUterinas: 'Uterinas · IP médio', arteriaUmbilical: 'Umbilical · IP',
  arteriaCerebralMedia: 'ACM · IP', ratioCerebroplacentario: 'RCP · ACM / umbilical',
}
const decimal = (n: number, digits = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const probability = (p: number) => `${p === 0 ? '0' : p < 0.0001 ? '<0,01' : decimal(p * 100)}%`
const CURVES = Object.fromEntries(DOPPLER_CHART_VESSELS.map(v => [v, dopplerReferenceCurve(v)])) as Record<DopplerChartVessel, ReturnType<typeof dopplerReferenceCurve>>

/** Valores do motor + geometria de apresentação. Nenhuma equação clínica aqui. */
function DopplerGraph({ vessel, result, ga }: { vessel: DopplerChartVessel; result: VesselResult; ga: number }) {
  const points = CURVES[vessel]
  const tooltipId = useId()
  const [explored, setExplored] = useState<number | null>(null)
  const currentIndex = Math.max(0, Math.min(points.length - 1, Math.round((ga - points[0]!.ga) * 7)))
  const exploration = explored !== null ? points[explored] : undefined
  const explorePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const svgX = (event.clientX - rect.left) / rect.width * 360
    setExplored(Math.max(0, Math.min(points.length - 1, Math.round((svgX - 38) / 294 * (points.length - 1)))))
  }
  const exploreKeyboard = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const index = explored ?? currentIndex
    const next = event.key === 'ArrowLeft' ? index - 1 : event.key === 'ArrowRight' ? index + 1 : event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : null
    if (next === null) return
    event.preventDefault()
    event.stopPropagation()
    setExplored(Math.max(0, Math.min(points.length - 1, next)))
  }
  const start = points[0]!.ga, end = points[points.length - 1]!.ga
  const limit = vessel === 'arteriasUterinas' || vessel === 'arteriaUmbilical' ? 'p95' : 'p5'
  const minimum = Math.min(0, result.ip, ...points.map(p => p.p5))
  const maximum = Math.max(result.ip, ...points.map(p => p.p95)) * 1.08
  const x = (age: number) => 38 + (age - start) / (end - start) * 294
  const y = (ip: number) => 100 - (ip - minimum) / (maximum - minimum) * 88
  const endLabels = (['p5', 'p50', 'p95'] as const).map(key => ({ key, value: y(points[points.length - 1]![key]), labelY: 0 })).sort((a, b) => a.value - b.value)
  endLabels.forEach((label, index) => { label.labelY = Math.max(label.value, index ? endLabels[index - 1]!.labelY + 10 : 12) })
  const overflow = Math.max(0, endLabels[endLabels.length - 1]!.labelY - 97)
  endLabels.forEach(label => { label.labelY -= overflow })
  const path = (key: 'p5' | 'p50' | 'p95') => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.ga).toFixed(2)},${y(p[key]).toFixed(2)}`).join(' ')
  return <section className="clinical-chart-card">
    <div className="clinical-chart-heading"><strong>{LABEL[vessel]}</strong><span>{decimal(result.ip)} · p{result.percentileLabel}</span></div>
    <svg viewBox="0 0 360 126" role="img" aria-label={`${LABEL[vessel]}, observado ${decimal(result.ip)}, percentil ${result.percentileLabel}, ${result.pathological ? 'fora' : 'dentro'} do limite ${limit}`} style={{ width: '100%', display: 'block' }}
      tabIndex={0} aria-describedby={tooltipId} aria-keyshortcuts="ArrowLeft ArrowRight Home End"
      onPointerMove={explorePointer} onPointerDown={explorePointer} onPointerLeave={event => { if (event.pointerType === 'mouse') setExplored(null) }}
      onFocus={() => setExplored(index => index ?? currentIndex)} onBlur={() => setExplored(null)} onKeyDown={exploreKeyboard}>
      {[0, 0.5, 1].map(f => { const value = minimum + f * (maximum - minimum); return <g key={f}><path d={`M38 ${y(value)}H332`} stroke="#e5e7eb" /><text x="33" y={y(value) + 3} textAnchor="end" fontSize="9" fill="#475569">{decimal(value, 1)}</text></g> })}
      {(['p5', 'p50', 'p95'] as const).map(key => <g key={key}><path d={path(key)} fill="none" stroke={key === limit ? '#475569' : '#94a3b8'} strokeWidth={key === limit ? 1.7 : 1} strokeDasharray={key === 'p50' ? undefined : '4 3'} />{endLabels.filter(label => label.key === key).map(label => <g key={key}><path d={`M332 ${label.value}L335 ${label.labelY}`} fill="none" stroke="#94a3b8" strokeWidth="0.5" /><text x="337" y={label.labelY + 3} fontSize="9" fill="#475569">{key}</text></g>)}</g>)}
      {[start, Math.round((start + end) / 2), 44].map(age => <text key={age} x={x(age)} y="113" textAnchor="middle" fontSize="9" fill="#475569">{age}</text>)}
      <text x="185" y="125" textAnchor="middle" fontSize="9" fill="#475569">Idade gestacional (semanas)</text>
      <path d={`M${x(ga)} 12V100`} stroke="#cbd5e1" strokeDasharray="2 3" />
      <circle cx={x(ga)} cy={y(result.ip)} r="4.5" fill="#0f172a" stroke="white" strokeWidth="1.5" />
      {exploration ? <g className="clinical-doppler-explore" pointerEvents="none" aria-hidden="true">
        <path d={`M${x(exploration.ga)} 12V100`} stroke="#0369a1" strokeDasharray="3 2" />
        <rect x={Math.max(40, Math.min(168, x(exploration.ga) - 80))} y="14" width="164" height="43" rx="4" fill="white" stroke="#64748b" />
        <text x={Math.max(46, Math.min(174, x(exploration.ga) - 74))} y="27" fontSize="10" fill="#0f172a">
          <tspan>IG {Math.floor(Math.round(exploration.ga * 7) / 7)}s{Math.round(exploration.ga * 7) % 7}d</tspan>
          <tspan x={Math.max(46, Math.min(174, x(exploration.ga) - 74))} dy="12">p5 {decimal(exploration.p5)} · p50 {decimal(exploration.p50)}</tspan>
          <tspan x={Math.max(46, Math.min(174, x(exploration.ga) - 74))} dy="12">p95 {decimal(exploration.p95)}</tspan>
        </text>
      </g> : null}
    </svg>
    <span id={tooltipId} role="status" aria-live="polite" className="clinical-doppler-status">{exploration
      ? `IG ${Math.floor(Math.round(exploration.ga * 7) / 7)}s${Math.round(exploration.ga * 7) % 7}d: p5 ${decimal(exploration.p5)}, p50 ${decimal(exploration.p50)}, p95 ${decimal(exploration.p95)}.`
      : 'Explore com mouse ou toque. No teclado, use as setas esquerda/direita, Home e End.'}</span>
    <p className="clinical-chart-note">{limit} · {result.pathological ? 'Fora da referência' : 'Dentro da referência'}</p>
  </section>
}

export const CLINICAL_CHART_CSS = `
.clinical-page { box-sizing:border-box; width:100%; max-width:190mm; margin:0 auto; padding:7mm; color:#0f172a; background:white; font:12px/1.35 Arial,sans-serif; }
.clinical-page * { box-sizing:border-box; }
.clinical-doppler-status { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
.clinical-chart-card svg:focus-visible { outline:2px solid #0369a1; outline-offset:2px; }
.clinical-page h2 { margin:0; font-size:19px; }
.clinical-page h3 { margin:0 0 8px; font-size:14px; }
.clinical-page p { margin:4px 0; }
.clinical-page-header { border-bottom:2px solid #334155; padding-bottom:9px; margin-bottom:12px; }
.clinical-chart-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
.clinical-chart-card { min-width:0; border:1px solid #d1d5db; border-radius:7px; padding:8px; break-inside:avoid; }
.clinical-chart-heading { display:flex; flex-wrap:wrap; gap:3px 8px; justify-content:space-between; font-size:12px; }
.clinical-page .clinical-chart-note { font-size:10px; color:#475569; margin:2px 0; }
.clinical-growth-block { break-inside:avoid; margin-bottom:12px; }

.clinical-growth-block .mt-2 { margin-top:3px; }
.clinical-chart-grid { break-inside:avoid; }
.clinical-risk-block { border-top:1px solid #cbd5e1; padding-top:7px; margin-top:9px; break-inside:avoid; }
.clinical-risk-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.clinical-risk-grid strong { display:block; font-size:17px; }
.clinical-page table { width:100%; border-collapse:collapse; font-size:12px; font-variant-numeric:tabular-nums; }
.clinical-page th,.clinical-page td { padding:4px 8px; border-bottom:1px solid #e2e8f0; text-align:left; }
.clinical-validation { border:1px solid #a16207; padding:4px 8px; font-size:10px; color:#713f12; margin:6px 0; }
.clinical-page .clinical-reference { margin:4px 0; font-size:9px; color:#475569; overflow-wrap:anywhere; }
.clinical-print-overlay { position:fixed; inset:0; z-index:2147483000; padding:16px; background:rgba(15,23,42,.55); display:flex; justify-content:center; }
.clinical-print-shell { width:210mm; max-width:100%; background:white; color:#0f172a; display:flex; flex-direction:column; border-radius:12px; overflow:hidden; }
.clinical-print-toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; padding:12px; border-bottom:1px solid #e2e8f0; font:13px Arial,sans-serif; }
.clinical-print-toolbar button { border:1px solid #cbd5e1; background:white; border-radius:6px; padding:8px 12px; cursor:pointer; }
.clinical-print-scroll { overflow:auto; padding:12px; background:#f1f5f9; }
@media(max-width:500px) { .clinical-page { padding:12px; } .clinical-chart-grid { grid-template-columns:1fr; } .clinical-print-overlay { padding:0; } .clinical-print-scroll { padding:0; } }
`
const PRINT_CSS = `
@media print {
 @page { size:A4 portrait; margin:10mm; }
 html,body { margin:0!important; padding:0!important; overflow:visible!important; background:white!important; }
 body > *:not([data-clinical-print-root]) { display:none!important; }
 [data-clinical-print-root] .clinical-print-overlay { position:static; display:block; padding:0; background:white; }
 [data-clinical-print-root] .clinical-print-shell { display:block; width:190mm; max-width:none; overflow:visible; border-radius:0; }
 [data-clinical-print-root] .clinical-print-toolbar { display:none!important; }
 [data-clinical-print-root] .clinical-print-scroll { overflow:visible; padding:0; background:white; }
 [data-clinical-print-root] .clinical-page { width:190mm; padding:0; margin:0; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
 [data-clinical-print-root] .clinical-chart-card svg { outline:none!important; }
 [data-clinical-print-root] .clinical-doppler-explore, [data-clinical-print-root] .clinical-doppler-status { display:none!important; }
 [data-clinical-print-root] .clinical-chart-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
`

export function ClinicalChartsFigure({ charts, growth }: { charts: ClinicalCharts; growth?: ClinicalGrowth }) {
  if (!hasClinicalCharts(charts) && !growth) return null
  const doppler = charts.doppler ? calcularDopplerParcial(charts.doppler) : {}
  const pe = charts.pe, trisomy = charts.trisomy
  return <article className="clinical-page" data-clinical-page="">
    <style>{CLINICAL_CHART_CSS}</style>
    <header className="clinical-page-header"><h2>Avaliação obstétrica · gráficos e riscos</h2><p className="clinical-chart-note">LaudoUSG · Dados do exame e das calculadoras. Confira a idade gestacional em cada bloco.</p></header>
    {growth ? <section className="clinical-growth-block" data-report-figure="fetal-growth-intergrowth">
      <h3>Crescimento fetal</h3>
      <p>{growth.preview.version} · PFE {growth.preview.weightRounded} g · {formatarIgBiometria(growth.preview.ig)} · percentil {formatarPercentilIntergrowth(growth.preview.percentile)} · datação por {growth.preview.dating?.source === 'dum' ? 'DUM' : 'ultrassom precoce'} · exame em {growth.preview.dating?.examDate.split('-').reverse().join('/') ?? 'data não informada'}.</p>
      <p className="clinical-chart-note">CC {growth.preview.medidasMm.ccMm} mm · CA {growth.preview.medidasMm.caMm} mm · CF {growth.preview.medidasMm.cfMm} mm.</p>
      <IntergrowthChart preview={growth.preview} percentilTexto={formatarPercentilIntergrowth(growth.preview.percentile) ?? 'não disponível'} priorExams={growth.priorExams} interactive={false} reportMode compact chartHeight={150} />
      {growth.priorExams.map(exam => <p key={exam.examDate} className="clinical-chart-note">Anterior: {exam.examDate.split('-').reverse().join('/')} · {Math.floor(exam.gestationalAgeDays / 7)}s{exam.gestationalAgeDays % 7}d · PFE manual {exam.weightGrams} g · p{formatarPercentilIntergrowth(exam.percentile)}.</p>)}
      <p className="clinical-reference">{growth.preview.formula} · IG anterior derivada da datação atual. Pontos: atual calculado / anterior informado; curvas P3, P10, P50, P90 e P97.</p>
    </section> : null}
    {charts.doppler ? <section>
      <h3>Doppler · {charts.doppler.weeks}s{charts.doppler.days}d</h3>
      <div className="clinical-chart-grid">{DOPPLER_CHART_VESSELS.map(v => {
        const result = doppler[v]
        if (!result || !Number.isFinite(result.zscore) || v === 'ratioCerebroplacentario' && charts.doppler?.suppressRcp) return null
        return <DopplerGraph key={v} vessel={v} result={result} ga={charts.doppler!.weeks + charts.doppler!.days / 7} />
      })}</div>
      {charts.doppler.suppressRcp ? <p className="clinical-chart-note">RCP: gráfico omitido porque o valor informado difere da razão dos IPs.</p> : null}
      <p className="clinical-reference">{DOPPLER_BARCELONA_REFERENCE} Limites gráficos z = ±1,645; rótulos de percentil conforme o motor Barcelona.</p>
    </section> : null}
    {pe ? <section className="clinical-risk-block">
      <h3>Pré-eclâmpsia · {Math.floor(pe.gestante.gaDias / 7)}s{pe.gestante.gaDias % 7}d</h3>
      <div className="clinical-risk-grid">{([37, 34, 32] as const).map(week => <div key={week}><span>Parto com PE &lt;{week} semanas</span><strong>{probability(pe.resultado.riscos[week])}</strong></div>)}</div>
      <p>MoM utilizados: {pe.resultado.marcadores.length ? pe.resultado.marcadores.map(m => `${m.nome === 'map' ? 'PAM' : 'IP uterino'} ${decimal(m.mom, 3)}${m.truncado ? ' (truncado pelo modelo)' : ''}`).join(' · ') : 'nenhum; fatores maternos apenas'}.</p>
      <p className="clinical-chart-note">{pe.medidas.pamMmHg != null ? `PAM ${decimal(pe.medidas.pamMmHg, 1)} mmHg · ${pe.medidas.afericoesPam ?? 0} aferições. ` : ''}{pe.medidas.utaPiMedio != null ? `IP uterino médio ${decimal(pe.medidas.utaPiMedio)}. ` : ''}Risco condicionado à IG atual pelo modelo.</p>
      {pe.medidas.pamMmHg != null && (pe.medidas.afericoesPam ?? 0) < 4 ? <p className="clinical-chart-note">Protocolo de PAM incompleto: menos de quatro aferições.</p> : null}
      <p className="clinical-reference">FMF · Modelo de riscos competitivos (Wright et al., AJOG 2020). {pe.resultado.versaoParametros}. Não constitui software certificado pela FMF.</p>
    </section> : null}
    {trisomy ? <section className="clinical-risk-block">
      <h3>Trissomias · 1º trimestre · CCN {decimal(trisomy.input.crl, 1)} mm · TN {decimal(trisomy.input.nt, 1)} mm</h3>
      <div className="clinical-validation">Validação clínica pendente · Modo de homologação. O resultado ainda não deve ser usado isoladamente para decisão clínica.</div>
      <table><thead><tr><th>Trissomia</th><th>Risco basal</th><th>Risco ajustado</th></tr></thead><tbody>{(['t21', 't18', 't13'] as const).map(key => <tr key={key}><th>{key.toUpperCase()}</th><td>{formatarRiscoExibicao(trisomy.result.basal[key], trisomy.result)}</td><td><strong>{formatarRiscoExibicao(trisomy.result[key], trisomy.result)}</strong></td></tr>)}</tbody></table>
      <p className="clinical-chart-note">Marcadores utilizados: {trisomy.result.markersUsed.join(', ')}.</p>
      {trisomy.result.warnings.map(w => <p key={w} className="clinical-chart-note">{w}</p>)}
      <p className="clinical-reference">Fetal Medicine Foundation · {trisomy.result.modelVersion}. Feto único; CCN 45–84 mm. Riscos exibidos com os limites de apresentação do motor.</p>
    </section> : null}
  </article>
}

export function ClinicalChartsPrintSheet({ charts, growth, open, onClose }: { charts: ClinicalCharts; growth?: ClinicalGrowth; open: boolean; onClose: () => void }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const shell = useRef<HTMLDivElement>(null)
  const title = useId()
  const active = open && (hasClinicalCharts(charts) || Boolean(growth))
  useEffect(() => {
    if (!active) return
    const container = document.createElement('div')
    container.setAttribute('data-clinical-print-root', '')
    document.body.appendChild(container)
    const focus = document.activeElement as HTMLElement | null
    const inert: Element[] = []
    for (const child of Array.from(document.body.children)) {
      if (child === container || child.hasAttribute('inert')) continue
      child.setAttribute('inert', ''); inert.push(child)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        event.stopPropagation()
        const buttons = shell.current?.querySelectorAll<HTMLButtonElement>('button')
        if (!buttons?.length) return
        const first = buttons[0]!, last = buttons[buttons.length - 1]!
        if (event.shiftKey && (document.activeElement === first || document.activeElement === shell.current)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', keydown, true)
    setHost(container)
    return () => {
      document.removeEventListener('keydown', keydown, true)
      inert.forEach(child => child.removeAttribute('inert'))
      document.body.style.overflow = overflow
      container.remove(); setHost(null)
      if (focus?.isConnected) focus.focus()
    }
  }, [active, onClose])
  useEffect(() => { if (host) shell.current?.focus() }, [host])
  if (!active || !host) return null
  return createPortal(<div className="clinical-print-overlay" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <style>{CLINICAL_CHART_CSS}{PRINT_CSS}</style>
    <div ref={shell} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title} className="clinical-print-shell">
      <div className="clinical-print-toolbar"><strong id={title}>Página clínica · A4</strong><div><button type="button" onClick={() => window.print()}>Imprimir / Salvar PDF</button> <button type="button" onClick={onClose}>Fechar</button></div></div>
      <div className="clinical-print-scroll"><ClinicalChartsFigure charts={charts} growth={growth} /></div>
    </div>
  </div>, host)
}

export function ClinicalChartsPanel({ charts, growth, included, onInclude, onOpen }: { charts: ClinicalCharts; growth?: ClinicalGrowth; included: boolean; onInclude: (include: boolean) => void; onOpen?: () => void }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  useEffect(() => { if (!hasClinicalCharts(charts) && !growth) setOpen(false) }, [charts, growth])
  if (!hasClinicalCharts(charts) && !growth) return null
  return <div className="my-3 rounded-xl border border-gray-200 p-3 font-sans dark:border-gray-700">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">{hasClinicalCharts(charts) ? <label className="flex items-center gap-2"><input type="checkbox" checked={included} onChange={e => onInclude(e.target.checked)} />Incluir Doppler e riscos no laudo salvo</label> : <span>Crescimento incluído no laudo</span>}<button type="button" className="rounded-lg border px-3 py-2" onClick={onOpen ?? (() => setOpen(true))}>Página clínica / PDF</button></div>
    {!onOpen ? <ClinicalChartsPrintSheet open={open} charts={charts} growth={growth} onClose={close} /> : null}
  </div>
}
