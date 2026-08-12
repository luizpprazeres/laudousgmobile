import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PromptExplorer } from "@/components/prompts/PromptExplorer";

export const dynamic = "force-dynamic";

/**
 * /prompts — o prompt que cada categoria usa, sem gerar laudo.
 *
 * As listas de categoria e estilo vêm do BANCO (fonte canônica), não de um
 * enum de código — a lista de categorias do backend e a dos apps divergem.
 */
export default async function PromptsPage() {
  const supabase = createServerSupabaseClient();

  const [{ data: categorias }, { data: estilos }] = await Promise.all([
    supabase.from("categories").select("code,label,active").order("code"),
    supabase.from("writing_styles").select("id,code,name,active").order("code"),
  ]);

  return (
    <section className="px-6 py-12 lg:px-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">prompts</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">
        O que a IA recebe
      </h1>
      <p className="mt-2 max-w-3xl text-base text-stone-600">
        O prompt de cada categoria, dissecado camada a camada — <strong>sem gerar laudo</strong>,
        sem gastar OpenAI e sem criar nenhuma linha no banco.
      </p>

      <div className="mt-8">
        <PromptExplorer
          categorias={(categorias ?? []) as { code: string; label: string; active: boolean }[]}
          estilos={(estilos ?? []) as { id: string; code: string; name: string; active: boolean }[]}
        />
      </div>
    </section>
  );
}
