// DET-2 — aplicador transacional dos SQLs de saneamento das 7 categorias grandes.
// Snapshot antes, aplica arquivo a arquivo (cada um já tem BEGIN/COMMIT),
// e verifica invariantes do bundle por categoria/estilo após cada um.
// Uso: node scripts/apply-det2-sql.mjs [--verify-only] cat1 cat2 ...
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const DOCS = path.join(process.cwd(), "docs");

const CATS = {
  doppler_obstetrico: "DOPPLER_OBSTETRICO",
  cervical: "CERVICAL",
  tireoide: "TIREOIDE",
  mamaria: "MAMARIA",
  obstetrica: "OBSTETRICA",
  pelve_feminina: "PELVE_FEMININA",
  morfologico: "MORFOLOGICO",
};

const args = process.argv.slice(2);
const verifyOnly = args.includes("--verify-only");
const requested = args.filter((a) => !a.startsWith("--"));
const order = requested.length ? requested : Object.keys(CATS);

async function snapshot() {
  const rows = await sql`
    select category_code, count(*) filter (where status='validated') as validated,
           count(*) filter (where status='validated' and kind='modelo') as modelos
    from knowledge_blocks
    where category_code = any(${order.map((k) => CATS[k])})
    group by category_code order by category_code`;
  return rows;
}

// Invariante: por (categoria, estilo) deve haver >=1 modelo validado, cada
// modelo com no máximo 1 tag variant:, e nenhum par de modelos com a MESMA
// variante (senão o bundle fica ambíguo para algum ditado).
async function verify(code) {
  const models = await sql`
    select writing_style_id, title,
      (select array_agg(t) from unnest(tags) t where t like 'variant:%') as variants
    from knowledge_blocks
    where category_code=${code} and kind='modelo' and status='validated'
    order by writing_style_id, title`;
  const byStyle = new Map();
  for (const m of models) {
    const list = byStyle.get(m.writing_style_id) ?? [];
    list.push(m);
    byStyle.set(m.writing_style_id, list);
  }
  const problems = [];
  if (byStyle.size === 0) problems.push("NENHUM modelo validado");
  for (const [style, list] of byStyle) {
    const s = style.slice(0, 8);
    if (list.length === 0) problems.push(`estilo ${s}: 0 modelos`);
    const variants = list.map((m) => (m.variants ?? []).join("|") || "(sem variant)");
    // se >1 modelo, todos precisam ter variant distinta
    if (list.length > 1) {
      const noTag = list.filter((m) => !m.variants || m.variants.length === 0);
      if (noTag.length) problems.push(`estilo ${s}: ${list.length} modelos, ${noTag.length} SEM variant: (${noTag.map((m) => m.title).join(", ")})`);
      const dup = variants.filter((v, i) => variants.indexOf(v) !== i);
      if (dup.length) problems.push(`estilo ${s}: variantes duplicadas [${dup.join(", ")}]`);
    }
    list.forEach((m) => {
      if (m.variants && m.variants.length > 1) problems.push(`${m.title} (${s}): ${m.variants.length} tags variant:`);
    });
  }
  return { styles: byStyle.size, models: models.length, problems };
}

async function main() {
  console.log("== snapshot ANTES ==");
  console.table((await snapshot()).map((r) => ({ ...r })));

  if (!verifyOnly) {
    for (const key of order) {
      const file = path.join(DOCS, `det-2-sql-${key}.sql`);
      const text = fs.readFileSync(file, "utf8");
      process.stdout.write(`\napply ${key}... `);
      try {
        await sql.unsafe(text);
        console.log("OK");
      } catch (e) {
        console.log("ERRO:", e.message);
        await sql.end();
        process.exit(1);
      }
    }
  }

  console.log("\n== verificação de invariantes do bundle ==");
  let anyProblem = false;
  for (const key of order) {
    const code = CATS[key];
    const v = await verify(code);
    const tag = v.problems.length ? "❌" : "✅";
    console.log(`${tag} ${code}: ${v.styles} estilos, ${v.models} modelos${v.problems.length ? " — " + v.problems.join("; ") : ""}`);
    if (v.problems.length) anyProblem = true;
  }

  console.log("\n== snapshot DEPOIS ==");
  console.table((await snapshot()).map((r) => ({ ...r })));

  await sql.end();
  process.exit(anyProblem ? 2 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
