import Link from 'next/link'
import LaudoUSGLogo from '@/components/LaudoUSGLogo'

/** Mesmos destinos do rodapé atual: nenhum link removido. */
export default function LandingFooter() {
  const link = 'inline-flex min-h-11 items-center text-[0.9rem] text-slate-600 transition-colors hover:text-slate-950 md:min-h-0'
  return (
    <footer data-landing-section="footer" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-5 py-14 sm:grid-cols-[1.6fr_1fr_1fr] sm:px-8 lg:px-12">
        <div>
          <LaudoUSGLogo size="md" />
          <p className="mt-4 max-w-[22rem] text-[0.9rem] leading-relaxed text-slate-600">
            Laudos de ultrassonografia redigidos no seu estilo, na Web e no celular.
          </p>
        </div>
        <nav aria-label="Produto">
          <p className="mb-3 text-[0.8rem] font-semibold text-slate-900">Produto</p>
          <ul className="flex flex-col gap-1.5">
            <li><a href="#precos" className={link}>Preços</a></li>
            <li><Link href="/precos" className={link}>Planos e preços</Link></li>
            <li><Link href="/login" className={link}>Entrar</Link></li>
            <li><Link href="/signup" className={link}>Criar conta</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="mb-3 text-[0.8rem] font-semibold text-slate-900">Legal</p>
          <ul className="flex flex-col gap-1.5">
            <li><Link href="/privacy" className={link}>Privacidade</Link></li>
            <li><Link href="/terms" className={link}>Termos de uso</Link></li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 border-t border-slate-200 px-5 py-6 text-[0.78rem] text-slate-500 sm:flex-row sm:justify-between sm:px-8 lg:px-12">
        <span>© {new Date().getFullYear()} LaudoUSG. Todos os direitos reservados.</span>
        <span>Feito no Brasil, para ultrassonografistas.</span>
      </div>
    </footer>
  )
}
