import { Sparkles, GitBranch, FileEdit, Clock } from "lucide-react";
import { getChangelogStats } from "@/lib/changelog/loader";
import type { ChangelogEntry } from "@/lib/changelog/types";
import { cn } from "@/lib/utils";

export function HeroStats({ entries }: { entries: ChangelogEntry[] }) {
  const stats = getChangelogStats(entries);
  const items = [
    { label: "shipped", value: stats.shipped, icon: GitBranch, color: "bg-brand-50 text-brand-700" },
    { label: "em progresso", value: stats.inProgress, icon: FileEdit, color: "bg-amber-50 text-amber-700" },
    { label: "planejados", value: stats.planned, icon: Clock, color: "bg-stone-100 text-stone-600" },
    { label: "total", value: stats.total, icon: Sparkles, color: "bg-violet-50 text-violet-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{label}</span>
            <span className={cn("grid h-7 w-7 place-items-center rounded-md", color)}>
              <Icon aria-hidden className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-stone-900">{value}</p>
        </div>
      ))}
    </div>
  );
}
