import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, FilePlus2, History, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import LaudoUSGLogo from '@/components/LaudoUSGLogo'

export const dynamic = 'force-dynamic'

const CAT_LABEL: Record<string, string> = {
  ABDOMEN_TOTAL: 'Abdome total', ABDOME_SUPERIOR: 'Abdome superior', PROSTATA_SUPRAPUBICA: 'Próstata',
  VIAS_URINARIAS: 'Vias urinárias', MAMARIA: 'Mamária', PELVE_FEMININA: 'Pelve feminina', CERVICAL: 'Cervical',
  PARTES_MOLES: 'Partes moles', TIREOIDE: 'Tireoide', MUSCULOESQUELETICO: 'Musculoesquelético',
  OBSTETRICA: 'Obstétrica', MORFOLOGICO: 'Morfológica', DOPPLER_OBSTETRICO: 'Doppler obstétrico',
}
const catLabel = (c: string) => CAT_LABEL[c] ?? c
const dataFmt = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}` : ''
}

export default async function AppHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/app')

  const [{ data: profile }, web, ia] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    supabase.from('web_reports').select('id, category_code, title, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('reports').select('id, category_code, created_at').not('final_output', 'is', null).order('created_at', { ascending: false }).limit(5),
  ])
  const plan = profile?.plan ?? 'free'
  const recentes = [
    ...(web.data ?? []).map((r) => ({ id: r.id as string, origin: 'web' as const, label: (r.title as string | null) ?? catLabel(r.category_code as string), date: r.created_at as string })),
    ...(ia.data ?? []).map((r) => ({ id: r.id as string, origin: 'ia' as const, label: catLabel(r.category_code as string), date: r.created_at as string })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <LaudoUSGLogo size="sm" />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-xs text-gray-400 dark:text-gray-500">{user.email}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Plano {plan}</div>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 font-barlow text-2xl font-bold text-gray-900 dark:text-gray-100">Olá 👋</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Gere um laudo determinístico ou retome um do histórico.</p>

        {/* CTA primária */}
        <Link
          href="/app/gerar"
          className="mb-4 flex items-center gap-4 rounded-2xl bg-emerald-600 px-6 py-5 text-white shadow-sm transition hover:bg-emerald-700"
        >
          <FilePlus2 className="h-7 w-7 shrink-0" />
          <div>
            <div className="text-base font-bold">Gerar laudo (sem IA)</div>
            <div className="text-sm text-emerald-50">12 categorias · por cliques, sem digitar</div>
          </div>
        </Link>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link href="/app/historico" className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
            <History className="h-4 w-4 text-gray-400" /> Histórico
          </Link>
          <Link href="/app/preferencias" className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
            <Settings className="h-4 w-4 text-gray-400" /> Preferências
          </Link>
          <Link href="/precos" className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
            Planos
          </Link>
        </div>

        {/* Últimos laudos */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
            <Clock className="h-4 w-4 text-gray-400" /> Últimos laudos
          </h2>
          {recentes.length > 0 ? (
            <Link href="/app/historico" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Ver tudo</Link>
          ) : null}
        </div>

        {recentes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum laudo ainda. Gere o primeiro e clique em “Salvar laudo”.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentes.map((r) => (
              <li key={`${r.origin}-${r.id}`}>
                <Link href="/app/historico" className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800">
                  <span className="flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">{r.label}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.origin === 'web' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'}`}>
                    {r.origin === 'web' ? 'Web' : 'IA'}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">{dataFmt(r.date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
