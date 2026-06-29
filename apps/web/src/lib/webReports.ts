/**
 * Persistência dos laudos da versão WEB determinística (tabela `web_reports`).
 * Gaveta própria, separada da `reports` (pipeline com IA). RLS garante que cada
 * usuário só acessa os seus. Histórico unifica as duas com etiqueta de origem.
 */
import { createClient } from '@/lib/supabase/client'

export type WebReport = {
  id: string
  category_code: string
  title: string | null
  laudo_text: string
  exam_state: unknown
  created_at: string
}

export type SaveWebReportInput = {
  categoryCode: string
  title: string
  laudoText: string
  examState: unknown
}

/** Salva um laudo determinístico. Retorna o id criado. */
export async function saveWebReport(input: SaveWebReportInput): Promise<string> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')

  const { data, error } = await supabase
    .from('web_reports')
    .insert({
      user_id: user.id,
      category_code: input.categoryCode,
      title: input.title,
      laudo_text: input.laudoText,
      exam_state: input.examState ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

/** Lista os laudos web do usuário (mais recentes primeiro). */
export async function listWebReports(): Promise<WebReport[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('web_reports')
    .select('id, category_code, title, laudo_text, exam_state, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as WebReport[]
}

/** Remove um laudo web do usuário. */
export async function deleteWebReport(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('web_reports').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
