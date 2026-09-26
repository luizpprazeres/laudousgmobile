'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import LaudoUSGLogo from '@/components/LaudoUSGLogo'

/**
 * Nav fixa, uma linha, 64px. Escurece sobre qualquer capítulo marcado com
 * `data-nav-dark` (esquemas, planos, e a seção mobile se for escura). O
 * observador só olha a faixa do topo da tela, então a troca acontece quando o
 * capítulo passa por baixo da nav, não antes.
 */
export default function LandingNav() {
  const [onDark, setOnDark] = useState(false)

  useEffect(() => {
    const visible = new Set<Element>()
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target)
          else visible.delete(e.target)
        }
        setOnDark(visible.size > 0)
      },
      { rootMargin: '0px 0px -92% 0px', threshold: 0 },
    )
    // As seções são importadas de forma síncrona: a varredura inicial basta.
    document.querySelectorAll('[data-nav-dark]').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const link = onDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-950'
  return (
    <header
      data-landing-nav={onDark ? 'dark' : 'light'}
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300 ${
        onDark ? 'border-white/10 bg-slate-950/55' : 'border-slate-200/70 bg-white/70'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="LaudoUSG, página inicial" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          {/* Logo compacto em telas estreitas para caber logo + Entrar + CTA. */}
          <span className="sm:hidden"><LaudoUSGLogo size="sm" variant={onDark ? 'white' : 'default'} /></span>
          <span className="hidden sm:block"><LaudoUSGLogo size="md" variant={onDark ? 'white' : 'default'} /></span>
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
          <a href="#precos" className={`hidden h-11 items-center rounded-full px-3 text-[0.86rem] font-medium transition-colors sm:inline-flex ${link}`}>
            Preços
          </a>
          {/* Abaixo de 360px some da nav; "Entrar" continua no rodapé. */}
          <Link href="/login" className={`hidden h-11 items-center rounded-full px-3 text-[0.86rem] font-medium transition-colors min-[360px]:inline-flex ${link}`}>
            Entrar
          </Link>
          <Link
            href="/signup"
            data-cta="signup"
            className={`ml-1 inline-flex h-11 items-center whitespace-nowrap rounded-full px-4 text-[0.84rem] font-semibold transition-colors active:scale-[0.98] ${
              onDark ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-950 text-white hover:bg-slate-800'
            }`}
          >
            Criar conta grátis
          </Link>
        </nav>
      </div>
    </header>
  )
}
