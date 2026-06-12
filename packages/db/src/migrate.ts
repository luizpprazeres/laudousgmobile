import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente");

  const sql = postgres(url, { max: 1, prepare: false });

  // 1) Drizzle migrations (geradas por drizzle-kit generate)
  console.log("→ aplicando migrations Drizzle…");
  await migrate(drizzle(sql), { migrationsFolder: join(__dirname, "../drizzle") });

  // 2) SQL vivos (extensions, triggers, RPC) — ordem importa
  const sqlFiles = [
    "0001_extensions_and_triggers.sql",
    "0002_retriever_rpc.sql",
    "0006_s27_objective_style_enum.sql",
    "0007_s27_objective_style_and_product_events.sql",
    "0008_det3_template_variants.sql",
  ];
  for (const file of sqlFiles) {
    console.log(`→ aplicando ${file}…`);
    const content = await readFile(join(__dirname, "sql", file), "utf-8");
    await sql.unsafe(content);
  }

  console.log("✓ migrations OK");
  await sql.end();
}

main().catch((err) => {
  console.error("✗ migration falhou:", err);
  process.exit(1);
});
