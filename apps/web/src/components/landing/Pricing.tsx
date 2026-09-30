'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Check, Lock } from 'lucide-react'

// Preços mensais (decisão Luiz 2026-06-19). Só mensal — AbacatePay tem só planos MONTHLY.
const PRICES = {
  essencial: 99.0,
  profissional: 169.9,
}
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/*
 * Mesmo grafite (#111614) e mesmo grid (max-w 1440, px-12) do resto da landing.
 * Contraste: texto sobre emerald-500 é sempre slate-950 (branco dava 2,5:1);
 * secundários em slate-400 sobre o grafite. Nenhum texto informativo abaixo de 12px.
 */
function PlanFeature({
  children, bright = false, soon = false,
}: {
  children: React.ReactNode
  bright?: boolean
  soon?: boolean
}) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/[0.15]">
        <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={2.5} />
      </span>
      <span className={`text-sm leading-[1.45] ${bright ? 'text-slate-100' : 'text-slate-300'}`}>
        {children}
        {soon && (
          <span className="ml-1.5 align-middle text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-emerald-400">
            em breve
          </span>
        )}
      </span>
    </div>
  )
}

export default function Pricing() {
  return (
    <section id="precos" className="scroll-mt-[64px] bg-[#111614] py-20 sm:py-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <h2 className="mb-3 font-barlow text-[2rem] font-extrabold leading-[1.12] tracking-[-0.025em] text-white sm:text-[2.5rem]">
          Escolha o plano ideal<br />para a sua rotina
        </h2>
        <p data-landing-free-trial-copy className="mb-12 max-w-3xl text-base leading-relaxed text-slate-400">
          Teste na sua rotina do dia a dia. São 30 laudos grátis — o bastante para acompanhar um turno inteiro e sentir o ganho de tempo na prática.
          Depois, escolha o plano que acompanha a sua demanda, sem fidelidade.
        </p>

        {/* Essencial central e maior; o destaque vem da borda e da escala, não de brilho. */}
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_1.18fr_1fr]">
          {/* Gratuito */}
          <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-transform duration-200 hover:-translate-y-1 lg:my-3">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Gratuito</p>
            <div className="mb-1 font-barlow text-[1.9rem] font-extrabold leading-none text-white">
              <sup className="align-super text-xs text-slate-400">R$</sup> 0
            </div>
            <p className="mb-4 text-[0.8125rem] text-slate-400">para sempre</p>
            <div className="mb-4 h-px bg-white/[0.08]" />
            {['30 laudos grátis', 'Link para auxiliar de sala', 'Exportação .docx'].map((f) => (
              <PlanFeature key={f}>{f}</PlanFeature>
            ))}
            <Link
              href="/signup"
              className="mt-auto flex min-h-11 items-center justify-center rounded-lg border border-white/15 py-2.5 text-center text-sm font-bold text-slate-200 transition-[transform,border-color,color] duration-150 hover:border-white/30 hover:text-white active:scale-[0.97]"
            >
              Começar grátis
            </Link>
          </div>

          {/* Essencial */}
          <div className="relative flex flex-col rounded-2xl border border-emerald-400/50 bg-white/[0.05] p-7 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-transform duration-200 hover:-translate-y-1.5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold tracking-[0.04em] text-slate-950">
              Recomendado
            </div>
            <p className="mb-2.5 mt-1 text-xs font-bold uppercase tracking-[0.1em] text-emerald-300">Essencial</p>
            <div className="mb-1 font-barlow text-[2.6rem] font-extrabold leading-none text-white">
              <sup className="align-super text-[0.8rem] text-slate-300">R$</sup> {fmtBRL(PRICES.essencial)}
              <small className="text-[0.8125rem] font-normal text-slate-400">/mês</small>
            </div>
            <p className="mb-5 text-[0.8125rem] text-slate-400">cancele quando quiser</p>
            <div className="mb-5 h-px bg-emerald-400/20" />
            {[
              'Até 800 laudos/mês (cerca de 26 por dia)',
              'Todas as categorias de exame',
              'Calibração ao seu estilo',
              'Sala do Auxiliar personalizada',
              'Esquemas visuais (mama, tireoide e mapa venoso)',
            ].map((f) => (
              <PlanFeature key={f} bright>{f}</PlanFeature>
            ))}
            <Link
              href="/precos"
              className="mt-auto flex min-h-11 items-center justify-center rounded-xl bg-emerald-500 py-3 text-center text-[0.9rem] font-bold text-slate-950 transition-[transform,background-color] duration-150 hover:bg-emerald-400 active:scale-[0.97] active:bg-emerald-600"
            >
              Assinar agora
            </Link>
          </div>

          {/* Profissional */}
          <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-transform duration-200 hover:-translate-y-1 lg:my-3">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Profissional</p>
            <div className="mb-1 font-barlow text-[1.9rem] font-extrabold leading-none text-white">
              <sup className="align-super text-xs text-slate-400">R$</sup> {fmtBRL(PRICES.profissional)}
              <small className="text-[0.8125rem] font-normal text-slate-400">/mês</small>
            </div>
            <p className="mb-4 text-[0.8125rem] text-slate-400">para clínicas e alta demanda</p>
            <div className="mb-4 h-px bg-white/[0.08]" />
            <p className="mb-3 text-[0.8125rem] font-semibold text-emerald-400">Tudo do Essencial, e mais:</p>
            {[
              'Laudos ilimitados, sem contador',
              'Múltiplos assistentes de sala',
              'Suporte prioritário via WhatsApp',
              'Consultor IA para diagnósticos e redação',
            ].map((f) => (
              <PlanFeature key={f}>{f}</PlanFeature>
            ))}
            <PlanFeature soon>Cartografia automática no Doppler</PlanFeature>
            <Link
              href="/precos"
              className="mt-auto flex min-h-11 items-center justify-center rounded-lg border border-white/15 py-2.5 text-center text-sm font-bold text-slate-200 transition-[transform,border-color,color] duration-150 hover:border-white/30 hover:text-white active:scale-[0.97]"
            >
              Assinar agora
            </Link>
          </div>
        </div>

        {/* Formas de pagamento */}
        <div className="mt-12 flex flex-col items-center gap-4 border-t border-white/[0.08] pt-8">
          <div className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-emerald-300">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
            Pagamento seguro
          </div>
          <Image
            src="/payway.png"
            alt="Formas de pagamento aceitas: PIX, Visa, Mastercard, American Express, Elo, Hipercard e Boleto"
            width={480}
            height={56}
            className="opacity-70 transition-opacity duration-300 hover:opacity-90"
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
    </section>
  )
}
