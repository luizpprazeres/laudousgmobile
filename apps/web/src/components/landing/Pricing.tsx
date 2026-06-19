'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, Lock } from 'lucide-react'

const PRICES = {
  monthly: { essencial: 99.9, profissional: 159.9 },
  annual: { essencial: 84.92, profissional: 135.92 },
}
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function PlanFeature({
  children, bright = false, soon = false,
}: {
  children: React.ReactNode
  bright?: boolean
  soon?: boolean
}) {
  return (
    <div className="flex items-start gap-2 mb-2.5">
      <span className="w-[15px] h-[15px] bg-emerald-500/[0.15] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <Check className="w-2 h-2 text-emerald-400" strokeWidth={2.5} />
      </span>
      <span className={`text-[0.73rem] leading-[1.4] ${bright ? 'text-slate-200' : 'text-slate-400'}`}>
        {children}
        {soon && (
          <span className="ml-1.5 text-[0.58rem] font-bold uppercase tracking-[0.06em] text-emerald-400/80 align-middle">
            em breve
          </span>
        )}
      </span>
    </div>
  )
}

export default function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  return (
    <section id="precos" className="relative bg-[#020617] py-20 sm:py-24 px-6 sm:px-10 overflow-hidden scroll-mt-[64px]">
      {/* Grid técnico emoldurando o bloco de planos (uso intencional das linhas) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_78%)]"
      />

      <div className="relative max-w-[1000px] mx-auto">
        <p className="text-emerald-400 text-[0.7rem] font-bold uppercase tracking-[0.1em] mb-3">Planos</p>
        <h2 className="font-barlow font-extrabold text-[2rem] sm:text-[2.5rem] tracking-[-0.025em] text-white leading-[1.12] mb-2">
          Escolha o plano ideal<br />para a sua rotina
        </h2>
        <p className="text-[0.9rem] text-slate-500 mb-9">Comece grátis. Escale conforme sua demanda.</p>

        {/* Toggle */}
        <div className="inline-flex bg-white/[0.05] border border-white/[0.08] rounded-full p-1 mb-12">
          {(['monthly', 'annual'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              aria-pressed={billing === b}
              className={`px-[18px] py-1.5 text-[0.75rem] font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                billing === b ? 'bg-white text-[#0f172a]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {b === 'monthly' ? 'Mensal' : 'Anual'}
              {b === 'annual' && (
                <span className="text-[0.58rem] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                  15% off
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Cards: Essencial central, maior, com glow (tamanhos variados) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.18fr_1fr] gap-4 items-center">
          {/* Gratuito */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 flex flex-col lg:my-3 hover:-translate-y-1 transition-transform duration-200">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-slate-500 mb-2.5">Gratuito</p>
            <div className="font-barlow font-extrabold text-[1.9rem] text-white leading-none mb-0.5">
              <sup className="text-[0.7rem] text-slate-400 align-super">R$</sup> 0
            </div>
            <p className="text-[0.68rem] text-slate-500 mb-4">para sempre</p>
            <div className="h-px bg-white/[0.06] mb-4" />
            {['10 laudos vitalício', 'Link para auxiliar de sala', 'Exportação .docx'].map((f) => (
              <PlanFeature key={f}>{f}</PlanFeature>
            ))}
            <Link
              href="/signup"
              className="mt-auto pt-4 block text-center border border-white/10 text-slate-300 text-[0.8rem] font-bold py-2.5 rounded-lg hover:border-white/25 hover:text-white active:scale-[0.97] transition-[transform,border-color,color] duration-150"
            >
              Começar grátis
            </Link>
          </div>

          {/* Essencial — destaque maior + neon */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.35)_0%,transparent_70%)] blur-xl"
            />
            <div className="relative rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-500/[0.12] to-white/[0.03] p-7 flex flex-col shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_22px_60px_-18px_rgba(16,185,129,0.5)] hover:-translate-y-1.5 transition-transform duration-200">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[0.6rem] font-bold px-3 py-1 rounded-full tracking-[0.07em] whitespace-nowrap shadow-[0_4px_14px_rgba(16,185,129,0.5)]">
                Recomendado
              </div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-emerald-300 mb-2.5 mt-1">Essencial</p>
              <div className="font-barlow font-extrabold text-[2.6rem] text-white leading-none mb-0.5">
                <sup className="text-[0.8rem] text-slate-300 align-super">R$</sup> {fmtBRL(PRICES[billing].essencial)}
                <small className="text-[0.78rem] text-slate-400 font-normal">/mês</small>
              </div>
              <p className="text-[0.7rem] text-slate-400 mb-5">cancele quando quiser</p>
              <div className="h-px bg-emerald-400/15 mb-5" />
              {[
                'Até 800 laudos/mês (cerca de 26 por dia)',
                'Todas as categorias de exame',
                'Calibração ao seu estilo',
                'Sala do Auxiliar personalizada',
                'Esquemas visuais (mama, tireoide, miomas)',
              ].map((f) => (
                <PlanFeature key={f} bright>{f}</PlanFeature>
              ))}
              <Link
                href="/planos"
                className="mt-auto pt-5 block text-center bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-[0.97] text-white text-[0.85rem] font-bold py-3 rounded-xl shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_10px_28px_rgba(16,185,129,0.5)] transition-[transform,box-shadow,background-color] duration-150"
              >
                Assinar agora
              </Link>
            </div>
          </div>

          {/* Profissional */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 flex flex-col lg:my-3 hover:-translate-y-1 transition-transform duration-200">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-slate-500 mb-2.5">Profissional</p>
            <div className="font-barlow font-extrabold text-[1.9rem] text-white leading-none mb-0.5">
              <sup className="text-[0.7rem] text-slate-400 align-super">R$</sup> {fmtBRL(PRICES[billing].profissional)}
              <small className="text-[0.7rem] text-slate-500 font-normal">/mês</small>
            </div>
            <p className="text-[0.66rem] text-slate-500 mb-4">para clínicas e alta demanda</p>
            <div className="h-px bg-white/[0.06] mb-4" />
            <p className="text-[0.64rem] text-emerald-400/80 font-semibold mb-3">Tudo do Essencial, e mais:</p>
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
              href="/planos"
              className="mt-auto pt-4 block text-center border border-white/10 text-slate-300 text-[0.8rem] font-bold py-2.5 rounded-lg hover:border-white/25 hover:text-white active:scale-[0.97] transition-[transform,border-color,color] duration-150"
            >
              Assinar agora
            </Link>
          </div>
        </div>

        {/* Formas de pagamento */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-1.5 text-[0.7rem] text-emerald-300/90 font-semibold">
            <Lock className="w-3.5 h-3.5" strokeWidth={2} />
            Pagamento seguro
          </div>
          <Image
            src="/payway.png"
            alt="Formas de pagamento aceitas: PIX, Visa, Mastercard, American Express, Elo, Hipercard e Boleto"
            width={480}
            height={56}
            className="opacity-70 hover:opacity-90 transition-opacity duration-300"
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
    </section>
  )
}
