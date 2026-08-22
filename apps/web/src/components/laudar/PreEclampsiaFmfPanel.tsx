'use client'

import { useMemo, useState } from 'react'
import { FilePlus2, Plus, Trash2, X } from 'lucide-react'
import {
  calcularPreEclampsiaWeb,
  type PeAfericaoForm,
  type PeWebForm,
} from '@/lib/calculators/preEclampsia'

type Props = {
  insertedBlock?: string
  onInsert: (block: string) => void
  onRemove: () => void
}

const INITIAL_FORM: PeWebForm = {
  idade: '',
  peso: '',
  altura: '',
  gaSemanas: '',
  gaDias: '',
  etnia: '',
  paridade: '',
  intervaloAnos: '',
  igPartoAnterior: '',
  zEscorePesoAnterior: '',
  histFamiliarPE: false,
  fiv: false,
  hipertensaoCronica: false,
  diabetes: false,
  lesSaf: false,
  fumante: false,
  afericoes: [{ sistolica: '', diastolica: '' }],
  utaPiMedio: '',
}

const INPUT_CLASS = 'mt-1 h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50'
const LABEL_CLASS = 'font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400'

function Campo({
  label,
  value,
  onChange,
  placeholder,
  inputMode = 'decimal',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputMode?: 'decimal' | 'numeric'
}) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={INPUT_CLASS}
      />
    </label>
  )
}

function Escolha<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | ''
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div>
      <div className={LABEL_CLASS}>{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'
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

function Toggle({
  label,
  active,
  onChange,
}: {
  label: string
  active: boolean
  onChange: (active: boolean) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onChange(!active)}
      className={`rounded-lg border px-2.5 py-2 text-left text-[12px] font-semibold transition ${
        active
          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
          : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'
      }`}
    >
      {label}
    </button>
  )
}

