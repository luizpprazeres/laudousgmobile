/**
 * Procedência medida em laudos REAIS do banco (read-only, agregado).
 * Rodar de apps/lab: pnpm exec tsx --env-file=.env.local src/lib/procedencia/real.manual.ts
 */
import { createClient } from "@supabase/supabase-js";
import { procedenciaDoLaudo } from "./index";

async function main() {
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const { data, error } = await supa
  .from("generation_audit")
  .select("id,category,output_text,structured_output")
  .not("output_text", "is", null)
  .not("structured_output", "is", null)
  .order("created_at", { ascending: false })
  .limit(80);
if (error) throw error;

const porCat = new Map<string, { n: number; cod: number; txt: number; dado: number }>();
let semCobertura = 0;

for (const r of data ?? []) {
  const { resumo, trechos } = procedenciaDoLaudo(r.output_text as string, r.structured_output);
  const tot = resumo.codigo + resumo.llm_texto + resumo.llm_dado;
  if (tot === 0) continue;
  // Invariante: a soma dos trechos reconstrói o laudo, sem perder caractere.
  if (trechos.map((t) => t.texto).join("") !== r.output_text) {
    throw new Error(`perdeu texto no laudo ${r.id}`);
  }
  if (resumo.llm_texto + resumo.llm_dado === 0) semCobertura++;
  const c = porCat.get(r.category as string) ?? { n: 0, cod: 0, txt: 0, dado: 0 };
  c.n++;
  c.cod += (100 * resumo.codigo) / tot;
  c.txt += (100 * resumo.llm_texto) / tot;
  c.dado += (100 * resumo.llm_dado) / tot;
  porCat.set(r.category as string, c);
}

console.log("\nProcedência média por categoria (laudos reais)\n");
console.log("categoria".padEnd(24), "n".padStart(3), "código".padStart(8), "LLM redigiu".padStart(12), "LLM mediu".padStart(10));
for (const [cat, v] of [...porCat.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(
    cat.padEnd(24), String(v.n).padStart(3),
    `${(v.cod / v.n).toFixed(1)}%`.padStart(8),
    `${(v.txt / v.n).toFixed(1)}%`.padStart(12),
    `${(v.dado / v.n).toFixed(1)}%`.padStart(10),
  );
}
console.log(`\nlaudos sem nenhuma atribuição ao LLM: ${semCobertura}`);
console.log("(invariante verificada: nenhum caractere perdido na segmentação)\n");
}
void main();
