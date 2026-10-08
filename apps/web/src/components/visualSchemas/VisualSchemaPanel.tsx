'use client'

import { useMemo, useRef, useState } from 'react'
import { Download, FileDown, Move, Plus, Radio, Trash2, X } from 'lucide-react'
import type { ExamState, OrganState, TireoideState } from '@/lib/deterministic'
import { createMyomaSchemeContract, type MapaVenoso } from '@laudousg/schemes'
import { addVisualBreastCyst, breastFindingsFromState, moveBreastFinding, moveThyroidFinding, removeVisualBreastCyst, thyroidFindingsFromState } from '@/lib/visualSchemas/adapters'
import { fetalPositionFromState } from '@/lib/visualSchemas/fetalPosition'
import { myomaFindingsFromPelvisState } from '@/lib/visualSchemas/myomaAdapter'
import { carotidVisualFromState, type CarotidVisualSideId } from '@/lib/visualSchemas/carotidAdapter'
import { BreastSchema } from './BreastSchema'
import { FetalPositionSchema } from './FetalPositionSchema'
import { ThyroidSchema } from './ThyroidSchema'
import { VenousSchema } from './VenousSchema'
import { MyomaSchemaEditor } from './MyomaSchemaEditor'
import { CarotidSchema } from './CarotidSchema'
import { base64Only, downloadDataUrl, schemaPdf, schemaPng } from './exportSchema'

type Props = {
  category: 'MAMARIA' | 'TIREOIDE' | 'FETAL_POSITION' | 'VENOUS' | 'MYOMA' | 'CAROTID'
  breastState: OrganState
  fetalState: OrganState
  thyroidState: TireoideState
  venousMap?: MapaVenoso
  myomaState?: OrganState
  carotidState?: ExamState
  onBreastChange: (state: OrganState) => void
  onThyroidChange: (state: TireoideState) => void
  onMyomaChange?: (state: OrganState) => void
  onCarotidSelectSide?: (side: CarotidVisualSideId) => void
  embedded?: boolean
  onClose: () => void
}

