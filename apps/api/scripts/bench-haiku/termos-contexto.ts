/**
 * CONTEXTOS DE TERMO (decisões do Luiz 10/10, seção Termos) — sem LLM, banco só leitura.
 * Lista, por categoria e por coluna (ditado/gerado/final), os contextos de um regex nos laudos com final.
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/termos-contexto.ts '<regex>' [--days 180] [--cats A,B]
 */
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });
const argv = process.argv.slice(2);
const re = new RegExp(argv[0], "giu");
const DAYS = argv.includes("--days") ? Number(argv[argv.indexOf("--days") + 1]) : 180;
const CATS = argv.includes("--cats") ? argv[argv.indexOf("--cats") + 1].split(",") : undefined;

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select category_code cat, coalesce(consolidated_transcript, raw_input, '') ditado,
      coalesce(generated_output, '') gerado, final_output final
    from reports where final_output is not null and created_at > now() - make_interval(days => ${DAYS})`;
  await sql.end();
  const ctx = new Map<string, number>();
  const tot: Record<string, number> = {};
  for (const r of rows) {
    if (CATS && !CATS.includes(r.cat)) continue;
    for (const col of ["ditado", "gerado", "final"] as const) {
      for (const m of (r[col] as string).matchAll(re)) {
        const i = m.index ?? 0;
        const s = (r[col] as string).slice(Math.max(0, i - 30), i + m[0].length + 30).replace(/\s+/g, " ");
        const k = `${col} [${r.cat}] …${s}…`;
        ctx.set(k, (ctx.get(k) ?? 0) + 1);
        tot[`${col} ${r.cat}`] = (tot[`${col} ${r.cat}`] ?? 0) + 1;
      }
    }
  }
  console.log(`laudos com final (${DAYS} dias): ${rows.length}`);
  console.log(Object.entries(tot).sort().map(([k, n]) => `${k}: ${n}`).join("\n"));
  console.log("");
  for (const [k, n] of [...ctx].sort()) console.log(`${n}× ${k}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
