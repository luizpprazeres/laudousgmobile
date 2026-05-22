import type { Quota } from "@/lib/mock/testbench";

export function QuotaBars({ quotas }: { quotas: Quota[] }) {
  const totalUsed = quotas.reduce((a, q) => a + q.used, 0);
  const totalMax = quotas.reduce((a, q) => a + q.max, 0);

  return (
    <div className="border-b border-stone-100 px-5 py-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-mono text-stone-500">USO DE QUOTA</span>
        <span className="font-mono text-stone-700">
          {totalUsed} / {totalMax}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {quotas.map((q) => {
          const pct = Math.round((q.used / q.max) * 100);
          return (
            <div key={q.kind} className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400">{q.short}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="font-mono text-[10px] text-stone-600">
                {q.used}/{q.max}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
