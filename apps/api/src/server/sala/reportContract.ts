import type { SupabaseClient } from "@supabase/supabase-js";
import { buildReviewSignals, stripAutomaticReviewMarkers, type ReviewSignalIssue } from "@laudousg/shared";
export function salaDayStart(now = new Date()): Date {
  const shifted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 3));
}
export type SalaReportRow = { id: string; final_output: string | null; generated_output: string | null; category_code: string | null; created_at: string; content_revision?: number; sanity_result?: { verdict?: string; issues?: ReviewSignalIssue[] } | null };
export type ReviewRow = { report_id: string; reviewed_revision: number; reviewed_at: string };
export function serializeSalaReport(row: SalaReportRow, review?: ReviewRow) {
  const revision = row.content_revision ?? 1;
  const raw = row.final_output ?? row.generated_output;
  const outputText = stripAutomaticReviewMarkers(raw ?? "");
  const reviewSignals = buildReviewSignals(outputText, row.sanity_result?.issues ?? []);
  // Revisão médica e alerta automático são dimensões independentes. A revisão
  // vale somente para a revisão atual do payload; os alertas seguem visíveis.
  const reviewed = !!review && review.reviewed_revision === revision;
  return { id: row.id, outputText, category: row.category_code, createdAt: row.created_at,
    contentRevision: revision, reviewStatus: reviewed ? "reviewed" as const : "pending" as const,
    reviewedAt: reviewed ? review.reviewed_at : null, reviewSignals };
}
export async function loadMedicalReviews(service: SupabaseClient, ids: string[]): Promise<Map<string, ReviewRow>> {
  if (!ids.length) return new Map();
  const { data, error } = await service.from("report_medical_reviews").select("report_id,reviewed_revision,reviewed_at").in("report_id", ids);
  // Fail closed; an unavailable approval store must never show a green badge.
  if (error) return new Map();
  return new Map((data ?? []).map((row) => [row.report_id, row as ReviewRow]));
}
