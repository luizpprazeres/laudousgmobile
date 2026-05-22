import type { ChangelogEntry } from "@/lib/changelog/types";
import { ChangelogCard } from "./ChangelogCard";

function groupByMonth(entries: ChangelogEntry[]) {
  const map = new Map<string, ChangelogEntry[]>();
  for (const e of entries) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}

const MONTH_FMT = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export function ChangelogTimeline({ entries }: { entries: ChangelogEntry[] }) {
  const groups = groupByMonth(entries);

  return (
    <div className="space-y-8">
      {groups.map(([key, items]) => {
        const [year, month] = key.split("-");
        const label = MONTH_FMT.format(new Date(Number(year), Number(month) - 1, 1));
        return (
          <section key={key}>
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">{label}</h2>
            <div className="space-y-3">
              {items.map((e) => (
                <ChangelogCard key={e.slug} entry={e} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
