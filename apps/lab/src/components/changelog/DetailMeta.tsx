import type { ChangelogEntry } from "@/lib/changelog/types";

export function DetailMeta({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="border-b border-stone-100 px-5 py-3">
        <h3 className="font-display text-sm font-semibold text-stone-900">Metadados</h3>
      </div>
      <dl className="divide-y divide-stone-100">
        <Row label="sprint" value={entry.sprint ?? "—"} />
        <Row label="size" value={entry.size} />
        <Row label="status" value={entry.status} />
        <Row label="files touched" value={entry.files_touched ? `~${entry.files_touched}` : "—"} />
        {entry.related_adrs && entry.related_adrs.length > 0 && (
          <Row label="ADRs" value={entry.related_adrs.map((n) => `0${String(n).padStart(3, "0")}`).join(", ")} />
        )}
        {entry.commits && entry.commits.length > 0 && (
          <div className="px-5 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-500">commits</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {entry.commits.map((c) => (
                <span
                  key={c}
                  className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] text-stone-700"
                >
                  {c}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 text-xs">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{label}</dt>
      <dd className="font-mono text-stone-900">{value}</dd>
    </div>
  );
}
