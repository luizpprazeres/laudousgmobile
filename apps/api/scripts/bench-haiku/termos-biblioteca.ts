/**
 * TERMOS NA BIBLIOTECA (decisões do Luiz 10/10, Termos item 5) — a MESMA fonte do app (`lexicoDaCasa.ts`,
 * camada "saida", categoria = a do bloco) aplicada às frases fixas da Biblioteca:
 *
 *   --snippets   reescreve o corpo (não o frontmatter) de packages/knowledge/snippets/<CATEGORIA>/**.md
 *   --sql        lê knowledge_blocks (SÓ LEITURA, status validated) e escreve a PROPOSTA de SQL com guardas
 *                (id + md5 do conteúdo atual; aborta se alguma linha não bater) em
 *                docs/stories/haiku-migration/TERMOS-biblioteca-proposta.sql (+ .json com as trocas).
 *
 * Nada é aplicado no banco: o SQL é para o orquestrador aplicar com GO.
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/termos-biblioteca.ts --snippets --sql
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";
import { aplicarLexico, type TrocaLexico } from "../../src/server/pipeline/lexicoDaCasa";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });
const argv = process.argv.slice(2);
const resumo = (t: TrocaLexico[]) => t.map((x) => `${x.id}: ${x.de} → ${x.para}`);

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : p.endsWith(".md") ? [p] : [];
  });
}

function snippets() {
  const raiz = join(REPO, "packages/knowledge/snippets");
  let n = 0;
  for (const categoria of readdirSync(raiz)) {
    if (!statSync(join(raiz, categoria)).isDirectory()) continue;
    for (const f of arquivos(join(raiz, categoria))) {
      const s = readFileSync(f, "utf8");
      // Frontmatter (tags, ids) fica como está: só o corpo é frase de laudo.
      const m = /^(---\n[\s\S]*?\n---\n)([\s\S]*)$/.exec(s);
      const [cabeca, corpo] = m ? [m[1], m[2]] : ["", s];
      const r = aplicarLexico(corpo, { categoria, camada: "saida" });
      if (!r.trocas.length) continue;
      writeFileSync(f, cabeca + r.texto);
      n++;
      console.log(`${relative(REPO, f)}\n   ${resumo(r.trocas).join("\n   ")}`);
    }
  }
  console.log(`snippets alterados: ${n}`);
}

async function sqlProposta() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select kb.id, kb.category_code cat, ws.code estilo, kb.kind, kb.title, kb.content
    from knowledge_blocks kb join writing_styles ws on ws.id = kb.writing_style_id
    where kb.status = 'validated' order by kb.category_code, kb.title, ws.code`;
  await sql.end();
  const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");
  const mudancas = rows.flatMap((r) => {
    const out = aplicarLexico(r.content, { categoria: r.cat, camada: "saida" });
    return out.trocas.length ? [{ ...r, novo: out.texto, trocas: resumo(out.trocas) }] : [];
  });
  const linhas = [
    "-- TERMOS (decisões do Luiz 10/10, item 5) — PROPOSTA, NÃO APLICADA. Gerada por",
    "-- apps/api/scripts/bench-haiku/termos-biblioteca.ts a partir de knowledge_blocks (status validated) com o léxico",
    "-- da casa (lexicoDaCasa.ts, camada saida, categoria do bloco) — a mesma troca que o app já faz na saída.",
    `-- ${mudancas.length} blocos de ${rows.length} validados. Golf ball ("foco ecogênico" na obstetrícia) fica fora.`,
    "-- GUARDAS: cada UPDATE exige id E md5 do conteúdo lido em " + new Date().toISOString().slice(0, 10) + ";",
    "-- se qualquer bloco tiver mudado desde então, a transação inteira aborta (nada é aplicado).",
    "-- O embedding não é recalculado (troca de uma palavra por sinônimo da casa; reingestão opcional).",
    "begin;",
    "do $termos$",
    "declare n int;",
    "begin",
  ];
  for (const m of mudancas) {
    linhas.push(
      `  -- ${m.cat} ${m.estilo} ${m.kind} ${m.title}: ${m.trocas.join(" · ").replace(/\n/g, " ")}`,
      `  update knowledge_blocks set content = $c$${m.novo}$c$, version = version + 1, updated_at = now()`,
      `   where id = '${m.id}' and status = 'validated' and md5(content) = '${md5(m.content)}';`,
      "  get diagnostics n = row_count;",
      `  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '${m.id}', n; end if;`,
    );
  }
  linhas.push("end", "$termos$;", "commit;", "");
  if (mudancas.some((m) => m.novo.includes("$c$") || m.novo.includes("$termos$"))) throw new Error("delimitador no conteúdo");
  writeFileSync(join(REPO, "docs/stories/haiku-migration/TERMOS-biblioteca-proposta.sql"), linhas.join("\n"));
  writeFileSync(
    join(REPO, "docs/stories/haiku-migration/TERMOS-biblioteca-proposta.json"),
    JSON.stringify(mudancas.map(({ id, cat, estilo, kind, title, trocas }) => ({ id, cat, estilo, kind, title, trocas })), null, 2) + "\n",
  );
  const porId: Record<string, number> = {};
  for (const m of mudancas) for (const t of m.trocas) porId[t.split(":")[0]] = (porId[t.split(":")[0]] ?? 0) + 1;
  console.log(`knowledge_blocks validados: ${rows.length}; com troca: ${mudancas.length}; trocas por entrada: ${JSON.stringify(porId)}`);
}

(async () => {
  if (argv.includes("--snippets")) snippets();
  if (argv.includes("--sql")) await sqlProposta();
})().catch((e) => { console.error(e); process.exit(1); });