export function PreEclampsiaFmfPanel({ insertedBlock, onInsert, onRemove }: Props) {
  const [form, setForm] = useState<PeWebForm>(INITIAL_FORM)
  const setCampo = <K extends keyof PeWebForm>(campo: K, valor: PeWebForm[K]) => {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  const dadosBasicosPreenchidos = Boolean(
    form.idade.trim() &&
    form.peso.trim() &&
    form.altura.trim() &&
    form.gaSemanas.trim() &&
    form.gaDias.trim() &&
    form.etnia &&
    form.paridade
  )

  const calculo = useMemo(() => {
    if (!dadosBasicosPreenchidos) return { estado: 'aguardando' as const }
    try {
      return { estado: 'calculado' as const, valor: calcularPreEclampsiaWeb(form) }
    } catch (error) {
      return {
        estado: 'erro' as const,
        mensagem: error instanceof Error ? error.message : 'Não foi possível calcular o risco.',
      }
    }
  }, [dadosBasicosPreenchidos, form])

  const atualizarAfericao = (index: number, campo: keyof PeAfericaoForm, valor: string) => {
    setForm((atual) => ({
      ...atual,
      afericoes: atual.afericoes.map((afericao, atualIndex) =>
        atualIndex === index ? { ...afericao, [campo]: valor } : afericao
      ),
    }))
  }

  const adicionarAfericao = () => {
    if (form.afericoes.length >= 4) return
    setCampo('afericoes', [...form.afericoes, { sistolica: '', diastolica: '' }])
  }

  const removerAfericao = (index: number) => {
    if (form.afericoes.length === 1) {
      setCampo('afericoes', [{ sistolica: '', diastolica: '' }])
      return
    }
    setCampo('afericoes', form.afericoes.filter((_, atualIndex) => atualIndex !== index))
  }

  const resultado = calculo.estado === 'calculado' ? calculo.valor.resultado : null
  const resultadoAtualInserido = Boolean(resultado && insertedBlock === resultado.insertBloco)
  const resultadoInseridoDesatualizado = Boolean(insertedBlock && !resultadoAtualInserido)

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-barlow text-lg font-bold text-gray-900 dark:text-gray-100">Rastreio de pré-eclâmpsia</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
            Feto único. Janela aceita pelo núcleo: 77 a 99 dias. Digite os dados usados na consulta.
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          Modelo FMF
        </span>
      </div>

      <div className="mt-4 space-y-5">
        <div>
          <div className="mb-2 text-[12px] font-bold text-gray-800 dark:text-gray-200">Dados maternos</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Campo label="Idade na DPP (anos)" value={form.idade} onChange={(value) => setCampo('idade', value)} placeholder="36" />
            <Campo label="Peso (kg)" value={form.peso} onChange={(value) => setCampo('peso', value)} placeholder="69" />
            <Campo label="Altura (cm)" value={form.altura} onChange={(value) => setCampo('altura', value)} placeholder="164" />
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2 sm:max-w-[260px]">
            <Campo label="IG — semanas" value={form.gaSemanas} onChange={(value) => setCampo('gaSemanas', value)} placeholder="12" inputMode="numeric" />
            <Campo label="IG — dias" value={form.gaDias} onChange={(value) => setCampo('gaDias', value)} placeholder="0" inputMode="numeric" />
          </div>
        </div>

        <Escolha
          label="Etnia materna"
          value={form.etnia}
          onChange={(value) => setCampo('etnia', value)}
          options={[
            { value: 'branca', label: 'Branca' },
            { value: 'afro', label: 'Negra' },
            { value: 'sul-asiatica', label: 'Sul-asiática' },
            { value: 'leste-asiatica', label: 'Leste-asiática' },
          ]}
        />

        <div>
          <Escolha
            label="História obstétrica"
            value={form.paridade}
            onChange={(value) => setCampo('paridade', value)}
            options={[
              { value: 'nulipara', label: 'Nulípara' },
              { value: 'multipara-sem-pe', label: 'Multípara sem PE anterior' },
              { value: 'multipara-com-pe', label: 'Multípara com PE anterior' },
            ]}
          />
          {form.paridade.startsWith('multipara') ? (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
              <Campo label="IG do parto anterior (sem)" value={form.igPartoAnterior} onChange={(value) => setCampo('igPartoAnterior', value)} placeholder="39" />
              <Campo label="Intervalo entre gestações (anos)" value={form.intervaloAnos} onChange={(value) => setCampo('intervaloAnos', value)} placeholder="3" />
              {form.paridade === 'multipara-com-pe' ? (
                <Campo label="Z-score do peso ao nascer" value={form.zEscorePesoAnterior} onChange={(value) => setCampo('zEscorePesoAnterior', value)} placeholder="0" />
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 text-[12px] font-bold text-gray-800 dark:text-gray-200">Condições maternas</div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <Toggle label="Hipertensão crônica" active={form.hipertensaoCronica} onChange={(value) => setCampo('hipertensaoCronica', value)} />
            <Toggle label="Diabetes tipo 1 ou 2" active={form.diabetes} onChange={(value) => setCampo('diabetes', value)} />
            <Toggle label="LES ou SAF" active={form.lesSaf} onChange={(value) => setCampo('lesSaf', value)} />
            <Toggle label="Mãe teve pré-eclâmpsia" active={form.histFamiliarPE} onChange={(value) => setCampo('histFamiliarPE', value)} />
            <Toggle label="Fertilização in vitro" active={form.fiv} onChange={(value) => setCampo('fiv', value)} />
            <Toggle label="Fumante" active={form.fumante} onChange={(value) => setCampo('fumante', value)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-bold text-gray-800 dark:text-gray-200">Pressão arterial</div>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Aceita uma aferição na rotina ou as quatro do protocolo.</p>
            </div>
            {form.afericoes.length < 4 ? (
              <button type="button" onClick={adicionarAfericao} className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                <Plus className="h-3 w-3" /> Aferição
              </button>
            ) : null}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {form.afericoes.map((afericao, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-1.5 rounded-xl border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950/50">
                <Campo label={`PAS ${index + 1}`} value={afericao.sistolica} onChange={(value) => atualizarAfericao(index, 'sistolica', value)} placeholder="120" />
                <Campo label={`PAD ${index + 1}`} value={afericao.diastolica} onChange={(value) => atualizarAfericao(index, 'diastolica', value)} placeholder="80" />
                <button type="button" onClick={() => removerAfericao(index)} aria-label={`Remover aferição ${index + 1}`} className="mb-0.5 rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600 dark:hover:bg-gray-900">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-[260px]">
          <Campo label="IP médio das artérias uterinas" value={form.utaPiMedio} onChange={(value) => setCampo('utaPiMedio', value)} placeholder="1,08" />
        </div>
      </div>

      <div className={`mt-5 rounded-xl border p-3 ${
        calculo.estado === 'erro'
          ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30'
          : resultado?.altoRisco
            ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/25'
            : 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30'
      }`}>
        {calculo.estado === 'aguardando' ? (
          <p className="text-[12px] text-gray-500 dark:text-gray-400">Preencha os dados maternos, a idade gestacional, a etnia e a história obstétrica.</p>
        ) : calculo.estado === 'erro' ? (
          <div>
            <div className="font-barlow text-base font-bold text-red-800 dark:text-red-300">Revise os dados</div>
            <p role="alert" className="mt-1 text-[12px] leading-relaxed text-red-700 dark:text-red-300">{calculo.mensagem}</p>
          </div>
        ) : resultado ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-barlow text-2xl font-extrabold text-gray-900 dark:text-gray-100">1 em {resultado.umEmN.toLocaleString('pt-BR')}</div>
                <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Pré-eclâmpsia com parto antes de 37 semanas</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                resultado.altoRisco
                  ? 'bg-amber-200 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
              }`}>
                {resultado.altoRisco ? 'Atingiu o corte de 1:100' : 'Abaixo do corte de 1:100'}
              </span>
            </div>

            {resultado.marcadores.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {resultado.marcadores.map((marcador) => (
                  <div key={marcador.nome} className="rounded-lg border border-white/70 bg-white/70 px-2.5 py-2 dark:border-gray-800 dark:bg-gray-950/40">
                    <div className={LABEL_CLASS}>{marcador.nome === 'map' ? 'PAM' : 'IP uterino'}</div>
                    <div className="mt-0.5 text-base font-bold text-gray-900 dark:text-gray-100">{marcador.mom.toFixed(2).replace('.', ',')} MoM</div>
                    {marcador.truncado ? <div className="mt-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Valor truncado pelo modelo</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-amber-800 dark:text-amber-200">Resultado calculado somente com a história materna.</p>
            )}

            <pre className="mt-3 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2.5 font-sans text-[11px] leading-relaxed text-gray-600 dark:bg-gray-950/40 dark:text-gray-300">{resultado.insertBloco}</pre>
          </div>
        ) : null}

        {resultadoInseridoDesatualizado ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-2 text-[11px] font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
            O laudo ainda contém um resultado anterior. Atualize ou remova o bloco antes de salvar.
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {resultado ? (
            <button
              type="button"
              onClick={() => onInsert(resultado.insertBloco)}
              disabled={resultadoAtualInserido}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-default disabled:bg-emerald-300 dark:disabled:bg-emerald-900"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              {resultadoAtualInserido ? 'Inserido no laudo' : insertedBlock ? 'Atualizar no laudo' : 'Inserir no laudo'}
            </button>
          ) : null}
          {insertedBlock ? (
            <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-red-200 hover:text-red-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <X className="h-3.5 w-3.5" /> Remover do laudo
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
