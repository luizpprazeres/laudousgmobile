/**
 * PADRÕES REAIS DO MÉDICO (W10) — linhas mais frequentes dos laudos FINAIS de uma categoria (90 dias).
 * Só LÊ o banco. Grava os laudos em tmp-review/haiku-migration/padroes/<CAT>.json (dados reais, fora do
 * git) e imprime as 60 linhas mais frequentes (frases de modelo; linhas raras podem ter dado de paciente —
 * não copie para documento versionado sem anonimizar).
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/padroes-finais.ts ABDOMEN_TOTAL
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });

async function main() {
  const cat = process.argv[2];
  if (!cat) throw new Error("uso: padroes-finais.ts <CATEGORIA>");
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select id, final_output, generated_output, coalesce(consolidated_transcript, raw_input) ditado
    from reports where category_code = ${cat} and final_output is not null and created_at > now() - interval '90 days'
    order by created_at`;
  await sql.end();
  const out = join(REPO, "tmp-review/haiku-migration/padroes");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${cat}.json`), JSON.stringify(rows, null, 1));
  const freq = new Map<string, number>();
  for (const r of rows) {
    for (const l of new Set(String(r.final_output).split("\n").map((s) => s.trim()).filter(Boolean))) freq.set(l, (freq.get(l) ?? 0) + 1);
  }
  console.log(`${cat}: ${rows.length} laudos finais`);
  for (const [l, n] of [...freq].sort((a, b) => b[1] - a[1]).slice(0, 60)) console.log(String(n).padStart(3), l.slice(0, 230));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
