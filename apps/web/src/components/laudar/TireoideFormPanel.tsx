'use client'

import { Plus, X } from 'lucide-react'
import {
  TIREOIDITES,
  VOLUME_GLANDULAR,
  volumeLobo,
  type LoboId,
  type LoboState,
  type NoduloTireoide,
  type TireoideState,
  type TireoiditeTipo,
} from '@/lib/deterministic'
import {
  CALCIFICACOES_EIXOS,
  ECOGENICIDADE_EIXOS,
  FORMA_EIXOS,
  HALO_EIXOS,
  MARGEM_EIXOS,
  VASCULARIZACAO_EIXOS,
  type Opcao,
} from '@/lib/catalog/eixosDoNodulo'
import { previewAcrDoNodulo } from '@/lib/calculators/tireoideAcr'
import type { TiRadsCategory } from '@/lib/calculators/tiRads'

type Props = {
  section: string
  state: TireoideState
  onChange: (next: TireoideState) => void
  showCompanionConflicts?: boolean
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
  /**
   * Nasce SEM classificação. O padrão antigo já vinha com "hipoecoica", nota 3
   * e TI-RADS 3 preenchidos — e nódulo que chega classificado é nódulo que sai
   * classificado sem ninguém ter olhado. Vazio pontua zero no canônico, que é o
   * mesmo que "não avaliado", e obriga o médico a dizer o que viu.
   */
  return {
    id: crypto.randomUUID(),
    lobo: 'lobo_direito',
    ecogenicidade: null,
    margem: null,
    halo: null,
    forma: null,
    calcificacoes: null,
    vascularizacao: null,
    c1: '',
    c2: '',
    c3: '',
    localizacao: '',
    domingosAtivo: false,
    acrComposicao: null,
    acrEcogenicidade: null,
    acrForma: null,
    acrMargem: null,
    acrFocos: [],
  }
}

const ACR_COMPOSICAO: Opcao[] = [
  { value: 'cistico', label: 'Cístico/quase cístico · 0' },
  { value: 'espongiforme', label: 'Espongiforme · 0' },
  { value: 'misto', label: 'Misto · 1' },
  { value: 'solido', label: 'Sólido/quase sólido · 2' },
]
const ACR_ECOGENICIDADE: Opcao[] = [
  { value: 'anecoico', label: 'Anecoico · 0' },
  { value: 'hiper_ou_isoecoico', label: 'Hiper/isoecoico · 1' },
  { value: 'hipoecoico', label: 'Hipoecoico · 2' },
  { value: 'muito_hipoecoico', label: 'Muito hipoecoico · 3' },
]
const ACR_FORMA: Opcao[] = [
  { value: 'mais_larga_que_alta', label: 'Mais larga que alta · 0' },
  { value: 'mais_alta_que_larga', label: 'Mais alta que larga · 3' },
]
const ACR_MARGEM: Opcao[] = [
  { value: 'lisa', label: 'Lisa · 0' },
  { value: 'mal_definida', label: 'Mal definida · 0' },
  { value: 'lobulada_ou_irregular', label: 'Lobulada/irregular · 2' },
  { value: 'extensao_extratireoidiana', label: 'Extensão extratireoidiana · 3' },
]
const ACR_FOCOS: Opcao[] = [
  { value: 'nenhum_ou_cauda_cometa', label: 'Nenhum/cauda de cometa · 0' },
  { value: 'macrocalcificacoes', label: 'Macrocalcificações · 1' },
  { value: 'calcificacoes_perifericas', label: 'Periféricas · 2' },
  { value: 'focos_puntiformes', label: 'Puntiformes · 3' },
]

const LOCALIZACOES = [
  { value: '', label: 'Não informada' },
  { value: 'no terço superior', label: 'Terço superior' },
  { value: 'no terço médio', label: 'Terço médio' },
  { value: 'no terço inferior', label: 'Terço inferior' },
]

const TIRADS_STYLE: Record<TiRadsCategory, string> = {
  TR1: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200',
  TR2: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200',
  TR3: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
  TR4: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200',
  TR5: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200',
}

