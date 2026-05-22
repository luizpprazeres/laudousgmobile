import Link from "next/link";
import { cn } from "@/lib/utils";

const CHIP_TIER = {
  universal: "bg-emerald-100 text-emerald-800",
  contextual: "bg-sky-100 text-sky-800",
  optional: "bg-stone-100 text-stone-700",
  skipped: "bg-rose-100 text-rose-700",
} as const;

type Item = {
  priority: number;
  slug: string;
  similarity: number;
  tier: keyof typeof CHIP_TIER;
};

export function UsedBlocksList({ items, auditId }: { items: Item[]; auditId: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
        <h2 className="font-display text-base font-semibold text-stone-900">Blocks que entraram</h2>
        <Link className="text-xs font-medium text-brand-700 hover:underline" href={`/audit?selected=${auditId}`}>
          Audit completo →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-stone-500">Nenhum block correspondido a este laudo.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {items.map((b, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-2">
              <div className="flex items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold", CHIP_TIER[b.tier])}>
                  p{b.priority}
                </span>
                <span className="truncate font-mono text-xs text-stone-900">{b.slug}</span>
              </div>
              <span className="font-mono text-xs text-stone-500">{b.similarity.toFixed(3).replace(/^0/, "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
