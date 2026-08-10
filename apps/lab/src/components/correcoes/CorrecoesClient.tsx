"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { diffLinhas, resumirDiff, type LinhaDiff } from "@/lib/diff/linhas";
import type { CorrecaoDetalhe, CorrecaoLinha, ResumoCategoria } from "@/lib/supabase/correcoes-queries";
import { cn } from "@/lib/utils";

/**
 * O que o médico corrigiu à mão.
 *
 * `generated_output` é a saída da IA; `final_output` é o que ele salvou depois
 * de editar. O diff entre os dois é o sinal de qualidade mais honesto que o
 * sistema tem — não é heurística, é um médico decidindo mudar algo antes de
 * assinar. Havia 585 laudos assim e nenhuma tela os lia.
 */

type Props = {
  pagina: { linhas: CorrecaoLinha[]; total: number; pagina: number; porPagina: number };
  resumo: ResumoCategoria[];
  opcoes: { categorias: string[]; medicos: { id: string; nome: string }[] };
  filtros: { categoria?: string; medicoId?: string };
  detalheInicial: CorrecaoDetalhe | null;
};

export function CorrecoesClient({ pagina, resumo, opcoes, filtros, detalheInicial }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [selecionado, setSelecionado] = useState<string | null>(detalheInicial?.id ?? null);
  const [detalhe, setDetalhe] = useState<CorrecaoDetalhe | null>(detalheInicial);
  const [carregando, setCarregando] = useState(false);
  const [verDitado, setVerDitado] = useState(false);

  const setFiltro = (k: string, v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v) q.set(k, v); else q.delete(k);
    if (k !== "pagina") q.delete("pagina");
    router.push(`/correcoes?${q.toString()}`);
  };

  useEffect(() => {
    setDetalhe(detalheInicial);
    setSelecionado(detalheInicial?.id ?? null);
  }, [detalheInicial]);

  useEffect(() => {
    if (!selecionado || detalhe?.id === selecionado) return;
    let cancelado = false;
    setCarregando(true);
    fetch(`/api/correcoes/${selecionado}`)
      .then((r) => r.json())
      .then((d) => !cancelado && setDetalhe(d))
      .finally(() => !cancelado && setCarregando(false));
    return () => { cancelado = true; };
  }, [selecionado, detalhe?.id]);

  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.porPagina));
  const maiorPct = Math.max(...resumo.map((r) => r.pct), 1);
  const diff = detalhe ? diffLinhas(detalhe.gerado, detalhe.final) : [];
  const res = detalhe ? resumirDiff(diff) : null;

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">qualidade</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">
          O que o médico corrigiu
        </h1>
        <p className="mt-0.5 max-w-3xl text-sm text-stone-600">
          A diferença entre o que a IA gerou e o que foi salvo depois da revisão. É o
          sinal de qualidade mais direto do sistema — cada correção é um ponto em que o
          modelo não acertou de primeira.
        </p>
      </div>

      {/* ------------------------------------------- taxa de edição por categoria */}
      <div className="mb-5 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="mb-3 font-display text-sm font-bold text-stone-900">
          Taxa de correção por categoria
        </h2>
        <ul className="space-y-1.5">
          {resumo.map((r) => (
            <li key={r.categoria}>
              <button type="button" onClick={() => setFiltro("categoria", r.categoria)}
                className="group flex w-full items-center gap-3 text-left">
                <span className={cn(
                  "w-52 shrink-0 truncate font-mono text-[11px]",
                  filtros.categoria === r.categoria ? "font-bold text-brand-800" : "text-stone-600",
                )}>
                  {r.categoria}
                </span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <span
                    style={{ width: `${(100 * r.pct) / maiorPct}%` }}
                    className={cn(
                      "block h-full rounded-full transition group-hover:opacity-80",
                      r.pct >= 35 ? "bg-rose-400" : r.pct >= 20 ? "bg-amber-400" : "bg-emerald-400",
                    )}
                  />
                </span>
                <span className="w-14 shrink-0 text-right font-mono text-[11px] font-semibold text-stone-800">
                  {r.pct.toFixed(1)}%
                </span>
                <span className="w-32 shrink-0 text-right font-mono text-[10px] text-stone-500">
                  {r.editados}/{r.laudos} · ±{r.deltaAbsMedio} ch
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-stone-500">
          A barra é a proporção de laudos que precisaram de correção. O número ao lado é
          quantos caracteres mudaram, em média — muitas correções pequenas indicam um
          ajuste repetitivo que a personalização do modelo resolveria.
        </p>
      </div>

      {/* -------------------------------------------------------------- filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-2.5 rounded-lg border border-stone-200 bg-white p-3">
        <label className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">categoria</span>
          <select value={filtros.categoria ?? ""} onChange={(e) => setFiltro("categoria", e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500">
            <option value="">todas</option>
            {opcoes.categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">médico</span>
          <select value={filtros.medicoId ?? ""} onChange={(e) => setFiltro("medico", e.target.value)}
            className="max-w-[13rem] rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500">
            <option value="">todos</option>
            {opcoes.medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </label>
        {(filtros.categoria || filtros.medicoId) && (
          <button type="button" onClick={() => router.push("/correcoes")}
            className="mb-0.5 rounded-md border border-stone-300 px-2.5 py-1 text-sm text-stone-600 hover:bg-stone-50">
            limpar
          </button>
        )}
        <span className="ml-auto mb-1 font-mono text-[10px] uppercase tracking-wider text-stone-500">
          {pagina.total.toLocaleString("pt-BR")} laudos corrigidos
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* lista */}
        <div className="rounded-lg border border-stone-200 bg-white">
          <ul className="max-h-[70vh] divide-y divide-stone-100 overflow-auto">
            {pagina.linhas.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => setSelecionado(l.id)}
                  className={cn(
                    "w-full px-4 py-2.5 text-left transition",
                    selecionado === l.id ? "bg-brand-50/70" : "hover:bg-stone-50",
                  )}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-stone-900">{l.categoria}</span>
                    <span className={cn(
                      "ml-auto rounded px-1.5 font-mono text-[10px]",
                      l.delta > 0 ? "bg-emerald-100 text-emerald-800"
                        : l.delta < 0 ? "bg-rose-100 text-rose-800" : "bg-stone-100 text-stone-600",
                    )}>
                      {l.delta > 0 ? "+" : ""}{l.delta} ch
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-stone-500">
                    <span>{l.quando}</span>
                    {l.medico && <><span className="text-stone-300">·</span><span>{l.medico}</span></>}
                    <span className="text-stone-300">·</span>
                    <span>{l.linhasAlteradas}/{l.totalLinhas} linhas</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2 text-xs">
            <span className="font-mono text-stone-500">pág. {pagina.pagina}/{totalPaginas}</span>
            <div className="flex gap-1">
              <button type="button" disabled={pagina.pagina <= 1}
                onClick={() => setFiltro("pagina", String(pagina.pagina - 1))}
                className="rounded border border-stone-200 px-2 disabled:text-stone-300">‹</button>
              <button type="button" disabled={pagina.pagina >= totalPaginas}
                onClick={() => setFiltro("pagina", String(pagina.pagina + 1))}
                className="rounded border border-stone-200 px-2 disabled:text-stone-300">›</button>
            </div>
          </div>
        </div>

        {/* diff */}
        <div className="rounded-lg border border-stone-200 bg-white">
          {!detalhe && !carregando && (
            <p className="p-10 text-center text-sm text-stone-500">
              Selecione um laudo para ver o que mudou.
            </p>
          )}
          {carregando && <p className="p-10 text-center text-sm text-stone-500">carregando…</p>}
          {detalhe && !carregando && res && (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-stone-200 px-4 py-2.5">
                <span className="font-display text-sm font-bold text-stone-900">{detalhe.categoria}</span>
                <span className="font-mono text-[11px] text-stone-500">{detalhe.quando}</span>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  {res.alteradas > 0 && <span className="rounded bg-amber-100 px-1.5 text-amber-900">{res.alteradas} reescrita{res.alteradas > 1 ? "s" : ""}</span>}
                  {res.adicionadas > 0 && <span className="rounded bg-emerald-100 px-1.5 text-emerald-900">+{res.adicionadas}</span>}
                  {res.removidas > 0 && <span className="rounded bg-rose-100 px-1.5 text-rose-900">−{res.removidas}</span>}
                </div>
                {detalhe.rawInput && (
                  <button type="button" onClick={() => setVerDitado((v) => !v)}
                    className="ml-auto text-[11px] text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline">
                    {verDitado ? "ocultar ditado" : "ver o ditado"}
                  </button>
                )}
              </header>

              {verDitado && detalhe.rawInput && (
                <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-stone-500">
                    o que foi ditado
                  </p>
                  <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-stone-700">
                    {detalhe.rawInput}
                  </p>
                </div>
              )}

              <div className="max-h-[62vh] overflow-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
                {diff.map((l, i) => <Linha key={i} l={l} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Linha({ l }: { l: LinhaDiff }) {
  if (l.tipo === "igual") {
    return <p className="text-stone-400">{l.texto || " "}</p>;
  }
  if (l.tipo === "removida") {
    return (
      <p className="rounded bg-rose-50 px-1 text-rose-900/70 line-through decoration-rose-400">
        <span className="mr-1 select-none text-rose-500 no-underline">−</span>{l.texto}
      </p>
    );
  }
  if (l.tipo === "adicionada") {
    return (
      <p className="rounded bg-emerald-50 px-1 text-emerald-900">
        <span className="mr-1 select-none text-emerald-600">+</span>{l.texto}
      </p>
    );
  }
  // alterada: mostra a frase uma vez, com as palavras trocadas destacadas
  return (
    <p className="rounded bg-amber-50 px-1 text-stone-800">
      <span className="mr-1 select-none text-amber-600">~</span>
      {l.palavras.map((p, i) =>
        p.tipo === "igual" ? (
          <span key={i}>{p.texto}</span>
        ) : p.tipo === "removida" ? (
          <span key={i} className="bg-rose-200/60 line-through decoration-rose-500">{p.texto}</span>
        ) : (
          <span key={i} className="bg-emerald-200/70 font-semibold">{p.texto}</span>
        ),
      )}
    </p>
  );
}
