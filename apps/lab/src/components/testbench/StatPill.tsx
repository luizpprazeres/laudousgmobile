type Props = {
  label: string;
  value: string;
  unit?: string;
};

export function StatPill({ label, value, unit }: Props) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-card">
      <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-stone-900">
        {value}
        {unit && <span className="ml-0.5 text-xs text-stone-500">{unit}</span>}
      </p>
    </div>
  );
}
