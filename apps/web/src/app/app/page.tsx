import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LaudoUSGLogo from '@/components/LaudoUSGLogo'

export const dynamic = 'force-dynamic'

// Stub autenticado do S4 — prova o fluxo de login ponta a ponta.
// A área logada completa (dashboard, histórico, gerador) chega no S8/S9.
export default async function AppHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/app')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

  const plan = profile?.plan ?? 'free'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 w-full max-w-md">
        <div className="mb-6">
          <LaudoUSGLogo size="md" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Você está logado 🎉</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Área logada (versão inicial). O gerador determinístico já está disponível abaixo; o modo
          com IA e o painel completo chegam nos próximos sprints.
        </p>

        <Link
          href="/app/gerar"
          className="block w-full text-center bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors mb-6"
        >
          Gerar laudo (sem IA) — Abdome Total / Tireoide
        </Link>

        <dl className="text-sm border border-gray-100 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 mb-6">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-gray-400 dark:text-gray-500">Email</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-200">{user.email}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-gray-400 dark:text-gray-500">Plano</dt>
            <dd className="font-medium text-emerald-600 dark:text-emerald-400 uppercase">{plan}</dd>
          </div>
        </dl>

        <div className="flex items-center gap-3">
          <Link
            href="/precos"
            className="flex-1 text-center border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Ver planos
          </Link>
          <form action="/auth/signout" method="post" className="flex-1">
            <button
              type="submit"
              className="w-full bg-gray-900 dark:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
