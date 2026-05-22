import { notFound } from "next/navigation";
import { ReviewerClient } from "@/components/reviewer/ReviewerClient";
import { getReviewerData } from "@/lib/supabase/reviewer-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getNeighbors(id: string, createdAt: string): Promise<{ prevId: string | null; nextId: string | null }> {
  const supa = createServerSupabaseClient();
  const [prevRes, nextRes] = await Promise.all([
    supa
      .from("generation_audit")
      .select("id")
      .lt("created_at", createdAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supa
      .from("generation_audit")
      .select("id")
      .gt("created_at", createdAt)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    prevId: (prevRes.data?.id as string | undefined) ?? null,
    nextId: (nextRes.data?.id as string | undefined) ?? null,
  };
}

export default async function ReviewerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{8,}$/i.test(id)) notFound();

  const data = await getReviewerData(id);
  if (!data) notFound();

  const supa = createServerSupabaseClient();
  const { data: tsRow } = await supa
    .from("generation_audit")
    .select("created_at")
    .eq("id", id)
    .maybeSingle();
  const createdAt = (tsRow?.created_at as string | undefined) ?? new Date().toISOString();

  const { prevId, nextId } = await getNeighbors(id, createdAt);

  return <ReviewerClient data={data} prevId={prevId} nextId={nextId} />;
}
