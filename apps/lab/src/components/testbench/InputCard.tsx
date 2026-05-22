"use client";

import { useState } from "react";
import { FileText, Mic, Play } from "lucide-react";

type Props = {
  initial: string;
  onGenerate?: (text: string) => void;
  disabled?: boolean;
};

export function InputCard({ initial, onGenerate, disabled }: Props) {
  const [value, setValue] = useState(initial);
  const chars = value.length;
  const words = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-50 text-brand-700">
            <FileText aria-hidden className="h-4 w-4" />
          </span>
          <h2 className="font-display text-base font-semibold text-stone-900">Input do médico</h2>
          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-stone-400">
            {chars} caracteres · {words} palavras
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            aria-label="Inputs salvos (em breve)"
            className="cursor-not-allowed rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-400"
            disabled
            type="button"
          >
            Inputs salvos ▾
          </button>
          <button
            className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            onClick={() => setValue("")}
            type="button"
          >
            Limpar
          </button>
        </div>
      </div>
      <textarea
        className="block w-full resize-none border-0 bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-stone-900 placeholder-stone-400 focus:ring-0"
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        value={value}
        placeholder="Cole ou digite aqui o input do médico…"
      />
      <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <button
            aria-label="Gravar áudio (em breve)"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-400"
            disabled
            type="button"
          >
            <Mic aria-hidden className="h-3.5 w-3.5" />
            Gravar
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
            whisper · pt-BR
          </span>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          disabled={value.trim().length === 0 || disabled}
          onClick={() => onGenerate?.(value)}
          type="button"
        >
          <Play aria-hidden className="h-4 w-4" fill="currentColor" />
          {disabled ? "Gerando…" : "Gerar laudo"}
        </button>
      </div>
    </div>
  );
}
