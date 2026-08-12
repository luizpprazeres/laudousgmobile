"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuditDetail, AuditPagina, AuditStatus } from "@/lib/audit/types";
import { AuditRowItem } from "./AuditRow";
import { AuditDetailPanel } from "./AuditDetailPanel";
import { cn } from "@/lib/utils";

/**
 * Os tipos que o sanity emite. Ordenados por consequência, não por frequência —
 * `medida_divergente` é 79 % dos alertas e é o menos grave; `achado_inventado`
 * é raro e é o que mais importa.
 */
const TIPOS_ALERTA = [
  "achado_inventado",
  "achado_omitido",
  "lateralidade_divergente",
  "comando_ignorado",
  "conclusao_inconsistente",
  "categoria_divergente",
  "data_divergente",
  "metacomando_residual",
  "formato_quebrado",
  "medida_divergente",
  "outro",
];

type Props = {
  pagina: AuditPagina;
  filtros: {
    categoria?: string; medicoId?: string; status?: AuditStatus;
    de?: string; ate?: string; busca?: string;
    tipoIssue?: string; soCriticos?: boolean;
    pagina: number; porPagina: number;
  };
  opcoes: { categorias: string[]; medicos: { id: string; nome: string }[] };
  counts: { today: number; total7d: number; totalAll: number; comErro7d: number };
  initialDetail: AuditDetail | null;
};

