/**
 * Procedência medida em laudos REAIS (read-only, agregado, sem expor conteúdo).
 * Rodar de apps/lab: pnpm exec tsx --env-file=.env.local src/lib/procedencia/real.manual.ts
 */
import { createClient } from "@supabase/supabase-js";
import { modoDe, procedenciaDoLaudo } from "./index";

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Só as gerações que têm achados preenchidos — nas demais não há o que atribuir.
  const { data, error } = await supa
    .from("generation_audit")
    .select("id,category,system_message_full,output_text,structured_output")
    .not("output_text", "is", null)
    .not("structured_output->achados", "eq", "{}")
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw error;

  const porModo = new Map<string, { n: number; cod: number; txt: number; dado: number }>();
  let semAtribuicao = 0;
  let exemplo: { cat: string; pct: string } | null = null;

  for (const r of data ?? []) {
    const laudo = r.output_text as string;
    const { resumo, trechos } = procedenciaDoLaudo(laudo, r.structured_output);
    if (trechos.map((t) => t.texto).join("") !== laudo) throw new Error(`perdeu texto em ${r.id}`);
    const tot = resumo.codigo + resumo.llm_texto + resumo.llm_dado;
    if (tot === 0) continue;
    const atribuido = resumo.llm_texto + resumo.llm_dado;
    if (atribuido === 0) semAtribuicao++;
    const modo = modoDe(r.system_message_full as string | null);
    const c = porModo.get(modo) ?? { n: 0, cod: 0, txt: 0, dado: 0 };
    c.n++; c.cod += (100 * resumo.codigo) / tot;
    c.txt += (100 * resumo.llm_texto) / tot; c.dado += (100 * resumo.llm_dado) / tot;
    porModo.set(modo, c);
    if (!exemplo && atribuido > 0) {
      exemplo = { cat: r.category as string, pct: ((100 * atribuido) / tot).toFixed(1) };
    }
  }

  console.log("\nProcedência em laudos reais (só os que têm achados preenchidos)\n");
  console.log("caminho".padEnd(12), "n".padStart(4), "não atribuído".padStart(15), "LLM redigiu".padStart(13), "LLM mediu".padStart(11));
  for (const [modo, v] of porModo) {
    console.log(
      modo.padEnd(12), String(v.n).padStart(4),
      `${(v.cod / v.n).toFixed(1)}%`.padStart(15),
      `${(v.txt / v.n).toFixed(1)}%`.padStart(13),
      `${(v.dado / v.n).toFixed(1)}%`.padStart(11),
    );
  }
  console.log(`\nlaudos sem nenhuma atribuição: ${semAtribuicao}`);
  if (exemplo) console.log(`exemplo com atribuição: ${exemplo.cat} — ${exemplo.pct}% do texto veio de campo do LLM`);
  console.log("(invariante ok: nenhum caractere perdido na segmentação)\n");
}
void main();
