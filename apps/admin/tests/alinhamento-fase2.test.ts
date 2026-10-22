/**
 * As colunas que o painel lê das tabelas da fase 2 precisam existir na migração de feat/admin-dados.
 * Rode com ADMIN_MIGRATIONS_DIR=<worktree laudousg-admin-dados>/supabase/migrations (ou depois do merge,
 * sem variável, contra supabase/migrations deste repositório).
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SELECOES } from "../src/lib/data/colunas";

const dirs = [join(__dirname, "..", "..", "..", "supabase", "migrations"), process.env.ADMIN_MIGRATIONS_DIR].filter(
  (d): d is string => !!d && existsSync(d),
);
const sql = dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(join(d, f), "utf8"))).join("\n");

function colunasDaTabela(tabela: string): string[] | null {
  const m = new RegExp(`create table (?:if not exists )?public\\.${tabela}\\s*\\(([\\s\\S]*?)\\n\\);`, "i").exec(sql);
  if (!m) return null;
  return (m[1] ?? "")
    .split("\n")
    .map((l) => l.trim().split(/\s+/)[0]?.toLowerCase() ?? "")
    .filter((c) => /^[a-z_]+$/.test(c) && !["foreign", "check", "primary", "unique", "constraint"].includes(c));
}

for (const tabela of ["ai_usage_events", "iap_notifications", "iap_notification_attempts"] as const) {
  test(`colunas lidas de ${tabela} existem na migração`, (t) => {
    const cols = colunasDaTabela(tabela);
    if (!cols) {
      t.skip("migração da fase 2 não encontrada (defina ADMIN_MIGRATIONS_DIR)");
      return;
    }
    for (const c of SELECOES[tabela]) assert.ok(cols.includes(c), `${tabela}.${c} não existe na migração`);
  });
}
