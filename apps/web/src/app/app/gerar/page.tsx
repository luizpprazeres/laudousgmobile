import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LaudarWebExperience } from '@/components/laudar/LaudarWebExperience'

export const dynamic = 'force-dynamic'

// Gerador DETERMINÍSTICO (sem IA) — S6. Abdome Total + Tireoide.
// Compõe o laudo 100% em código (lib/deterministic). Protegido por auth.
export default async function GerarPage({ searchParams }: { searchParams: Promise<{ reabrir?: string | string[] }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/app/gerar')

  // O id só identifica o laudo; quem confere dono e envelope é a rota autenticada.
  const { reabrir } = await searchParams
  const reopenReportId = typeof reabrir === 'string' && /^[0-9a-f-]{36}$/i.test(reabrir) ? reabrir : undefined

  return <LaudarWebExperience key={reopenReportId ?? 'novo'} richEditor reopenReportId={reopenReportId} />
}
