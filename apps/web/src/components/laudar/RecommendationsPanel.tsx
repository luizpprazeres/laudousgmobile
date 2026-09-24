'use client'

import type { OrganState } from '@/lib/deterministic'

// Atalhos de redação escolhidos pelo médico, sem indicação inferida dos achados.
const OPTIONS = [
  ['clinica', 'Correlação clínica', 'Interpretar os achados em conjunto com a avaliação clínica.'],
  ['anteriores', 'Exames anteriores', 'Comparar com exames anteriores, quando disponíveis.'],
  ['laboratorio', 'Dados laboratoriais', 'Correlacionar os achados com os dados laboratoriais pertinentes.'],
] as const

export function RecommendationsPanel({ state, onChange }: { state: OrganState; onChange: (state: OrganState) => void }) {
  const draft = String(state.draft ?? '')
  const inserted = String(state.inserted ?? '')
  return <div className="space-y-3">
    <p className="text-xs text-gray-500">Escolha um ponto de partida e ajuste a orientação para este exame.</p>
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map(([id, label, text]) => <button key={id} type="button"
        className="min-h-11 rounded-lg border border-gray-200 px-2.5 text-xs dark:border-gray-700 md:min-h-8"
        onClick={() => onChange({ ...state, draft: [draft, text].filter(Boolean).join('\n') })}>{label}</button>)}
    </div>
    <label className="block text-xs font-medium">
      Orientação do médico
      <textarea aria-label="Orientação do médico" value={draft} rows={3} maxLength={4000}
        placeholder="Escreva a recomendação e, quando pertinente, o prazo ou exame complementar."
        onChange={event => onChange({ ...state, draft: event.target.value })}
        className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700" />
    </label>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={!draft.trim() || draft.trim() === inserted}
        onClick={() => onChange({ ...state, inserted: draft.trim() })}
        className="min-h-11 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-40 md:min-h-8">
        {inserted ? 'Atualizar no laudo' : 'Incluir no laudo'}
      </button>
      {inserted ? <button type="button" onClick={() => onChange({ ...state, inserted: '' })}
        className="min-h-11 rounded-full border border-gray-200 px-3 text-xs dark:border-gray-700 md:min-h-8">Remover do laudo</button> : null}
      <span role="status" className="text-xs text-gray-500">{inserted ? draft.trim() === inserted ? 'Incluída no modelo do laudo.' : 'Há alterações ainda não incluídas.' : 'Nenhuma recomendação incluída.'}</span>
    </div>
  </div>
}
