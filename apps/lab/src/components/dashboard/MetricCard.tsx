import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: ReactNode;
  delta: { text: string; tone: "positive" | "warning" | "neutral" };
  note: string;
  icon?: ReactNode;
  children?: ReactNode;
  ringGrid?: boolean;
};

const TONES = {
  positive: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  neutral: "bg-brand-50 text-brand-700",
} as const;

export function MetricCard({ label, value, delta, note, icon, children, ringGrid }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      {ringGrid && <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 opacity-50 [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:24px_24px]" aria-hidden />}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{label}</span>
        {icon && <span className="text-stone-300">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-4xl font-extrabold tracking-tight text-stone-900">{value}</span>
        <span className={cn("rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold", TONES[delta.tone])}>{delta.text}</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">{note}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
