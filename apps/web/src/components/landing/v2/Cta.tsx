import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * UM rótulo por intenção na página inteira:
 *   cadastro → "Criar conta grátis" (/signup)
 *   planos   → "Ver planos" (#precos)
 * O card de planos mantém os próprios botões ("Começar grátis", "Assinar
 * agora") porque são a oferta atual e não mudam nesta rodada.
 */
export function SignupCta({ tone = 'dark', size = 'md' }: { tone?: 'dark' | 'emerald' | 'light'; size?: 'md' | 'lg' }) {
  const tones = {
    dark: 'bg-slate-950 text-white hover:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(2,6,23,0.55)]',
    emerald: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_12px_36px_-14px_rgba(16,185,129,0.8)]',
    light: 'bg-white text-slate-950 hover:bg-emerald-50 shadow-[0_10px_30px_-14px_rgba(255,255,255,0.4)]',
  }
  const sizes = { md: 'h-11 px-5 text-[0.9rem]', lg: 'h-[52px] px-6 text-[1rem]' }
  return (
    <Link
      href="/signup"
      data-cta="signup"
      className={`group inline-flex items-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${tones[tone]} ${sizes[size]}`}
    >
      Criar conta grátis
      <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
    </Link>
  )
}

export function PlansLink({ onDark = false }: { onDark?: boolean }) {
  return (
    <a
      href="#precos"
      data-cta="plans"
      className={`inline-flex h-11 items-center whitespace-nowrap rounded-full px-4 text-[0.9rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        onDark ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-slate-950'
      }`}
    >
      Ver planos
    </a>
  )
}
