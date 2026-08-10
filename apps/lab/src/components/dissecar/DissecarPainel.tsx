"use client";

import { useMemo, useState } from "react";
import {
  modoDe,
  procedenciaDoLaudo,
  procedenciaDisponivel,
  rotuloNaoAtribuido,
  type Origem,
} from "@/lib/procedencia";
import { cn } from "@/lib/utils";

/**
 * De onde veio cada trecho do laudo.
 *
 * A atribuição é por CORRESPONDÊNCIA LITERAL com os campos que o LLM preencheu
 * — não por semelhança de palavras, como fazia o reviewer antigo. O que não
 * casa com campo nenhum fica sem cor, e o rótulo desse trecho muda conforme o
 * caminho: no renderer é template escrito em código; no writer é redação livre
 * do LLM. Ver lib/procedencia/index.ts.
 */

type Props = {
  laudo: string;
  structuredOutput: unknown;
  modelWriter: string | null;
};

const CORES: Record<Origem, { fundo: string; ponto: string; nome: string }> = {
  codigo: { fundo: "", ponto: "bg-stone-300", nome: "" },
  llm_texto: { fundo: "bg-amber-100", ponto: "bg-amber-400", nome: "o LLM redigiu" },
  llm_dado: { fundo: "bg-sky-100", ponto: "bg-sky-400", nome: "o LLM mediu ou classificou" },
};

export function DissecarPainel({ laudo, structuredOutput, modelWriter }: Props) {
  const [campoEmFoco, setCampoEmFoco] = useState<string | null>(null);
  const temStructured =
    structuredOutput !== null &&
    structuredOutput !== undefined &&
    Object.keys(structuredOutput as object).length > 0;

  const disponivel = procedenciaDisponivel(modelWriter, temStructured);
  const modo = modoDe(modelWriter);
  const naoAtribuido = rotuloNaoAtribuido(modo);

  const { trechos, resumo } = useMemo(
    () => (disponivel ? procedenciaDoLaudo(laudo, structuredOutput) : { trechos: [], resumo: null }),
    [laudo, structuredOutput, disponivel],
  );

  if (!disponivel) {
    return (
      <div className="rounded-lg border border-stone-300 bg-stone-50 p-4">
        <p className="text-sm font-semibold text-stone-800">
          Não dá para dizer de onde veio cada trecho deste laudo.
        </p>
        <p className="mt-1 text-sm text-stone-600">
          A atribuição depende dos campos que o LLM preencheu, e esta geração não os
          guardou. O backend só passou a registrar a extração do renderer em 10/08 —
          laudos anteriores a isso não têm o dado, e sem ele qualquer cor seria chute.
        </p>
      </div>
    );
  }

  const total = resumo!.codigo + resumo!.llm_texto + resumo!.llm_dado;
  const pct = (n: number) => (total === 0 ? 0 : (100 * n) / total);

  return (
    <div className="space-y-3">
      {/* proporção */}
      <div className="rounded-lg border border-stone-200 bg-white p-3">
        <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
          <div style={{ width: `${pct(resumo!.codigo)}%` }} className="bg-stone-300" title={naoAtribuido.curto} />
          <div style={{ width: `${pct(resumo!.llm_texto)}%` }} className="bg-amber-400" title="o LLM redigiu" />
          <div style={{ width: `${pct(resumo!.llm_dado)}%` }} className="bg-sky-400" title="o LLM mediu ou classificou" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-stone-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-stone-300" />
            {naoAtribuido.curto} <strong>{pct(resumo!.codigo).toFixed(1)}%</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            o LLM redigiu <strong>{pct(resumo!.llm_texto).toFixed(1)}%</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            o LLM mediu ou classificou <strong>{pct(resumo!.llm_dado).toFixed(1)}%</strong>
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          {naoAtribuido.ajuda} A atribuição é por correspondência exata com os campos
          extraídos — na dúvida, o trecho fica sem cor.
        </p>
      </div>

      {/* laudo colorido */}
      <div className="rounded-lg border border-stone-200 bg-white">
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-relaxed text-stone-800">
          {trechos.map((t, i) => {
            if (t.origem === "codigo") return <span key={i}>{t.texto}</span>;
            const c = CORES[t.origem];
            const emFoco = campoEmFoco !== null && campoEmFoco === t.campo;
            return (
              <span
                key={i}
                title={`${c.nome} — campo ${t.campo}`}
                onMouseEnter={() => setCampoEmFoco(t.campo ?? null)}
                onMouseLeave={() => setCampoEmFoco(null)}
                className={cn(
                  "cursor-help rounded-sm",
                  c.fundo,
                  emFoco && "outline outline-1 outline-offset-1 outline-stone-500",
                )}
              >
                {t.texto}
              </span>
            );
          })}
        </pre>
      </div>

      {campoEmFoco && (
        <p className="font-mono text-[11px] text-stone-600">
          campo: <span className="rounded bg-stone-100 px-1">{campoEmFoco}</span>
        </p>
      )}
    </div>
  );
}
