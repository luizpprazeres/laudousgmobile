import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/** Shell visual compartilhado pelas páginas legais (/privacy, /terms). */
export default function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
          Voltar para o início
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-10">
          Última atualização: {updatedAt}
        </p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-gray-600 dark:text-gray-400 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:dark:text-gray-200 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_a]:text-emerald-600 [&_a]:underline">
          {children}
        </div>

        <footer className="mt-14 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3 text-xs text-gray-400 dark:text-gray-600">
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-emerald-600 transition-colors">
              Privacidade
            </Link>
            <Link href="/terms" className="hover:text-emerald-600 transition-colors">
              Termos
            </Link>
            <Link href="/precos" className="hover:text-emerald-600 transition-colors">
              Preços
            </Link>
          </div>
          <p>© 2026 LaudoUSG · Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  )
}
