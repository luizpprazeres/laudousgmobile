'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown, Monitor, Smartphone } from 'lucide-react'
import { SignupCta } from './Cta'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/** Editorial illustration and a local diagram, never a live room connection. */
export default function WorkplaceScene() {
  const section = useRef<HTMLElement>(null)
  const reduce = useReducedMotionSafe()
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 24, reduce ? 0 : -24])

  return (
    <section
      ref={section}
      data-landing-section="workplace"
      aria-labelledby="workplace-title"
      className="relative isolate overflow-hidden bg-[#f4f6f4] text-slate-950"
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src="/brand/landing-workspace-v3.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[65%_center] opacity-[0.85]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#f4f6f4_5%,rgba(244,246,244,0.96)_30%,rgba(244,246,244,0.1)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#f4f6f4_0%,transparent_38%)]" />
        <div className="absolute inset-0 bg-[#f4f6f4]/75 lg:hidden" />
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:min-h-[740px] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20 lg:px-12 lg:py-28">
        <div className="max-w-[36rem]">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Médico e auxiliar, conectados</p>
          <h2 id="workplace-title" className="font-barlow text-[2.5rem] font-extrabold leading-[1.04] tracking-[-0.025em] sm:text-[3.5rem] lg:text-[4rem]">
            A sala acompanha.<br />
            <span className="text-emerald-700">Você segue o exame.</span>
          </h2>
          <p className="mt-6 max-w-[30rem] text-base leading-relaxed text-slate-700 sm:text-lg">
            Com a Sala do Auxiliar, médico e equipe acompanham o laudo em tempo real.
            Do celular ao computador da sala, o trabalho continua conectado.
          </p>
          <p className="mt-4 max-w-[30rem] text-sm leading-relaxed text-slate-600">
            Trabalha sozinho? Use a plataforma no navegador e revise o texto antes de levar ao sistema da clínica.
          </p>
          <div className="mt-8"><SignupCta tone="dark" size="lg" /></div>
          <p className="mt-4 max-w-[30rem] text-xs leading-relaxed text-slate-600">
            Web disponível. Apps nativos para iPhone e Android em breve.
          </p>
        </div>

        <motion.div style={{ y }} className="mx-auto w-full max-w-[360px] lg:mr-0 lg:self-end">
          <div className="rounded-[22px] border border-white/70 bg-white/95 p-5 text-slate-900 shadow-[0_2px_0_rgba(255,255,255,0.7)_inset,0_35px_65px_-25px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-6">
            <p className="mb-5 text-xs font-medium text-slate-500">Um fluxo compartilhado</p>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Smartphone aria-hidden size={21} strokeWidth={1.7} /></span>
              <div><h3 className="text-sm font-semibold">Médico</h3><p className="mt-1 text-sm text-slate-600">Registra os achados do exame.</p></div>
            </div>
            <div className="my-3 ml-5 flex h-9 items-center gap-4 border-l border-emerald-200 pl-4 text-xs text-emerald-700">
              <ArrowDown aria-hidden size={14} />Sala do Auxiliar
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Monitor aria-hidden size={21} strokeWidth={1.7} /></span>
              <div><h3 className="text-sm font-semibold">Equipe</h3><p className="mt-1 text-sm text-slate-600">Acompanha o laudo no computador.</p></div>
            </div>
            <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">A revisão final continua com o médico.</p>
          </div>
          <p className="mt-3 text-right text-[0.7rem] text-slate-600">Ambiente ilustrativo · imagem gerada por IA</p>
        </motion.div>
      </div>
    </section>
  )
}
