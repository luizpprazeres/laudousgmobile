"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Biblioteca de modelos — projeto docs/projeto-modelos/.
 *
 * Duas decisões de desenho, ambas vindas do uso real:
 *
 *  1. O modelo é lido como LAUDO, não como formulário. Cada frase é editável no
 *     lugar, sem caixa nem rótulo técnico; os controles só aparecem no hover, e
 *     uma barra fina na margem marca obrigatória / escrita pelo sistema.
 *
 *  2. A coluna da direita mostra o QUE MUDOU, não dois laudos inteiros: a frase
 *     original riscada, a nova embaixo, e os itens acrescentados à conclusão.
 *     O diff vem do backend por slot (não textual), então é exato.
 *
 * NADA é persistido ainda.
 */

type VariantDescription = { id: string; frase?: string; padrao: boolean; editavel: boolean; motivo?: string };
type SlotDescription = {
  id: string;
  obrigatorio: boolean;
  placeholdersObrigatorios: string[];
  condicional: boolean;
  variantes: VariantDescription[];
};
type CatalogDescription = {
  id: string; categoria: string; estilo: string; versao: number;
  variaveis: string[];
  cabecalhos: { tecnica?: string; corpo: string; conclusao: string };
  preambulo?: string;
  slots: SlotDescription[];
  ordens: { nome: string; slots: string[] }[];
};
type Cenario = {
  id: string; nome: string; descricao: string; patologico: boolean;
  compara_com: string | null;
  compara_com_nome: string | null;
  /** O que ESTE ACHADO muda no modelo padrão, sem personalização nenhuma. */
  efeito_do_achado: Mudanca[];
  laudo_padrao: string;
};
type Mudanca = {
  secao: "corpo" | "conclusao";
  tipo: "alterada" | "removida" | "acrescentada";
  slot: string; instance?: string; antes?: string; depois?: string;
};
type Previa = {
  cenario: string; nome: string; patologico: boolean; mudou: boolean;
  mudancas: Mudanca[]; laudo_padrao: string; laudo_personalizado: string;
};
type Operation =
  | { op: "remove_slot"; slot: string }
  | { op: "replace_phrase"; slot: string; variant?: string; value: string }
  | { op: "append_conclusion_item"; value: string }
  | { op: "insert_phrase_after"; anchor: string; value: string };

const CATEGORIA = "OBSTETRICA";

