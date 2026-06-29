'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Minus, ChevronDown, ChevronUp, Zap, ArrowLeft, Loader2 } from 'lucide-react'

// Preços mensais (decisão Luiz 2026-06-19). Free = 10 laudos vitalício (sem cobrança).
const PRICES = {
  essencial: 99.0,
  profissional: 169.9,
} as const

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const comparisonRows: {
  label: string
  free: string | true | false
  essencial: string | true | false
  profissional: string | true | false
}[] = [
  { label: 'Laudos', free: '10 vitalício', essencial: '800/mês', profissional: 'Ilimitados' },
  { label: 'Categorias de USG', free: true, essencial: true, profissional: true },
  { label: 'Geração com e sem IA', free: true, essencial: true, profissional: true },
  { label: 'Link de sala (auxiliar)', free: false, essencial: true, profissional: true },
  { label: 'Exportação .docx', free: true, essencial: true, profissional: true },
  { label: 'Suporte', free: false, essencial: 'WhatsApp', profissional: 'WhatsApp prioritário' },
]

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />
  if (value === false) return <Minus className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
  return <span className="text-xs text-gray-700 dark:text-gray-300">{value}</span>
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[2.75rem] touch-manipulation"
      >
        <span>{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-3" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-3" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
          {a}
        </div>
      )}
    </div>
  )
}

// Botão "assinar": cria a assinatura na AbacatePay (/api/checkout → url) e
// redireciona ao checkout. Se não estiver logado (401), manda ao cadastro
// preservando o plano escolhido.
function SubscribeButton({
  plan,
  label,
  variant,
}: {
  plan: 'essencial' | 'profissional'
  label: string
  variant: 'primary' | 'secondary'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubscribe() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      if (res.status === 401) {
        window.location.href = `/signup?plan=${plan}&redirect=/precos`
        return
      }

      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setError('Não foi possível iniciar o checkout. Tente novamente.')
      setLoading(false)
    } catch {
      setError('Não foi possível iniciar o checkout. Tente novamente.')
      setLoading(false)
    }
  }

  const baseClass =
    'w-full min-h-[2.75rem] flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-150 btn-press touch-manipulation disabled:opacity-60'
  const variantClass =
    variant === 'primary'
      ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
      : 'border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'

  return (
    <div className="flex flex-col gap-2">
      <button onClick={handleSubscribe} disabled={loading} className={`${baseClass} ${variantClass}`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
      </button>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}

export default function PrecosPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-10 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
          Voltar para o início
        </Link>

        <header className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-1.5 mb-6">
            <Zap className="w-5 h-5 text-emerald-600" />
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
              LaudoUSG
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-3 max-w-xl mx-auto">
            Escolha o plano certo para o seu volume de laudos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Plataforma de geração de laudos de ultrassonografia com e sem IA, especializada por
            categoria. Sem contrato, sem burocracia.
          </p>
        </header>

        <div className="flex items-center justify-center mb-8">
          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            Cobrança mensal · Sem fidelidade · PIX ou cartão
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gratuito */}
          <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                Gratuito
              </p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">R$&nbsp;0</span>
                <span className="text-sm text-gray-400 dark:text-gray-500 pb-0.5">/para sempre</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">10 laudos vitalício</p>
            </div>

            <ul className="flex flex-col gap-2.5 flex-1">
              {['Todas as categorias de USG', 'Geração com e sem IA', 'Exportação .docx'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="w-full min-h-[2.75rem] flex items-center justify-center py-3 rounded-xl font-semibold text-sm border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 btn-press"
            >
              Começar grátis
            </Link>
          </div>

          {/* Essencial (recomendado) */}
          <div className="relative border-2 border-emerald-500 bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col gap-5 shadow-md">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap">
              Recomendado
            </span>

            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                Essencial
              </p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  R$&nbsp;{fmtBRL(PRICES.essencial)}
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500 pb-0.5">/mês</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">800 laudos/mês</p>
            </div>

            <ul className="flex flex-col gap-2.5 flex-1">
              {[
                'Todas as categorias de USG',
                'Geração com e sem IA',
                'Link de sala (auxiliar)',
                'Exportação .docx',
                'Suporte via WhatsApp',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <SubscribeButton plan="essencial" label="Assinar Essencial" variant="primary" />
          </div>

          {/* Profissional */}
          <div className="relative border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col gap-5">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap">
              Mais completo
            </span>

            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                Profissional
              </p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  R$&nbsp;{fmtBRL(PRICES.profissional)}
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500 pb-0.5">/mês</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Laudos ilimitados</p>
            </div>

            <ul className="flex flex-col gap-2.5 flex-1">
              {[
                'Todas as categorias de USG',
                'Geração com e sem IA',
                'Link de sala (auxiliar)',
                'Exportação .docx',
                'Suporte prioritário',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <SubscribeButton plan="profissional" label="Assinar Profissional" variant="secondary" />
          </div>
        </div>

        <section className="mt-16">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-5">
            Compare os planos
          </h2>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-[40%]">
                    Recurso
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Gratuito
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide bg-emerald-50/50 dark:bg-emerald-900/20">
                    Essencial
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Profissional
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                      i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/40'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.label}</td>
                    <td className="px-3 py-3 text-center">
                      <CellValue value={row.free} />
                    </td>
                    <td className="px-3 py-3 text-center bg-emerald-50/30 dark:bg-emerald-900/10">
                      <CellValue value={row.essencial} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CellValue value={row.profissional} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-5">
            Dúvidas frequentes
          </h2>
          <div className="flex flex-col gap-3">
            <FaqItem
              q="Como funciona a ativação do plano?"
              a="Após o pagamento via AbacatePay (PIX ou cartão), seu plano é ativado automaticamente. Você recebe a confirmação e já pode usar todos os recursos do plano."
            />
            <FaqItem
              q="Quais formas de pagamento são aceitas?"
              a="PIX e cartão de crédito, com cobrança recorrente mensal processada pela AbacatePay."
            />
            <FaqItem
              q="Posso cancelar a qualquer momento?"
              a="Sim. Os planos são mensais, sem fidelidade. Cancele quando quiser — sem burocracia."
            />
            <FaqItem
              q="O que é o Link de Sala?"
              a="Um link exclusivo que você compartilha com sua auxiliar. Ela visualiza e copia o laudo em tempo real, sem precisar de login ou acesso à sua conta."
            />
          </div>
        </section>

        <footer className="mt-10 pb-8 text-center flex flex-col gap-2 items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-600 transition-colors group"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform duration-150" />
            Voltar para o início
          </Link>
          <p className="text-xs text-gray-300 dark:text-gray-600">
            © 2026 LaudoUSG · Todos os direitos reservados
          </p>
        </footer>
      </div>
    </div>
  )
}
