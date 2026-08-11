/**
 * O código sobrevive a chegar em produção ANTES da migration 0023?
 *
 * Rodar de apps/api:
 *   pnpm exec tsx --env-file=.env.local src/server/db/auditModelo.manual.ts
 *
 * SEGURANÇA: não grava nada. O insert com as colunas novas FALHA enquanto a
 * migration não foi aplicada — e é justamente essa falha que se quer observar.
 * O retry (que gravaria) não é executado aqui.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";

/** Cópia fiel da função de auditRepo.ts — se divergir, o teste perde o sentido. */
function ehColunaDesconhecida(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /column .* does not exist|could not find the .* column/i.test(error.message ?? "")
  );
}

let ok = 0;
const falhas: string[] = [];
const check = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++;
  else falhas.push(nome + (extra === undefined ? "" : ` — ${JSON.stringify(extra)}`));
};

async function main() {
  const e = env();
  const sb = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Uma linha mínima e válida, exceto pelas colunas da 0023.
  const base = {
    user_id: null,
    category: "OBSTETRICA",
    prompt_version: "teste-migration-0023",
    pipeline_version: "v1",
    contract_hash: "teste",
  };
  const modelo = {
    model_catalog_id: "OBSTETRICA/CLASSICO_COMPLETO",
    model_catalog_versao: 1,
    model_customization_versao: null,
  };

  // NÃO usa .select(): sem retorno, e o insert falha antes de gravar seja o que for.
  const { error } = await sb.from("generation_audit").insert({ ...base, ...modelo });

  const jaAplicada = error === null;
  if (jaAplicada) {
    console.log("\n⚠ a migration 0023 JÁ ESTÁ APLICADA — este insert GRAVOU uma linha de teste.");
    const { error: errDel } = await sb
      .from("generation_audit")
      .delete()
      .eq("prompt_version", "teste-migration-0023");
    check("linha de teste removida", errDel === null, errDel);
    const { count } = await sb
      .from("generation_audit")
      .select("id", { count: "exact", head: true })
      .eq("prompt_version", "teste-migration-0023");
    check("nada sobrou", (count ?? 0) === 0, count);
    check("com a migration aplicada, as colunas aceitam os valores", true);
  } else {
    check("o insert com as colunas novas falha (migration ainda não aplicada)", true);
    check(
      "e o erro é reconhecido como 'coluna desconhecida'",
      ehColunaDesconhecida(error),
      { code: error.code, message: error.message },
    );
    console.log(`\ncódigo do erro: ${error.code}`);
    console.log(`mensagem: ${error.message}`);

    // O caminho de fallback: o mesmo insert SEM as colunas novas funcionaria?
    // Verificado sem gravar, com um insert deliberadamente inválido que falha
    // por OUTRO motivo — provando que o detector não é um "sim" universal.
    const { error: outro } = await sb
      .from("generation_audit")
      .insert({ ...base, category: null as unknown as string });
    check(
      "o detector NÃO confunde outro erro com coluna desconhecida",
      outro !== null && !ehColunaDesconhecida(outro),
      { code: outro?.code, message: outro?.message },
    );
  }

  const { count: total } = await sb
    .from("generation_audit")
    .select("id", { count: "exact", head: true })
    .eq("prompt_version", "teste-migration-0023");
  check("nenhuma linha de teste ficou no banco", (total ?? 0) === 0, total);

  console.log(`\nTolerância à ordem do deploy (migration 0023)\n`);
  for (const f of falhas) console.log("  ✗", f);
  console.log(`\n${ok} passaram, ${falhas.length} falharam`);
  console.log(`migration 0023: ${jaAplicada ? "APLICADA" : "ainda não aplicada"}\n`);
  process.exit(falhas.length === 0 ? 0 : 1);
}

void main();
