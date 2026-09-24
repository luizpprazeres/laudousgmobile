'use client'

import type { OrganState } from '@/lib/deterministic'
import {
  BIRADS_CATEGORIAS,
  TIPO_LABEL,
  aplicarBiradsAchado,
  sugestoesBiradsMamaria,
  temAchadoLegado,
  type BiradsSugestaoAchado,
  type BiradsSugestaoStatus,
} from '@/lib/calculators/mamariaBiradsSugestao'

/**
 * BI-RADS POR ACHADO — painel da seção Cálculos (`calc:bi-rads`).
 *
 * Recebe o MESMO estado da seção `mamas` que o MamariaFormPanel edita, então
 * acompanha sozinho cada achado adicionado, alterado ou removido. A sugestão é
 * só leitura; o laudo muda apenas quando o médico aplica ou escolhe uma
 * categoria, e isso grava `achados.<id>.birads` daquele achado e de nenhum outro.
 *
 * A regra e os seus limites estão em `lib/calculators/mamariaBiradsSugestao`.
 */
type Props = {
  state: OrganState
  onChange: (next: OrganState) => void
}

const TARGET = 'min-h-11 sm:min-h-8'

const STATUS: Record<BiradsSugestaoStatus, { label: string; className: string }> = {
  sugerida: { label: 'Sugestão', className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300' },
  suspeita: { label: 'Avaliação suspeita', className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200' },
  incompleta: { label: 'Dados insuficientes', className: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300' },
  revisao: { label: 'Sem sugestão automática', className: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300' },
  nao_se_aplica: { label: 'Não se aplica', className: 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400' },
}

const chipClass = (active: boolean) => `${TARGET} inline-flex min-w-11 items-center justify-center rounded-full border px-2.5 text-[12px] font-semibold tabular-nums transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 sm:min-w-9 dark:focus-visible:ring-offset-gray-900 ${active
  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'}`

function AchadoRow({ item, onDefine }: { item: BiradsSugestaoAchado; onDefine: (categoria: string | null) => void }) {
  const status = STATUS[item.status]
  const titulo = `Achado ${item.indice + 1}`
  const descricao = [TIPO_LABEL[item.tipo] ?? (item.tipo || 'tipo não informado'), item.lado ? `mama ${item.lado}` : 'mama não informada'].join(' · ')
  const titleId = `birads-achado-${item.id}-titulo`
  const divergente = item.definida && item.categoria && item.definida !== item.categoria
  return (
    <li
      aria-labelledby={titleId}
      data-birads-achado={item.id}
      data-birads-status={item.status}
      className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 id={titleId} className="text-[13px] font-semibold text-gray-900 dark:text-gray-50">{titulo}</h4>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">{descricao}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${status.className}`}>
          {status.label}
          {item.status === 'sugerida' && item.categoria ? <strong data-birads-sugerida className="tabular-nums">BI-RADS {item.categoria}</strong> : null}
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-gray-600 dark:text-gray-300">{item.motivo}</p>
      {item.faltando.length ? (
        <p className="mt-1 text-[12px] text-gray-600 dark:text-gray-300">
          Falta: <span className="font-semibold">{item.faltando.join(', ')}</span>
        </p>
      ) : null}

      {item.status !== 'nao_se_aplica' ? (
        <div className="mt-2.5 border-t border-gray-100 pt-2.5 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] text-gray-600 dark:text-gray-300" data-birads-definida={item.definida ?? ''}>
              {item.definida
                ? <>No laudo: <strong className="tabular-nums text-gray-900 dark:text-gray-50">BI-RADS {item.definida}</strong>{divergente ? ' (diferente da sugestão)' : ''}</>
                : 'Nenhuma categoria no laudo para este achado.'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {item.status === 'sugerida' && item.categoria && item.definida !== item.categoria ? (
                <button
                  type="button"
                  onClick={() => onDefine(item.categoria)}
                  className={`${TARGET} rounded-full border border-emerald-300 bg-white px-3 text-[12px] font-semibold text-emerald-700 transition motion-reduce:transition-none hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300`}
                >
                  Aplicar BI-RADS {item.categoria} ao {titulo.toLowerCase()}
                </button>
              ) : null}
              {item.definida ? (
                <button
                  type="button"
                  onClick={() => onDefine(null)}
                  className={`${TARGET} rounded-full px-3 text-[12px] font-semibold text-gray-500 transition motion-reduce:transition-none hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-white/10 dark:hover:text-gray-100`}
                >
                  Remover do laudo
                </button>
              ) : null}
            </div>
          </div>
          <div role="group" aria-label={`BI-RADS definido pelo médico — ${titulo}`} className="mt-2 flex flex-wrap gap-1">
            {BIRADS_CATEGORIAS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={item.definida === value}
                onClick={() => onDefine(item.definida === value ? null : value)}
                className={chipClass(item.definida === value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function MamariaBiradsPanel({ state, onChange }: Props) {
  const itens = sugestoesBiradsMamaria(state)
  return (
    <div className="space-y-2.5" data-mamaria-birads>
      <p className="px-1 text-[12px] leading-relaxed text-gray-600 dark:text-gray-300">
        Sugestão de apoio a partir dos descritores marcados em cada achado. Nada entra no laudo sem você aplicar ou escolher
        a categoria.
      </p>
      {itens.length === 0 && temAchadoLegado(state) ? (
        <p data-birads-legado className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Este rascunho está no formato antigo, com um achado por mama. A sugestão por achado não está disponível para ele; defina a categoria no próprio achado.
        </p>
      ) : itens.length === 0 ? (
        <p className="px-1 text-[12.5px] text-gray-500 dark:text-gray-400">Nenhum achado nas mamas. Adicione achados na seção Mamas para ver as sugestões aqui.</p>
      ) : (
        <ul className="space-y-2" aria-label="BI-RADS por achado">
          {itens.map((item) => (
            <AchadoRow key={item.id} item={item} onDefine={(categoria) => onChange(aplicarBiradsAchado(state, item.id, categoria))} />
          ))}
        </ul>
      )}
      <details className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] leading-relaxed text-gray-600 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-300">
        <summary className={`${TARGET} flex cursor-pointer items-center font-semibold text-gray-700 dark:text-gray-200`}>Fonte e limites</summary>
        <div className="space-y-1.5 pb-1 pt-1">
          <p>Léxico e categorias de avaliação do ACR BI-RADS® Atlas, 5ª edição (ultrassonografia). Não é um algoritmo do ACR nem foi validado contra a edição mais recente.</p>
          <p>Só há categoria sugerida quando os critérios estão completos: 2 para cisto simples, cistos simples e linfonodo intramamário; 3 para nódulo oval, circunscrito, paralelo, hipo ou isoecoico, sem sombra e sem microcalcificações.</p>
          <p>Com descritor suspeito, o painel indica avaliação suspeita sem subcategoria. Nos demais casos, e com descritores faltando, não sugere categoria.</p>
        </div>
      </details>
    </div>
  )
}
