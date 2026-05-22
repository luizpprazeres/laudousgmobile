"use client";

import Link from "next/link";
import { AlertTriangle, Eye, Play, RotateCw, X } from "lucide-react";
import type { AuditDetail } from "@/lib/mock/audit";
import { CompactBlockList } from "./CompactBlockList";

export function AuditDetailPanel({ detail, onClose }: { detail: AuditDetail; onClose?: () => void }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-semibold text-stone-900">Detalhe</h2>
          <span className="font-mono text-xs text-stone-500">{detail.id}</span>
        </div>
        <button
          aria-label="Fechar detalhe"
          className="text-stone-400 hover:text-stone-600"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 py-4">
        {detail.warning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle fill="currentColor" className="h-4 w-4" />
              <p className="text-sm font-semibold">{detail.warning.title}</p>
            </div>
            <p className="mt-1 text-xs text-amber-700">{detail.warning.message}</p>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field label="pipeline" value={detail.pipeline} />
          <Field label="prompt" value={detail.promptVersion} />
          <Field label="contract" value={detail.contract} />
          <Field label="writing_style" value={detail.writingStyle} />
          <div className="col-span-2">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-500">input</dt>
            <dd className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs leading-relaxed text-stone-700">
              {`"${detail.inputFull}"`}
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <CompactBlockList tone="retrieved" label={`retrieved · ${detail.blocksUsed}`} blocks={detail.retrieved} />
          <CompactBlockList tone="skipped" label={`skipped · ${detail.skipped.length}`} blocks={detail.skipped} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            href="/testbench"
          >
            <Play aria-hidden className="h-3.5 w-3.5" fill="currentColor" />
            Reabrir no Testbench
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            href={`/reviewer/${detail.id}`}
          >
            <Eye aria-hidden className="h-3.5 w-3.5" />
            Abrir Reviewer
          </Link>
          <button
            aria-label="Re-rodar geração (em breve)"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-400"
            disabled
            type="button"
          >
            <RotateCw aria-hidden className="h-3.5 w-3.5" />
            Re-rodar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs text-stone-900">{value}</dd>
    </div>
  );
}
