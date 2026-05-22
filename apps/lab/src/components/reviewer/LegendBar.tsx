type Item = { label: string; bg: string; ring: string };

const ITEMS: Item[] = [
  { label: "Universal (p≥90)", bg: "bg-brand-100", ring: "ring-brand-200" },
  { label: "Contextual (p75-80)", bg: "bg-sky-50", ring: "ring-sky-200" },
  { label: "Opcional (p≤70)", bg: "bg-stone-100", ring: "ring-stone-200" },
  { label: "LLM puro (sem source)", bg: "bg-violet-50", ring: "ring-violet-200" },
];

export function LegendBar() {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs shadow-card">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">legenda:</span>
      {ITEMS.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`inline-block h-3 w-3 rounded-sm ring-1 ring-inset ${item.bg} ${item.ring}`} />
          <span className="text-stone-700">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
