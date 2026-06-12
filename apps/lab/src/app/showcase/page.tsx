import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ShowcaseClient, type ShowcaseSampleRow } from "./ShowcaseClient";

export const dynamic = "force-dynamic";

/**
 * Showcase — demonstrativo visual de laudos por categoria (dados fictícios).
 * Uma amostra por categoria/variante, gerada pelo pipeline REAL de prod, em
 * grade de 1/2/4 colunas — para bater o olho e identificar categorias que
 * precisam de atenção ou ajuste.
 */
export default async function ShowcasePage() {
  const supa = createServerSupabaseClient();
  const { data, error } = await supa
    .from("category_showcase_samples")
    .select(
      "sample_key, category_code, variant_label, raw_input, laudo, model_writer, latency_ms, generated_at",
    )
    .order("category_code", { ascending: true })
    .order("sample_key", { ascending: true });

  const samples = (data ?? []) as ShowcaseSampleRow[];

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">
            demonstrativo por categoria
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-stone-900">
            Showcase de laudos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Uma amostra <span className="font-semibold">fictícia</span> por
            categoria/variante, gerada pelo pipeline real de produção. Use para
            identificar categorias que precisam de atenção — e regenerar uma
            amostra após qualquer ajuste de biblioteca.
          </p>
        </div>
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Erro ao carregar amostras: {error.message}
        </div>
      ) : (
        <ShowcaseClient samples={samples} />
      )}
    </div>
  );
}
