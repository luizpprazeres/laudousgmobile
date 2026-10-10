/**
 * PLACAR DETERMINÍSTICO GENÉRICO (W10) — sem juiz, contra o laudo FINAL do médico. Generaliza o placar-msk.ts:
 * as FRASES-PADRÃO da categoria são as linhas que se repetem nos próprios laudos finais da rodada (números
 * trocados por N, a partir de --min ocorrências), em vez de um roteiro fixo no código.
 *
 * Por candidato:
 *   padrao      linha do final que é frase-padrão e não está IDÊNTICA no candidato (omitida ou reescrita)
 *   titulo      título (1ª linha com ULTRASSONOGRAFIA) diferente do final
 *   tecnica     linha "Exame realizado…" diferente da do final
 *   lacuna      "____" ou medida "0,0"
 *   duplicada   item de conclusão repetido
 *   numeracao   conclusão numerada fora de 1) 2) 3)… ou cabeçalho numerado
 *   legenda     legenda FIGO numerada como item ou repetida
 *   unidade     saco gestacional ≥ 5 "cm" (provável mm escrito como cm)
 *   fotos       "em 06 fotos" quando o final não tem
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/placar.ts <rodada> [--keys gpt,A,AS] [--min 4] [--detalhe]
 * Imprime só agregados e ids de 8 caracteres.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const dir = argv[0];
const arg = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const KEYS = (arg("keys") ?? "gpt,A,AS").split(",");
const MIN = Number(arg("min") ?? 4);

type Row = Record<string, any>;
const limpa = (l: string) => l.replace(/^[\s*#_]+|[*_]+$/g, "").trim().replace(/^\d+\)\s*/, "");
const padrao = (l: string) => limpa(l).replace(/\d+(?:[.,]\d+)?/g, "N");
const linhas = (t: string) => (t ?? "").split("\n").map(limpa).filter((l) => l.length > 15);
const conclusao = (t: string) => {
  const i = (t ?? "").search(/^[\s*#_]*CONCLUS[ÃA]O\s*:/im);
  return i < 0 ? [] : t.slice(i).split("\n").slice(1).map((l) => l.trim()).filter(Boolean);
};

const rs: Row[] = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));
const contagem = new Map<string, number>();
for (const r of rs) for (const p of new Set(linhas(r.final).map(padrao))) contagem.set(p, (contagem.get(p) ?? 0) + 1);
const PADROES = new Set([...contagem.entries()].filter(([, n]) => n >= MIN).map(([p]) => p));
const textoDe = (r: Row, k: string) => (k === "gpt" ? r.gpt : r[k]?.[0]?.text) ?? "";

type T = Record<string, number>;
const total: Record<string, T> = {};
const faltas: Record<string, Map<string, number>> = {};
for (const k of KEYS) { total[k] = {}; faltas[k] = new Map(); }
const soma = (k: string, m: string, n = 1) => { total[k][m] = (total[k][m] ?? 0) + n; };

for (const r of rs) {
  const fin = linhas(r.final);
  const finPad = fin.filter((l) => PADROES.has(padrao(l)));
  const titFin = fin.find((l) => /ULTRASSONOGRAFIA/i.test(l)) ?? "";
  const tecFin = fin.find((l) => /^Exame realizado/i.test(l)) ?? "";
  for (const k of KEYS) {
    const t = textoDe(r, k);
    if (!t) continue;
    const cand = new Set(linhas(t));
    soma(k, "casos");
    soma(k, "padraoFinal", finPad.length);
    for (const l of finPad) if (!cand.has(l)) { soma(k, "padraoFaltando"); faltas[k].set(padrao(l), (faltas[k].get(padrao(l)) ?? 0) + 1); }
    const tit = [...cand].find((l) => /ULTRASSONOGRAFIA/i.test(l)) ?? "";
    if (tit !== titFin) soma(k, "tituloDiferente");
    const tec = [...cand].find((l) => /^Exame realizado/i.test(l)) ?? "";
    if (tecFin && tec !== tecFin) soma(k, "tecnicaDiferente");
    if (/____|\b0,0\s*(cm|mm)/.test(t)) soma(k, "lacuna0");
    const conc = conclusao(t);
    const itens = conc.map((l) => l.replace(/^\d+\)\s*/, ""));
    if (new Set(itens).size < itens.length) soma(k, "conclusaoDuplicada");
    const nums = conc.map((l) => l.match(/^(\d+)\)/)?.[1]).filter(Boolean).map(Number);
    if (nums.some((n, i) => n !== i + 1) || /^\s*\d+\)\s*(ULTRASSONOGRAFIA|COMENT|OS SEGUINTES|FIGO|Obs)/im.test(t)) soma(k, "numeracao");
    if ((t.match(/FIGO: Federa/g) ?? []).length > 1 || /^\s*\d+\)\s*FIGO:/m.test(t)) soma(k, "legendaFIGO");
    const sg = t.match(/saco gestacional[^.\n]{0,40}?(\d+(?:,\d+)?)\s*(?:x\s*\d+(?:,\d+)?\s*)*cm/i);
    if (sg && Number(sg[1].replace(",", ".")) >= 5) soma(k, "unidadeSaco");
    if (/obtida em 06 fotos/.test(t) && !/obtida em 06 fotos/.test(r.final)) soma(k, "fotosDiferente");
  }
}

console.log(`rodada ${dir.split("/").pop()} · ${rs.length} casos · ${PADROES.size} frases-padrão (≥ ${MIN} finais)`);
const cols: [string, string][] = [["padraoFaltando", "frases-padrão faltando"], ["tituloDiferente", "título ≠"], ["tecnicaDiferente", "técnica ≠"], ["fotosDiferente", "\"06 fotos\" a mais"], ["lacuna0", "____ ou 0,0"], ["conclusaoDuplicada", "conclusão duplicada"], ["numeracao", "numeração"], ["legendaFIGO", "legenda FIGO"], ["unidadeSaco", "saco em cm"]];
console.log(`| candidato | ${cols.map((c) => c[1]).join(" | ")} |`);
console.log(`|---|${cols.map(() => "---").join("|")}|`);
for (const k of KEYS) {
  const t = total[k];
  const pf = `${t.padraoFaltando ?? 0}/${t.padraoFinal ?? 0} (${((100 * (t.padraoFaltando ?? 0)) / Math.max(1, t.padraoFinal ?? 0)).toFixed(1)}%)`;
  console.log(`| ${k} | ${[pf, ...cols.slice(1).map(([c]) => String(t[c] ?? 0))].join(" | ")} |`);
}
if (argv.includes("--detalhe")) {
  for (const k of KEYS) {
    console.log(`\nfrases-padrão mais faltantes — ${k}:`);
    [...faltas[k].entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([p, n]) => console.log(`  ${n}× ${p.slice(0, 150)}`));
  }
}
