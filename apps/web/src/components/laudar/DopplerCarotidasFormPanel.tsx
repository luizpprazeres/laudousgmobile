'use client'

import { Plus, X } from 'lucide-react'
import type { OrganState } from '@/lib/deterministic'

type Props = { section: string; state: OrganState; onChange: (next: OrganState) => void }

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return <label className="block"><span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{label}</span><input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-emerald-900/50" /></label>
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void }) {
  return <label className="block"><span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] dark:border-gray-700 dark:bg-gray-950">{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
}

const value = (s: OrganState, k: string) => typeof s[k] === 'string' ? s[k] as string : ''

export function DopplerCarotidasFormPanel({ section, state, onChange }: Props) {
  const set = (key: string, v: string | string[]) => onChange({ ...state, [key]: v })
  if (section === 'conclusao') return <div className="space-y-3">
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Classificação informada pelo médico" value={value(state, 'classificacao')} onChange={(v) => set('classificacao', v)} options={[["normal","Normal"],["ateromatose_sem_estenose_significativa","Ateromatose sem estenose significativa"],["estenose_menor_50","Estenose menor que 50%"],["estenose_50_69","Estenose de 50 a 69%"],["estenose_70_99","Estenose de 70 a 99%"],["oclusao","Oclusão"],["","Não classificar"]]} />
        <Select label="Lado da classificação" value={value(state, 'lado')} onChange={(v) => set('lado', v)} options={[["","Não se aplica"],["direita","Direita"],["esquerda","Esquerda"],["bilateral","Bilateral"]]} />
      </div>
      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">A classificação não é calculada pelas velocidades. Selecione somente quando tiver sido definida pelo médico.</p>
    </section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><Field label="Conclusão livre (opcional, substitui a automática)" value={value(state, 'conclusao_livre')} onChange={(v) => set('conclusao_livre', v)} /><div className="mt-3"><Field label="Achados adicionais" value={value(state, 'achados_adicionais')} onChange={(v) => set('achados_adicionais', v)} /></div></section>
  </div>

  const ids = Array.isArray(state.placas_ids) ? state.placas_ids as string[] : []
  const conflicts = Array.isArray(state.companion_conflitos) ? state.companion_conflitos as string[] : []
  const addPlate = () => set('placas_ids', [...ids, crypto.randomUUID()])
  const removePlate = (id: string) => {
    const next: OrganState = { ...state, placas_ids: ids.filter((item) => item !== id) }
    for (const key of Object.keys(next)) if (key.startsWith(`placas.${id}.`)) delete next[key]
    onChange(next)
  }
  return <div className="space-y-3">
    {conflicts.length ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><strong>As imagens trouxeram valores diferentes.</strong><div className="mt-1">Revise e preencha manualmente: {conflicts.join(' · ')}</div></div> : null}
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Morfologia</h3>
      <Field label="Espessura médio-intimal (mm)" value={value(state, 'emi')} placeholder="0,7" onChange={(v) => set('emi', v)} />
    </section>
    {([['comum','Carótida comum'],['interna','Carótida interna'],['externa','Carótida externa']] as const).map(([key,label]) => <section key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</h3><div className="grid grid-cols-2 gap-3"><Field label="PSV (cm/s)" value={value(state, `${key}_vps`)} onChange={(v) => set(`${key}_vps`, v)} /><Field label="VDF (cm/s)" value={value(state, `${key}_vdf`)} onChange={(v) => set(`${key}_vdf`, v)} /></div></section>)}
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Artéria vertebral</h3><div className="grid grid-cols-2 gap-3"><Field label="PSV (cm/s)" value={value(state, 'vertebral_vps')} onChange={(v) => set('vertebral_vps', v)} /><Select label="Direção do fluxo" value={value(state, 'vertebral_direcao')} onChange={(v) => set('vertebral_direcao', v)} options={[["anterogrado","Anterógrado"],["retrogrado","Retrógrado"],["ausente","Ausente"],["","Não informado"]]} /></div></section>
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="mb-3 flex items-center justify-between"><h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Placas</h3><button type="button" onClick={addPlate} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />Adicionar</button></div>{ids.length === 0 ? <p className="text-sm text-gray-500">Nenhuma placa registrada.</p> : <div className="space-y-3">{ids.map((id, i) => <div key={id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950"><div className="mb-2 flex justify-between"><strong className="text-sm">Placa {i+1}</strong><button type="button" onClick={() => removePlate(id)} aria-label="Remover placa"><X className="h-4 w-4 text-gray-400" /></button></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Localização" value={value(state, `placas.${id}.localizacao`)} placeholder="bulbo carotídeo" onChange={(v) => set(`placas.${id}.localizacao`, v)} /><Select label="Composição" value={value(state, `placas.${id}.composicao`)} onChange={(v) => set(`placas.${id}.composicao`, v)} options={[["","Não informada"],["calcificada","Calcificada"],["lipidica","Lipídica"],["mista","Mista"]]} /><Select label="Superfície" value={value(state, `placas.${id}.superficie`)} onChange={(v) => set(`placas.${id}.superficie`, v)} options={[["","Não informada"],["regular","Regular"],["irregular","Irregular"],["ulcerada","Ulcerada"]]} /><Field label="Espessura (mm)" value={value(state, `placas.${id}.espessura`)} onChange={(v) => set(`placas.${id}.espessura`, v)} /><Field label="Estenose informada (%)" value={value(state, `placas.${id}.estenose`)} onChange={(v) => set(`placas.${id}.estenose`, v)} /><Field label="Descrição livre" value={value(state, `placas.${id}.descricao`)} onChange={(v) => set(`placas.${id}.descricao`, v)} /></div></div>)}</div>}</section>
  </div>
}
