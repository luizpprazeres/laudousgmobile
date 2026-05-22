import { cn } from "@/lib/utils";
import type { CategoryHealth } from "@/lib/mock/dashboard";

const STAR = "★";
const FORMATTER = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < value ? "text-amber-500" : "text-stone-200"}>
          {STAR}
        </span>
      ))}
    </span>
  );
}

export function CategoryHealthTable({ items }: { items: CategoryHealth[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-base font-semibold text-stone-900">Categorias</h2>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-medium text-stone-600">
            {items.length} ativas · 28 pendentes
          </span>
        </div>
        <button
          aria-label="Ver todas (em breve)"
          className="cursor-not-allowed text-xs font-medium text-stone-400"
          disabled
          title="Em breve"
          type="button"
        >
          Ver todas →
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
          <tr>
            <th className="px-5 py-2.5 text-left font-medium">Categoria</th>
            <th className="px-3 py-2.5 text-right font-medium">Blocks</th>
            <th className="px-3 py-2.5 text-center font-medium">Qualidade</th>
            <th className="px-3 py-2.5 text-right font-medium">Saúde</th>
            <th className="px-3 py-2.5 text-right font-medium">Skipped</th>
            <th className="px-5 py-2.5 text-right font-medium" aria-label="ações" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((cat) => {
            const pct = Math.round(cat.successRate * 100);
            const barColor = cat.alert ? "bg-amber-500" : "bg-brand-600";
            return (
              <tr key={cat.slug} className="hover:bg-stone-50/60">
                <td className="px-5 py-3 font-medium text-stone-900">{cat.slug}</td>
                <td className="px-3 py-3 text-right font-mono text-stone-700">{cat.blocks}</td>
                <td className="px-3 py-3 text-center">
                  <Stars value={cat.rating} />
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="ml-auto flex w-24 items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-stone-100">
                      <div className={cn("h-1.5 rounded-full", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-mono text-[11px] text-stone-600">{pct}%</span>
                  </div>
                </td>
                <td className={cn("px-3 py-3 text-right font-mono", cat.alert ? "font-semibold text-amber-700" : "text-stone-600")}>
                  {FORMATTER.format(cat.avgSkipped)}
                </td>
                <td className="px-5 py-3 text-right">
                  {cat.alert ? (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-amber-800">
                      {cat.alert}
                    </span>
                  ) : (
                    <span className="text-stone-300">›</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
