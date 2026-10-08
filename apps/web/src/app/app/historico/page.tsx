import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HistoryList, type HistoryItem } from '@/components/historico/HistoryList'
import { extractReportPresentation } from '@/components/laudar/reportRichText'
import { parseEnvelope } from '@/lib/composition/envelope'
import { extractStoredGrowthChart } from '@/lib/calculators/growthChartPersistence'
import { extractClinicalCharts, storeClinicalCharts } from '@/lib/calculators/clinicalCharts'

export const dynamic = 'force-dynamic'

export default async function HistoricoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/app/historico')

  // Duas gavetas, uma visão: web (determinístico) + reports (IA/app), com etiqueta.
  const [web, ia] = await Promise.all([
    supabase
      .from('web_reports')
      .select('id, category_code, title, laudo_text, exam_state, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('reports')
      .select('id, category_code, final_output, generated_output, created_at')
      .or('final_output.not.is.null,generated_output.not.is.null')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const items: HistoryItem[] = [
    ...(web.data ?? []).map((r) => ({
      id: r.id as string,
      origin: 'web' as const,
      category: r.category_code as string,
      title: (r.title as string | null) ?? null,
      text: r.laudo_text as string,
      html: extractReportPresentation(r.exam_state),
      growthChart: extractStoredGrowthChart(r.exam_state),
      clinicalCharts: storeClinicalCharts(extractClinicalCharts(r.exam_state)),
      reopenable: parseEnvelope(r.exam_state).kind === 'composition',
      date: r.created_at as string,
    })),
    ...(ia.data ?? []).map((r) => ({
      id: r.id as string,
      origin: 'ia' as const,
      category: r.category_code as string,
      title: null,
      text: ((r.final_output as string | null) ?? (r.generated_output as string | null)) ?? '',
      date: r.created_at as string,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return <HistoryList items={items} />
}
