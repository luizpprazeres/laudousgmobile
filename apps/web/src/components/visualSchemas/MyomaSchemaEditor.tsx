'use client'

import { useEffect, useMemo, useState, type RefObject } from 'react'
import { FIGO_CATEGORIES, MYOMA_ECHO_LABELS, MYOMA_LOCATION_LABELS, createMyomaSchemeContract, type MyomaEcho, type MyomaFinding, type MyomaLocation } from '@laudousg/schemes'
import type { OrganState } from '@/lib/deterministic'
import { addMyomaToPelvisState, myomaFindingsFromPelvisState, removeMyomaFromPelvisState, updateMyomaInPelvisState } from '@/lib/visualSchemas/myomaAdapter'
import { MyomaSchema } from './MyomaSchema'

type Props = { state: OrganState; onChange: (state: OrganState) => void; svgRef: RefObject<SVGSVGElement> }
const control = 'min-h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950'
export function MyomaSchemaEditor({ state, onChange, svgRef }: Props) {
  const findings = useMemo(() => myomaFindingsFromPelvisState(state), [state])
  const [selectedId, setSelectedId] = useState<string | null>(findings[0]?.id ?? null)
  useEffect(() => { if (!findings.some((item) => item.id === selectedId)) setSelectedId(findings[0]?.id ?? null) }, [findings, selectedId])
  const selected = findings.find((item) => item.id === selectedId) ?? findings[0]
  const contract = createMyomaSchemeContract(findings)
  const update = (patch: Partial<MyomaFinding>) => selected && onChange(updateMyomaInPelvisState(state, { ...selected, ...patch }))
  return <>
    <MyomaSchema findings={findings} selectedId={selected?.id ?? null} svgRef={svgRef} onSelect={setSelectedId} onMove={(id, plane, point) => {
      const finding = findings.find((item) => item.id === id)
      if (finding) onChange(updateMyomaInPelvisState(state, { ...finding, [plane === 'sagittal' ? 'sagittalPoint' : 'axialPoint']: point }))
    }} />
    <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2"><strong className="mr-auto text-sm">Miomas individualizados</strong><span className="text-[11px] text-gray-500">{findings.length}/20</span><button type="button" disabled={findings.length >= 20} onClick={() => onChange(addMyomaToPelvisState(state))} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Adicionar mioma</button></div>
      {findings.length ? <div className="mt-3 flex flex-wrap gap-2">{findings.map((finding, index) => <button key={finding.id} type="button" onClick={() => setSelectedId(finding.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selected?.id === finding.id ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200'}`}>Mioma {index + 1}{finding.figoConfirmed ? ` · FIGO ${finding.figo}` : ' · FIGO pendente'}</button>)}</div> : <p className="mt-3 text-xs text-gray-500">Adicione um mioma para editar posição, classificação, medida e ecotextura.</p>}
      {selected ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label><span className="mb-1 block text-[11px] font-semibold text-gray-500">FIGO confirmado</span><select className={control} value={selected.figoConfirmed ? selected.figo : ''} onChange={(e) => update(e.target.value === '' ? { figoConfirmed: false } : { figo: Number(e.target.value), figoConfirmed: true, sagittalPoint: null })}><option value="">Selecione após revisar</option>{FIGO_CATEGORIES.map((item) => <option key={item.figo} value={item.figo}>{item.figo} · {item.title}</option>)}</select></label>
        <label><span className="mb-1 block text-[11px] font-semibold text-gray-500">Localização</span><select className={control} value={selected.location} onChange={(e) => update({ location: e.target.value as MyomaLocation, axialPoint: null })}>{Object.entries(MYOMA_LOCATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className="mb-1 block text-[11px] font-semibold text-gray-500">Maior medida (mm)</span><input className={control} type="number" min="1" max="500" value={selected.sizeMaxMm ?? ''} onChange={(e) => update({ sizeMaxMm: e.target.value ? Number(e.target.value) : null })} /></label>
        <label><span className="mb-1 block text-[11px] font-semibold text-gray-500">Ecotextura</span><select className={control} value={selected.echo ?? ''} onChange={(e) => update({ echo: e.target.value ? e.target.value as MyomaEcho : null })}><option value="">Não informada</option>{Object.entries(MYOMA_ECHO_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-3"><p className={`text-xs ${contract ? 'text-emerald-700' : 'text-amber-700'}`}>{contract ? 'Contrato myoma-scheme/v1 pronto para envio.' : 'Confirme a classificação FIGO de todos os miomas antes de enviar.'}</p><button type="button" onClick={() => onChange(removeMyomaFromPelvisState(state, selected.id))} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Remover</button></div>
      </div> : null}
    </section>
  </>
}
