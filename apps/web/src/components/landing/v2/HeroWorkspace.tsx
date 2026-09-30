'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'
import { PlansLink, SignupCta } from './Cta'
import { HeroDemo } from './hero/HeroDemo'
import { HeroMeshLight } from './hero/HeroMeshLight'

/**
 * HERO: a sensação de usar o LaudoUSG na primeira dobra.
 *
 * A vitrine (hero/HeroDemo) é uma DEMONSTRAÇÃO local e declarada: quatro
 * casos sintéticos montados com frases dos modelos em
 * packages/knowledge/snippets, nada vai a servidor e nada vai à área de
 * transferência sem clique. O produto real monta o laudo no renderer
 * canônico; aqui só se mostra a experiência.
 */
export default function HeroWorkspace() {
  const reduce = useReducedMotionSafe()
  const section = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] })
  const windowY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80])
  const glowOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.35])

  return (
    <section
      ref={section}
      data-landing-section="hero"
      className="relative isolate overflow-hidden bg-white pt-20 min-[360px]:pt-24 lg:pt-28"
    >
      {/* Luz principal: vem de cima à direita, onde está o produto. */}
      <motion.div
        aria-hidden
        style={{ opacity: glowOpacity }}
        className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[720px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.16),rgba(16,185,129,0.04)_60%,transparent)]"
      />
      {/* Malha discreta entre o título e o mockup, acende perto do ponteiro. */}
      <HeroMeshLight host={section} reduce={reduce} />
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-6 px-5 pb-16 sm:px-8 lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-12 lg:gap-8 lg:px-12 lg:pb-24">
        {/* Título e produto visíveis já no HTML do servidor: nada da primeira
            dobra depende de JS para aparecer em rede lenta. */}
        <div className="lg:col-span-5">
          <p className="mb-5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-emerald-700">Para ultrassonografistas</p>
          <h1 className="font-barlow text-[2.1rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-slate-950 min-[360px]:text-[2.6rem] sm:text-[3.2rem] xl:text-[3.9rem]">
            O laudo se escreve enquanto você <span className="text-emerald-600">examina.</span>
          </h1>
          <p className="mt-4 max-w-[34rem] text-[0.98rem] leading-relaxed text-slate-600 min-[360px]:mt-6 min-[360px]:text-[1.06rem]">
            Marque os achados. O laudo aparece redigido no seu estilo, pronto para revisar e copiar.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 min-[360px]:mt-8">
            <SignupCta size="lg" />
            <span className="hidden min-[360px]:inline-flex"><PlansLink /></span>
          </div>
        </div>

        {/* O produto: sai da coluna e encosta na borda direita no desktop. */}
        <motion.div
          style={{ y: windowY }}
          className="lg:col-span-7 lg:-mr-12 xl:-mr-[max(3rem,calc((100vw-1440px)/2+3rem))]"
        >
          <HeroDemo reduce={reduce} />
        </motion.div>
      </div>
    </section>
  )
}
