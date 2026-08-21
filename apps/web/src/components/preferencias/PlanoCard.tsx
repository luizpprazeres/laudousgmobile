'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Minus, Zap } from 'lucide-react'
import { PRECOS, type Assinatura, type PlanoDoBanco, fmtBRL, inclui, nivelDe } from '@/lib/planos'

/**
 * O PLANO — o que o médico tem, o que isso inclui, e para onde subir.
 *
 * Sem medidor de uso, de propósito. A tabela de preços promete "10 laudos
 * vitalício" e "800/mês", mas **nada disso é imposto**: não existe cota
 * implementada em lugar nenhum do sistema (procurado em 21/08). Um contador
 * aqui pareceria estar medindo um limite que não existe — e o médico decidiria
 * uma compra com base nele.
 *
 * O que se mostra é o que é verdade: o nível, onde a assinatura é gerida, e o
 * que o plano promete — com link para a página de preços, que é a fonte.
 */
export function PlanoCard({
  plano,
  assinatura,
}: {
  plano: PlanoDoBanco
  assinatura: Assinatura
}) {
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const nivel = nivelDe(plano, assinatura)
  const linhas = inclui(nivel)

  const assinar = async (destino: 'essencial' | 'profissional') => {
    setIndo(true)
    setErro(null)
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: destino }),
      })
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!r.ok || !j.url) {
        setErro(j.error ?? 'Não foi possível abrir o pagamento. Tente de novo.')
        setIndo(false)
        return
      }
      window.location.href = j.url
    } catch {
      setErro('Sem conexão com o pagamento. Tente de novo.')
      setIndo(false)
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Seu plano</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {nivel.origem === 'App Store'
              ? 'assinatura pela App Store'
              : nivel.origem === 'site'
                ? 'assinatura pelo site'
                : 'sem assinatura'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 font-barlow text-sm font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          {nivel.rotulo}
        </span>
      </div>

      {assinatura ? (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          {assinatura.is_trial ? 'Período de teste até ' : 'Renova em '}
          <strong className="font-semibold text-gray-700 dark:text-gray-300">
            {new Date(assinatura.expires_at).toLocaleDateString('pt-BR')}
          </strong>
          . Para mudar ou cancelar, use as assinaturas da App Store — o site não
          gerencia o que foi comprado por lá.
        </p>
      ) : null}

      <ul className="mb-4 flex flex-col gap-1.5">
        {linhas.map((l) => (
          <li key={l.label} className="flex items-center gap-2 text-xs">
            {l.valor === true ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : l.valor === false ? (
              <Minus className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            )}
            <span
              className={
                l.valor === false
                  ? 'text-gray-400 line-through dark:text-gray-600'
                  : 'text-gray-700 dark:text-gray-300'
              }
            >
              {l.label}
              {typeof l.valor === 'string' ? (
                <span className="text-gray-500 dark:text-gray-400"> · {l.valor}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {nivel.sugereUpgrade && !assinatura ? (
        <>
          <button
            type="button"
            onClick={() => assinar(nivel.sugereUpgrade!)}
            disabled={indo}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {indo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {nivel.sugereUpgrade === 'essencial' ? 'Assinar Essencial' : 'Assinar Profissional'}
            <span className="font-normal opacity-80">
              · R$&nbsp;{fmtBRL(PRECOS[nivel.sugereUpgrade])}/mês
            </span>
          </button>
          <Link
            href="/precos"
            className="mt-2 block text-center text-xs font-semibold text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
          >
            comparar os planos
          </Link>
        </>
      ) : (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          {assinatura ? 'Gerido pela App Store.' : 'Você está no plano mais completo.'}
        </p>
      )}

      {erro ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{erro}</p> : null}
    </section>
  )
}
