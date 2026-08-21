'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Check, Lock, Pencil, RotateCcw, Undo2 } from 'lucide-react'
import type { CategoriaDaBiblioteca, LinhaDoModelo, ModeloProjetado, Operation } from '@/lib/biblioteca/tipos'

const ESTILOS = [
  { code: 'CLASSICO_COMPLETO', label: 'Clássico' },
  { code: 'OBJETIVO', label: 'Objetivo' },
] as const

type Detalhe = {
  catalogo?: { modelos?: ModeloProjetado[] }
  rascunho?: { operations: Operation[] } | null
  publicado?: { operations: Operation[]; versao: number } | null
  personalizacao_ativa?: boolean
  error?: string
}

const SECAO_ROTULO: Record<LinhaDoModelo['secao'], string> = {
  tecnica: 'Técnica',
  corpo: 'Achados',
  conclusao: 'Conclusão',
}

/**
 * A BIBLIOTECA — o médico lê o modelo dos laudos dele e reescreve a redação.
 *
 * O modelo NÃO é um texto guardado: é derivado do renderer que gera os laudos
 * de verdade. Por isso o que aparece aqui é exatamente o que sai lá, e por isso
 * há linhas que ele não pode reescrever — o catálogo diz quais, e diz por quê.
 *
 * Três estados que a tela precisa manter distintos, porque confundi-los é o que
 * faz o médico achar que o produto está quebrado:
 *
 *   RASCUNHO   — salvo, não muda laudo nenhum
 *   PUBLICADO  — a intenção está gravada
 *   EM USO     — as flags do ambiente realmente aplicam a redação dele
 *
 * Publicado ≠ em uso. A API responde `personalizacao_ativa` justamente porque
 * dizer "em uso" para algo que o gerador ignora é a pior espécie de mentira num
 * produto clínico.
 */