export function VisualSchemaPanel({ category, breastState, fetalState, thyroidState, venousMap, myomaState = {}, carotidState = {}, onBreastChange, onThyroidChange, onMyomaChange, onCarotidSelectSide, onClose, embedded = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [status, setStatus] = useState<'idle' | 'working' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const breast = useMemo(() => breastFindingsFromState(breastState), [breastState])
  const breastReportFindings = useMemo(() => breast.filter((finding) => !finding.visualOnly), [breast])
  const visualCysts = useMemo(() => breast.filter((finding) => finding.visualOnly), [breast])
  const multipleCystSources = useMemo(() => breastReportFindings.filter((finding) => breastState[`achados.${finding.id}.tipo`] === 'multiplos_cistos'), [breastReportFindings, breastState])
  const fetalPosition = useMemo(() => fetalPositionFromState(fetalState), [fetalState])
  const thyroid = useMemo(() => thyroidFindingsFromState(thyroidState), [thyroidState])
  const myomas = useMemo(() => myomaFindingsFromPelvisState(myomaState), [myomaState])
  const carotids = useMemo(() => carotidVisualFromState(carotidState), [carotidState])
  const myomaContract = useMemo(() => createMyomaSchemeContract(myomas), [myomas])
  const carotidPlateCount = [...carotids.sides.direita.plates, ...carotids.sides.esquerda.plates]
    .filter((plate) => plate.anchor !== 'unmapped').length
  const findingsCount = category === 'MAMARIA' ? breastReportFindings.length : category === 'TIREOIDE' ? thyroid.length : category === 'VENOUS' ? venousMap?.lesoes.length ?? 0 : category === 'MYOMA' ? myomas.length : category === 'CAROTID' ? carotidPlateCount : 1
  const name = category === 'MAMARIA' ? 'esquema-mamas' : category === 'TIREOIDE' ? 'esquema-tireoide' : category === 'VENOUS' ? 'cartografia-venosa-mmii' : category === 'MYOMA' ? 'esquema-miomas' : category === 'CAROTID' ? 'mapa-carotidas-vertebrais' : 'esquema-posicao-fetal'

  async function createFiles() {
    if (!svgRef.current) throw new Error('O esquema ainda não está pronto.')
    if (svgRef.current.dataset.ready === 'false') {
      throw new Error('A base anatômica ainda está sendo preparada.')
    }
    // A base venosa já tem 2048×3072 px. Ampliá-la 3× criaria um canvas de
    // aproximadamente 240 MB sem acrescentar detalhe e pode derrubar notebooks.
    const png = await schemaPng(svgRef.current, category === 'VENOUS' ? 1 : 3)
    const carotidLandscape = category === 'CAROTID' && svgRef.current.viewBox.baseVal.width > svgRef.current.viewBox.baseVal.height
    const pdf = await schemaPdf(png, category === 'MAMARIA' || category === 'TIREOIDE' || category === 'MYOMA' || carotidLandscape)
    return { png, pdf }
  }

  async function run(action: 'png' | 'pdf' | 'sala') {
    setStatus('working')
    setMessage('Preparando o esquema…')
    try {
      const files = await createFiles()
      if (action === 'png') downloadDataUrl(files.png, `${name}.png`)
      if (action === 'pdf') downloadDataUrl(files.pdf, `${name}.pdf`)
      if (action === 'sala') {
        if (category === 'MYOMA' && !myomaContract) throw new Error('Confirme a classificação FIGO de todos os miomas antes de enviar.')
        const response = await fetch('/api/sala/schema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examType: category === 'MAMARIA' ? 'MAMA' : category === 'TIREOIDE' ? 'TIREOIDE' : category === 'VENOUS' ? 'VENOSO_MMII' : category === 'MYOMA' ? 'MIOMAS' : category === 'CAROTID' ? 'CAROTIDAS' : 'FETAL_POSITION',
            examLabel: category === 'MAMARIA' ? 'Esquema de mamas e axilas' : category === 'TIREOIDE' ? 'Esquema de tireoide' : category === 'VENOUS' ? 'Cartografia venosa dos membros inferiores' : category === 'MYOMA' ? 'Esquema de miomas' : category === 'CAROTID' ? 'Mapa de carótidas e vertebrais' : 'Esquema da posição fetal',
            contractVersion: category === 'MYOMA' ? myomaContract?.contractVersion : undefined,
            findings: category === 'MYOMA' ? myomaContract?.findings : undefined,
            png: base64Only(files.png),
            pdf: base64Only(files.pdf),
          }),
        })
        const body = await response.json().catch(() => null) as { error?: string } | null
        if (!response.ok) throw new Error(body?.error || 'A Sala não recebeu o esquema.')
        setStatus('sent')
        setMessage('Esquema enviado para a Sala.')
        return
      }
      setStatus('idle')
      setMessage('Arquivo pronto.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Não foi possível preparar o esquema.')
    }
  }

  return <section data-visual-schema-inline={embedded || undefined} className={embedded ? "flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1E]" : "flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1C1C1E]"}>
    <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Move className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><h2 className="font-barlow text-lg font-bold">{category === 'VENOUS' ? 'Cartografia venosa' : category === 'CAROTID' ? 'Mapa vascular' : 'Esquema visual'}</h2><p className="text-[11px] text-gray-500">{category === 'FETAL_POSITION' ? 'O desenho acompanha a situação fetal informada no formulário.' : category === 'VENOUS' ? 'Os segmentos alterados são projetados a partir dos mesmos achados estruturados do laudo.' : category === 'CAROTID' ? 'Clique em um lado para abrir seus campos; medidas e placas acompanham o formulário.' : 'Arraste os marcadores. O formulário será atualizado junto.'}</p></div>
      <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={embedded ? "Ocultar esquema" : "Voltar ao laudo"}><X className="h-4 w-4" /></button>
    </header>
    <div className={embedded ? "min-w-0 bg-gray-50 p-2 dark:bg-gray-950/40 sm:p-3" : "min-h-0 flex-1 overflow-auto bg-gray-50 p-4 dark:bg-gray-950/40"}>
      {category === 'MAMARIA'
        ? <>
          <BreastSchema findings={breast} svgRef={svgRef} onMove={(id, position) => onBreastChange(moveBreastFinding(breastState, id, position))} />
          {multipleCystSources.length ? <section className="mt-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-auto">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100">Cistos adicionais no desenho</p>
                <p className="mt-0.5 text-[11px] text-gray-500">Representam a distribuição dos cistos. Somente o maior permanece descrito no laudo.</p>
              </div>
              {multipleCystSources.map((source) => {
                const reportIndex = breastReportFindings.findIndex((finding) => finding.id === source.id) + 1
                return <button
                  key={source.id}
                  type="button"
                  onClick={() => onBreastChange(addVisualBreastCyst(breastState, source.id, crypto.randomUUID()))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                ><Plus className="h-3.5 w-3.5" /> Cisto extra · achado {reportIndex}</button>
              })}
            </div>
            {visualCysts.length ? <div className="mt-2 flex flex-wrap gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
              {visualCysts.map((finding, index) => <span key={finding.id} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                Cisto extra {index + 1} · {finding.side}
                <button type="button" onClick={() => onBreastChange(removeVisualBreastCyst(breastState, finding.id))} className="rounded-full p-0.5 text-gray-400 hover:bg-white hover:text-rose-600 dark:hover:bg-gray-700" aria-label={`Remover cisto extra ${index + 1}`}><Trash2 className="h-3 w-3" /></button>
              </span>)}
            </div> : null}
          </section> : null}
        </>
        : category === 'TIREOIDE'
          ? <ThyroidSchema findings={thyroid} svgRef={svgRef} onMove={(id, position) => onThyroidChange(moveThyroidFinding(thyroidState, id, position))} />
          : category === 'VENOUS'
            ? venousMap
              ? <VenousSchema map={venousMap} svgRef={svgRef} />
              : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">A cartografia ainda não recebeu os achados estruturados deste exame.</p>
            : category === 'MYOMA'
              ? <MyomaSchemaEditor state={myomaState} onChange={onMyomaChange ?? (() => {})} svgRef={svgRef} />
              : category === 'CAROTID'
                ? <CarotidSchema state={carotids} svgRef={svgRef} onSelectSide={onCarotidSelectSide ?? (() => {})} />
              : <FetalPositionSchema position={fetalPosition} svgRef={svgRef} />}
      <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {category === 'FETAL_POSITION'
          ? fetalPosition.title
          : category === 'VENOUS'
            ? findingsCount ? `${findingsCount} ${findingsCount === 1 ? 'alteração vascular projetada' : 'alterações vasculares projetadas'} no mapa.` : 'O mapa permanece anatômico até receber achados estruturados.'
          : category === 'MYOMA'
            ? findingsCount ? `${findingsCount} ${findingsCount === 1 ? 'mioma individualizado' : 'miomas individualizados'} no esquema.` : 'Adicione um mioma para iniciar o esquema.'
          : category === 'CAROTID'
            ? findingsCount ? `${findingsCount} ${findingsCount === 1 ? 'placa projetada' : 'placas projetadas'} no mapa bilateral.` : 'As medidas e a direção do fluxo aparecem conforme o preenchimento.'
          : category === 'MAMARIA' && visualCysts.length
            ? `${findingsCount} ${findingsCount === 1 ? 'achado descrito' : 'achados descritos'} e ${visualCysts.length} ${visualCysts.length === 1 ? 'cisto adicional somente no desenho' : 'cistos adicionais somente no desenho'}.`
            : findingsCount ? `${findingsCount} ${findingsCount === 1 ? 'marcador' : 'marcadores'} no esquema.` : 'Adicione um achado no formulário para ele aparecer aqui.'}
        <span className="ml-1 text-gray-400">O desenho não muda classificações clínicas.</span>
      </div>
      {message ? <p className={`mt-2 text-xs ${status === 'error' ? 'text-rose-600' : status === 'sent' ? 'text-emerald-600' : 'text-gray-500'}`}>{message}</p> : null}
    </div>
    <footer className="flex flex-wrap items-center gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
      <button type="button" disabled={status === 'working'} onClick={() => void run('png')} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"><Download className="h-3.5 w-3.5" /> PNG</button>
      <button type="button" disabled={status === 'working'} onClick={() => void run('pdf')} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"><FileDown className="h-3.5 w-3.5" /> PDF</button>
      <div className="flex-1" />
      <button type="button" disabled={status === 'working'} onClick={() => void run('sala')} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Radio className="h-3.5 w-3.5" /> {status === 'working' ? 'Enviando…' : 'Enviar para a Sala'}</button>
    </footer>
  </section>
}