/** Um eixo do escore: rótulo, opções, e a possibilidade de desmarcar. */
function Eixo({
  rotulo,
  auxiliar,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string
  auxiliar?: string
  opcoes: Opcao[]
  valor: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div>
      <FieldLabel>
        {rotulo}
        {auxiliar ? (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">
            {auxiliar}
          </span>
        ) : null}
      </FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => (
          <Chip
            key={o.value}
            active={valor === o.value}
            /* Clicar de novo desmarca — sem isso não há como voltar a "não avaliado". */
            onClick={() => onChange(valor === o.value ? null : o.value)}
          >
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function AcrEixo({
  rotulo,
  opcoes,
  valor,
  onChange,
  disabled = false,
}: {
  rotulo: string
  opcoes: Opcao[]
  valor: string | null
  onChange: (v: string | null) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className={`min-w-0 rounded-xl border border-gray-200 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-950/40 ${disabled ? 'opacity-45' : ''}`}>
      <legend className="px-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
        {rotulo}
      </legend>
      <div className="grid gap-1.5">
        {opcoes.map((opcao) => {
          const active = valor === opcao.value
          return (
            <button
              key={opcao.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : opcao.value)}
              className={`min-h-11 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition sm:min-h-9 ${
                active
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'
              }`}
            >
              {opcao.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
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
              O <strong className="font-semibold">ACR TI-RADS</strong> é a classificação principal.
              A escala de Domingos pode ser acrescentada em cada nódulo, sem conversão entre os sistemas.
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
            <div className={`grid gap-3 ${nodulo.lobo === 'istmo' ? '' : 'lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.6fr)]'}`}>
              <Segmented
                label="Lobo"
                value={nodulo.lobo}
                onChange={(value) => updateNodulo(nodulo.id, {
                  lobo: value as LoboId,
                  ...(value === 'istmo' ? { localizacao: '' } : {}),
                })}
                options={[
                  { value: 'lobo_direito', label: 'Direito' },
                  { value: 'lobo_esquerdo', label: 'Esquerdo' },
                  { value: 'istmo', label: 'Istmo' },
                ]}
              />
              {nodulo.lobo !== 'istmo' ? <label className="block">
                <FieldLabel>Localização</FieldLabel>
                <select
                  aria-label={`Localização do nódulo ${index + 1}`}
                  value={nodulo.localizacao}
                  onChange={(event) => updateNodulo(nodulo.id, { localizacao: event.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50 sm:h-9"
                >
                  {!LOCALIZACOES.some((opcao) => opcao.value === nodulo.localizacao) && nodulo.localizacao ? (
                    <option value={nodulo.localizacao}>{nodulo.localizacao}</option>
                  ) : null}
                  {LOCALIZACOES.map((opcao) => <option key={opcao.value || 'none'} value={opcao.value}>{opcao.label}</option>)}
                </select>
              </label> : null}
            </div>

            {/* As três medidas, separadas. O canônico usa a maior como diâmetro
                transverso quando o médico não nomeia um. */}
            <div>
              <FieldLabel>Medidas (cm)</FieldLabel>
              <div className="flex items-center gap-1.5">
                {(['c1', 'c2', 'c3'] as const).map((eixo, n) => (
                  <div key={eixo} className="flex items-center gap-1.5">
                    {n > 0 ? <span className="text-xs text-gray-400">×</span> : null}
                    <input
                      value={nodulo[eixo]}
                      inputMode="decimal"
                      placeholder="0,0"
                      onChange={(e) => updateNodulo(nodulo.id, { [eixo]: e.target.value })}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center font-mono text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              {(() => {
                const resultado = previewAcrDoNodulo(nodulo)
                const composicaoTr1 = nodulo.acrComposicao === 'cistico' || nodulo.acrComposicao === 'espongiforme'
                return (
                  <>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                          ACR TI-RADS · principal
                        </h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                          {composicaoTr1
                            ? 'Composição cística ou espongiforme: TR1, sem somar as demais categorias.'
                            : 'Selecione uma opção em cada grupo. Os focos ecogênicos podem ser somados.'}
                        </p>
                      </div>
                      {resultado ? (
                        <span role="status" className={`rounded-full border px-3 py-1 text-xs font-bold ${TIRADS_STYLE[resultado.category]}`}>
                          {resultado.category} · {resultado.score} {resultado.score === 1 ? 'ponto' : 'pontos'}
                        </span>
                      ) : (
                        <span role="status" className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                          Classificação incompleta
                        </span>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      <AcrEixo rotulo="Composição" opcoes={ACR_COMPOSICAO} valor={nodulo.acrComposicao ?? null} onChange={(v) => {
                        const composicao = v as NoduloTireoide['acrComposicao']
                        updateNodulo(nodulo.id, {
                          acrComposicao: composicao,
                          ...(composicao === 'cistico' || composicao === 'espongiforme'
                            ? { acrEcogenicidade: null, acrForma: null, acrMargem: null, acrFocos: [] }
                            : {}),
                        })
                      }} />
                      <AcrEixo
                        disabled={composicaoTr1}
                        rotulo="Ecogenicidade"
                        opcoes={composicaoTr1 ? ACR_ECOGENICIDADE : ACR_ECOGENICIDADE.filter((opcao) => opcao.value !== 'anecoico')}
                        valor={nodulo.acrEcogenicidade ?? null}
                        onChange={(v) => updateNodulo(nodulo.id, { acrEcogenicidade: v as NoduloTireoide['acrEcogenicidade'] })}
                      />
                      <AcrEixo disabled={composicaoTr1} rotulo="Forma" opcoes={ACR_FORMA} valor={nodulo.acrForma ?? null} onChange={(v) => updateNodulo(nodulo.id, { acrForma: v as NoduloTireoide['acrForma'] })} />
                      <AcrEixo disabled={composicaoTr1} rotulo="Margens" opcoes={ACR_MARGEM} valor={nodulo.acrMargem ?? null} onChange={(v) => updateNodulo(nodulo.id, { acrMargem: v as NoduloTireoide['acrMargem'] })} />
                      <fieldset disabled={composicaoTr1} className={`min-w-0 rounded-xl border border-gray-200 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-950/40 ${composicaoTr1 ? 'opacity-45' : ''}`}>
                        <legend className="px-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Focos ecogênicos</legend>
                        <div className="grid gap-1.5">
                    {ACR_FOCOS.map((o) => {
                      const current = nodulo.acrFocos ?? []
                      const active = current.includes(o.value as NonNullable<NoduloTireoide['acrFocos']>[number])
                      return <button key={o.value} type="button" aria-pressed={active} className={`min-h-11 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition sm:min-h-9 ${active ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'}`} onClick={() => {
                        const value = o.value as NonNullable<NoduloTireoide['acrFocos']>[number]
                        const next = value === 'nenhum_ou_cauda_cometa'
                          ? (active ? [] : [value])
                          : active
                            ? current.filter((item) => item !== value)
                            : [...current.filter((item) => item !== 'nenhum_ou_cauda_cometa'), value]
                        updateNodulo(nodulo.id, { acrFocos: next })
                      }}>{o.label}</button>
                    })}
                        </div>
                      </fieldset>
                    </div>
                    {resultado ? (
                      <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[12px] leading-relaxed ${TIRADS_STYLE[resultado.category]}`}>
                        <strong>ACR {resultado.category} — {resultado.riskDescription}.</strong> {resultado.management}.
                        <span className="mt-1 block text-[11px] opacity-80">
                          A recomendação entra no laudo quando essa opção estiver ativada em Preferências.
                        </span>
                      </div>
                    ) : null}
                  </>
                )
              })()}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/30">
              <button
                type="button"
                aria-pressed={nodulo.domingosAtivo ?? Boolean(nodulo.ecogenicidade || nodulo.margem || nodulo.halo || nodulo.forma || nodulo.calcificacoes || nodulo.vascularizacao)}
                onClick={() => updateNodulo(nodulo.id, { domingosAtivo: !(nodulo.domingosAtivo ?? Boolean(nodulo.ecogenicidade || nodulo.margem || nodulo.halo || nodulo.forma || nodulo.calcificacoes || nodulo.vascularizacao)) })}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">Classificação de Domingos</span>
                  <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">Opcional e complementar; não altera o cálculo ACR TI-RADS.</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${(nodulo.domingosAtivo ?? Boolean(nodulo.ecogenicidade || nodulo.margem || nodulo.halo || nodulo.forma || nodulo.calcificacoes || nodulo.vascularizacao)) ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'border border-gray-300 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'}`}>
                  {(nodulo.domingosAtivo ?? Boolean(nodulo.ecogenicidade || nodulo.margem || nodulo.halo || nodulo.forma || nodulo.calcificacoes || nodulo.vascularizacao)) ? 'Ativa' : 'Adicionar'}
                </span>
              </button>
              {(nodulo.domingosAtivo ?? Boolean(nodulo.ecogenicidade || nodulo.margem || nodulo.halo || nodulo.forma || nodulo.calcificacoes || nodulo.vascularizacao)) ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Eixo rotulo="Ecogenicidade" opcoes={ECOGENICIDADE_EIXOS} valor={nodulo.ecogenicidade} onChange={(v) => updateNodulo(nodulo.id, { ecogenicidade: v })} />
                  <Eixo rotulo="Margem" opcoes={MARGEM_EIXOS} valor={nodulo.margem} onChange={(v) => updateNodulo(nodulo.id, { margem: v })} />
                  <Eixo rotulo="Halo" opcoes={HALO_EIXOS} valor={nodulo.halo} onChange={(v) => updateNodulo(nodulo.id, { halo: v })} />
                  <Eixo rotulo="Forma" opcoes={FORMA_EIXOS} valor={nodulo.forma} onChange={(v) => updateNodulo(nodulo.id, { forma: v })} />
                  <Eixo rotulo="Calcificações" opcoes={CALCIFICACOES_EIXOS} valor={nodulo.calcificacoes} onChange={(v) => updateNodulo(nodulo.id, { calcificacoes: v })} />
                  <Eixo rotulo="Vascularização" auxiliar="Chammas — entra na nota, não no texto" opcoes={VASCULARIZACAO_EIXOS} valor={nodulo.vascularizacao} onChange={(v) => updateNodulo(nodulo.id, { vascularizacao: v })} />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

function ParenquimaPanel({ state, onChange }: Omit<Props, 'section'>) {
  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/*
        O VOLUME DA GLÂNDULA é perguntado, não deduzido das medidas.
        
        A tela concluía "volume normal" para qualquer volume digitado — um bócio
        de 40 ml saía descrito como normal. A faixa de normalidade varia com
        idade, sexo e constituição; um número não decide isso sozinho, e o
        renderer se recusa a inferir das medidas.
        
        ⚠️ Mas EM BRANCO o laudo não fica calado: o renderer escreve "volume
        normal" como padrão. Escrevi aqui, primeiro, que em branco "o laudo não
        afirma" — e era falso; o gate mostrou a conclusão dizendo normal. O
        rótulo agora diz o que acontece de verdade, porque um aviso errado é
        pior que nenhum: o médico deixaria em branco acreditando ter se calado.
      */}
      <div>
        <FieldLabel>
          Volume da glândula
          <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">
            em branco, sai como normal
          </span>
        </FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {VOLUME_GLANDULAR.map((o) => (
            <Chip
              key={o.value}
              active={state.volumeGlandular === o.value}
              onClick={() =>
                onChange({
                  ...state,
                  volumeGlandular: state.volumeGlandular === o.value ? null : o.value,
                })
              }
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </div>

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
          onChange={(value) => onChange({ ...state, avaliarLinfonodos: value === 'sim', linfonodosConfirmados: true })}
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
            onChange={(value) => onChange({ ...state, linfonodos: value as TireoideState['linfonodos'], linfonodosConfirmados: true })}
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

export function TireoideCompanionNotice({ state }: { state: TireoideState }) {
  const conflicts = state.companionConflitos ?? []
  if (!conflicts.length) return null
  return <div role="status" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><strong>A imagem trouxe dados diferentes dos já digitados.</strong><div className="mt-1">Mantivemos o formulário. Revise: {conflicts.join(' · ')}</div></div>
}

export function TireoideFormPanel({ section, state, onChange, showCompanionConflicts = true }: Props) {
  let content: React.ReactNode
  if (section === 'nodulos') content = <NodulosPanel state={state} onChange={onChange} />
  else if (section === 'parenquima') content = <ParenquimaPanel state={state} onChange={onChange} />
  else if (section === 'linfonodos') content = <LinfonodosPanel state={state} onChange={onChange} />
  else if (section === 'lobo_direito' || section === 'lobo_esquerdo' || section === 'istmo') {
    content = <LoboPanel section={section} state={state} onChange={onChange} />
  } else content = (
    <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-[13px] text-gray-500 dark:text-gray-400">Selecione uma seção da tireoide.</p>
    </section>
  )

  return <>
    {showCompanionConflicts ? <TireoideCompanionNotice state={state} /> : null}
    {content}
  </>
}
