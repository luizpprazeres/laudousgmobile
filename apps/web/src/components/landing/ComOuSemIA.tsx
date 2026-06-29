'use client'

import { Sparkles, PenLine, Check } from 'lucide-react'
import { Reveal } from './Reveal'

const COM_IA = [
  'Achados viram laudo completo em segundos',
  'Calibrado pra soar como você escreve',
  'Sugestões de redação e diagnóstico',
]
const SEM_IA = [
  'Editor livre, do título ao ponto final',
  'Frases prontas suas, salvas pra reusar',
  'Nada é enviado sem você revisar',
]

export default function ComOuSemIA() {
  return (
    <section className="relative bg-[#020617] text-white px-6 sm:px-10 py-20 sm:py-24 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(16,185,129,0.10)_0%,transparent_55%)]"
      />
      <div className="relative max-w-[1080px] mx-auto">
        <Reveal className="max-w-[620px] mb-12">
          <h2 className="font-barlow font-extrabold text-[2rem] sm:text-[2.6rem] leading-[1.06] tracking-[-0.02em] mb-4">
            A IA é opção.
            <span className="block text-emerald-400">O controle é sempre seu.</span>
          </h2>
          <p className="text-[0.96rem] leading-[1.7] text-slate-400 max-w-[520px]">
            Tem dia de deixar a IA fazer o trabalho pesado. Tem dia de escrever cada palavra na
            mão. O LaudoUSG serve aos dois, sem te empurrar pra nenhum lado.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Com IA */}
          <Reveal>
            <div className="h-full rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-7">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" strokeWidth={1.8} />
                </div>
                <h3 className="font-barlow font-bold text-[1.15rem]">Com IA</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {COM_IA.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.88rem] text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" strokeWidth={2.4} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Sem IA */}
          <Reveal delay={0.08}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-slate-200" strokeWidth={1.8} />
                </div>
                <h3 className="font-barlow font-bold text-[1.15rem]">Sem IA, na sua mão</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {SEM_IA.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.88rem] text-slate-300">
                    <Check className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" strokeWidth={2.4} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
