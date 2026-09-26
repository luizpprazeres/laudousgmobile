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

/**
 * COMPOSIÇÃO — laudo de exames associados, com estado versionado para
 * reabrir. A primeira gravação insere (RLS); as seguintes passam pela rota
 * autenticada, que confere dono, envelope e a versão aberta (`updatedAt`).
 */
export type SavedComposition = { id: string; updatedAt: string }

export async function saveCompositionReport(input: {
  associationCode: string
  title: string
  laudoText: string
  envelope: unknown
}): Promise<SavedComposition> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')

  const { data, error } = await supabase
    .from('web_reports')
    .insert({
      user_id: user.id,
      category_code: input.associationCode,
      title: input.title,
      laudo_text: input.laudoText,
      exam_state: input.envelope,
    })
    .select('id, updated_at')
    .single()

  if (error) throw new Error(error.message)
  return { id: data.id as string, updatedAt: data.updated_at as string }
}

export async function updateCompositionReport(
  id: string,
  input: { expectedUpdatedAt: string; title: string; laudoText: string; envelope: unknown },
): Promise<SavedComposition> {
  const r = await fetch(`/api/web-reports/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const j = (await r.json().catch(() => null)) as { updatedAt?: string; error?: string } | null
  if (!r.ok || typeof j?.updatedAt !== 'string') throw new Error(j?.error ?? 'Erro ao salvar.')
  return { id, updatedAt: j.updatedAt }
}

export type ReopenedComposition = { id: string; title: string | null; laudoText: string; updatedAt: string; envelope: unknown }

export async function loadCompositionReport(id: string): Promise<ReopenedComposition> {
  const r = await fetch(`/api/web-reports/${encodeURIComponent(id)}`, { cache: 'no-store' })
  const j = (await r.json().catch(() => null)) as (ReopenedComposition & { error?: string }) | null
  if (!r.ok || !j || typeof j.updatedAt !== 'string') throw new Error(j?.error ?? 'Não foi possível reabrir o laudo.')
  return j
}
