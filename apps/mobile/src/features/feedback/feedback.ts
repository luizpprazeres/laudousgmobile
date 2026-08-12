import { supabase } from "@/lib/supabase";

/**
 * Feedback 👍/👎 do laudo — espelho do FeedbackService do iOS:
 * upsert em user_feedback com on_conflict (report_id,user_id), permitindo
 * trocar o voto. RLS *_own (migration 0020).
 */

export type FeedbackVerdict = "positive" | "negative";

export async function submitFeedback(params: {
  reportId: string;
  categoryCode: string;
  verdict: FeedbackVerdict;
  comment?: string;
}): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("feedback: não autenticado");

  const comment = params.comment?.trim() || null;
  const { error } = await supabase.from("user_feedback").upsert(
    {
      report_id: params.reportId,
      user_id: userId,
      category_code: params.categoryCode,
      verdict: params.verdict,
      comment,
    },
    { onConflict: "report_id,user_id" },
  );
  if (error) throw new Error(`feedback: ${error.message}`);
}
