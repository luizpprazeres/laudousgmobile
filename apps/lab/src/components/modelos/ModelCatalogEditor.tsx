"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Prévia da Biblioteca (projeto docs/projeto-modelos/).
 *
 * Mostra o modelo de laudo slot a slot, deixa reescrever as frases editáveis e
 * exibe o efeito lado a lado nos cenários de exemplo — inclusive nos
 * patológicos, onde a personalização deliberadamente NÃO se aplica.
 *
 * NADA é persistido: é uma bancada para avaliar a ergonomia da personalização
 * antes de construir as tabelas e os endpoints de publicação.
 */

type VariantDescription = {
  id: string;
  frase?: string;
  padrao: boolean;
  editavel: boolean;
  motivo?: string;
};
type SlotDescription = {
  id: string;
  obrigatorio: boolean;
  placeholdersObrigatorios: string[];
  condicional: boolean;
  variantes: VariantDescription[];
};
type CatalogDescription = {
  id: string;
  categoria: string;
  estilo: string;
  versao: number;
  variaveis: string[];
  cabecalhos: { tecnica?: string; corpo: string; conclusao: string };
  slots: SlotDescription[];
  ordens: { nome: string; slots: string[] }[];
};
type Cenario = {
  id: string;
  nome: string;
  descricao: string;
  patologico: boolean;
  laudo_padrao: string;
};
type Previa = {
  cenario: string;
  nome: string;
  patologico: boolean;
  mudou: boolean;
  laudo_padrao: string;
  laudo_personalizado: string;
};
type Operation =
  | { op: "remove_slot"; slot: string }
  | { op: "replace_phrase"; slot: string; variant?: string; value: string }
  | { op: "append_conclusion_item"; value: string };

const CATEGORIA = "OBSTETRICA";

