/**
 * HISTÓRICO "Correlacionar com dados clínicos" (decisão do Luiz de 10/10: só quando ditado, em todas as categorias).
 * Sem LLM, banco só leitura. Por categoria: laudos cujo gerado traz a correlação clínica genérica, quantos ditados a
 * pediam e quantos finais assinados a mantiveram. Imprime só agregados e formas (sem texto de paciente).
 *
 * Depois aplica o guard da rota (`aplicarCorrelacaoDitada`) ao gerado e ao FINAL de cada laudo, com o ditado dele:
 * quantos gerados ele corrige, quantos ficam com a frase sem pedido, e quantos finais assinados ele mudaria
 * (falso positivo: o médico assinou sem pedir no ditado) — os textos mudados vão só para tmp-review.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/correlacionar-historico.ts [--days 365]
 */
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";
import { aplicarCorrelacaoDitada, CORRELACAO_CLINICA_RE } from "../../src/server/pipeline/correlacaoClinica";

loadDotenv({ path: join(resolve(__dirname, "../../../.."), ".env") });
const argv = process.argv.slice(2);
const DAYS = Number(argv[argv.indexOf("--days") + 1] || 365) || 365;

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select category_code cat, coalesce(consolidated_transcript, raw_input, '') ditado,
      coalesce(generated_output, '') gerado, final_output final
    from reports where created_at > now() - make_interval(days => ${DAYS})`;
  await sql.end();
  const tem = (t: string | null) => !!t && new RegExp(CORRELACAO_CLINICA_RE.source, "i").test(t);
  type T = { laudos: number; comFinal: number; gerado: number; geradoComFinal: number; ditado: number; final: number; geradoNaoDitado: number; finalMantevNaoDitado: number };
  const por = new Map<string, T>();
  const formas = new Map<string, number>();
  for (const r of rows) {
    const t = por.get(r.cat) ?? { laudos: 0, comFinal: 0, gerado: 0, geradoComFinal: 0, ditado: 0, final: 0, geradoNaoDitado: 0, finalMantevNaoDitado: 0 };
    t.laudos++;
    if (r.final) t.comFinal++;
    const g = tem(r.gerado), d = tem(r.ditado), f = tem(r.final);
    if (g) { t.gerado++; for (const m of r.gerado.matchAll(new RegExp(CORRELACAO_CLINICA_RE.source, "gi"))) formas.set(m[0].toLowerCase(), (formas.get(m[0].toLowerCase()) ?? 0) + 1); }
    if (g && r.final) t.geradoComFinal++;
    if (d) t.ditado++;
    if (f) t.final++;
    if (g && !d) t.geradoNaoDitado++;
    if (g && !d && r.final && f) t.finalMantevNaoDitado++;
    por.set(r.cat, t);
  }
  console.log(`laudos (${DAYS} dias): ${rows.length}\n`);
  console.log("| categoria | laudos | gerado com a frase | … com final | ditado pedia | final com a frase | gerado sem pedido | final manteve sem pedido |");
  console.log("|---|---|---|---|---|---|---|---|");
  const lista = [...por].filter(([, t]) => t.gerado || t.ditado || t.final).sort((a, b) => b[1].gerado - a[1].gerado);
  const soma = { laudos: 0, gerado: 0, geradoComFinal: 0, ditado: 0, final: 0, geradoNaoDitado: 0, finalMantevNaoDitado: 0 };
  for (const [c, t] of lista) {
    console.log(`| ${c} | ${t.laudos} | ${t.gerado} | ${t.geradoComFinal} | ${t.ditado} | ${t.final} | ${t.geradoNaoDitado} | ${t.finalMantevNaoDitado} |`);
    for (const k of Object.keys(soma) as (keyof typeof soma)[]) soma[k] += t[k];
  }
  console.log(`| **total** | ${soma.laudos} | ${soma.gerado} | ${soma.geradoComFinal} | ${soma.ditado} | ${soma.final} | ${soma.geradoNaoDitado} | ${soma.finalMantevNaoDitado} |`);
  // Guard da rota sobre o histórico.
  let corrigidos = 0, restam = 0, garantidos = 0, finaisMudados = 0;
  const amostras: string[] = [];
  for (const r of rows) {
    const g2 = aplicarCorrelacaoDitada(r.gerado, r.ditado);
    if (g2 !== r.gerado) {
      if (tem(r.ditado)) garantidos++;
      else corrigidos++;
      amostras.push(`## ${r.cat} gerado\n- ${r.gerado.split("\n").filter((l: string) => !g2.split("\n").includes(l)).join("\n- ")}\n+ ${g2.split("\n").filter((l: string) => !r.gerado.split("\n").includes(l)).join("\n+ ")}`);
    }
    if (!tem(r.ditado) && tem(g2)) restam++;
    if (r.final) {
      const f2 = aplicarCorrelacaoDitada(r.final, r.ditado);
      if (f2 !== r.final) {
        finaisMudados++;
        amostras.push(`## ${r.cat} FINAL\n- ${r.final.split("\n").filter((l: string) => !f2.split("\n").includes(l)).join("\n- ")}\n+ ${f2.split("\n").filter((l: string) => !r.final.split("\n").includes(l)).join("\n+ ")}`);
      }
    }
  }
  console.log(`\nguard sobre o histórico: gerados corrigidos (frase sem pedido) ${corrigidos} · gerados com a frase ditada garantida ${garantidos} · gerados que ainda ficariam com a frase sem pedido ${restam} · finais assinados que o guard mudaria ${finaisMudados}`);
  const saida = argv.includes("--amostras") ? argv[argv.indexOf("--amostras") + 1] : undefined;
  if (saida) (await import("node:fs")).writeFileSync(saida, amostras.join("\n\n"));
  console.log("\nformas no gerado:", [...formas].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${n}× "${f}"`).join(" · "));
}
main().catch((e) => { console.error(e); process.exit(1); });
