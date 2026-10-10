import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";
import { requestedVolumeCalc } from "../../src/server/pipeline/volumeGuard";
loadDotenv({ path: join(resolve(__dirname, "../../../.."), ".env") });
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select id, category_code cat, created_at, coalesce(consolidated_transcript, raw_input, '') ditado,
     coalesce(generated_output,'') gerado, final_output final
     from reports where created_at > now() - interval '365 days' and coalesce(consolidated_transcript, raw_input, '') ~* 'volum'`;
  await sql.end();
  const hits = rows.filter((r) => requestedVolumeCalc(r.ditado));
  const porCat = new Map<string, number>();
  for (const r of hits) porCat.set(r.cat, (porCat.get(r.cat) ?? 0) + 1);
  console.log("com 'volum' no ditado:", rows.length, " · pedido de cálculo (requestedVolumeCalc):", hits.length);
  console.log([...porCat].sort((a,b)=>b[1]-a[1]).map(([c,n])=>`${c}:${n}`).join(" · "));
  for (const r of hits) {
    const d = r.ditado; const i = d.search(/calcul\w*[^.]{0,20}volum|volum[^.]{0,20}calcul|me\s+d[êéáe][^.]{0,12}volum|qual[^.]{0,15}volum/i);
    console.log(`\n### ${r.id.slice(0,8)} ${r.cat} ${r.created_at.toISOString().slice(0,10)} final=${r.final ? "sim" : "não"}`);
    console.log("DITADO …" + d.slice(Math.max(0,i-220), i+80).replace(/\s+/g," ") + "…");
    const g = (r.final ?? r.gerado); const gi = g.search(/volume/i);
    const vols = [...g.matchAll(/[^.\n]{0,90}volume[^.\n]{0,60}/gi)].map(m=>m[0]).slice(0,4);
    console.log((r.final ? "FINAL" : "GERADO") + ": " + vols.join(" | "));
  }
}
main();
