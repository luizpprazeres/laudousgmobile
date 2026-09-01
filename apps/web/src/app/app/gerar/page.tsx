import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LaudarWebExperience } from '@/components/laudar/LaudarWebExperience'

export const dynamic = 'force-dynamic'

// Gerador DETERMINÍSTICO (sem IA) — S6. Abdome Total + Tireoide.
// Compõe o laudo 100% em código (lib/deterministic). Protegido por auth.
export default async function GerarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/app/gerar')

  return <LaudarWebExperience richEditor />
}
