import { Download, Search } from "lucide-react";

export function AuditFilterBar() {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-card">
      <FilterSelect label="cat" options={["Todas", "OBSTETRICA", "PELVE_FEMININA", "TIREOIDE", "ABDOMEN_TOTAL", "MAMARIA", "DOPPLER_OBSTETRICO"]} />
      <FilterSelect label="status" options={["Todos", "OK", "Warning", "Erro"]} />
      <FilterSelect label="range" options={["Últimos 7 dias", "24h", "30d", "Tudo"]} />
      <FilterSelect label="pipeline" options={["v1", "v0"]} />
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Search aria-hidden className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            className="w-72 rounded-md border-stone-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-stone-400 focus:border-brand-500 focus:ring-brand-500"
            placeholder="buscar por id, achado, regra…"
            type="text"
          />
        </div>
        <button
          aria-label="Exportar (em breve)"
          className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-400"
          disabled
          type="button"
        >
          <Download aria-hidden className="h-3.5 w-3.5" />
          Exportar
        </button>
      </div>
    </div>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs">
      <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">{label}</span>
      <select className="border-0 bg-transparent pr-6 text-xs font-medium text-stone-900 focus:ring-0">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
