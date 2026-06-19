'use client'

import Image from 'next/image'
import { MessageSquare, GraduationCap, Clock, ShieldCheck } from 'lucide-react'
import { Reveal } from './Reveal'

const POINTS = [
  {
    icon: MessageSquare,
    title: 'Comunicação em tempo real',
    desc: 'O médico dita no celular e o laudo aparece na hora na tela da sala. Sem grito de corredor, sem "já vai".',
  },
  {
    icon: GraduationCap,
    title: 'Recursos didáticos',
    desc: 'A equipe acompanha como o laudo é construído. Quem está aprendendo aprende vendo, no fluxo real.',
  },
  {
    icon: Clock,
    title: 'Treinamento em dias, não semanas',
    desc: 'A interface é simples o bastante pra um auxiliar novo entrar no ritmo já no primeiro turno.',
  },
]

export default function SalaEquipe() {
  return (
    <section className="bg-white px-6 sm:px-10 py-20 sm:py-24">
      <div className="max-w-[1080px] mx-auto">
        {/* Header */}
        <Reveal className="max-w-[640px]">
          <h2 className="font-barlow font-extrabold text-[2rem] sm:text-[2.5rem] leading-[1.08] tracking-[-0.02em] text-[#0f172a] mb-4">
            A sala toda no{' '}
            <span className="text-emerald-600">mesmo ritmo.</span>
          </h2>
          <p className="text-[0.96rem] leading-[1.7] text-slate-600 max-w-[560px]">
            O LaudoUSG não pensa só no médico. A Sala do Auxiliar transforma o exame num
            trabalho de equipe, com cada pessoa enxergando o mesmo laudo, no mesmo instante.
          </p>
        </Reveal>

        {/* Tópicos lado a lado */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3.5">
                <p.icon className="w-5 h-5 text-emerald-600" strokeWidth={1.8} />
              </div>
              <h3 className="font-barlow font-bold text-[1rem] text-[#0f172a] mb-1.5">{p.title}</h3>
              <p className="text-[0.85rem] leading-[1.6] text-slate-500">{p.desc}</p>
            </Reveal>
          ))}
        </div>

        {/* Nota de rastreabilidade */}
        <Reveal delay={0.05}>
          <div className="mt-8 inline-flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 max-w-[520px]">
            <ShieldCheck className="w-[18px] h-[18px] text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
            <p className="text-[0.8rem] leading-[1.55] text-slate-600">
              O nome de quem ajudou fica no rodapé do laudo. Reconhecimento pra equipe e
              rastreabilidade pra você.
            </p>
          </div>
        </Reveal>

        {/* Imagem grande da Sala, embaixo */}
        <Reveal delay={0.1} className="mt-12">
          <div className="relative">
            <div className="relative rounded-2xl border border-slate-200 shadow-[0_30px_70px_-24px_rgba(15,23,42,0.22)] overflow-hidden bg-white">
              <Image
                src="/brand/sala-room.png"
                alt="Sala do Auxiliar aberta: o laudo do exame aparecendo em tempo real, com a lista de exames do turno e o painel de anotações da equipe"
                width={1680}
                height={1000}
                className="w-full h-auto block"
                sizes="(max-width: 1080px) 100vw, 1080px"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
