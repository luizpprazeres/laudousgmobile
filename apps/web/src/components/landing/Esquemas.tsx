'use client'

import Image from 'next/image'
import { Shapes } from 'lucide-react'
import { Reveal } from './Reveal'

const TAGS = ['Miomas (FIGO)', 'Mama', 'Tireoide']

export default function Esquemas() {
  return (
    <section className="bg-slate-50 border-y border-slate-200 px-6 sm:px-10 py-20 sm:py-24">
      <div className="max-w-[1080px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Imagem real do esquema gerado a partir do laudo */}
        <Reveal className="order-2 lg:order-1">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-4 bg-gradient-to-tr from-emerald-100/60 to-transparent rounded-3xl blur-xl"
            />
            <div className="relative rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.16)] p-6 sm:p-8">
              <Image
                src="/mama-esquema.png"
                alt="Esquema de mama gerado automaticamente a partir do laudo, com a divisão por quadrantes e posições em horas para localizar os achados"
                width={1920}
                height={1080}
                className="w-full h-auto block"
              />
            </div>
          </div>
        </Reveal>

        {/* Texto */}
        <Reveal delay={0.1} className="order-1 lg:order-2">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
            <Shapes className="w-[22px] h-[22px] text-emerald-600" strokeWidth={1.8} />
          </div>
          <h2 className="font-barlow font-extrabold text-[2rem] sm:text-[2.5rem] leading-[1.08] tracking-[-0.02em] text-[#0f172a] mb-4">
            Esquemas que se{' '}
            <span className="text-emerald-600">desenham sozinhos.</span>
          </h2>
          <p className="text-[0.96rem] leading-[1.7] text-slate-600 max-w-[480px] mb-6">
            Enquanto você descreve o achado, o esquema visual aparece pronto, montado a partir
            do próprio laudo. Bonito de ver no exame, fácil de explicar pra paciente, claro pra
            quem vai ler depois.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {TAGS.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-[0.78rem] font-semibold text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
