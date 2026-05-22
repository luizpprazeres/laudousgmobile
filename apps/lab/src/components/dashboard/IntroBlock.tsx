import Link from "next/link";
import { Zap } from "lucide-react";

export function IntroBlock() {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">painel de calibração rag</p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-4xl font-extrabold tracking-tight text-stone-900">
          Olá, Luiz
          <span aria-hidden className="ml-1 inline-block size-2 animate-pulse rounded-full bg-brand-500" />
        </h1>
        <p className="mt-1 text-base text-stone-600">
          Você tem <span className="font-semibold text-stone-900">23 laudos</span> e{" "}
          <span className="font-semibold text-stone-900">3 edições</span> nas últimas 12 horas.
        </p>
      </div>
      <Link
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
        href="/testbench"
      >
        <Zap aria-hidden className="h-4 w-4" />
        Novo teste
      </Link>
    </div>
  );
}
