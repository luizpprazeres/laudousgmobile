"use client";

import { useEffect, useState } from "react";
import type { AuditDetail, AuditRow } from "@/lib/mock/audit";
import { AuditFilterBar } from "./AuditFilterBar";
import { AuditRowItem } from "./AuditRow";
import { AuditDetailPanel } from "./AuditDetailPanel";

type Props = {
  rows: AuditRow[];
  initialDetail: AuditDetail | null;
  counts: { today: number; total7d: number; totalAll: number };
};

export function AuditClient({ rows, initialDetail, counts }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialDetail?.id ?? null);
  const [detail, setDetail] = useState<AuditDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    if (detail?.id === selectedId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/audit/${selectedId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return (await r.json()) as AuditDetail;
      })
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, detail?.id]);

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">trilha forense</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">Audit log</h1>
        <p className="mt-0.5 text-sm text-stone-600">
          Toda geração com retrieved + skipped + similarity. Use os filtros pra cruzar com mudanças de regra.
        </p>
      </div>

      <AuditFilterBar />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-7">
        <div className="lg:col-span-4 rounded-2xl border border-stone-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
            <h2 className="font-display text-sm font-semibold text-stone-900">Gerações</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
              {counts.today} hoje · {counts.total7d} últimos 7d · {counts.totalAll} total
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="px-10 py-12 text-center text-sm text-stone-500">
              Nenhuma geração encontrada.
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {rows.map((row) => (
                <AuditRowItem
                  key={row.id}
                  row={row}
                  selected={selectedId === row.id}
                  onSelect={setSelectedId}
                />
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3 text-xs">
            <span className="font-mono text-stone-500">{rows.length} carregadas</span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Anterior (em breve)"
                className="cursor-not-allowed rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-400"
                disabled
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="Próxima (em breve)"
                className="cursor-not-allowed rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-400"
                disabled
                type="button"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!selectedId && (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-card">
              Selecione uma geração à esquerda pra ver o detalhe.
            </div>
          )}
          {selectedId && loading && (
            <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-card">
              <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">carregando…</p>
              <p className="mt-2 font-mono text-xs text-stone-700">{selectedId}</p>
            </div>
          )}
          {selectedId && error && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-6 text-sm text-rose-700 shadow-card">
              <p className="font-mono text-[10px] uppercase tracking-widest">erro</p>
              <p className="mt-1">{error}</p>
            </div>
          )}
          {selectedId && detail && !loading && !error && (
            <AuditDetailPanel detail={detail} onClose={() => setSelectedId(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
