import { cn } from "@/lib/utils";

type CoverageBreakdownItem = {
  label: string;
  color: string;
  count: number;
  pct: number;
};

type Props = {
  coveragePct: number;
  breakdown: CoverageBreakdownItem[];
  retrievedTotal: number;
  usedTotal: number;
  skippedTotal: number;
};

export function CoverageCard({ coveragePct, breakdown, retrievedTotal, usedTotal, skippedTotal }: Props) {
  const usedPct = retrievedTotal === 0 ? 0 : Math.round((usedTotal / retrievedTotal) * 100);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="border-b border-stone-100 px-5 py-3">
        <h2 className="font-display text-base font-semibold text-stone-900">Análise de cobertura</h2>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-5xl font-extrabold tracking-tight text-stone-900">
            {coveragePct}
            <span className="text-2xl text-stone-500">%</span>
          </span>
          <span className="text-xs text-stone-500">do laudo veio de blocks identificados</span>
        </div>
        <div className="mt-5 space-y-3">
          {breakdown.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("inline-block h-3 w-3 rounded-sm", row.color)} />
                  <span className="font-medium text-stone-700">{row.label}</span>
                </span>
                <span className="font-mono text-stone-700">
                  {row.count} {row.count === 1 ? "trecho" : "trechos"} · {Math.round(row.pct * 100)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                <div className={cn("h-1.5 rounded-full", row.color)} style={{ width: `${row.pct * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-stone-100 border-t border-stone-100">
        <Stat label="retrieved" value={`${retrievedTotal}`} />
        <Stat label="usados" value={`${usedTotal}`} sub={`(${usedPct}%)`} />
        <Stat label="skipped" value={`${skippedTotal}`} tone={skippedTotal > 5 ? "warning" : undefined} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warning" }) {
  return (
    <div className="px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500">{label}</p>
      <p className={cn("mt-0.5 font-mono text-base font-semibold", tone === "warning" ? "text-amber-700" : "text-stone-900")}>
        {value}{sub && <span className="ml-1 text-xs font-normal text-stone-500">{sub}</span>}
      </p>
    </div>
  );
}
