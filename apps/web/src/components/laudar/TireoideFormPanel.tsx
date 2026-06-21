'use client'

import { Plus, X } from 'lucide-react'
import {
  ECOGENICIDADES,
  MARGENS,
  NOTAS_DOMINGOS,
  TIRADS_VALUES,
  TIREOIDITES,
  volumeLobo,
  type LoboId,
  type LoboState,
  type NoduloTireoide,
  type TireoideState,
  type TireoiditeTipo,
} from '@/lib/deterministic'

type Props = {
  section: string
  state: TireoideState
  onChange: (next: TireoideState) => void
}

const LOBO_LABELS: Record<LoboId, string> = {
  lobo_direito: 'Direito',
  lobo_esquerdo: 'Esquerdo',
  istmo: 'Istmo',
}

const LOBO_TITLES: Record<LoboId, string> = {
  lobo_direito: 'Lobo direito',
  lobo_esquerdo: 'Lobo esquerdo',
  istmo: 'Istmo',
}

const MEDIDAS: Array<{ key: keyof Pick<LoboState, 'a' | 'b' | 'c'>; label: string; placeholder: string }> = [
  { key: 'a', label: 'A', placeholder: '4,0' },
  { key: 'b', label: 'B', placeholder: '1,5' },
  { key: 'c', label: 'C', placeholder: '1,3' },
]