export function AuditClient({ pagina, filtros, opcoes, counts, initialDetail }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(initialDetail?.id ?? null);
  const [detail, setDetail] = useState<AuditDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros vivem na URL: o link de uma investigação é compartilhável.
  const setFiltro = (chave: string, valor: string) => {
    const q = new URLSearchParams(sp.toString());
    if (valor) q.set(chave, valor);
    else q.delete(chave);
    if (chave !== "pagina") q.delete("pagina");
    router.push(`/audit?${q.toString()}`);
  };

  useEffect(() => {
    setDetail(initialDetail);
    setSelectedId(initialDetail?.id ?? null);
  }, [initialDetail]);

  useEffect(() => {
    if (!selectedId || detail?.id === selectedId) return;
    let cancelado = false;
    setLoading(true);
    setError(null);
    fetch(`/api/audit/${selectedId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return (await r.json()) as AuditDetail;
      })
      .then((d) => !cancelado && setDetail(d))
      .catch((e: Error) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setLoading(false));
    return () => { cancelado = true; };
  }, [selectedId, detail?.id]);

  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.porPagina));
  const temFiltro = Boolean(
    filtros.categoria || filtros.medicoId || filtros.status || filtros.de ||
      filtros.ate || filtros.busca || filtros.tipoIssue || filtros.soCriticos,
  );

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">trilha forense</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">
          Auditoria
        </h1>
        <p className="mt-0.5 text-sm text-stone-600">
          Todas as gerações, de todas as contas — com o ditado, o laudo, o prompt e o modelo usado.
        </p>
      </div>

      {/* ----------------------------------------------------------- filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-2.5 rounded-lg border border-stone-200 bg-white p-3">
        <Campo rotulo="categoria">
          <select value={filtros.categoria ?? ""} onChange={(e) => setFiltro("categoria", e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500">
            <option value="">todas</option>
            {opcoes.categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>

        <Campo rotulo="médico">
          <select value={filtros.medicoId ?? ""} onChange={(e) => setFiltro("medico", e.target.value)}
            className="max-w-[13rem] rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500">
            <option value="">todos</option>
            {opcoes.medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Campo>

        <Campo rotulo="situação">
          <select value={filtros.status ?? ""} onChange={(e) => setFiltro("status", e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500">
            <option value="">todas</option>
            <option value="error">com erro</option>
            <option value="warning">com alerta do sanity</option>
            <option value="ok">sem ocorrência</option>
          </select>
        </Campo>

        <Campo rotulo="tipo de alerta">
          <select value={filtros.tipoIssue ?? ""} onChange={(e) => setFiltro("alerta", e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500">
            <option value="">qualquer</option>
            {TIPOS_ALERTA.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </Campo>

        <label className="mb-1 flex cursor-pointer items-center gap-1.5 text-sm text-stone-700">
          <input type="checkbox" checked={Boolean(filtros.soCriticos)}
            onChange={(e) => setFiltro("criticos", e.target.checked ? "1" : "")}
            className="h-4 w-4 rounded border-stone-300" />
          só críticos
        </label>

        <Campo rotulo="de">
          <input type="date" value={filtros.de ?? ""} onChange={(e) => setFiltro("de", e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500" />
        </Campo>
        <Campo rotulo="até">
          <input type="date" value={filtros.ate ?? ""} onChange={(e) => setFiltro("ate", e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500" />
        </Campo>

        <Campo rotulo="buscar no ditado">
          <input defaultValue={filtros.busca ?? ""}
            onKeyDown={(e) => e.key === "Enter" && setFiltro("busca", (e.target as HTMLInputElement).value)}
            onBlur={(e) => e.target.value !== (filtros.busca ?? "") && setFiltro("busca", e.target.value)}
            placeholder="ex.: placenta prévia"
            className="w-52 rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-brand-500" />
        </Campo>

        {temFiltro && (
          <button type="button" onClick={() => router.push("/audit")}
            className="mb-0.5 rounded-md border border-stone-300 px-2.5 py-1 text-sm text-stone-600 hover:bg-stone-50">
            limpar
          </button>
        )}

        <div className="ml-auto mb-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-stone-500">
          <span>{counts.today} hoje</span>
          <span>{counts.total7d} em 7d</span>
          <span className={cn(counts.comErro7d > 0 && "text-rose-600")}>{counts.comErro7d} com erro em 7d</span>
          <span>{counts.totalAll} total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-7">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-card lg:col-span-4">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-2.5">
            <h2 className="font-display text-sm font-semibold text-stone-900">
              {pagina.total.toLocaleString("pt-BR")} geraç{pagina.total === 1 ? "ão" : "ões"}
              {temFiltro && <span className="ml-1 text-stone-500">com estes filtros</span>}
            </h2>
            <Paginacao pagina={pagina.pagina} total={totalPaginas} onIr={(p) => setFiltro("pagina", String(p))} />
          </div>

          {pagina.linhas.length === 0 ? (
            <div className="px-10 py-12 text-center text-sm text-stone-500">
              Nenhuma geração com estes filtros.
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {pagina.linhas.map((row) => (
                <AuditRowItem key={row.id} row={row} selected={selectedId === row.id} onSelect={setSelectedId} />
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-stone-100 px-5 py-2.5 text-xs">
            <span className="font-mono text-stone-500">
              página {pagina.pagina} de {totalPaginas}
            </span>
            <Paginacao pagina={pagina.pagina} total={totalPaginas} onIr={(p) => setFiltro("pagina", String(p))} />
          </div>
        </div>

        <div className="lg:col-span-3">
          {!selectedId && (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-card">
              Selecione uma geração para ver o detalhe.
            </div>
          )}
          {selectedId && loading && (
            <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-card">
              carregando…
            </div>
          )}
          {selectedId && error && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-6 text-sm text-rose-700 shadow-card">
              {error}
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

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">{rotulo}</span>
      {children}
    </label>
  );
}

function Paginacao({ pagina, total, onIr }: { pagina: number; total: number; onIr: (p: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" disabled={pagina <= 1} onClick={() => onIr(pagina - 1)}
        className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-stone-600 disabled:cursor-not-allowed disabled:text-stone-300">
        ‹
      </button>
      <button type="button" disabled={pagina >= total} onClick={() => onIr(pagina + 1)}
        className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-stone-600 disabled:cursor-not-allowed disabled:text-stone-300">
        ›
      </button>
    </div>
  );
}
