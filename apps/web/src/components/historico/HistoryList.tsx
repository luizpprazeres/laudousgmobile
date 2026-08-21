'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Search } from 'lucide-react'
import { categoriaLabel, dataFmt, grupoDaData, resumo, type HistoryItem } from './HistoryItem'
import { OriginBadge, ReportDetail } from './ReportDetail'

export type { HistoryItem }

/**
 * O histórico em DUAS COLUNAS: a lista à esquerda, o laudo à direita.
 *
 * Antes era um acordeão numa coluna de 48rem — abrir um laudo empurrava os
 * outros para fora da tela, e comparar dois exigia rolar. A tela do médico é
 * larga; a lista não precisava dela toda, e o laudo precisava.
 *
 * No celular a mesma lista abre o laudo em folha sobreposta, com o MESMO
 * componente de detalhe. Duas implementações divergiriam.
 */
export function HistoryList({ items }: { items: HistoryItem[] }) {
  const [lista, setLista] = useState(items)
  const [selecionado, setSelecionado] = useState<string | null>(items[0]?.id ?? null)
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    /** Busca no título, na categoria e no TEXTO — quem procura "mioma" quer o laudo que o menciona. */
    return lista.filter((i) =>
      [i.title ?? '', categoriaLabel(i.category), i.text].join(' ').toLowerCase().includes(q),
    )
  }, [lista, busca])

  const aberto = filtrados.find((i) => i.id === selecionado) ?? null

  const aoExcluir = (id: string) => {
    const restante = lista.filter((x) => x.id !== id)
    setLista(restante)
    /** Some o que estava aberto: abre o próximo, em vez de deixar o painel vazio. */
    if (selecionado === id) setSelecionado(restante[0]?.id ?? null)
  }

  if (lista.length === 0) return <Vazio />

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Link
          href="/app/gerar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="font-barlow text-lg font-bold text-gray-900 dark:text-gray-100">Histórico</h1>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filtrados.length === lista.length
            ? `${lista.length} laudo${lista.length === 1 ? '' : 's'}`
            : `${filtrados.length} de ${lista.length}`}
        </span>

        <label className="relative ml-auto w-full max-w-xs">
          <span className="sr-only">Buscar no histórico</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por categoria ou conteúdo…"
            className="h-8 w-full rounded-full border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/40"
          />
        </label>

        <Link
          href="/app/gerar"
          className="shrink-0 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
        >
          Novo laudo
        </Link>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(19rem,26rem)_1fr]">
        {/* ── a lista ── */}
        <nav
          aria-label="Laudos salvos"
          className="min-h-0 overflow-y-auto border-gray-200 bg-white lg:border-r dark:border-gray-800 dark:bg-gray-900"
        >
          {filtrados.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Nada encontrado para “{busca}”.
            </p>
          ) : (
            <ul>
              {filtrados.map((item, i) => {
                const grupo = grupoDaData(item.date)
                const novoGrupo = i === 0 || grupoDaData(filtrados[i - 1]!.date) !== grupo
                const ativo = item.id === selecionado
                return (
                  <li key={`${item.origin}-${item.id}`}>
                    {novoGrupo ? (
                      <p className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/95 px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 dark:text-gray-400">
                        {grupo}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelecionado(item.id)}
                      aria-current={ativo ? 'true' : undefined}
                      className={`flex w-full items-start gap-2.5 border-b border-gray-100 px-5 py-3 text-left transition dark:border-gray-800/70 ${
                        ativo
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/25'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      {/* Barra de seleção: diz onde você está sem depender só do fundo. */}
                      <span
                        aria-hidden
                        className={`mt-0.5 h-9 w-0.5 shrink-0 rounded-full ${ativo ? 'bg-emerald-600' : 'bg-transparent'}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {item.title ?? categoriaLabel(item.category)}
                          </span>
                          <OriginBadge origin={item.origin} />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                          {resumo(item.text)}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-gray-400 dark:text-gray-500">
                          {dataFmt(item.date)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        {/* ── o laudo, no desktop ── */}
        <section className="hidden min-h-0 bg-white lg:block dark:bg-gray-900">
          {aberto ? (
            <ReportDetail item={aberto} onDeleted={aoExcluir} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
              <FileText className="h-7 w-7" />
              <p className="text-sm">Escolha um laudo à esquerda.</p>
            </div>
          )}
        </section>
      </div>

      {/*
        No celular não há coluna: o laudo aberto vira folha sobreposta, com o
        mesmo componente. `lg:hidden` para não duplicar no desktop.
      */}
      {aberto ? (
        <div className="fixed inset-0 z-40 bg-white lg:hidden dark:bg-gray-900">
          <ReportDetail item={aberto} onClose={() => setSelecionado(null)} onDeleted={aoExcluir} />
        </div>
      ) : null}
    </div>
  )
}

function Vazio() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="max-w-md rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Nenhum laudo salvo ainda</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monte um laudo e clique em <strong className="font-semibold">Salvar laudo</strong> — ele aparece aqui.
        </p>
        <Link
          href="/app/gerar"
          className="mt-5 inline-block rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Gerar meu primeiro laudo
        </Link>
      </div>
    </div>
  )
}
