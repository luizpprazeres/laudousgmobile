/**
 * PLACAR DA TÉCNICA (W15) — seção COMENTÁRIOS de cada candidato contra o laudo FINAL do médico, sem juiz.
 * O final é normalizado pelas decisões do Luiz (10/10) antes de comparar: sem "em NN fotos", "que possuem",
 * MSK/parede/próstata pela frase da casa — senão o candidato "erra" por seguir a decisão.
 *
 *   igual     seção idêntica à do final normalizado
 *   via       via do texto (TA, TV, TA+TV) igual à do final
 *   contexto  frase de contexto do final ("Exame realizado em …") presente no candidato
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/placar-tecnica.ts <rodada> [--keys A5,A6] [--detalhe]
 * Imprime agregados por categoria e ids de 8 caracteres.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { viaDoTexto } from "@laudousg/schemes";
import { ajustarComentarios } from "../../src/server/pipeline/tecnicaGuard";

const argv = process.argv.slice(2);
const dir = argv[0]!;
const arg = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const KEYS = (arg("keys") ?? "A5,A6").split(",");
type Row = Record<string, any>;
const rs: Row[] = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));
const textoDe = (r: Row, k: string) => (k === "gpt" ? r.gpt : r[k]?.[0]?.text) ?? "";
const secao = (t: string) => (/COMENT[ÁA]RIOS\s*:\s*\n([\s\S]*?)\n\s*\n/.exec(t ?? "")?.[1] ?? "").replace(/\s+/g, " ").trim();
const categoriaDe = (r: Row) => String(r.categoria ?? r.category ?? r.category_code ?? "?");
/** Final pelas decisões do Luiz: fotos fora, "possuem", variantes antigas (sem via/contexto ditados). */
const finalAlvo = (r: Row) => secao(ajustarComentarios(String(r.final ?? "").replace(/\bobtida\s+em\s+\d{1,2}\s+fotos\s*,?\s+segundo\b/gi, "obtida segundo"), { categoria: categoriaDe(r), ditado: "" }).texto);
const contextos = (s: string) => s.match(/Exame realizado (?:em|entre) [^.]+\.|Foi realizado estudo comparativo[^.]+\./g) ?? [];

const tot: Record<string, Record<string, Record<string, number>>> = {};
const dif: Record<string, string[]> = {};
for (const r of rs) {
  const cat = categoriaDe(r);
  const alvo = finalAlvo(r);
  if (!alvo) continue;
  for (const k of KEYS) {
    const t = textoDe(r, k);
    if (!t) continue;
    const s = secao(t);
    const m = ((tot[k] ??= {})[cat] ??= {});
    const inc = (x: string) => { m[x] = (m[x] ?? 0) + 1; };
    inc("casos");
    if (s === alvo) inc("igual"); else (dif[k] ??= []).push(`${String(r.id).slice(0, 8)} ${cat}`);
    if (viaDoTexto(s) === viaDoTexto(alvo)) inc("via");
    const ctx = contextos(alvo);
    if (ctx.length) { inc("comContexto"); if (ctx.every((c) => s.includes(c))) inc("contextoOk"); }
  }
}
console.log(`rodada ${dir.split("/").pop()} · ${rs.length} casos`);
console.log("| candidato | categoria | casos | seção = final | via = final | contexto do final presente |");
console.log("|---|---|---|---|---|---|");
for (const k of KEYS) for (const [cat, m] of Object.entries(tot[k] ?? {}).sort()) {
  const pct = (n = 0) => `${n} (${((100 * n) / Math.max(1, m.casos ?? 0)).toFixed(0)}%)`;
  console.log(`| ${k} | ${cat} | ${m.casos} | ${pct(m.igual)} | ${pct(m.via)} | ${m.comContexto ? `${m.contextoOk ?? 0}/${m.comContexto}` : "—"} |`);
}
if (argv.includes("--detalhe")) for (const k of KEYS) console.log(`\n${k} — seção ≠ final: ${(dif[k] ?? []).join(", ")}`);
