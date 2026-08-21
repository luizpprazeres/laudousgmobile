'use client'

import { useState } from 'react'
import { Lock, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { LinhaDoModelo, ModeloProjetado } from '@/lib/biblioteca/tipos'

const SECAO_ROTULO: Record<LinhaDoModelo['secao'], string> = {
  tecnica: 'Técnica',
  corpo: 'Achados',
  conclusao: 'Conclusão',
}

export type Edicoes = {
  /** slot → frase reescrita */
  textos: Record<string, string>
  /** slots removidos do laudo */
  removidos: string[]
  /** frases novas, ancoradas depois de um slot existente */
  inseridas: { anchor: string; value: string }[]
}

export const EDICOES_VAZIAS: Edicoes = { textos: {}, removidos: [], inseridas: [] }

/**
 * O MODELO como TEXTO CORRIDO — não uma caixa por frase.
 *
 * A primeira versão desenhava cada linha dentro de um cartão com borda. Lia-se
 * como formulário, não como laudo, e o médico precisa reconhecer ali o
 * documento que ele assina. Agora é texto: as ações aparecem ao passar o mouse,
 * discretas, e somem quando ele só quer ler.
 *
 * O que é fixo ganha um cadeado no fim da frase — em vez do rótulo "frase
 * obrigatória", que repetia a mesma informação em quatro palavras.
 */
export function Modelo({
  modelo,
  edicoes,
  exemplo,
  onEditar,
  onRemover,
  onRestaurar,
  onInserir,
}: {
  modelo: ModeloProjetado
  edicoes: Edicoes
  /** O laudo de exemplo, já renderizado no mesmo cenário e estilo. */
  exemplo: string | null
  onEditar: (slot: string, valor: string) => void
  onRemover: (slot: string) => void
  onRestaurar: (slot: string) => void
  onInserir: (anchor: string, valor: string) => void
}) {
  const secoes: LinhaDoModelo['secao'][] = ['tecnica', 'corpo', 'conclusao']

  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── o modelo, editável ── */}
      <div className="flex flex-col gap-5">
        <Cabecalho titulo="Modelo" auxiliar="o que a casa escreve — as lacunas vêm do exame" />
        {secoes.map((secao) => {
          const linhas = modelo.linhas.filter((l) => l.secao === secao)
          if (linhas.length === 0) return null
          return (
            <section key={secao}>
              <h3 className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                {SECAO_ROTULO[secao]}
              </h3>
              <div className="-mx-2">
                {linhas.map((l) => (
                  <Frase
                    key={`${l.slot}·${l.variante}`}
                    linha={l}
                    valor={edicoes.textos[l.slot]}
                    removida={edicoes.removidos.includes(l.slot)}
                    inseridas={edicoes.inseridas.filter((i) => i.anchor === l.slot)}
                    onEditar={(v) => onEditar(l.slot, v)}
                    onRemover={() => onRemover(l.slot)}
                    onRestaurar={() => onRestaurar(l.slot)}
                    onInserir={(v) => onInserir(l.slot, v)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* ── um laudo seu, de verdade ── */}
      <div className="flex min-w-0 flex-col gap-2">
        <Cabecalho titulo="Exemplo" auxiliar="o mesmo modelo, com números — ilustrativos, de um exame normal" />
        {exemplo === null ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-xs text-gray-400 dark:border-gray-700">
            Sem exemplo para este cenário.
          </p>
        ) : (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3 font-['Times_New_Roman',Georgia,serif] text-[13px] leading-relaxed text-gray-600 dark:bg-gray-900/60 dark:text-gray-400">
            {exemplo}
          </pre>
        )}
      </div>
    </div>
  )
}

function Cabecalho({ titulo, auxiliar }: { titulo: string; auxiliar: string }) {
  return (
    <div className="border-b border-gray-200 pb-1.5 dark:border-gray-800">
      <h2 className="font-barlow text-sm font-bold text-gray-800 dark:text-gray-100">{titulo}</h2>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{auxiliar}</p>
    </div>
  )
}

/**
 * Uma frase do laudo. Sem borda, sem caixa — só texto, até o mouse chegar.
 */
function Frase({
  linha,
  valor,
  removida,
  inseridas,
  onEditar,
  onRemover,
  onRestaurar,
  onInserir,
}: {
  linha: LinhaDoModelo
  valor?: string
  removida: boolean
  inseridas: { anchor: string; value: string }[]
  onEditar: (v: string) => void
  onRemover: () => void
  onRestaurar: () => void
  onInserir: (v: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [inserindo, setInserindo] = useState(false)
  const [nova, setNova] = useState('')
  const alterada = valor !== undefined && valor !== linha.frase

  /** A frase travada não tem ação nenhuma — só o cadeado, no fim. */
  if (!linha.editavel) {
    return (
      <p
        title={linha.motivo ?? 'Escrita pelo sistema — depende do cálculo, não da redação'}
        className="px-2 py-1 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-gray-500 dark:text-gray-400"
      >
        {linha.frase}
        <Lock className="ml-1.5 inline h-3 w-3 -translate-y-px text-gray-300 dark:text-gray-600" />
      </p>
    )
  }

  if (removida) {
    return (
      <p className="group flex items-baseline gap-2 px-2 py-1">
        <span className="flex-1 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-gray-300 line-through dark:text-gray-600">
          {linha.frase}
        </span>
        <button
          type="button"
          onClick={onRestaurar}
          className="shrink-0 text-[11px] font-semibold text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
        >
          devolver
        </button>
      </p>
    )
  }

  return (
    <>
      <div className="group relative rounded-md px-2 py-1 transition hover:bg-gray-50 dark:hover:bg-gray-800/40">
        {editando ? (
          <textarea
            autoFocus
            value={valor ?? linha.frase}
            onChange={(e) => onEditar(e.target.value)}
            onBlur={() => setEditando(false)}
            rows={Math.max(2, Math.ceil((valor ?? linha.frase).length / 70))}
            className="w-full resize-y rounded-md border border-emerald-500 bg-white px-2 py-1 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-gray-800 outline-none dark:bg-gray-950 dark:text-gray-100"
          />
        ) : (
          <p
            onClick={() => setEditando(true)}
            className={`cursor-text font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed ${
              alterada
                ? 'text-gray-900 decoration-emerald-400 decoration-dotted underline-offset-4 dark:text-gray-100'
                : 'text-gray-800 dark:text-gray-200'
            } ${alterada ? 'underline' : ''}`}
          >
            {valor ?? linha.frase}
            {(linha.obrigatorio || !linha.removivel) && (
              <Lock className="ml-1.5 inline h-3 w-3 -translate-y-px text-gray-300 dark:text-gray-600" />
            )}
          </p>
        )}

        {/*
          As ações vivem à direita e só aparecem no hover ou no foco do teclado.
          Absolutas para não empurrar o texto quando surgem — a linha não pode
          "pular" enquanto o médico lê.
        */}
        {!editando ? (
          <span className="absolute right-1 top-0.5 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            {alterada ? (
              <Acao titulo="Desfazer" onClick={onRestaurar}>
                <RotateCcw className="h-3 w-3" />
              </Acao>
            ) : null}
            <Acao titulo="Escrever uma frase depois desta" onClick={() => setInserindo(true)}>
              <Plus className="h-3 w-3" />
            </Acao>
            {linha.removivel && !linha.obrigatorio ? (
              <Acao titulo="Tirar do laudo" onClick={onRemover} perigo>
                <Trash2 className="h-3 w-3" />
              </Acao>
            ) : null}
          </span>
        ) : null}

        {/* Os dados que não podem sumir, discretos e só quando se está editando. */}
        {editando && linha.placeholdersObrigatorios.length > 0 ? (
          <p className="mt-1 px-0.5 text-[10.5px] text-gray-500 dark:text-gray-400">
            mantenha{' '}
            {linha.placeholdersObrigatorios.map((p) => (
              <code key={p} className="mx-0.5 font-mono text-gray-700 dark:text-gray-300">
                {p}
              </code>
            ))}
            — é o dado do exame
          </p>
        ) : null}
      </div>

      {inseridas.map((i, n) => (
        <p
          key={`${i.anchor}-${n}`}
          className="px-2 py-1 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-emerald-800 dark:text-emerald-300"
        >
          {i.value}
        </p>
      ))}

      {inserindo ? (
        <div className="px-2 py-1">
          <textarea
            autoFocus
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            placeholder="A frase nova, que entra logo depois da de cima…"
            rows={2}
            className="w-full resize-y rounded-md border border-emerald-500 bg-white px-2 py-1 font-['Times_New_Roman',Georgia,serif] text-[13.5px] text-gray-800 outline-none dark:bg-gray-950 dark:text-gray-100"
          />
          <div className="mt-1 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (nova.trim()) onInserir(nova.trim())
                setNova('')
                setInserindo(false)
              }}
              className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-700"
            >
              Acrescentar
            </button>
            <button
              type="button"
              onClick={() => {
                setNova('')
                setInserindo(false)
              }}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-gray-500 transition hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

function Acao({
  titulo,
  onClick,
  perigo,
  children,
}: {
  titulo: string
  onClick: () => void
  perigo?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      className={`rounded p-1 text-gray-400 transition ${
        perigo
          ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40'
          : 'hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