export function BibliotecaWorkspace({ categorias }: { categorias: CategoriaDaBiblioteca[] }) {
  const [categoria, setCategoria] = useState(categorias[0]?.categoria ?? '')
  const [estilo, setEstilo] = useState<string>('CLASSICO_COMPLETO')
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  /** As reescritas ainda não salvas: slot → frase nova. */
  const [edicoes, setEdicoes] = useState<Record<string, string>>({})

  const atual = categorias.find((c) => c.categoria === categoria)

  const carregar = useCallback(async () => {
    if (!categoria) return
    setCarregando(true)
    setErro(null)
    setAviso(null)
    setEdicoes({})
    try {
      const r = await fetch(`/api/biblioteca/${categoria}?estilo=${estilo}`, { cache: 'no-store' })
      const d = (await r.json()) as Detalhe
      if (!r.ok) {
        setErro(d.error ?? 'Não foi possível carregar o modelo.')
        setDetalhe(null)
      } else {
        setDetalhe(d)
        /** O rascunho em curso reaparece como edição pendente, não como texto salvo. */
        const doRascunho: Record<string, string> = {}
        for (const op of d.rascunho?.operations ?? []) {
          if (op.op === 'replace_phrase') doRascunho[op.slot] = op.value
        }
        setEdicoes(doRascunho)
      }
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setCarregando(false)
    }
  }, [categoria, estilo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const modelos = detalhe?.catalogo?.modelos ?? []
  const [cenario, setCenario] = useState(0)
  useEffect(() => setCenario(0), [categoria, estilo])
  const modelo = modelos[cenario] ?? modelos[0]

  const operacoes = useMemo<Operation[]>(
    () =>
      Object.entries(edicoes)
        .filter(([, v]) => v.trim() !== '')
        .map(([slot, value]) => ({ op: 'replace_phrase', slot, value })),
    [edicoes],
  )

  const publicadoOps = detalhe?.publicado?.operations ?? []
  const sujo = JSON.stringify(operacoes) !== JSON.stringify(publicadoOps.filter((o) => o.op === 'replace_phrase'))

  const acao = async (caminho: string, init: RequestInit, sucesso: string) => {
    setSalvando(true)
    setErro(null)
    setAviso(null)
    try {
      const r = await fetch(caminho, init)
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        /** O 403 da allowlist não é falha da tela — é decisão de produto, e o médico precisa ler isso. */
        setErro(
          r.status === 403
            ? 'A personalização ainda não está liberada para a sua conta nesta categoria. O rascunho fica salvo.'
            : (d.error ?? d.detalhe ?? 'Não foi possível concluir.'),
        )
      } else {
        setAviso(sucesso)
        await carregar()
      }
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setSalvando(false)
    }
  }

  if (categorias.length === 0) {
    return (
      <Moldura>
        <p className="px-5 py-10 text-sm text-gray-500 dark:text-gray-400">
          Nenhuma categoria disponível. Se isto persistir, o serviço do catálogo pode estar fora.
        </p>
      </Moldura>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Link
          href="/app/gerar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="font-barlow text-lg font-bold text-gray-900 dark:text-gray-100">Biblioteca</h1>
        <p className="hidden text-xs text-gray-500 sm:block dark:text-gray-400">
          O modelo dos seus laudos. Reescreva a redação; os dados continuam vindo do exame.
        </p>

        <div className="ml-auto inline-flex rounded-full border border-gray-200 p-0.5 dark:border-gray-700">
          {ESTILOS.map((e) => (
            <button
              key={e.code}
              type="button"
              onClick={() => setEstilo(e.code)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                estilo === e.code
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(15rem,19rem)_1fr]">
        <nav
          aria-label="Categorias"
          className="min-h-0 overflow-y-auto border-gray-200 bg-white lg:border-r dark:border-gray-800 dark:bg-gray-900"
        >
          <ul>
            {categorias.map((c) => {
              const ativa = c.categoria === categoria
              return (
                <li key={c.categoria}>
                  <button
                    type="button"
                    onClick={() => setCategoria(c.categoria)}
                    aria-current={ativa ? 'true' : undefined}
                    className={`flex w-full items-center gap-2.5 border-b border-gray-100 px-4 py-2.5 text-left transition dark:border-gray-800/70 ${
                      ativa ? 'bg-emerald-50/70 dark:bg-emerald-950/25' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-7 w-0.5 shrink-0 rounded-full ${ativa ? 'bg-emerald-600' : 'bg-transparent'}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {c.rotulo}
                    </span>
                    {c.personalizacao_ativa ? (
                      <span
                        title="A sua redação está valendo nos laudos desta categoria"
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
                      >
                        em uso
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section className="min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-5 py-5">
            {atual && !atual.personalizacao_ativa && atual.explicacao_inativa ? (
              <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong className="font-semibold">A sua redação ainda não vale nesta categoria.</strong>{' '}
                  {atual.explicacao_inativa} O rascunho pode ser salvo mesmo assim.
                </span>
              </p>
            ) : null}

            {erro ? <Faixa tom="erro">{erro}</Faixa> : null}
            {aviso ? <Faixa tom="ok">{aviso}</Faixa> : null}

            {carregando ? (
              <p className="py-10 text-center text-sm text-gray-400">Carregando o modelo…</p>
            ) : !modelo ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Esta categoria ainda não projeta um modelo editável.
              </p>
            ) : (
              <>
                {modelos.length > 1 ? (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {modelos.map((m, i) => (
                      <button
                        key={m.nome}
                        type="button"
                        onClick={() => setCenario(i)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          i === cenario
                            ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                        }`}
                      >
                        {m.nome}
                      </button>
                    ))}
                  </div>
                ) : null}

                <Modelo
                  modelo={modelo}
                  edicoes={edicoes}
                  onEditar={(slot, valor) => setEdicoes((e) => ({ ...e, [slot]: valor }))}
                  onRestaurarLinha={(slot) =>
                    setEdicoes((e) => {
                      const { [slot]: _fora, ...resto } = e
                      return resto
                    })
                  }
                />
              </>
            )}
          </div>

          {modelo ? (
            <footer className="sticky bottom-0 border-t border-gray-200 bg-white/95 px-5 py-2.5 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
              <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {operacoes.length === 0
                    ? 'Nenhuma alteração.'
                    : `${operacoes.length} linha${operacoes.length === 1 ? '' : 's'} reescrita${operacoes.length === 1 ? '' : 's'}.`}
                  {detalhe?.publicado ? ' Há uma versão publicada.' : ''}
                </span>

                <span className="ml-auto" />

                {detalhe?.publicado ? (
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() =>
                      acao(
                        `/api/biblioteca/${categoria}/publicar?estilo=${estilo}`,
                        { method: 'DELETE' },
                        'Despublicado. Os laudos voltaram ao modelo da casa.',
                      )
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Despublicar
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={salvando || operacoes.length === 0}
                  onClick={() =>
                    acao(
                      `/api/biblioteca/${categoria}?estilo=${estilo}`,
                      {
                        method: 'PUT',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ operations: operacoes }),
                      },
                      'Rascunho salvo. Nenhum laudo mudou ainda.',
                    )
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  Salvar rascunho
                </button>

                <button
                  type="button"
                  disabled={salvando || (operacoes.length === 0 && !sujo)}
                  onClick={() =>
                    acao(
                      `/api/biblioteca/${categoria}?estilo=${estilo}`,
                      {
                        method: 'PUT',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ operations: operacoes }),
                      },
                      'Salvo. Publicando…',
                    ).then(() =>
                      acao(
                        `/api/biblioteca/${categoria}/publicar?estilo=${estilo}`,
                        { method: 'POST' },
                        'Publicado. A partir de agora os seus laudos usam esta redação.',
                      ),
                    )
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  Publicar
                </button>
              </div>
            </footer>
          ) : null}
        </section>
      </div>
    </div>
  )
}

function Modelo({
  modelo,
  edicoes,
  onEditar,
  onRestaurarLinha,
}: {
  modelo: ModeloProjetado
  edicoes: Record<string, string>
  onEditar: (slot: string, valor: string) => void
  onRestaurarLinha: (slot: string) => void
}) {
  const secoes: LinhaDoModelo['secao'][] = ['tecnica', 'corpo', 'conclusao']
  return (
    <div className="flex flex-col gap-5">
      {secoes.map((secao) => {
        const linhas = modelo.linhas.filter((l) => l.secao === secao)
        if (linhas.length === 0) return null
        return (
          <section key={secao}>
            <h2 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              {SECAO_ROTULO[secao]}
            </h2>
            <div className="flex flex-col gap-1.5">
              {linhas.map((l) => (
                <Linha
                  key={`${l.slot}·${l.variante}`}
                  linha={l}
                  valor={edicoes[l.slot]}
                  onEditar={(v) => onEditar(l.slot, v)}
                  onRestaurar={() => onRestaurarLinha(l.slot)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Linha({
  linha,
  valor,
  onEditar,
  onRestaurar,
}: {
  linha: LinhaDoModelo
  valor?: string
  onEditar: (v: string) => void
  onRestaurar: () => void
}) {
  const [abrindo, setAbrindo] = useState(false)
  const alterada = valor !== undefined && valor !== linha.frase
  const editando = abrindo || alterada

  if (!linha.editavel) {
    return (
      <div
        title={linha.motivo ?? 'Esta linha é escrita pelo sistema'}
        className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/60"
      >
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
        <p className="flex-1 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-gray-500 dark:text-gray-400">
          {linha.frase}
        </p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 transition ${
        alterada
          ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
      }`}
    >
      {editando ? (
        <textarea
          autoFocus={abrindo}
          value={valor ?? linha.frase}
          onChange={(e) => onEditar(e.target.value)}
          onBlur={() => setAbrindo(false)}
          rows={Math.max(2, Math.ceil((valor ?? linha.frase).length / 78))}
          className="w-full resize-y rounded-md border border-gray-200 bg-white px-2.5 py-1.5 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-gray-800 outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAbrindo(true)}
          className="group flex w-full items-start gap-2 text-left"
        >
          <Pencil className="mt-1 h-3 w-3 shrink-0 text-gray-300 transition group-hover:text-emerald-600 dark:text-gray-600" />
          <p className="flex-1 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-gray-800 dark:text-gray-200">
            {linha.frase}
          </p>
        </button>
      )}

      {(linha.placeholdersObrigatorios.length > 0 || !linha.removivel || linha.obrigatorio || alterada) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-gray-500 dark:text-gray-400">
          {linha.placeholdersObrigatorios.map((p) => (
            <span key={p} title="Este dado vem do exame e não pode sumir da frase">
              mantenha <code className="font-mono text-gray-700 dark:text-gray-300">{p}</code>
            </span>
          ))}
          {linha.obrigatorio || !linha.removivel ? <span>frase obrigatória</span> : null}
          {alterada ? (
            <button
              type="button"
              onClick={onRestaurar}
              className="ml-auto inline-flex items-center gap-1 font-semibold text-gray-500 transition hover:text-gray-800 dark:hover:text-gray-200"
            >
              <RotateCcw className="h-3 w-3" />
              desfazer
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Faixa({ tom, children }: { tom: 'erro' | 'ok'; children: React.ReactNode }) {
  return (
    <p
      className={`mb-4 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
        tom === 'erro'
          ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
      }`}
    >
      {children}
    </p>
  )
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  )
}
