type Props = {
  category: string;
  style: string;
  onCategoryChange?: (value: string) => void;
  onStyleChange?: (value: string) => void;
};

const CATEGORIES = [
  "OBSTETRICA",
  "PELVE_FEMININA",
  "TIREOIDE",
  "MAMARIA",
  "DOPPLER_OBSTETRICO",
  "ABDOMEN_TOTAL",
];

const STYLES = ["CLÁSSICO_COMPLETO", "DIRETO_OBJETIVO", "DETALHADO_PROTOCOLAR"];

export function Toolbar({ category, style, onCategoryChange, onStyleChange }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">testbench</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">
          Gerar laudo de teste
        </h1>
        <p className="mt-0.5 text-sm text-stone-600">
          Cole ou dite o achado. Veja em tempo real o source map de cada trecho.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-card">
          <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">cat</span>
          <select
            className="border-0 bg-transparent pr-7 text-sm font-medium text-stone-900 focus:ring-0"
            onChange={(e) => onCategoryChange?.(e.target.value)}
            value={category}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-card">
          <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">style</span>
          <select
            className="border-0 bg-transparent pr-7 text-sm font-medium text-stone-900 focus:ring-0"
            onChange={(e) => onStyleChange?.(e.target.value)}
            value={style}
          >
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
