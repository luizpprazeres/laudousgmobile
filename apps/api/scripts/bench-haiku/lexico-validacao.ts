/**
 * VALIDAÇÃO DO LÉXICO (W11) — sem LLM, banco só leitura.
 *
 * Para cada laudo com final nos últimos N dias, aplica o léxico (camada "saida") ao generated_output e
 * classifica cada troca pelo laudo FINAL assinado:
 *   acerto       o final tem a forma nova e não a antiga (o léxico teria evitado a edição do médico);
 *   contra       o final manteve a forma antiga (o médico preferiu o original — troca indevida);
 *   neutra       nenhuma das duas no final (o médico reescreveu o trecho).
 * Aplica também ao próprio FINAL: toda troca ali muda um texto assinado — listada para revisão
 * (esperado: só erros que o médico deixou passar, ex. "super lateral").
 * E aplica a camada "ditado" ao ditado: quantos ditados o léxico mudaria, por entrada.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/lexico-validacao.ts [--days 180]
 */
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";
import { aplicarLexico, LEXICO_DA_CASA } from "../../src/server/pipeline/lexicoDaCasa";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });
const argv = process.argv.slice(2);
const DAYS = Number(argv[argv.indexOf("--days") + 1] || 180) || 180;
const low = (s: string) => s.toLowerCase();

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select id, category_code cat, coalesce(consolidated_transcript, raw_input, '') ditado,
      coalesce(generated_output, '') gerado, final_output final
    from reports where final_output is not null and created_at > now() - make_interval(days => ${DAYS})`;
  await sql.end();

  type T = { acerto: number; contra: number; neutra: number; noFinal: number; noDitado: number; exFinal: Map<string, number>; exContra: Map<string, number> };
  const por = new Map<string, T>(LEXICO_DA_CASA.map((e) => [e.id, { acerto: 0, contra: 0, neutra: 0, noFinal: 0, noDitado: 0, exFinal: new Map(), exContra: new Map() }]));
  for (const r of rows) {
    const fin = low(r.final);
    for (const tr of aplicarLexico(r.gerado, { categoria: r.cat, camada: "saida" }).trocas) {
      const t = por.get(tr.id)!;
      // Por contexto (trecho anterior + termo): "4" sozinho sempre existe no final.
      const ctx = low(tr.antes).slice(-12);
      const temNovo = fin.includes(ctx + low(tr.para)), temVelho = fin.includes(ctx + low(tr.de));
      if (temVelho) { t.contra++; t.exContra.set(`${tr.de} → ${tr.para} [${r.cat}]`, (t.exContra.get(`${tr.de} → ${tr.para} [${r.cat}]`) ?? 0) + 1); }
      else if (temNovo) t.acerto++;
      else t.neutra++;
    }
    for (const tr of aplicarLexico(r.final, { categoria: r.cat, camada: "saida" }).trocas) {
      const t = por.get(tr.id)!;
      t.noFinal++;
      const k = `${tr.de} → ${tr.para} [${r.cat}]`;
      t.exFinal.set(k, (t.exFinal.get(k) ?? 0) + 1);
    }
    for (const tr of aplicarLexico(r.ditado, { categoria: r.cat, camada: "ditado" }).trocas) por.get(tr.id)!.noDitado++;
  }
  console.log(`laudos com final (${DAYS} dias): ${rows.length}\n`);
  console.log("| entrada | trocas no gerado | acerto (médico fez igual) | contra (médico manteve o original) | neutra | trocas num FINAL assinado | trocas no ditado |");
  console.log("|---|---|---|---|---|---|---|");
  for (const [id, t] of por) console.log(`| ${id} | ${t.acerto + t.contra + t.neutra} | ${t.acerto} | ${t.contra} | ${t.neutra} | ${t.noFinal} | ${t.noDitado} |`);
  for (const [id, t] of por) {
    if (t.exContra.size) console.log(`\ncontra — ${id}: ${[...t.exContra].map(([k, n]) => `${n}× ${k}`).join(" · ")}`);
    if (t.exFinal.size) console.log(`no FINAL — ${id}: ${[...t.exFinal].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${n}× ${k}`).join(" · ")}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
