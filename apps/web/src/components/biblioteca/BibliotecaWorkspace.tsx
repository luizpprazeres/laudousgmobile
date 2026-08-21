'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Undo2 } from 'lucide-react'
import type { CategoriaDaBiblioteca, ModeloProjetado, Operation } from '@/lib/biblioteca/tipos'
import { EDICOES_VAZIAS, Modelo, type Edicoes } from './Modelo'

const ESTILOS = [
  { code: 'CLASSICO_COMPLETO', label: 'Clássico' },
  { code: 'OBJETIVO', label: 'Objetivo' },
] as const

type Detalhe = {
  catalogo?: { modelos?: ModeloProjetado[] }
  /** Um por cenário, na mesma ordem dos modelos, no MESMO estilo da tela. */
  cenarios?: { nome: string; exemplo: string | null }[]
  rascunho?: { operations: Operation[] } | null
  publicado?: { operations: Operation[]; versao: number } | null
  personalizacao_ativa?: boolean
  error?: string
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

  /** O que ainda não foi salvo: reescritas, remoções e frases novas. */
  const [edicoes, setEdicoes] = useState<Edicoes>(EDICOES_VAZIAS)

  const atual = categorias.find((c) => c.categoria === categoria)

  const carregar = useCallback(async () => {
    if (!categoria) return
    setCarregando(true)
    setErro(null)
    setAviso(null)
    setEdicoes(EDICOES_VAZIAS)
    try {
      const r = await fetch(`/api/biblioteca/${categoria}?estilo=${estilo}`, { cache: 'no-store' })
      const d = (await r.json()) as Detalhe
      if (!r.ok) {
        setErro(d.error ?? 'Não foi possível carregar o modelo.')
        setDetalhe(null)
      } else {
        setDetalhe(d)
        /** O rascunho em curso reaparece como edição pendente, não como texto salvo. */
        const pend: Edicoes = { textos: {}, removidos: [], inseridas: [] }
        for (const op of d.rascunho?.operations ?? []) {
          if (op.op === 'replace_phrase') pend.textos[op.slot] = op.value
          if (op.op === 'remove_slot') pend.removidos.push(op.slot)
          if (op.op === 'insert_phrase_after') pend.inseridas.push({ anchor: op.anchor, value: op.value })
        }
        setEdicoes(pend)
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
  /**
   * O exemplo do cenário ESCOLHIDO, no estilo da tela.
   *
   * Antes era um laudo real do médico, buscado por categoria — e desencontrava
   * em dois eixos: podia ser de outro cenário (7 semanas ao lado do modelo de
   * 32) e vinha no estilo em que foi escrito. Agora sai do mesmo motor, com o
   * mesmo cenário e o mesmo estilo. (Luiz, 21/08.)
   */
  const exemplo =
    detalhe?.cenarios?.find((c) => c.nome === modelo?.nome)?.exemplo ??
    detalhe?.cenarios?.[cenario]?.exemplo ??
    null

  const operacoes = useMemo<Operation[]>(
    () => [
      ...Object.entries(edicoes.textos)
        .filter(([, v]) => v.trim() !== '')
        .map(([slot, value]) => ({ op: 'replace_phrase', slot, value }) as Operation),
      ...edicoes.removidos.map((slot) => ({ op: 'remove_slot', slot }) as Operation),
      ...edicoes.inseridas.map((i) => ({ op: 'insert_phrase_after', anchor: i.anchor, value: i.value }) as Operation),
    ],
    [edicoes],
  )

  const publicadoOps = detalhe?.publicado?.operations ?? []
  const sujo = JSON.stringify(operacoes) !== JSON.stringify(publicadoOps)

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

      <Apresentacao />

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
                  exemplo={exemplo}
                  onEditar={(slot, valor) =>
                    setEdicoes((e) => ({ ...e, textos: { ...e.textos, [slot]: valor } }))
                  }
                  onRemover={(slot) =>
                    setEdicoes((e) => ({ ...e, removidos: [...new Set([...e.removidos, slot])] }))
                  }
                  onRestaurar={(slot) =>
                    setEdicoes((e) => {
                      const { [slot]: _fora, ...textos } = e.textos
                      return { ...e, textos, removidos: e.removidos.filter((r) => r !== slot) }
                    })
                  }
                  onInserir={(anchor, value) =>
                    setEdicoes((e) => ({ ...e, inseridas: [...e.inseridas, { anchor, value }] }))
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

/**
 * A apresentação — poucas linhas, e elas ganham o dia.
 *
 * O médico chega numa tela que edita o texto dos próprios laudos e precisa
 * entender três coisas antes de mexer: de onde vem o modelo, por que algumas
 * frases não abrem, e que reescrever aqui não é o mesmo que assinar. Sem isso
 * ele testa no escuro — e o que está em jogo é documento clínico.
 *
 * Recolhida por padrão depois da primeira visita: instrução que não se pode
 * fechar vira ruído para quem já leu.
 */
function Apresentacao() {
  const [aberta, setAberta] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setAberta(window.localStorage.getItem('laudousg.biblioteca.lida') !== 'sim')
    } catch {
      setAberta(true)
    }
  }, [])

  const fechar = () => {
    setAberta(false)
    try {
      window.localStorage.setItem('laudousg.biblioteca.lida', 'sim')
    } catch {
      /* modo privado: fecha só nesta visita */
    }
  }

  if (aberta === null) return null

  if (!aberta) {
    return (
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="flex shrink-0 items-center gap-1.5 border-b border-gray-200 bg-white px-5 py-1.5 text-left text-[11px] font-semibold text-gray-400 transition hover:text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:hover:text-gray-300"
      >
        <ChevronDown className="h-3 w-3" />
        Como funciona a Biblioteca
      </button>
    )
  }

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-4">
        <div className="grid flex-1 gap-x-7 gap-y-2 text-[12px] leading-relaxed text-gray-600 sm:grid-cols-3 dark:text-gray-400">
          <p>
            <strong className="font-semibold text-gray-800 dark:text-gray-200">Este é o seu laudo.</strong>{' '}
            O modelo não é um texto guardado: sai do mesmo motor que escreve os seus laudos. O que
            você lê aqui é o que sai lá.
          </p>
          <p>
            <strong className="font-semibold text-gray-800 dark:text-gray-200">
              O que tem cadeado não abre.
            </strong>{' '}
            São as frases que o sistema calcula — classificação, escore, volume. Se elas virassem
            texto livre, o laudo poderia dizer um número e concluir outro.
          </p>
          <p>
            <strong className="font-semibold text-gray-800 dark:text-gray-200">
              Mexa na redação, não no dado.
            </strong>{' '}
            As lacunas <code className="font-mono text-[11px]">____</code> são medidas do exame.
            Troque as palavras à vontade; deixe as lacunas onde estão.
          </p>
        </div>
        <button
          type="button"
          onClick={fechar}
          className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          Entendi
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-500">
        Nada muda nos seus laudos até você <strong className="font-semibold">publicar</strong> — o
        rascunho é só seu. Ao lado de cada modelo há um laudo real da mesma categoria, para
        comparar.
      </p>
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
