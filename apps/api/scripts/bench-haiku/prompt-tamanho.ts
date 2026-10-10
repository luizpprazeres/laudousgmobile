/**
 * TAMANHO DO PROMPT DO WRITER (W10) — monta o system que o writer recebe DE FATO (contrato + global +
 * estilo + bundle validado do banco + proibições + CoT) para uma categoria × estilo e imprime o
 * tamanho (caracteres e tokens estimados, ~4 caracteres/token). Só leitura no banco.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/prompt-tamanho.ts MAMARIA [CLASSICO_COMPLETO] [--ditado "texto"] [--patch bundle.json] [--dump arquivo]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: join(resolve(__dirname, "../../../.."), ".env") });

const argv = process.argv.slice(2);
const arg = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const [cat, style = "CLASSICO_COMPLETO"] = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));

async function main() {
  const { buildSystemMessage } = await import("../../src/server/prompts/buildSystemMessage");
  const { loadDeterministicBundle } = await import("../../src/server/pipeline/bundleLoader");
  const { getKnownCategories } = await import("../../src/server/db/lookups");
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const [ws] = await sql`select id from writing_styles where code = ${style}`;
  await sql.end();
  const ditado = arg("ditado") ?? "";
  const bundle = await loadDeterministicBundle({ categoryCode: cat, writingStyleId: ws.id, rawInput: ditado });
  if (bundle.error) throw new Error(`bundle ${bundle.error.code}`);
  // --patch <json>: mesmo formato do BENCH_BUNDLE_PATCH da bancada (proposta de biblioteca, banco intacto).
  const patchFile = arg("patch");
  if (patchFile) {
    const patch: Record<string, string | null> = JSON.parse(readFileSync(patchFile, "utf8"));
    bundle.blocks = bundle.blocks
      .filter((b) => patch[b.title] !== null)
      .map((b) => (typeof patch[b.title] === "string" ? { ...b, content: patch[b.title] as string } : b));
  }
  const categories = await getKnownCategories();
  const system = buildSystemMessage({
    categoryCode: cat,
    categoryLabel: categories.labels.get(cat) ?? cat,
    writingStyleCode: style as any,
    ragBlocks: bundle.blocks,
    inputMode: "raw",
  });
  const blocos = bundle.blocks.map((b) => `${b.kind}:${b.title} ${b.content.length}`);
  console.log(`${cat} · ${style}: ${system.length} caracteres · ~${Math.round(system.length / 4)} tokens · bundle ${bundle.blocks.reduce((a, b) => a + b.content.length, 0)} (${blocos.length} blocos)`);
  for (const b of blocos) console.log(`  ${b}`);
  const dump = arg("dump");
  if (dump) writeFileSync(dump, system);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
