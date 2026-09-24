'use client'

import { useMemo } from 'react'
import type { OrganState } from '@/lib/deterministic'
import { buildLiverQuantificationBlock } from '@/lib/deterministic/liverQuantification'

type Props = { state: OrganState; onChange: (next: OrganState) => void }

const setField = (state: OrganState, onChange: Props['onChange'], key: string, value: string) => {
  const next = { ...state, [key]: value }
  // Mudar método/unidade não reinterpreta o número de uma aquisição anterior.
  if (key === 'rigidezUnidade' || key === 'elastografiaModalidade') {
    next.rigidezMediana = ''
    next.rigidezIqr = ''
    if (key === 'elastografiaModalidade') next.rigidezUnidade = ''
  }
  if (key === 'gorduraMetodo' || key === 'gorduraUnidade') {
    next.gorduraValor = ''
    if (key === 'gorduraMetodo') next.gorduraUnidade = ''
  }
  onChange(next)
}

function Toggle({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value === 'sim'} onClick={() => onChange(value === 'sim' ? '' : 'sim')}
      className={`min-h-11 rounded-full border px-3 text-xs font-semibold sm:min-h-8 ${value === 'sim' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
      {label}: {value === 'sim' ? 'sim' : 'não informado'}
    </button>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block min-w-0"><span className="mb-1 block text-[11px] font-semibold text-gray-500">{label}</span><input aria-label={label} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-950 sm:h-8" /></label>
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="block min-w-0"><span className="mb-1 block text-[11px] font-semibold text-gray-500">{label}</span><select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-950 sm:h-8"><option value="">Não informado</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
}

export function LiverQuantificationPanel({ state, onChange }: Props) {
  const result = useMemo(() => buildLiverQuantificationBlock(state), [state])
  const change = (key: string) => (value: string) => setField(state, onChange, key, value)
  const input = (key: string) => typeof state[key] === 'string' ? state[key] as string : ''
  const onNumber = (key: string) => (value: string) => change(key)(value)

  return <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-3 flex flex-wrap gap-2"><Toggle label="Elastografia" value={input('elastografiaAtiva')} onChange={change('elastografiaAtiva')} /><Toggle label="Quantificação de gordura" value={input('gorduraAtiva')} onChange={change('gorduraAtiva')} /></div>
    {input('elastografiaAtiva') === 'sim' ? <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField label="Modalidade" value={input('elastografiaModalidade')} onChange={change('elastografiaModalidade')} options={[["2d-swe", '2D-SWE'], ['pswe', 'pSWE/ARFI'], ['te', 'Transitória']]} />
      <SelectField label="Unidade da rigidez" value={input('rigidezUnidade')} onChange={change('rigidezUnidade')} options={[['kPa', 'kPa'], ['m/s', 'm/s']]} />
      <TextField label="Técnica/protocolo" value={input('elastografiaTecnica')} onChange={change('elastografiaTecnica')} />
      <TextField label="Equipamento" value={input('elastografiaEquipamento')} onChange={change('elastografiaEquipamento')} />
      <TextField label="Nº medições" value={input('rigidezNumeroMedicoes')} onChange={onNumber('rigidezNumeroMedicoes')} />
      <TextField label="Mediana da rigidez" value={input('rigidezMediana')} onChange={onNumber('rigidezMediana')} />
      <TextField label="IQR" value={input('rigidezIqr')} onChange={onNumber('rigidezIqr')} />
      <SelectField label="Qualidade informada" value={input('rigidezQualidade')} onChange={change('rigidezQualidade')} options={[["adequada", 'Adequada'], ['limitada', 'Limitada'], ['nao-realizavel', 'Não realizável']]} />
      <TextField label="Jejum, se registrado" value={input('rigidezJejum')} onChange={change('rigidezJejum')} />
    </div> : null}
    {input('gorduraAtiva') === 'sim' ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField label="Método" value={input('gorduraMetodo')} onChange={change('gorduraMetodo')} options={[["cap", 'CAP'], ['attenuation', 'Atenuação'], ['fraction', 'Fração gordurosa do equipamento']]} />
      <SelectField label="Unidade" value={input('gorduraUnidade')} onChange={change('gorduraUnidade')} options={[["dB/m", 'dB/m'], ['dB/cm/MHz', 'dB/cm/MHz'], ['%', '%']]} />
      <TextField label="Valor informado" value={input('gorduraValor')} onChange={onNumber('gorduraValor')} />
      <TextField label="Tecnologia de quantificação" value={input('gorduraTecnologia')} onChange={change('gorduraTecnologia')} placeholder="ATI, UGAP, UDFF, USFF…" />
      <TextField label="Equipamento" value={input('gorduraEquipamento')} onChange={change('gorduraEquipamento')} />
      <SelectField label="Qualidade informada" value={input('gorduraQualidade')} onChange={change('gorduraQualidade')} options={[["adequada", 'Adequada'], ['limitada', 'Limitada'], ['nao-realizavel', 'Não realizável']]} />
      <TextField label="Jejum, se registrado" value={input('gorduraJejum')} onChange={change('gorduraJejum')} />
    </div> : null}
    {input('elastografiaAtiva') === 'sim' || input('gorduraAtiva') === 'sim' ? <label className="mt-3 block"><span className="mb-1 block text-[11px] font-semibold text-gray-500">Interpretação médica livre</span><textarea value={input('interpretacaoMedica')} onChange={(e) => change('interpretacaoMedica')(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-950" /></label> : null}
    {result.errors.length ? <div role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{result.errors.join(' ')}</div> : null}
    {result.text ? <pre className="mt-3 min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-300">{result.text}</pre> : null}
  </section>
}