function formatVolume(lobo: LoboState) {
  const volume = volumeLobo(lobo)
  if (volume === null) return 'Volume: —'
  return `Volume: ${volume.toFixed(1).replace('.', ',')} ml`
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
      {children}
    </span>
  )
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50"
      />
    </label>
  )
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition ${
        active
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'
      }`}
    >
      {children}
    </button>
  )
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition ${
                active
                  ? 'border-emerald-200 bg-white font-bold text-gray-900 shadow-sm ring-1 ring-emerald-100 dark:border-emerald-800 dark:bg-gray-900 dark:text-gray-100 dark:ring-emerald-900/50'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-emerald-950/40'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LoboPanel({ section, state, onChange }: Props & { section: LoboId }) {
  const lobo = state[section]
  const updateLobo = (patch: Partial<LoboState>) => {
    onChange({ ...state, [section]: { ...lobo, ...patch } })
  }
  const picoKey = section === 'lobo_direito' ? 'picoDireito' : 'picoEsquerdo'

  return (
    <div className="space-y-2.5">
      <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {LOBO_TITLES[section]}
          </h3>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {formatVolume(lobo)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MEDIDAS.map((medida) => (
            <TextInput
              key={medida.key}
              label={`${medida.label} · cm`}
              value={lobo[medida.key]}
              placeholder={medida.placeholder}
              onChange={(value) => updateLobo({ [medida.key]: value })}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Segmented
          label="Ecotextura"
          value={lobo.ecotextura}
          onChange={(value) => updateLobo({ ecotextura: value as LoboState['ecotextura'] })}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'heterogenea', label: 'Heterogênea' },
          ]}
        />
      </section>

      {state.doppler && section !== 'istmo' ? (
        <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <TextInput
            label="Pico sistólico (cm/s)"
            value={state[picoKey]}
            placeholder="24"
            onChange={(value) => onChange({ ...state, [picoKey]: value })}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            Referência: artéria tireoidiana inferior normal ≈ 15–30 cm/s. Valores elevados
            (&gt; 40–50 cm/s) sugerem hipervascularização (ex.: doença de Graves).
          </p>
        </section>
      ) : null}
    </div>
  )
}

function newNodulo(): NoduloTireoide {
  return {
    id: crypto.randomUUID(),
    lobo: 'lobo_direito',
    ecogenicidade: 'hipoecoica',
    margens: 'regulares',
    dimensao: '',
    notaDomingos: '3',
    tirads: '3',
  }
}

function NodulosPanel({ state, onChange }: Omit<Props, 'section'>) {
  const updateNodulo = (id: string, patch: Partial<NoduloTireoide>) => {
    onChange({
      ...state,
      nodulos: state.nodulos.map((nodulo) => (nodulo.id === id ? { ...nodulo, ...patch } : nodulo)),
    })
  }

  return (
    <div className="space-y-2.5">
      <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Nódulos</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
              Nota Domingos e TI-RADS são informados pelo médico — selecione, não calculamos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...state, nodulos: [...state.nodulos, newNodulo()] })}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar nódulo
          </button>
        </div>
      </section>

      {state.nodulos.map((nodulo, index) => (
        <section key={nodulo.id} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-barlow text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">Nódulo {index + 1}</h3>
            <button
              type="button"
              onClick={() => onChange({ ...state, nodulos: state.nodulos.filter((item) => item.id !== nodulo.id) })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label={`Remover nódulo ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <Segmented
              label="Lobo"
              value={nodulo.lobo}
              onChange={(value) => updateNodulo(nodulo.id, { lobo: value as LoboId })}
              options={[
                { value: 'lobo_direito', label: 'Direito' },
                { value: 'lobo_esquerdo', label: 'Esquerdo' },
                { value: 'istmo', label: 'Istmo' },
              ]}
            />

            <div>
              <FieldLabel>Ecogenicidade</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {ECOGENICIDADES.map((option) => (
                  <Chip
                    key={option.value}
                    active={nodulo.ecogenicidade === option.value}
                    onClick={() => updateNodulo(nodulo.id, { ecogenicidade: option.value })}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Margens</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {MARGENS.map((option) => (
                  <Chip
                    key={option.value}
                    active={nodulo.margens === option.value}
                    onClick={() => updateNodulo(nodulo.id, { margens: option.value })}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>

            <TextInput
              label="Dimensão"
              value={nodulo.dimensao}
              placeholder="12 mm"
              onChange={(value) => updateNodulo(nodulo.id, { dimensao: value })}
            />

            <div>
              <FieldLabel>Nota Domingos</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {NOTAS_DOMINGOS.map((nota) => (
                  <Chip key={nota} active={nodulo.notaDomingos === nota} onClick={() => updateNodulo(nodulo.id, { notaDomingos: nota })}>
                    {nota}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>TI-RADS</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {TIRADS_VALUES.map((tirads) => (
                  <Chip key={tirads} active={nodulo.tirads === tirads} onClick={() => updateNodulo(nodulo.id, { tirads })}>
                    {tirads.toUpperCase()}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

function ParenquimaPanel({ state, onChange }: Omit<Props, 'section'>) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <Segmented
        label="Tireoidite (difusa)"
        value={state.tireoidite}
        onChange={(value) => onChange({ ...state, tireoidite: value as TireoiditeTipo })}
        options={TIREOIDITES}
      />
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
        Quando selecionada, descreve o parênquima difuso nos achados e inclui a hipótese na conclusão.
      </p>
    </section>
  )
}

function LinfonodosPanel({ state, onChange }: Omit<Props, 'section'>) {
  return (
    <div className="space-y-2.5">
      <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Segmented
          label="Avaliar linfonodos cervicais?"
          value={state.avaliarLinfonodos ? 'sim' : 'nao'}
          onChange={(value) => onChange({ ...state, avaliarLinfonodos: value === 'sim' })}
          options={[
            { value: 'sim', label: 'Sim' },
            { value: 'nao', label: 'Não avaliar' },
          ]}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          Opcional — quando desativado, os linfonodos não entram nos achados nem na conclusão.
        </p>
      </section>
      {state.avaliarLinfonodos ? (
        <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Segmented
            label="Linfonodos"
            value={state.linfonodos}
            onChange={(value) => onChange({ ...state, linfonodos: value as TireoideState['linfonodos'] })}
            options={[
              { value: 'preservados', label: 'Preservados' },
              { value: 'suspeitos', label: 'Suspeitos' },
            ]}
          />
        </section>
      ) : null}
    </div>
  )
}

export function TireoideFormPanel({ section, state, onChange }: Props) {
  if (section === 'nodulos') return <NodulosPanel state={state} onChange={onChange} />
  if (section === 'parenquima') return <ParenquimaPanel state={state} onChange={onChange} />
  if (section === 'linfonodos') return <LinfonodosPanel state={state} onChange={onChange} />
  if (section === 'lobo_direito' || section === 'lobo_esquerdo' || section === 'istmo') {
    return <LoboPanel section={section} state={state} onChange={onChange} />
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-[13px] text-gray-500 dark:text-gray-400">Selecione uma seção da tireoide.</p>
    </section>
  )
}