export function ModelCatalogEditor() {
  const [catalogo, setCatalogo] = useState<CatalogDescription | null>(null);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  // Personalização em memória: slotId → frase reescrita.
  const [frases, setFrases] = useState<Record<string, string>>({});
  const [removidos, setRemovidos] = useState<Set<string>>(new Set());
  const [itemConclusao, setItemConclusao] = useState("");

  const [previas, setPrevias] = useState<Previa[]>([]);
  const [errosValidacao, setErros] = useState<string[]>([]);
  const [cenarioAtivo, setCenarioAtivo] = useState<string>("padrao");
  const [avaliando, setAvaliando] = useState(false);

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
    return () => {
      vivo = false;
    };
  }, []);

  const operations = useMemo<Operation[]>(() => {
    const ops: Operation[] = [];
    for (const slot of removidos) ops.push({ op: "remove_slot", slot });
    for (const [slot, value] of Object.entries(frases)) ops.push({ op: "replace_phrase", slot, value });
    if (itemConclusao.trim()) ops.push({ op: "append_conclusion_item", value: itemConclusao.trim() });
    return ops;
  }, [frases, removidos, itemConclusao]);

  const avaliar = useCallback(async (ops: Operation[]) => {
    setAvaliando(true);
    try {
      const r = await fetch(`/api/model-catalog/${CATEGORIA}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: ops }),
      });
      const j = await r.json();
      setErros(j.erros ?? []);
      setPrevias(j.previas ?? []);
    } catch {
      setErros(["falha ao avaliar a prévia"]);
    } finally {
      setAvaliando(false);
    }
  }, []);

  // Debounce: avalia enquanto o médico digita, sem afogar o backend.
  useEffect(() => {
    if (!catalogo) return;
    const t = setTimeout(() => void avaliar(operations), 400);
    return () => clearTimeout(t);
  }, [operations, catalogo, avaliar]);

  const slotsPorId = useMemo(
    () => new Map((catalogo?.slots ?? []).map((s) => [s.id, s])),
    [catalogo],
  );

  const restaurar = () => {
    setFrases({});
    setRemovidos(new Set());
    setItemConclusao("");
  };

  const previaAtiva = previas.find((p) => p.cenario === cenarioAtivo);
  const cenarioBase = cenarios.find((c) => c.id === cenarioAtivo);
  const totalOps = operations.length;

  if (carregando) return <p className="text-sm text-stone-500">Carregando o modelo…</p>;
  if (erroCarga)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Não foi possível carregar o catálogo: {erroCarga}
      </div>
    );
  if (!catalogo) return null;

  return (
    <div className="space-y-6">
      {/* barra de estado */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm">
        <span className="font-mono text-[11px] uppercase tracking-widest text-brand-700">
          {catalogo.categoria} · {catalogo.estilo} · v{catalogo.versao}
        </span>
        <span className="text-stone-400">|</span>
        <span className="text-stone-600">
          {totalOps === 0 ? "Sem alterações" : `${totalOps} alteraç${totalOps === 1 ? "ão" : "ões"}`}
        </span>
        {avaliando && <span className="text-stone-400">avaliando…</span>}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={restaurar}
            disabled={totalOps === 0}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40"
          >
            Restaurar o modelo padrão
          </button>
          <span
            title="A publicação entra no próximo passo do projeto"
            className="rounded-md bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-500"
          >
            Publicar (em breve)
          </span>
        </div>
      </div>

      {errosValidacao.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Estas alterações não podem ser publicadas:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {errosValidacao.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* ------------------------------------------------ modelo, slot a slot */}
        <section className="space-y-5">
          {catalogo.ordens.map((ordem) => (
            <div key={ordem.nome} className="rounded-lg border border-stone-200 bg-white">
              <header className="border-b border-stone-200 px-4 py-2.5">
                <h3 className="font-display text-sm font-bold text-stone-900">{ordem.nome}</h3>
              </header>
              <ul className="divide-y divide-stone-100">
                {ordem.slots.map((slotId, i) => {
                  const slot = slotsPorId.get(slotId);
                  if (!slot) return null;
                  return (
                    <SlotRow
                      key={`${ordem.nome}-${slotId}-${i}`}
                      slot={slot}
                      valor={frases[slot.id]}
                      removido={removidos.has(slot.id)}
                      onFrase={(v) =>
                        setFrases((p) => {
                          const n = { ...p };
                          if (v === undefined) delete n[slot.id];
                          else n[slot.id] = v;
                          return n;
                        })
                      }
                      onRemover={(rem) =>
                        setRemovidos((p) => {
                          const n = new Set(p);
                          if (rem) n.add(slot.id);
                          else n.delete(slot.id);
                          return n;
                        })
                      }
                    />
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <label className="block text-sm font-semibold text-stone-900" htmlFor="item-conclusao">
              Item fixo na conclusão
            </label>
            <p className="mt-1 text-xs text-stone-500">
              Acrescentado ao final da conclusão em todos os laudos desta categoria.
            </p>
            <input
              id="item-conclusao"
              value={itemConclusao}
              onChange={(e) => setItemConclusao(e.target.value)}
              placeholder="Ex.: Recomenda-se controle ecográfico em 4 semanas."
              className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <p className="text-xs leading-relaxed text-stone-500">
            Prefira alterações pontuais e preserve a estrutura do modelo. Campos entre chaves,
            como <code className="rounded bg-stone-100 px-1">{"{dbp}"}</code>, são os dados do
            exame — se você removê-los, a medida some do laudo, e por isso a alteração é recusada.
            Teste nos cenários ao lado antes de publicar.
          </p>
        </section>

        {/* ------------------------------------------------------------- prévia */}
        <section className="space-y-3 xl:sticky xl:top-6 xl:self-start">
          <div className="flex flex-wrap gap-1.5">
            {cenarios.map((c) => {
              const p = previas.find((x) => x.cenario === c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCenarioAtivo(c.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                    cenarioAtivo === c.id
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
                  )}
                >
                  {c.nome}
                  {c.patologico && <span className="ml-1 opacity-70">⚠</span>}
                  {p?.mudou && <span className="ml-1 opacity-70">•</span>}
                </button>
              );
            })}
          </div>

          {cenarioBase && (
            <p className="text-xs text-stone-500">{cenarioBase.descricao}</p>
          )}

          {cenarioBase?.patologico && totalOps > 0 && !previaAtiva?.mudou && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              Neste cenário o laudo <strong>não muda</strong>: o achado alterado é escrito pelo
              sistema, para que uma personalização de normalidade não oculte a patologia.
            </div>
          )}

          <div className="grid gap-3 2xl:grid-cols-2">
            <LaudoBox titulo="Modelo padrão" texto={previaAtiva?.laudo_padrao ?? cenarioBase?.laudo_padrao ?? ""} />
            <LaudoBox
              titulo="Com a sua personalização"
              texto={previaAtiva?.laudo_personalizado ?? cenarioBase?.laudo_padrao ?? ""}
              destaque={previaAtiva?.mudou}
              base={previaAtiva?.laudo_padrao}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  valor,
  removido,
  onFrase,
  onRemover,
}: {
  slot: SlotDescription;
  valor: string | undefined;
  removido: boolean;
  onFrase: (v: string | undefined) => void;
  onRemover: (rem: boolean) => void;
}) {
  const padrao = slot.variantes.find((v) => v.padrao) ?? slot.variantes[0];
  const naoEditaveis = slot.variantes.filter((v) => !v.editavel);
  const editavel = Boolean(padrao?.editavel);
  const [aberto, setAberto] = useState(false);

  return (
    <li className={cn("px-4 py-3", removido && "bg-stone-50")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <code className="font-mono text-[11px] text-stone-500">{slot.id}</code>
            {slot.obrigatorio && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                obrigatório
              </span>
            )}
            {slot.condicional && (
              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                condicional
              </span>
            )}
            {!editavel && (
              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                escrito pelo sistema
              </span>
            )}
          </div>

          {removido ? (
            <p className="mt-1 text-sm italic text-stone-400 line-through">{padrao?.frase}</p>
          ) : editavel ? (
            <textarea
              value={valor ?? padrao?.frase ?? ""}
              onChange={(e) => onFrase(e.target.value === padrao?.frase ? undefined : e.target.value)}
              onFocus={() => setAberto(true)}
              rows={Math.min(4, Math.ceil(((valor ?? padrao?.frase ?? "").length || 1) / 70))}
              className={cn(
                "mt-1 w-full resize-y rounded-md border px-2.5 py-1.5 font-mono text-[13px] leading-relaxed outline-none transition",
                valor !== undefined
                  ? "border-brand-400 bg-brand-50/40 focus:ring-2 focus:ring-brand-100"
                  : "border-stone-200 bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
              )}
            />
          ) : (
            <p className="mt-1 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-stone-500">
              {padrao?.frase ?? "(montado a partir dos dados do exame)"}
            </p>
          )}

          {aberto && slot.placeholdersObrigatorios.length > 0 && (
            <p className="mt-1 text-[11px] text-stone-500">
              Precisa conservar:{" "}
              {slot.placeholdersObrigatorios.map((p) => (
                <code key={p} className="mr-1 rounded bg-stone-100 px-1">{`{${p}}`}</code>
              ))}
            </p>
          )}

          {naoEditaveis.length > 0 && naoEditaveis[0]?.motivo && (
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              {naoEditaveis.length === slot.variantes.length ? "" : "Este trecho tem outra redação quando há achado alterado. "}
              {naoEditaveis[0].motivo}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {valor !== undefined && (
            <button
              type="button"
              onClick={() => onFrase(undefined)}
              className="text-[11px] font-medium text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              desfazer
            </button>
          )}
          {!slot.obrigatorio && (
            <button
              type="button"
              onClick={() => onRemover(!removido)}
              className="text-[11px] font-medium text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              {removido ? "restaurar" : "remover"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function LaudoBox({
  titulo,
  texto,
  destaque,
  base,
}: {
  titulo: string;
  texto: string;
  destaque?: boolean;
  base?: string;
}) {
  const linhasBase = useMemo(() => new Set((base ?? "").split("\n")), [base]);
  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <header className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
        <h4 className="font-display text-xs font-bold text-stone-900">{titulo}</h4>
        {destaque && (
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">
            alterado
          </span>
        )}
      </header>
      <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap px-3 py-2.5 font-mono text-[12px] leading-relaxed text-stone-800">
        {base
          ? texto.split("\n").map((l, i) => (
              <span
                key={i}
                className={cn(!linhasBase.has(l) && l.trim() !== "" && "bg-brand-100/70")}
              >
                {l}
                {"\n"}
              </span>
            ))
          : texto}
      </pre>
    </div>
  );
}
