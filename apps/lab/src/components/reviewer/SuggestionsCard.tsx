import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const NUM_TONE = {
  warning: "bg-amber-100 text-amber-700",
  info: "bg-sky-100 text-sky-700",
} as const;

type Suggestion = {
  id: number;
  tone: "warning" | "info";
  title: string;
  detail: string;
  action?: { label: string; href: string };
};

export function SuggestionsCard({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-amber-50 text-amber-700">
            <Lightbulb aria-hidden className="h-4 w-4" fill="currentColor" />
          </span>
          <h2 className="font-display text-base font-semibold text-stone-900">Sugestões automáticas</h2>
        </div>
      </div>
      <ul className="divide-y divide-stone-100">
        {suggestions.map((s) => (
          <li key={s.id} className="px-5 py-3">
            <div className="flex items-start gap-2">
              <span className={cn("mt-0.5 grid h-5 w-5 place-items-center rounded-full font-mono text-[10px] font-semibold", NUM_TONE[s.tone])}>
                {s.id}
              </span>
              <div className="flex-1">
                <p className="text-sm text-stone-900">{s.title}</p>
                <p className="mt-1 text-xs text-stone-600">{s.detail}</p>
                {s.action && (
                  <div className="mt-2">
                    <Link
                      className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100"
                      href={s.action.href}
                    >
                      {s.action.label}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
