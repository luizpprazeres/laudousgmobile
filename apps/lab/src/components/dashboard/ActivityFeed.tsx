import type { ActivityItem } from "@/lib/mock/dashboard";
import { cn } from "@/lib/utils";

const DOT_TONE = {
  brand: "bg-brand-600",
  sky: "bg-sky-600",
  amber: "bg-amber-500",
  stone: "bg-stone-400",
  neutral: "bg-stone-300",
} as const;

const CATEGORY_TONE = {
  brand: "bg-brand-50 text-brand-800",
  sky: "bg-sky-50 text-sky-800",
  amber: "bg-amber-50 text-amber-800",
  stone: "bg-stone-100 text-stone-700",
  neutral: "bg-stone-100 text-stone-700",
} as const;

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
        <h2 className="font-display text-base font-semibold text-stone-900">Atividade recente</h2>
        <button
          aria-label="Ver tudo (em breve)"
          className="cursor-not-allowed text-xs font-medium text-stone-400"
          disabled
          title="Em breve"
          type="button"
        >
          Ver tudo →
        </button>
      </div>
      <ol className="relative px-5 py-4">
        <span aria-hidden className="absolute left-7 top-7 bottom-7 w-px bg-stone-100" />
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.id} className={cn("relative flex gap-3", !isLast && "mb-4")}>
              <span className={cn("z-10 mt-1 grid h-4 w-4 place-items-center rounded-full ring-4 ring-white", DOT_TONE[item.tone])}>
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">{item.time}</p>
                <p className="mt-0.5 text-sm text-stone-900">
                  {item.category && (
                    <span className={cn("mr-1 rounded px-1 font-mono text-xs", CATEGORY_TONE[item.tone])}>
                      {item.category}
                    </span>
                  )}
                  {item.title}
                </p>
                <p className="text-xs text-stone-500">{item.meta}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
