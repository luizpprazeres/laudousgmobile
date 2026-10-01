import { getServiceClient } from "@/server/supabaseService";
import { z } from "zod";

export const ReviewReportInputSchema = z.object({
  expectedRevision: z.number().int().positive(),
  expectedText: z.string().min(1).max(200_000),
}).strict();

export async function reviewPersistedReport(args: {
  reportId: string;
  actorId: string;
  expectedRevision: number;
  expectedText: string;
}): Promise<{ body: unknown; status: number }> {
  const { data, error } = await getServiceClient().rpc("review_report_content", {
    p_report_id: args.reportId,
    p_actor_id: args.actorId,
    p_expected_revision: args.expectedRevision,
    p_expected_text: args.expectedText,
  });
  if (error) return { body: { error: "review_unavailable" }, status: 503 };

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return {
      body: result ?? { error: "review_unavailable" },
      status: result?.error === "not_found" ? 404 : 409,
    };
  }
  return { body: result, status: 200 };
}
