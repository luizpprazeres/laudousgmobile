/**
 * TAMANHO DO SYSTEM DO WRITER (W10) — monta o system que o writer completo recebe de fato
 * (global + contrato + estilo + biblioteca do banco + few-shots), por categoria, e mede.
 * Só LÊ o banco (bundle determinístico). Grava o texto em tmp-review/haiku-migration/system/ para
 * leitura e diff (a biblioteca pode trazer trechos de laudos reais — fica fora do git).
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/system-tamanho.ts [ABDOMEN_TOTAL,VIAS_URINARIAS] [--tag antes] [--ditado "texto"]
 * Tokens: estimativa ~3,6 caracteres por token (português); serve para comparar antes × depois.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });

const argv = process.argv.slice(2);
const arg = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const cats = (argv[0] && !argv[0].startsWith("--") ? argv[0] : "ABDOMEN_TOTAL,VIAS_URINARIAS,PAREDE_ABDOMINAL,MAMARIA").split(",");
const tag = arg("tag") ?? "atual";
const ditado = arg("ditado") ?? "exame dentro da normalidade";

async function main() {
  const { loadDeterministicBundle } = await import("../../src/server/pipeline/bundleLoader");
  const { getKnownCategories } = await import("../../src/server/db/lookups");
  const { buildSystemMessage } = await import("../../src/server/prompts/buildSystemMessage");
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const [style] = await sql`select id, code from writing_styles where code = 'CLASSICO_COMPLETO'`;
  await sql.end();
  const known = await getKnownCategories();
  const out = join(REPO, "tmp-review/haiku-migration/system");
  mkdirSync(out, { recursive: true });
  console.log("| categoria | system (caracteres) | tokens (~) | biblioteca (blocos) | biblioteca (caracteres) |");
  console.log("|---|---|---|---|---|");
  for (const cat of cats) {
    const bundle = await loadDeterministicBundle({ categoryCode: cat, writingStyleId: style.id, rawInput: ditado });
    const blocks = bundle.blocks ?? [];
    const sys = buildSystemMessage({
      categoryCode: cat,
      categoryLabel: known.labels.get(cat) ?? cat,
      writingStyleCode: style.code,
      ragBlocks: blocks,
      inputMode: "raw",
    });
    const bib = blocks.reduce((a, b) => a + b.content.length + b.title.length, 0);
    writeFileSync(join(out, `${cat}.${tag}.txt`), sys);
    console.log(`| ${cat} | ${sys.length} | ${Math.round(sys.length / 3.6)} | ${blocks.length} (${[...new Set(blocks.map((b) => b.kind))].join("/")}) | ${bib} |`);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
