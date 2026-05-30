import Link from "next/link";
import { ArrowRight, FileEdit } from "lucide-react";
import type { DraftCategoryStat } from "@/lib/knowledge/fs";

const TIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function relativeTime(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return TIME_FMT.format(new Date(iso));
}

export function DraftsCard({ drafts }: { drafts: DraftCategoryStat[] }) {
  if (drafts.length === 0) return null;

  const totalBlocks = drafts.reduce((acc, d) => acc + d.draftCount, 0);
  const headline =
    drafts.length === 1
      ? `${drafts.length} categoria com drafts aguardando revisão`
      : `${drafts.length} categorias com drafts aguardando revisão`;

  return (
    <section
      aria-label="Drafts pendentes"
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm"
    >
      <header className="flex items-center justify-between border-b border-amber-100 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <FileEdit aria-hidden className="h-4 w-4 text-amber-700" strokeWidth={1.8} />
          <h2 className="font-display text-sm font-semibold text-amber-900">{headline}</h2>
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900">
            {totalBlocks} blocks
          </span>
        </div>
        <Link
          href="/blocks?status=draft"
          className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-800 hover:text-amber-900"
        >
          Ver todos
          <ArrowRight aria-hidden className="h-3 w-3" />
        </Link>
      </header>
      <ul className="divide-y divide-amber-100">
        {drafts.map((d) => (
          <li key={d.slug} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-semibold text-stone-900">{d.slug}</p>
              <p className="mt-0.5 font-mono text-[10px] text-stone-500">
                {d.draftCount} {d.draftCount === 1 ? "block aguardando" : "blocks aguardando"}
                <span className="mx-1.5 text-stone-300">·</span>
                {relativeTime(d.lastUpdated)}
              </p>
            </div>
            <Link
              href={`/blocks?status=draft&cat=${encodeURIComponent(d.slug)}`}
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-800 transition hover:bg-amber-100"
            >
              Revisar
              <ArrowRight aria-hidden className="h-3 w-3" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
