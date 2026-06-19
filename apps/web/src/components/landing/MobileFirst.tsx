'use client'

import { Smartphone, Hand, Wifi } from 'lucide-react'
import { Reveal } from './Reveal'

const POINTS = [
  {
    icon: Hand,
    title: 'Dita com gel na mão',
    desc: 'Você lauda no meio do exame, sem largar o transdutor pra correr até um computador.',
  },
  {
    icon: Smartphone,
    title: 'Não preso ao desktop',
    desc: 'O fluxo inteiro cabe no bolso. O computador vira opcional, não obrigação.',
  },
  {
    icon: Wifi,
    title: 'Onde você trabalha',
    desc: 'Na clínica, no plantão, na visita domiciliar. O laudo acompanha o seu dia.',
  },
]

export default function MobileFirst() {
  return (
    <section className="relative bg-emerald-600 text-white px-6 sm:px-10 py-20 sm:py-24 overflow-hidden">
      {/* Linhas cruzadas sutis dando textura ao bloco verde (uso intencional) */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[length:56px_56px] [mask-image:radial-gradient(ellipse_at_30%_40%,black_10%,transparent_70%)]"
      />
      <div className="relative max-w-[1080px] mx-auto">
        <Reveal className="max-w-[640px]">
          <h2 className="font-barlow font-extrabold text-[2.1rem] sm:text-[2.7rem] leading-[1.05] tracking-[-0.02em] mb-4">
            A única plataforma de laudos
            <span className="block italic text-emerald-100">projetada com foco no uso pelo celular.</span>
          </h2>
          <p className="text-[1rem] leading-[1.7] text-emerald-50/90 max-w-[520px]">
            A maioria dos sistemas nasceu no desktop e foi espremida na tela do telefone.
            Aqui é o contrário: o celular é a casa, porque é onde o ultrassonografista
            realmente está.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-sm p-6 transition-colors duration-200 hover:bg-white/[0.13]">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                  <p.icon className="w-[22px] h-[22px] text-white" strokeWidth={1.8} />
                </div>
                <h3 className="font-barlow font-bold text-[1.05rem] mb-1.5">{p.title}</h3>
                <p className="text-[0.86rem] leading-[1.6] text-emerald-50/85">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
