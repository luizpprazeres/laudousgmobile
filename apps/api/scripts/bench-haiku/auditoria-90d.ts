/**
 * AUDITORIA 90 DIAS — medições determinísticas citadas na revisão W4
 * (docs/reviews/2026-10-revisao-renderers-prompts.md). Só leitura no banco; não chama modelo.
 *
 *   1. itens do guard de comandos que entraram literais na conclusão gerada, e quantos o médico apagou (por caminho)
 *   2. laudos com vários exames colapsados pelo guard (gerado com menos "CONCLUSÃO:" que o final)
 *   3. ditados que já são o laudo colado pronto (por categoria)
 *   4. ditados curtos (< 80 caracteres)
 *   5. variante do bundle da PELVE_FEMININA para o writer genérico
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/auditoria-90d.ts [--days 90]
 * Imprime só agregados e ids de 8 caracteres — nenhum texto de paciente.
 */
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: join(resolve(__dirname, "../../../.."), ".env") });

const argv = process.argv.slice(2);
const DAYS = Number(argv[argv.indexOf("--days") + 1] || 90);

async function main() {
  const { extractCommandOperations } = await import("../../src/server/pipeline/commandOperations");
  const { parseConclusion } = await import("../../src/server/pipeline/conclusionUtils");
  const { loadDeterministicBundle } = await import("../../src/server/pipeline/bundleLoader");
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1, connect_timeout: 30 });

  const rows = await sql`
    select r.id, r.category_code cat, r.writing_style_id,
           coalesce(r.consolidated_transcript, r.raw_input) d, r.generated_output g, r.final_output f,
           left(a.system_message_full, 80) h
    from reports r
    left join lateral (select * from generation_audit g where g.report_id = r.id order by created_at desc limit 1) a on true
    where r.final_output is not null and r.created_at > now() - make_interval(days => ${DAYS})`;

  const n = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const conclusoes = (t: string | null) => ((t ?? "").match(/^\s*CONCLUS[ÃA]O\s*:/gim) ?? []).length;
  const caminho = (h: string | null) =>
    /writer_guarded/.test(h ?? "") ? "writer_guarded" : /^\[renderer/.test(h ?? "") ? "renderer" : "writer";
  const colado = (d: string) => /^\s*CONCLUS[ÃA]O\s*:?\s*$/m.test(d) && /OS SEGUINTES ASPECTOS|ACHADOS|COMENT[ÁA]RIOS/i.test(d);

  // 1 e 2
  const porCaminho: Record<string, { apagado: number; mantido: number }> = {};
  const colapsados: string[] = [];
  for (const r of rows) {
    const ops = extractCommandOperations(r.d ?? "").filter((o) => o.op === "add_conclusion_item") as { text: string }[];
    if (!ops.length) continue;
    const gi = parseConclusion(r.g ?? "").items.map(n);
    const fi = parseConclusion(r.f ?? "").items.map(n);
    for (const o of ops) {
      const x = n(o.text.replace(/\.$/, ""));
      if (!gi.includes(x)) continue;
      const b = (porCaminho[caminho(r.h)] ??= { apagado: 0, mantido: 0 });
      if (fi.includes(x)) b.mantido++;
      else b.apagado++;
    }
    if (conclusoes(r.f) >= 2 && conclusoes(r.g) < conclusoes(r.f)) {
      colapsados.push(`${r.id.slice(0, 8)} ${r.cat} (final ${conclusoes(r.f)} / gerado ${conclusoes(r.g)})`);
    }
  }
  console.log(`laudos com final (${DAYS}d): ${rows.length}`);
  console.log("\n1. itens do guard de comandos literais na conclusão gerada (apagado × mantido pelo médico):");
  console.table(porCaminho);
  console.log(`\n2. laudos com vários exames colapsados (com comando no ditado): ${colapsados.length}`);
  colapsados.forEach((l) => console.log("  ", l));

  // 3 e 4
  const porCat: Record<string, { n: number; colado: number; curto: number }> = {};
  for (const r of rows) {
    const b = (porCat[r.cat] ??= { n: 0, colado: 0, curto: 0 });
    b.n++;
    if (colado(r.d ?? "")) b.colado++;
    if ((r.d ?? "").trim().length < 80) b.curto++;
  }
  console.log("\n3–4. laudo colado pronto e ditado curto (< 80 caracteres), por categoria:");
  console.table(porCat);

  // 5
  const variantes: Record<string, number> = {};
  for (const r of rows.filter((x) => x.cat === "PELVE_FEMININA")) {
    const b = await loadDeterministicBundle({ categoryCode: "PELVE_FEMININA", writingStyleId: r.writing_style_id, rawInput: r.d ?? "" });
    const k = b.error ? `${b.error.code} ${(b.error as { variantTag?: string }).variantTag ?? ""}` : `ok ${b.variantKey}`;
    variantes[k] = (variantes[k] ?? 0) + 1;
  }
  console.log("\n5. PELVE_FEMININA no writer genérico — variante do bundle:");
  console.table(variantes);

  await sql.end();
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
