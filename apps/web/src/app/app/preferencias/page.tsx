'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ArrowLeft, Moon, Plus, Sun, Trash2 } from 'lucide-react'
import {
  gravarAtual,
  gravarDigitadoras,
  iniciaisDoNome,
  lerAtual,
  lerDigitadoras,
  normalizarIniciais,
  type Digitadora,
} from '@/lib/digitadoras'

export default function PreferenciasPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [digitadoras, setDigitadoras] = useState<Digitadora[]>([])
  const [nome, setNome] = useState('')
  const [iniciais, setIniciais] = useState('')

  useEffect(() => {
    setMounted(true)
    setDigitadoras(lerDigitadoras())
  }, [])

  /** Grava e devolve — as duas telas leem do mesmo lugar. */
  const persistir = (lista: Digitadora[]) => {
    setDigitadoras(lista)
    gravarDigitadoras(lista)
  }

  const sugestao = iniciais || iniciaisDoNome(nome)
  const jaExiste = digitadoras.some((d) => d.iniciais === sugestao)
  const podeAdicionar = nome.trim() !== '' && sugestao !== '' && !jaExiste

  const adicionar = () => {
    if (!podeAdicionar) return
    persistir([...digitadoras, { nome: nome.trim(), iniciais: sugestao }])
    setNome('')
    setIniciais('')
  }

  const remover = (alvo: string) => {
    persistir(digitadoras.filter((d) => d.iniciais !== alvo))
    /** Se a removida era a que estava selecionada, o laudo para de assiná-la. */
    if (lerAtual() === alvo) gravarAtual('')
  }

  const dark = mounted && theme === 'dark'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-2xl">
        <Link href="/app" className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="mb-6 font-barlow text-2xl font-bold text-gray-900 dark:text-gray-100">Preferências</h1>

        <div className="space-y-4">
          {/* Tema */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Tema</h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Aparência da interface.</p>
            <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${!dark ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <Sun className="h-4 w-4" /> Claro
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${dark ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <Moon className="h-4 w-4" /> Escuro
              </button>
            </div>
          </section>

          {/* Digitadoras */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Digitadoras</h2>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Cadastre quem transcreve. Na tela de gerar, você escolhe a digitadora na barra do topo e as
              iniciais passam a sair no fim do laudo (ex.: <span className="font-mono">/ha</span>).
            </p>

            {digitadoras.length > 0 ? (
              <ul className="mb-4 flex flex-col gap-1.5">
                {digitadoras.map((d) => (
                  <li
                    key={d.iniciais}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700"
                  >
                    <span className="flex-1 truncate text-sm text-gray-800 dark:text-gray-100">{d.nome}</span>
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">/{d.iniciais}</span>
                    <button
                      type="button"
                      onClick={() => remover(d.iniciais)}
                      aria-label={`Remover ${d.nome}`}
                      title={`Remover ${d.nome}`}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
                Nenhuma cadastrada. Sem digitadora, o laudo sai sem iniciais.
              </p>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[10rem] flex-1">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nome</span>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }}
                  placeholder="Helena Alves"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="w-28">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Iniciais</span>
                <input
                  value={iniciais}
                  onChange={(e) => setIniciais(normalizarIniciais(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }}
                  maxLength={4}
                  /* Vazio mostra o que o nome sugere — quase sempre é o que se quer. */
                  placeholder={iniciaisDoNome(nome) || 'ha'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm lowercase text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <button
                type="button"
                onClick={adicionar}
                disabled={!podeAdicionar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>
            {jaExiste && sugestao ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">
                Já existe alguém com as iniciais <span className="font-mono">/{sugestao}</span>. Use outras para
                não assinar dois laudos com a mesma marca.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
