import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL ausente. Defina no .env raiz (ver .env.example).",
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  // Não introspectar tabelas do Supabase Auth/Storage
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
