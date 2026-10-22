import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { auditarViewsAdmin, colunaProibida, colunas, SELECOES, type TabelaPermitida } from "../src/lib/data/colunas";

const RAIZ = join(__dirname, "..");

test("nenhuma coluna lida pelo painel é texto clínico ou dado pessoal", () => {
  for (const [tabela, lista] of Object.entries(SELECOES)) {
    for (const c of lista) assert.equal(colunaProibida(c), false, `${tabela}.${c}`);
    assert.doesNotThrow(() => colunas(tabela as TabelaPermitida));
  }
});

test("as colunas clínicas conhecidas estão na lista proibida", () => {
  for (const c of ["raw_input", "output_text", "system_message_full", "final_output", "generated_output", "consolidated_transcript", "email", "name", "error_message"]) {
    assert.equal(colunaProibida(c), true, c);
  }
});

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
}

test("o código só faz .select() pela allowlist (sem select literal nem '*')", () => {
  const fontes = arquivos(join(RAIZ, "src")).filter((f) => /\.(ts|tsx)$/.test(f));
  for (const f of fontes) {
    const txt = readFileSync(f, "utf8");
    const literais = [...txt.matchAll(/\.select\(\s*(["'`])([^"'`]*)\1/g)].map((m) => m[2] ?? "");
    for (const l of literais) {
      // única exceção: profiles.role na checagem de papel
      assert.ok(l === "role", `${f}: select literal "${l}" — use colunas(tabela)`);
    }
    assert.doesNotMatch(txt, /\.select\(\s*["'`]\*["'`]/, `${f}: select *`);
  }
});

test("auditor de views pega coluna clínica e select *", () => {
  const ruim = `create or replace view public.admin_x as select r.id, r.raw_input from reports r;\ncreate view admin_y as select * from generation_audit;`;
  const p = auditarViewsAdmin(ruim);
  assert.ok(p.some((x) => x.view === "admin_x" && /raw_input/.test(x.problema)));
  assert.ok(p.some((x) => x.view === "admin_y" && /select \*/.test(x.problema)));
  const bom = `create view public.admin_custos as select date_trunc('day', created_at)::date as dia, sum(cost_usd) as custo from ai_usage_events group by 1;`;
  assert.deepEqual(auditarViewsAdmin(bom), []);
});

test("nenhuma view admin_* nas migrações expõe texto clínico", () => {
  const dirs = [join(RAIZ, "..", "..", "supabase", "migrations"), process.env.ADMIN_MIGRATIONS_DIR].filter((d): d is string => !!d && existsSync(d));
  let views = 0;
  for (const d of dirs) {
    for (const f of readdirSync(d).filter((x) => x.endsWith(".sql"))) {
      const sql = readFileSync(join(d, f), "utf8");
      views += (sql.match(/create\s+(or\s+replace\s+)?view\s+(public\.)?admin_/gi) ?? []).length;
      assert.deepEqual(auditarViewsAdmin(sql), [], f);
    }
  }
  if (views === 0) console.log("   (nenhuma view admin_* nas migrações ainda — feat/admin-dados; rode com ADMIN_MIGRATIONS_DIR)");
});
