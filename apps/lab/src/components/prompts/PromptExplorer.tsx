"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Explorador de prompts (cockpit — docs/projeto-modelos/06-lab-cockpit.md).
 *
 * Três coisas que a tela faz questão de deixar claras, porque enganam quem
 * está estudando o pipeline:
 *
 *  1. O CAMINHO vem antes do texto. 11 categorias montam o laudo em código —
 *     mostrar o prompt do writer nelas, sem aviso, sugeriria que é ele que
 *     escreve o laudo. Não é.
 *  2. Nas categorias de renderer, quem comanda é o prompt de EXTRAÇÃO.
 *  3. O caminho depende de RENDERER_CATEGORIES, que é do ambiente. A tela
 *     mostra a lista que o servidor leu, para não induzir conclusão errada
 *     a partir de um .env defasado.
 */

type Camada = { ordem: number; id: string; titulo: string; origem: string; texto: string };
type Caminho = {
  caminho: "renderer" | "renderer+writer" | "writer" | "livre";
  explicacao: string;
  renderer_ligado: boolean;
  renderer_categories_lido: string[];
};
type Extracao = {
  schema_name: string;
  prompt: string;
  prompt_chars: number;
  campos_de_texto: string[];
};
type Resposta = {
  categoria: { code: string; label: string; ativa: boolean };
  estilo: { id: string; code: string };
  caminho: Caminho;
  prompt_version?: string;
  contract_hash?: string;
  hardening?: boolean;
  variante?: string | null;
  camadas?: Camada[];
  resumo_camadas?: { bundle_por_kind: Record<string, number>; bundle_total: number };
  extracao: Extracao | null;
  system_message?: string;
  system_message_chars?: number;
  sem_prompt?: boolean;
  motivo?: { codigo: string; explicacao: string | null };
  error?: string;
};

/** Uma cor por camada, estável entre categorias — a leitura vira hábito. */
const COR: Record<string, { barra: string; ponto: string; fundo: string }> = {
  contrato:    { barra: "bg-violet-500",  ponto: "bg-violet-500",  fundo: "bg-violet-50" },
  condicional: { barra: "bg-fuchsia-500", ponto: "bg-fuchsia-500", fundo: "bg-fuchsia-50" },
  global:      { barra: "bg-sky-500",     ponto: "bg-sky-500",     fundo: "bg-sky-50" },
  hardening:   { barra: "bg-orange-500",  ponto: "bg-orange-500",  fundo: "bg-orange-50" },
  estilo:      { barra: "bg-teal-500",    ponto: "bg-teal-500",    fundo: "bg-teal-50" },
  bundle:      { barra: "bg-emerald-500", ponto: "bg-emerald-500", fundo: "bg-emerald-50" },
  fewshots:    { barra: "bg-lime-500",    ponto: "bg-lime-500",    fundo: "bg-lime-50" },
  proibicoes:  { barra: "bg-rose-500",    ponto: "bg-rose-500",    fundo: "bg-rose-50" },
  cot:         { barra: "bg-amber-500",   ponto: "bg-amber-500",   fundo: "bg-amber-50" },
};
function corDe(id: string) {
  const chave = id.startsWith("condicional") ? "condicional" : id.startsWith("bundle_") ? "bundle" : id;
  return COR[chave] ?? { barra: "bg-stone-400", ponto: "bg-stone-400", fundo: "bg-stone-50" };
}

