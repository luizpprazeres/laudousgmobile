import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ChangelogEntry } from "@/lib/changelog/types";
import { SizeBadge } from "./SizeBadge";
import { StatusDot, StatusLabel } from "./StatusDot";
import { TagPill } from "./TagPill";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function preview(text: string, max = 240) {
  const cleaned = text.replace(/\n+/g, " ").replace(/\*\*/g, "").replace(/\*/g, "").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).trim() + "…";
}

export function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  const date = new Date(entry.date);
  const dateLabel = DATE_FMT.format(date);

  return (
    <Link
      className="group relative block rounded-2xl border border-stone-200 bg-white p-5 shadow-card transition hover:shadow-cardHover"
      href={`/changelog/${entry.slug}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center pt-1">
          <StatusDot status={entry.status} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <time dateTime={entry.date} className="font-mono text-[11px] uppercase tracking-widest text-stone-500">
              {dateLabel}
            </time>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">·</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
              <StatusLabel status={entry.status} />
            </span>
            {entry.sprint && (
              <>
                <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">·</span>
                <span className="font-mono text-[10px] font-medium text-brand-700">{entry.sprint}</span>
              </>
            )}
            <SizeBadge size={entry.size} />
          </div>

          <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight text-stone-900 group-hover:text-brand-700">
            {entry.title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-stone-600">{preview(entry.body.leigo)}</p>

          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.tags.map((t) => (
                <TagPill key={t} tag={t} />
              ))}
            </div>
          )}
        </div>

        <ArrowUpRight aria-hidden className="h-4 w-4 text-stone-300 transition group-hover:text-brand-600" />
      </div>
    </Link>
  );
}
