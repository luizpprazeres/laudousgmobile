import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AudienceTabs } from "@/components/changelog/AudienceTabs";
import { DetailMeta } from "@/components/changelog/DetailMeta";
import { SizeBadge } from "@/components/changelog/SizeBadge";
import { StatusDot, StatusLabel } from "@/components/changelog/StatusDot";
import { TagPill } from "@/components/changelog/TagPill";
import { getAllChangelog, getChangelogBySlug } from "@/lib/changelog/loader";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function generateStaticParams() {
  return getAllChangelog().map((e) => ({ slug: e.slug }));
}

export default async function ChangelogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getChangelogBySlug(slug);
  if (!entry) notFound();

  const dateLabel = DATE_FMT.format(new Date(entry.date));

  return (
    <div className="px-6 py-6 lg:px-10">
      <Link
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-brand-700 hover:underline"
        href="/changelog"
      >
        <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
        voltar pro changelog
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot status={entry.status} />
          <time dateTime={entry.date} className="font-mono text-xs uppercase tracking-wider text-stone-500">
            {dateLabel}
          </time>
          <span className="font-mono text-[10px] uppercase tracking-wider text-stone-300">·</span>
          <span className="font-mono text-xs text-stone-500">
            <StatusLabel status={entry.status} />
          </span>
          {entry.sprint && (
            <>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-300">·</span>
              <span className="font-mono text-xs font-medium text-brand-700">{entry.sprint}</span>
            </>
          )}
          <SizeBadge size={entry.size} />
        </div>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-stone-900">{entry.title}</h1>
        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.tags.map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>
        )}
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AudienceTabs body={entry.body} />
        </div>
        <aside>
          <DetailMeta entry={entry} />
        </aside>
      </div>
    </div>
  );
}