const CAMINHO_ESTILO: Record<Caminho["caminho"], { rotulo: string; classe: string }> = {
  renderer:          { rotulo: "Renderer",          classe: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  "renderer+writer": { rotulo: "Renderer + writer", classe: "bg-amber-100 text-amber-900 border-amber-300" },
  writer:            { rotulo: "Writer (LLM)",      classe: "bg-sky-100 text-sky-900 border-sky-300" },
  livre:             { rotulo: "Livre",             classe: "bg-stone-200 text-stone-800 border-stone-300" },
};

export function PromptExplorer({
  categorias, estilos,
}: {
  categorias: { code: string; label: string; active: boolean }[];
  estilos: { id: string; code: string; name: string; active: boolean }[];
}) {
  const estilosAtivos = estilos.filter((e) => e.active);
  const [categoria, setCategoria] = useState("OBSTETRICA");
  const [estiloId, setEstiloId] = useState(estilosAtivos[0]?.id ?? "");
  const [ditado, setDitado] = useState("");
  const [hardening, setHardening] = useState(false);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState<"extracao" | "writer">("writer");
  const [aberta, setAberta] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ category: categoria, hardening: String(hardening) });
      if (estiloId) qs.set("writing_style_id", estiloId);
      if (ditado.trim()) qs.set("raw_input", ditado.trim());
      const r = await fetch(`/api/prompt-preview?${qs}`, { cache: "no-store" });
      setDados(await r.json());
    } catch {
      setDados({ error: "falha ao consultar" } as Resposta);
    } finally {
      setCarregando(false);
    }
  }, [categoria, estiloId, ditado, hardening]);

  useEffect(() => {
    const t = setTimeout(() => void buscar(), 300);
    return () => clearTimeout(t);
  }, [buscar]);

  // Nas categorias de renderer, a extração é o que comanda — abre nela.
  useEffect(() => {
    if (!dados?.caminho) return;
    setAba(dados.caminho.caminho === "renderer" && dados.extracao ? "extracao" : "writer");
    setAberta(null);
  }, [dados?.categoria?.code, dados?.caminho?.caminho, dados?.extracao]);

  const camadas = dados?.camadas ?? [];
  const totalCamadas = useMemo(() => camadas.reduce((s, c) => s + c.texto.length, 0), [camadas]);

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- controles */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="min-w-[15rem] rounded-md border border-stone-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500">
            {categorias.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}{!c.active ? " (inativa)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">estilo</span>
          <select value={estiloId} onChange={(e) => setEstiloId(e.target.value)}
            className="rounded-md border border-stone-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500">
            {estilosAtivos.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>

        <label className="flex min-w-[18rem] flex-1 flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            ditado (opcional — dispara blocos condicionais e escolhe a variante)
          </span>
          <input value={ditado} onChange={(e) => setDitado(e.target.value)}
            placeholder="ex.: placenta prévia, região anexial com cisto, hashimoto…"
            className="rounded-md border border-stone-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>

        <label className="flex cursor-pointer items-center gap-2 pb-1.5 text-sm text-stone-700">
          <input type="checkbox" checked={hardening} onChange={(e) => setHardening(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300" />
          hardening
        </label>

        {carregando && <span className="pb-2 text-xs text-stone-400">consultando…</span>}
      </div>

      {dados?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{dados.error}</div>
      )}

      {dados?.caminho && (
        <>
          {/* ------------------------------------------------------- caminho */}
          <div className={cn("rounded-lg border p-4", CAMINHO_ESTILO[dados.caminho.caminho].classe)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-white/70 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide">
                {CAMINHO_ESTILO[dados.caminho.caminho].rotulo}
              </span>
              <span className="font-display text-sm font-bold">
                {dados.categoria.code} · {dados.estilo.code}
              </span>
              {dados.variante && (
                <span className="rounded bg-white/70 px-2 py-0.5 font-mono text-[11px]">
                  variante {dados.variante}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed">{dados.caminho.explicacao}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] opacity-70 hover:opacity-100">
                RENDERER_CATEGORIES lido deste ambiente ({dados.caminho.renderer_categories_lido.length})
              </summary>
              <p className="mt-1 font-mono text-[11px] opacity-80">
                {dados.caminho.renderer_categories_lido.join(", ") || "(vazio)"}
              </p>
              <p className="mt-1 text-[11px] opacity-70">
                Em produção esta lista costuma ser maior que a do .env local. O caminho acima vale
                para o ambiente que respondeu a esta consulta.
              </p>
            </details>
          </div>

          {/* ---------------------------------------------------------- abas */}
          <div className="flex gap-1.5">
            {dados.extracao && (
              <Aba ativa={aba === "extracao"} onClick={() => setAba("extracao")}
                rotulo="Prompt de extração"
                sub={`${dados.extracao.prompt_chars.toLocaleString("pt-BR")} ch`}
                destaque={dados.caminho.caminho === "renderer"} />
            )}
            <Aba ativa={aba === "writer"} onClick={() => setAba("writer")}
              rotulo="Prompt do writer"
              sub={dados.sem_prompt ? "não se aplica" : `${(dados.system_message_chars ?? 0).toLocaleString("pt-BR")} ch`}
              destaque={dados.caminho.caminho === "writer"} />
          </div>

          {aba === "extracao" && dados.extracao && (
            <ExtracaoPainel extracao={dados.extracao} />
          )}

          {aba === "writer" && (
            dados.sem_prompt ? (
              <div className="rounded-lg border border-stone-300 bg-stone-50 p-4">
                <p className="text-sm font-semibold text-stone-800">
                  Esta categoria não monta prompt de writer hoje.
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {dados.motivo?.explicacao} <span className="font-mono text-xs">({dados.motivo?.codigo})</span>
                </p>
                {dados.extracao && (
                  <p className="mt-2 text-sm text-stone-600">
                    O que comanda o laudo aqui é o <strong>prompt de extração</strong> — veja na aba ao lado.
                  </p>
                )}
              </div>
            ) : (
              <WriterPainel
                camadas={camadas}
                total={totalCamadas}
                promptFinal={dados.system_message ?? ""}
                promptVersion={dados.prompt_version}
                contractHash={dados.contract_hash}
                aberta={aberta}
                setAberta={setAberta}
              />
            )
          )}
        </>
      )}
    </div>
  );
}

function Aba({ ativa, onClick, rotulo, sub, destaque }: {
  ativa: boolean; onClick: () => void; rotulo: string; sub: string; destaque?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "rounded-t-lg border-b-2 px-4 py-2 text-left transition",
        ativa ? "border-brand-600 bg-white" : "border-transparent bg-stone-100 hover:bg-stone-50",
      )}>
      <span className={cn("block text-sm font-semibold", ativa ? "text-stone-900" : "text-stone-600")}>
        {rotulo}
        {destaque && (
          <span className="ml-1.5 rounded bg-brand-100 px-1 text-[10px] font-bold text-brand-800">
            é este que manda
          </span>
        )}
      </span>
      <span className="block font-mono text-[10px] text-stone-500">{sub}</span>
    </button>
  );
}

function ExtracaoPainel({ extracao }: { extracao: Extracao }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-white">
        <header className="flex items-center justify-between border-b border-stone-200 px-4 py-2.5">
          <h3 className="font-display text-sm font-bold text-stone-900">
            Instruções de extração — <span className="font-mono text-xs">{extracao.schema_name}</span>
          </h3>
          <CopiarBotao texto={extracao.prompt} />
        </header>
        <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-relaxed text-stone-800">
          {extracao.prompt}
        </pre>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <h3 className="font-display text-sm font-bold text-amber-900">
          Onde o LLM escreve texto livre ({extracao.campos_de_texto.length} campos)
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
          Campos do schema em que o LLM redige em vez de classificar. Parte deles entra
          <strong> literalmente </strong>no laudo — é por isso que nenhuma categoria de renderer é
          100&nbsp;% código.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {extracao.campos_de_texto.map((c) => (
            <code key={c} className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[11px] text-amber-900">
              {c}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

function WriterPainel({
  camadas, total, promptFinal, promptVersion, contractHash, aberta, setAberta,
}: {
  camadas: Camada[]; total: number; promptFinal: string;
  promptVersion?: string; contractHash?: string;
  aberta: string | null; setAberta: (v: string | null) => void;
}) {
  const [verBruto, setVerBruto] = useState(false);
  if (camadas.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* proporção de cada camada no prompt final */}
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-stone-900">Composição do prompt</h3>
          <div className="flex items-center gap-3 font-mono text-[11px] text-stone-500">
            {promptVersion && <span>{promptVersion}</span>}
            {contractHash && <span title="contract_hash">{contractHash.slice(0, 12)}</span>}
            <span>{total.toLocaleString("pt-BR")} ch</span>
            <button type="button" onClick={() => setVerBruto((v) => !v)}
              className="underline-offset-2 hover:text-stone-900 hover:underline">
              {verBruto ? "ver camadas" : "ver texto corrido"}
            </button>
          </div>
        </div>

        <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
          {camadas.map((c) => (
            <div key={c.id} title={`${c.titulo} — ${((100 * c.texto.length) / total).toFixed(1)}%`}
              style={{ width: `${(100 * c.texto.length) / total}%` }}
              className={cn(corDe(c.id).barra, "transition-opacity hover:opacity-80")} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {camadas.map((c) => (
            <button key={c.id} type="button" onClick={() => { setVerBruto(false); setAberta(c.id); }}
              className="flex items-center gap-1.5 text-[11px] text-stone-600 hover:text-stone-900">
              <span className={cn("h-2 w-2 rounded-full", corDe(c.id).ponto)} />
              {c.titulo} <span className="text-stone-400">{((100 * c.texto.length) / total).toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </div>

      {verBruto ? (
        <div className="rounded-lg border border-stone-200 bg-white">
          <header className="flex items-center justify-between border-b border-stone-200 px-4 py-2.5">
            <h3 className="font-display text-sm font-bold text-stone-900">Prompt final, como a IA recebe</h3>
            <CopiarBotao texto={promptFinal} />
          </header>
          <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-relaxed text-stone-800">
            {promptFinal}
          </pre>
        </div>
      ) : (
        <ul className="space-y-2">
          {camadas.map((c) => {
            const cor = corDe(c.id);
            const aberto = aberta === c.id;
            return (
              <li key={c.id} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                <button type="button" onClick={() => setAberta(aberto ? null : c.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-stone-50">
                  <span className={cn("h-6 w-1 shrink-0 rounded-full", cor.barra)} />
                  <span className="font-mono text-[11px] text-stone-400">{String(c.ordem).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-900">{c.titulo}</span>
                    <span className="block font-mono text-[10px] text-stone-500">{c.origem}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-stone-500">
                    {c.texto.length.toLocaleString("pt-BR")} ch · {((100 * c.texto.length) / total).toFixed(1)}%
                  </span>
                  <span className="shrink-0 text-stone-400">{aberto ? "−" : "+"}</span>
                </button>
                {aberto && (
                  <div className={cn("border-t border-stone-200", cor.fundo)}>
                    <div className="flex justify-end px-3 pt-2"><CopiarBotao texto={c.texto} /></div>
                    <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap px-4 pb-3 font-mono text-[12px] leading-relaxed text-stone-800">
                      {c.texto}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CopiarBotao({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      className="rounded border border-stone-300 px-2 py-0.5 text-[11px] text-stone-600 transition hover:bg-stone-50">
      {ok ? "copiado" : "copiar"}
    </button>
  );
}
