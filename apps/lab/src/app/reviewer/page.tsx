import { redirect } from "next/navigation";
import { getMostRecentAuditId } from "@/lib/supabase/reviewer-queries";

export const dynamic = "force-dynamic";

export default async function ReviewerIndexPage() {
  const id = await getMostRecentAuditId();
  if (id) redirect(`/reviewer/${id}`);

  return (
    <div className="px-6 py-12 lg:px-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">forensic reviewer</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">Nenhum laudo disponível</h1>
      <p className="mt-2 text-sm text-stone-600">
        Gere um laudo no <a className="text-brand-700 underline" href="/testbench">Testbench</a> ou abra o{" "}
        <a className="text-brand-700 underline" href="/audit">Audit</a> e selecione um.
      </p>
    </div>
  );
}
