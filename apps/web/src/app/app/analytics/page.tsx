import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'
import { canonicalCategory, type AnalyticsReport, type AnalyticsTotals, type FeedbackValue } from '@/components/analytics/types'

export const dynamic = 'force-dynamic'
const GRAPH_SAMPLE_LIMIT = 1000

type Metadata = Record<string, unknown> | null

function metadataRecord(value: unknown): Metadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function optionalFeedback(value: unknown): FeedbackValue | null {
  if (value === 'positive' || value === 'negative') return value
  return null
}

function feedbackFromMetadata(metadata: Metadata) {
  return optionalFeedback(metadata?.feedback ?? metadata?.medical_feedback ?? metadata?.assertivity_feedback)
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/app/analytics')

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const monthStartIso = startOfMonth.toISOString()

  const [ia, web, iaTotal, webTotal, iaMonth, webMonth] = await Promise.all([
    supabase
      .from('reports')
      .select('id, category_code, created_at, final_output, generation_metadata')
      .not('final_output', 'is', null)
      .order('created_at', { ascending: false })
      .limit(GRAPH_SAMPLE_LIMIT),
    supabase
      .from('web_reports')
      .select('id, category_code, title, laudo_text, exam_state, created_at')
      .order('created_at', { ascending: false })
      .limit(GRAPH_SAMPLE_LIMIT),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .not('final_output', 'is', null),
    supabase
      .from('web_reports')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .not('final_output', 'is', null)
      .gte('created_at', monthStartIso),
    supabase
      .from('web_reports')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStartIso),
  ])

  const reports: AnalyticsReport[] = [
    ...(ia.data ?? []).map((row) => {
      const metadata = metadataRecord(row.generation_metadata)
      return {
        id: row.id as string,
        origin: 'ia' as const,
        category_code: canonicalCategory(row.category_code as string),
        created_at: row.created_at as string,
        output_text: (row.final_output as string | null) ?? '',
        feedback: feedbackFromMetadata(metadata),
        generation_ms: null,
      }
    }),
    ...(web.data ?? []).map((row) => ({
      id: row.id as string,
      origin: 'web' as const,
      category_code: canonicalCategory(row.category_code as string),
      created_at: row.created_at as string,
      output_text: (row.laudo_text as string | null) ?? '',
      title: (row.title as string | null) ?? null,
      feedback: null,
      generation_ms: null,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const totalIa = iaTotal.count ?? (ia.data ?? []).length
  const totalWeb = webTotal.count ?? (web.data ?? []).length
  const totals: AnalyticsTotals = {
    totalReports: totalIa + totalWeb,
    totalIa,
    totalWeb,
    thisMonthReports: (iaMonth.count ?? 0) + (webMonth.count ?? 0),
    sampleSize: reports.length,
    sampleLimit: GRAPH_SAMPLE_LIMIT,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AnalyticsClient reports={reports} totals={totals} />
    </div>
  )
}
