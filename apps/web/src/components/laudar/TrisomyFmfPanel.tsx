'use client'

import { useMemo, useState } from 'react'
import { FilePlus2, X } from 'lucide-react'
import { calculateTrisomyWeb, type TrisomyWebForm } from '@/lib/calculators/trisomyFmf'

type Props = {
  initialValues?: Partial<TrisomyWebForm>
  insertedBlock?: string
  onInsert: (block: string) => void
  onRemove: () => void
}

const INITIAL: TrisomyWebForm = {
  maternalAge: '', crl: '', nt: '', fhr: '', ethnicity: 'white', weight: '', smoking: false,
  previousT21: false, previousT18: false, previousT13: false,
  freeBetaHcgMoM: '', pappaMoM: '', isMoMCorrected: false, dvPI: '', tricuspid: '', nasalBone: '',
}

const inputClass = 'mt-1 h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-violet-900/50'
const labelClass = 'font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400'

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><span className={labelClass}>{label}</span><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} inputMode="decimal" className={inputClass} /></label>
}

function Toggle({ label, active, onChange }: { label: string; active: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" aria-pressed={active} onClick={() => onChange(!active)} className={`rounded-lg border px-2.5 py-2 text-left text-[12px] font-semibold ${active ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>{label}</button>
}

export function TrisomyFmfPanel({ initialValues, insertedBlock, onInsert, onRemove }: Props) {
  const [form, setForm] = useState<TrisomyWebForm>(() => ({ ...INITIAL, ...initialValues }))
  const set = <K extends keyof TrisomyWebForm>(key: K, value: TrisomyWebForm[K]) => setForm(current => ({ ...current, [key]: value }))
  const ready = Boolean(form.maternalAge.trim() && form.crl.trim() && form.nt.trim())
  const calculation = useMemo(() => {
    if (!ready) return { status: 'waiting' as const }
    try { return { status: 'done' as const, value: calculateTrisomyWeb(form) } }
    catch (error) { return { status: 'error' as const, message: error instanceof Error ? error.message : 'Não foi possível calcular.' } }
  }, [form, ready])
  const value = calculation.status === 'done' ? calculation.value : null
  const currentInserted = Boolean(value && insertedBlock === value.block)

  return <section className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-900/60 dark:bg-gray-900">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-barlow text-lg font-bold">Rastreamento de trissomias — 1º trimestre</h3><p className="mt-1 text-xs text-gray-500">T21, T18 e T13. CCN entre 45 e 84 mm. Feto único.</p></div>
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-900 dark:bg-amber-950 dark:text-amber-200">Validação clínica pendente</span>
    </div>

    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Modo de homologação. O resultado ainda não deve ser usado isoladamente para decisão clínica.</div>

    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Field label="Idade na DPP" value={form.maternalAge} onChange={v => set('maternalAge', v)} placeholder="32" />
      <Field label="CCN (mm)" value={form.crl} onChange={v => set('crl', v)} placeholder="64" />
      <Field label="TN (mm)" value={form.nt} onChange={v => set('nt', v)} placeholder="1,5" />
      <Field label="FCF (bpm)" value={form.fhr} onChange={v => set('fhr', v)} placeholder="160" />
      <Field label="Peso materno (kg)" value={form.weight} onChange={v => set('weight', v)} placeholder="70" />
      <label className="block"><span className={labelClass}>Etnia</span><select value={form.ethnicity} onChange={event => set('ethnicity', event.target.value as TrisomyWebForm['ethnicity'])} className={inputClass}><option value="white">Branca</option><option value="black">Negra</option><option value="south_asian">Sul-asiática</option><option value="east_asian">Leste-asiática</option><option value="mixed">Mista</option></select></label>
      <Field label="IP ducto venoso" value={form.dvPI} onChange={v => set('dvPI', v)} placeholder="1,0" />
      <label className="block"><span className={labelClass}>Osso nasal</span><select value={form.nasalBone} onChange={event => set('nasalBone', event.target.value as TrisomyWebForm['nasalBone'])} className={inputClass}><option value="">Não informado</option><option value="present">Presente</option><option value="absent">Ausente</option></select></label>
      <label className="block"><span className={labelClass}>Regurgitação tricúspide</span><select value={form.tricuspid} onChange={event => set('tricuspid', event.target.value as TrisomyWebForm['tricuspid'])} className={inputClass}><option value="">Não avaliada</option><option value="normal">Ausente</option><option value="regurgitation">Presente</option></select></label>
    </div>

    <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      <Toggle label="Fumante" active={form.smoking} onChange={v => set('smoking', v)} />
      <Toggle label="Trissomia 21 anterior" active={form.previousT21} onChange={v => set('previousT21', v)} />
      <Toggle label="Trissomia 18 anterior" active={form.previousT18} onChange={v => set('previousT18', v)} />
      <Toggle label="Trissomia 13 anterior" active={form.previousT13} onChange={v => set('previousT13', v)} />
    </div>

    <details className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <summary className="cursor-pointer text-xs font-bold">Bioquímica opcional</summary>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-lg"><Field label="Free β-hCG (MoM)" value={form.freeBetaHcgMoM} onChange={v => set('freeBetaHcgMoM', v)} /><Field label="PAPP-A (MoM)" value={form.pappaMoM} onChange={v => set('pappaMoM', v)} /></div>
      <label className="mt-3 flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-300"><input type="checkbox" checked={form.isMoMCorrected} onChange={event => set('isMoMCorrected', event.target.checked)} className="mt-0.5" />Confirmo que os valores foram informados como MoM já corrigidos pelo laboratório.</label>
    </details>

    <div className={`mt-4 rounded-xl border p-3 ${calculation.status === 'error' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-violet-100 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20'}`}>
      {calculation.status === 'waiting' ? <p className="text-xs text-gray-500">Preencha idade, CCN e TN.</p> : calculation.status === 'error' ? <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-300">{calculation.message}</p> : value ? <>
        <div className="grid gap-2 sm:grid-cols-3">{(['t21', 't18', 't13'] as const).map(key => <div key={key} className="rounded-lg bg-white p-2.5 dark:bg-gray-950"><div className={labelClass}>{key.toUpperCase()}</div><div className="mt-1 text-lg font-extrabold">1 em {value.result[key].ratio.toLocaleString('pt-BR')}</div><div className="text-[10px] text-gray-500">basal: 1 em {value.result.basal[key].ratio.toLocaleString('pt-BR')}</div></div>)}</div>
        <p className="mt-3 text-[11px] text-gray-600 dark:text-gray-300">Usados: {value.result.markersUsed.join(', ')}.</p>
        {value.result.warnings.map(warning => <p key={warning} className="mt-1 text-[11px] font-semibold text-amber-800 dark:text-amber-200">{warning}</p>)}
        <pre className="mt-3 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 font-sans text-[11px] leading-relaxed dark:bg-gray-950">{value.block}</pre>
      </> : null}
      <div className="mt-3 flex gap-2">{value ? <button type="button" disabled={currentInserted} onClick={() => onInsert(value.block)} className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><FilePlus2 className="h-3.5 w-3.5" />{currentInserted ? 'Inserido no laudo' : insertedBlock ? 'Atualizar no laudo' : 'Inserir no laudo'}</button> : null}{insertedBlock ? <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs"><X className="h-3.5 w-3.5" />Remover</button> : null}</div>
    </div>
  </section>
}