export function ModelCatalogEditor() {
  const [catalogo, setCatalogo] = useState<CatalogDescription | null>(null);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const [frases, setFrases] = useState<Record<string, string>>({});
  const [removidos, setRemovidos] = useState<Set<string>>(new Set());
  const [inseridas, setInseridas] = useState<{ anchor: string; value: string }[]>([]);
  const [itemConclusao, setItemConclusao] = useState("");

  const [previas, setPrevias] = useState<Previa[]>([]);
  const [errosValidacao, setErros] = useState<string[]>([]);
  const [cenarioAtivo, setCenarioAtivo] = useState("padrao");
  const [avaliando, setAvaliando] = useState(false);
  const [verLaudoInteiro, setVerLaudoInteiro] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`/api/model-catalog/${CATEGORIA}`, { cache: "no-store" });
        const j = await r.json();
        if (!vivo) return;
        if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
        setCatalogo(j.catalogo);
        setCenarios(j.cenarios);
        setCenarioAtivo(j.cenarios[0]?.id ?? "padrao");
      } catch (e) {
        if (vivo) setErroCarga(e instanceof Error ? e.message : "falha ao carregar");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const operations = useMemo<Operation[]>(() => {
    const ops: Operation[] = [];
    for (const slot of removidos) ops.push({ op: "remove_slot", slot });
    for (const [slot, value] of Object.entries(frases)) ops.push({ op: "replace_phrase", slot, value });
    for (const i of inseridas) if (i.value.trim()) ops.push({ op: "insert_phrase_after", anchor: i.anchor, value: i.value });
    if (itemConclusao.trim()) ops.push({ op: "append_conclusion_item", value: itemConclusao.trim() });
    return ops;
  }, [frases, removidos, inseridas, itemConclusao]);

  const avaliar = useCallback(async (ops: Operation[]) => {
    setAvaliando(true);
    try {
      const r = await fetch(`/api/model-catalog/${CATEGORIA}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: ops }),
      });
      const j = await r.json();
      setErros(j.erros ?? []);
      setPrevias(j.previas ?? []);
    } catch {
      setErros(["falha ao avaliar a prévia"]);
    } finally { setAvaliando(false); }
  }, []);

  useEffect(() => {
    if (!catalogo) return;
    const t = setTimeout(() => void avaliar(operations), 400);
    return () => clearTimeout(t);
  }, [operations, catalogo, avaliar]);

  const slotsPorId = useMemo(() => new Map((catalogo?.slots ?? []).map((s) => [s.id, s])), [catalogo]);

  const restaurar = () => {
    setFrases({}); setRemovidos(new Set()); setInseridas([]); setItemConclusao("");
  };

  const previaAtiva = previas.find((p) => p.cenario === cenarioAtivo);
  const cenarioBase = cenarios.find((c) => c.id === cenarioAtivo);
  const totalOps = operations.length;

  if (carregando) return <p className="text-sm text-stone-500">Carregando o modelo…</p>;
  if (erroCarga)
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Não foi possível carregar: {erroCarga}</div>;
  if (!catalogo) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm">
        <span className="font-mono text-[11px] uppercase tracking-widest text-brand-700">
          {catalogo.categoria} · clássico · v{catalogo.versao}
        </span>
        <span className="text-stone-300">|</span>
        <span className={cn("text-stone-600", totalOps > 0 && "font-medium text-brand-800")}>
          {totalOps === 0 ? "Sem alterações" : `${totalOps} alteraç${totalOps === 1 ? "ão" : "ões"}`}
        </span>
        {avaliando && <span className="text-xs text-stone-400">avaliando…</span>}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={restaurar} disabled={totalOps === 0}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40">
            Restaurar padrão
          </button>
          <span title="A publicação entra no próximo passo" className="rounded-md bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500">
            Publicar (em breve)
          </span>
        </div>
      </div>

      {errosValidacao.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5">
          <p className="text-sm font-semibold text-amber-900">Estas alterações não podem ser publicadas:</p>
          <ul className="mt-1.5 space-y-0.5 text-sm text-amber-900">
            {errosValidacao.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* ------------------------------------------------- o laudo, como laudo */}
        <section className="rounded-lg border border-stone-200 bg-white">
          {catalogo.ordens.map((ordem, oi) => (
            <div key={ordem.nome} className={cn(oi > 0 && "border-t-8 border-stone-100")}>
              <header className="border-b border-stone-200 bg-stone-50/70 px-5 py-2">
                <h3 className="font-display text-xs font-bold uppercase tracking-wide text-stone-700">{ordem.nome}</h3>
              </header>

              <div className="px-5 py-4 font-mono text-[13px] leading-[1.75] text-stone-800">
                <p className="mb-3 select-none font-semibold text-stone-900">
                  {catalogo.categoria === "OBSTETRICA" && ordem.nome === "Gemelar"
                    ? "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR"
                    : "ULTRASSONOGRAFIA OBSTÉTRICA"}
                </p>
                {catalogo.preambulo && (
                  <p className="mb-3 whitespace-pre-wrap select-none text-stone-400">{catalogo.preambulo}</p>
                )}
                <p className="mb-1 select-none font-semibold text-stone-900">{catalogo.cabecalhos.corpo}</p>

                {ordem.slots.map((slotId, i) => {
                  const slot = slotsPorId.get(slotId);
                  if (!slot) return null;
                  return (
                    <LinhaDoLaudo
                      key={`${ordem.nome}-${slotId}-${i}`}
                      slot={slot}
                      valor={frases[slot.id]}
                      removido={removidos.has(slot.id)}
                      variaveis={catalogo.variaveis}
                      inseridaAqui={inseridas.filter((x) => x.anchor === slot.id)}
                      onFrase={(v) => setFrases((p) => {
                        const n = { ...p };
                        if (v === undefined) delete n[slot.id]; else n[slot.id] = v;
                        return n;
                      })}
                      onRemover={(rem) => setRemovidos((p) => {
                        const n = new Set(p);
                        if (rem) n.add(slot.id); else n.delete(slot.id);
                        return n;
                      })}
                      onInserir={() => setInseridas((p) => [...p, { anchor: slot.id, value: "" }])}
                      onEditarInserida={(idx, v) => setInseridas((p) => {
                        const alvo = p.filter((x) => x.anchor === slot.id)[idx];
                        return p.map((x) => (x === alvo ? { ...x, value: v } : x));
                      })}
                      onRemoverInserida={(idx) => setInseridas((p) => {
                        const alvo = p.filter((x) => x.anchor === slot.id)[idx];
                        return p.filter((x) => x !== alvo);
                      })}
                    />
                  );
                })}

                <p className="mb-1 mt-3 select-none font-semibold text-stone-900">{catalogo.cabecalhos.conclusao}</p>
                <p className="select-none text-stone-400">
                  Os itens da conclusão são montados a partir dos achados do exame.
                </p>
                <div className="mt-1.5">
                  <input
                    value={itemConclusao}
                    onChange={(e) => setItemConclusao(e.target.value)}
                    placeholder="+ item fixo na conclusão de todos os laudos"
                    className="w-full rounded border border-dashed border-stone-300 bg-transparent px-2 py-1 font-mono text-[13px] outline-none transition placeholder:text-stone-400 focus:border-solid focus:border-brand-400 focus:bg-brand-50/30"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* --------------------------------------------------- só o que mudou */}
        <section className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <div className="flex flex-wrap gap-1.5">
            {cenarios.map((c) => {
              const p = previas.find((x) => x.cenario === c.id);
              return (
                <button key={c.id} type="button" onClick={() => setCenarioAtivo(c.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                    cenarioAtivo === c.id
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
                  )}>
                  {c.nome}
                  {c.patologico && <span className="ml-1 opacity-70">⚠</span>}
                  {p && p.mudancas.length > 0 && (
                    <span className={cn("ml-1.5 rounded px-1 text-[10px]", cenarioAtivo === c.id ? "bg-white/25" : "bg-brand-100 text-brand-800")}
                      title="mudanças da sua personalização">
                      {p.mudancas.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 1. o que o ACHADO faz com o modelo padrão */}
          {cenarioBase && cenarioBase.efeito_do_achado.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white">
              <header className="border-b border-stone-200 px-4 py-2.5">
                <h4 className="font-display text-sm font-bold text-stone-900">
                  O que este achado muda no modelo
                </h4>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  {cenarioBase.descricao} Comparado com “{cenarioBase.compara_com_nome}”.
                </p>
              </header>
              <div className="p-4">
                <ListaDeMudancas mudancas={cenarioBase.efeito_do_achado} />
              </div>
            </div>
          )}

          {/* 2. o que a PERSONALIZAÇÃO faz, neste mesmo exame */}
          <div className="rounded-lg border border-stone-200 bg-white">
            <header className="flex items-center justify-between border-b border-stone-200 px-4 py-2.5">
              <h4 className="font-display text-sm font-bold text-stone-900">
                O que a sua personalização muda
              </h4>
              {previaAtiva && previaAtiva.mudancas.length > 0 && (
                <button type="button" onClick={() => setVerLaudoInteiro((v) => !v)}
                  className="text-[11px] font-medium text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline">
                  {verLaudoInteiro ? "ver só as mudanças" : "ver o laudo inteiro"}
                </button>
              )}
            </header>

            <div className="p-4">
              {cenarioBase && cenarioBase.efeito_do_achado.length === 0 && (
                <p className="mb-3 text-xs text-stone-500">{cenarioBase.descricao}</p>
              )}

              {totalOps === 0 ? (
                <p className="text-sm text-stone-500">
                  Edite uma frase ao lado para ver aqui, no ponto exato, o que muda no laudo.
                </p>
              ) : !previaAtiva || previaAtiva.mudancas.length === 0 ? (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                  <strong>Neste exame o laudo não muda.</strong>
                  {cenarioBase?.patologico
                    ? " O achado alterado é escrito pelo sistema, para que uma personalização de normalidade não oculte a patologia."
                    : " As frases que você alterou não aparecem neste cenário."}
                </div>
              ) : verLaudoInteiro ? (
                <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-stone-800">
                  {previaAtiva.laudo_personalizado}
                </pre>
              ) : (
                <ListaDeMudancas mudancas={previaAtiva.mudancas} />
              )}
            </div>
          </div>

          <p className="px-1 text-[11px] leading-relaxed text-stone-500">
            Campos entre chaves — <code className="rounded bg-stone-100 px-1">{"{dbp}"}</code> — são os
            dados do exame. Se você removê-los, a medida some do laudo; por isso a alteração é recusada.
          </p>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const SECAO_LABEL: Record<Mudanca["secao"], string> = { corpo: "No corpo do laudo", conclusao: "Na conclusão" };

function ListaDeMudancas({ mudancas }: { mudancas: Mudanca[] }) {
  const porSecao = (["corpo", "conclusao"] as const)
    .map((secao) => ({ secao, itens: mudancas.filter((m) => m.secao === secao) }))
    .filter((g) => g.itens.length > 0);

  return (
    <div className="space-y-4">
      {porSecao.map(({ secao, itens }) => (
        <div key={secao}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-stone-500">
            {SECAO_LABEL[secao]}
          </p>
          <ul className="space-y-2.5">
            {itens.map((m, i) => (
              <li key={`${m.slot}-${m.instance ?? ""}-${i}`} className="font-mono text-[12px] leading-relaxed">
                {m.instance && (
                  <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-stone-400">feto {m.instance}</span>
                )}
                {m.antes && (
                  <p className="rounded bg-red-50 px-1.5 py-0.5 text-red-900/60 line-through decoration-red-400">
                    <span className="mr-1 select-none text-red-500 no-underline">−</span>
                    {m.antes.trim()}
                  </p>
                )}
                {m.depois && (
                  <p className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-900">
                    <span className="mr-1 select-none text-emerald-600">+</span>
                    {m.depois.trim()}
                  </p>
                )}
                {m.tipo === "removida" && (
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-red-500">linha removida</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function LinhaDoLaudo({
  slot, valor, removido, variaveis, inseridaAqui,
  onFrase, onRemover, onInserir, onEditarInserida, onRemoverInserida,
}: {
  slot: SlotDescription;
  valor: string | undefined;
  removido: boolean;
  variaveis: string[];
  inseridaAqui: { anchor: string; value: string }[];
  onFrase: (v: string | undefined) => void;
  onRemover: (rem: boolean) => void;
  onInserir: () => void;
  onEditarInserida: (idx: number, v: string) => void;
  onRemoverInserida: (idx: number) => void;
}) {
  const padrao = slot.variantes.find((v) => v.padrao) ?? slot.variantes[0];
  const alterada = slot.variantes.find((v) => !v.editavel && !v.padrao);
  const editavel = Boolean(padrao?.editavel);
  const [focado, setFocado] = useState(false);

  // A frase do catálogo pode começar com \n (separador de parágrafo). Isso é
  // formatação, não texto — o médico não deve ver nem apagar sem querer.
  const bruta = padrao?.frase ?? "";
  const prefixo = bruta.match(/^\n+/)?.[0] ?? "";
  const exibida = (valor ?? bruta).slice(prefixo.length);

  const setTexto = (t: string) => {
    const completo = prefixo + t;
    onFrase(completo === bruta ? undefined : completo);
  };

  const tocada = valor !== undefined;
  const modificada = tocada || removido;

  return (
    <>
      {prefixo && <div className="h-3" />}
      <div
        className={cn(
          "group relative -mx-2 rounded px-2 transition",
          !removido && "hover:bg-stone-50",
          removido && "opacity-45",
        )}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
      >
        {/* barra de margem: vermelha = obrigatória, cinza = do sistema, azul = alterada */}
        <span
          aria-hidden
          className={cn(
            "absolute -left-1 top-1 bottom-1 w-[3px] rounded-full transition",
            modificada ? "bg-brand-500"
              : slot.obrigatorio ? "bg-red-300"
              : !editavel ? "bg-stone-300"
              : "bg-transparent group-hover:bg-stone-200",
          )}
          title={
            modificada ? "alterada por você"
              : slot.obrigatorio ? "obrigatória — não pode ser removida"
              : !editavel ? "escrita pelo sistema"
              : undefined
          }
        />

        {removido ? (
          <p className="line-through decoration-stone-400">{exibida}</p>
        ) : editavel ? (
          <TextareaFluido value={exibida} onChange={setTexto} />
        ) : (
          <p className="text-stone-500">{exibida || "(montado a partir dos dados do exame)"}</p>
        )}

        {/* controles discretos, só no hover/foco */}
        <div className={cn(
          "absolute right-1 top-0.5 flex items-center gap-2 opacity-0 transition group-hover:opacity-100",
          focado && "opacity-100",
        )}>
          {tocada && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onFrase(undefined)}
              className="rounded bg-white/90 px-1 text-[10px] text-stone-500 hover:text-stone-900">desfazer</button>
          )}
          {!slot.obrigatorio && editavel && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onRemover(!removido)}
              className="rounded bg-white/90 px-1 text-[10px] text-stone-500 hover:text-stone-900">
              {removido ? "restaurar" : "remover"}
            </button>
          )}
          <button type="button" title="acrescentar uma frase depois desta"
            onMouseDown={(e) => e.preventDefault()} onClick={onInserir}
            className="rounded bg-white/90 px-1 text-[11px] leading-none text-stone-400 hover:text-brand-700">+</button>
        </div>

        {focado && editavel && slot.placeholdersObrigatorios.length > 0 && (
          <p className="pb-1 text-[10px] text-stone-500">
            precisa conservar{" "}
            {slot.placeholdersObrigatorios.map((p) => (
              <code key={p} className="mr-1 rounded bg-amber-100 px-1 text-amber-900">{`{${p}}`}</code>
            ))}
          </p>
        )}
        {focado && !editavel && alterada?.motivo && (
          <p className="pb-1 text-[10px] leading-relaxed text-stone-500">{alterada.motivo}</p>
        )}
        {focado && editavel && alterada?.motivo && (
          <p className="pb-1 text-[10px] leading-relaxed text-stone-500">
            Quando há achado alterado, esta linha tem outra redação. {alterada.motivo}
          </p>
        )}
      </div>

      {inseridaAqui.map((ins, idx) => (
        <div key={idx} className="group relative -mx-2 rounded bg-emerald-50/50 px-2">
          <span aria-hidden className="absolute -left-1 top-1 bottom-1 w-[3px] rounded-full bg-emerald-400" />
          <TextareaFluido
            value={ins.value}
            onChange={(v) => onEditarInserida(idx, v)}
            placeholder="nova frase…"
            autoFocus
          />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onRemoverInserida(idx)}
            className="absolute right-1 top-0.5 rounded bg-white/90 px-1 text-[10px] text-stone-500 opacity-0 transition hover:text-red-700 group-hover:opacity-100">
            descartar
          </button>
        </div>
      ))}
    </>
  );
}

/** Textarea que não parece textarea: sem borda, cresce com o conteúdo. */
function TextareaFluido({
  value, onChange, placeholder, autoFocus,
}: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-mono text-[13px] leading-[1.75] text-stone-800 outline-none placeholder:italic placeholder:text-stone-400 focus:ring-0"
    />
  );
}
