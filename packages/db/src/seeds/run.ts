import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../schema";
import { WRITING_STYLES_SEED, CATEGORIES_SEED } from "./data";

/**
 * Seed idempotente. Executa apenas tabelas estruturais (writing_styles,
 * categories). knowledge_blocks vêm de seed separado depois que claude2
 * entregar a extração do LaudoUSG original.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente");

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  console.log("→ writing_styles");
  for (const ws of WRITING_STYLES_SEED) {
    await db
      .insert(schema.writingStyles)
      .values({
        id: ws.id,
        code: ws.code,
        name: ws.name,
        description: ws.description,
      })
      .onConflictDoUpdate({
        target: schema.writingStyles.id,
        set: { name: ws.name, description: ws.description },
      });
  }

  console.log("→ categories");
  for (const c of CATEGORIES_SEED) {
    await db
      .insert(schema.categories)
      .values({ code: c.code, label: c.label })
      .onConflictDoUpdate({
        target: schema.categories.code,
        set: { label: c.label },
      });
  }

  console.log("✓ seed concluído");
  await sql.end();
}

main().catch((err) => {
  console.error("✗ seed falhou:", err);
  process.exit(1);
});
