/**
 * MINERAÇÃO DO LÉXICO (W11) — sem LLM, banco só leitura.
 *
 * Para cada laudo com final salvo nos últimos N dias:
 *   1. VIGILÂNCIA: famílias de termos (variantes erradas → canônico) contadas por CAMADA:
 *      ditado (o que o ASR/médico entregou), gerado (o que a IA escreveu) e final (o que o médico
 *      assinou). Origem do erro: ASR quando a variante está no ditado; IA quando está no gerado e
 *      não no ditado. "corrigido" = a variante saiu do gerado e o canônico está no final.
 *   2. DESCOBERTA: trocas curtas (≤ 3 palavras de cada lado) que o médico fez entre o gerado e o
 *      final, por diff de palavras; agregadas e contadas (sem números puros).
 *
 * Grava o detalhe em tmp-review/haiku-migration/lexico/ (pode conter trecho de laudo — fora do git)
 * e imprime só agregados.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/lexico-mineracao.ts [--days 180]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });
const argv = process.argv.slice(2);
const DAYS = Number(argv[argv.indexOf("--days") + 1] || 180) || 180;

type Familia = { id: string; canonico: string; errado: RegExp; certo: RegExp; escopo?: string[] };
const NUM = String.raw`(?:\d+|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito)`;
export const FAMILIAS: Familia[] = [
  { id: "ecogenico-adj", canonico: "hipoecoico/hiperecoico/anecoico/isoecoico",
    errado: /\b(?:hipo|hiper|an|iso)ecog[êe]nic[oa]s?\b/gi, certo: /\b(?:hipo|hiper|an|iso)ecoic[oa]s?\b/gi },
  { id: "ecogenico-solto", canonico: "(decisão do Luiz) ecogênico sozinho",
    errado: /\becog[êe]nic[oa]s?\b/gi, certo: /\becoic[oa]s?\b/gi },
  { id: "ecoico-acento", canonico: "anecoico (sem acento)",
    errado: /\b(?:an|hipo|hiper|iso)?ec[óÓ]ic[oa]s?\b/g, certo: /\b(?:an|hipo|hiper|iso)ecoic[oa]s?\b/gi },
  { id: "quadrante-superolateral", canonico: "superolateral", escopo: ["MAMARIA"],
    errado: /\b(?:super(?:ior)?[\s-]+lateral|s[úu]pero[\s-]+lateral|s[úu]pero-?lateral(?<!superolateral)|superior\s+externo)\b/gi, certo: /\bsuperolateral\b/gi },
  { id: "quadrante-inferolateral", canonico: "inferolateral", escopo: ["MAMARIA"],
    errado: /\b(?:infer(?:ior)?[\s-]+lateral|[íi]nfero[\s-]+lateral|[íi]nfero-lateral|inferior\s+externo)\b/gi, certo: /\binferolateral\b/gi },
  { id: "quadrante-superomedial", canonico: "superomedial", escopo: ["MAMARIA"],
    errado: /\b(?:super(?:ior)?[\s-]+medial|s[úu]pero[\s-]+medial|s[úu]pero-medial|superior\s+interno)\b/gi, certo: /\bsuperomedial\b/gi },
  { id: "quadrante-inferomedial", canonico: "inferomedial", escopo: ["MAMARIA"],
    errado: /\b(?:infer(?:ior)?[\s-]+medial|[íi]nfero[\s-]+medial|[íi]nfero-medial|inferior\s+interno)\b/gi, certo: /\binferomedial\b/gi },
  { id: "compartimento-arabico", canonico: "compartimento em romano (I…VI)", escopo: ["MUSCULOESQUELETICO_V2", "MUSCULOESQUELETICO"],
    errado: new RegExp(String.raw`\bcompartimentos?\s+(?:extensor(?:es)?\s+)?${NUM}\b`, "gi"), certo: /\bcompartimentos?\s+(?:extensor(?:es)?\s+)?(?:I{1,3}|IV|VI?)\b/g },
  { id: "segmento-hepatico-arabico", canonico: "segmento hepático em romano (I…VIII)", escopo: ["ABDOMEN_TOTAL", "ABDOMEN_SUPERIOR", "ABDOMEN_TOTAL_DOPPLER", "DOPPLER_HEPATICO"],
    errado: new RegExp(String.raw`\bsegmentos?\s+(?:hep[áa]tico\s+)?${NUM}\b`, "gi"), certo: /\bsegmentos?\s+(?:hep[áa]tico\s+)?(?:I{1,3}|IV|VI{0,3}|V)\b/g },
  { id: "bursa", canonico: "bursa subacromial-subdeltoidea (grafia a decidir)",
    errado: /\b(?:bolsa|bursa)\s+(?:sub[\s-]?acromial[\s-]+sub[\s-]?delt[óo]i?de[ao]?|subacromial\s+e\s+subdelt[óo]i?de[ao])\b/gi, certo: /\bbursa\s+subacromial-subdeltoidea\b/gi },
  { id: "tendinopatia", canonico: "tendinopatia",
    errado: /\b(?:tendinite|tendinose|tendinopatias?\s+degenerativ)/gi, certo: /\btendinopatia\b/gi },
  { id: "metacarpofalangiana", canonico: "metacarpofalangiana",
    errado: /\bmetacarpo[\s-]*falang(?:e|ea|eana|eano|iano|eais)\b|\bmetacarpofalang(?:eana|eano|ea|iano)\b|\bmetacarpo[\s-]+falangiana\b/gi, certo: /\bmetacarpofalangian[ao]s?\b/gi },
  { id: "corticomedular", canonico: "corticomedular / córtico-medular (a decidir)",
    errado: /\bc[óo]rtico[\s]+medular\b/gi, certo: /\bc[óo]rtico-?medular\b/gi },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tokens = (s: string) => (s ?? "").replace(/[*_#]/g, " ").split(/\s+/).filter(Boolean);
const limpa = (w: string) => w.replace(/^[("“'[]+|[)"”'\].,;:!?]+$/g, "");

/** Trocas do diff de palavras (LCS) com no máximo `max` palavras de cada lado. */
function trocas(a: string[], b: string[], max = 3): [string, string][] {
  const n = a.length, m = b.length;
  if (n * m > 4_000_000) return [];
  const A = a.map((w) => norm(limpa(w))), B = b.map((w) => norm(limpa(w)));
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: [string, string][] = [];
  let i = 0, j = 0, del: string[] = [], ins: string[] = [];
  const flush = () => {
    if ((del.length || ins.length) && del.length <= max && ins.length <= max && del.length && ins.length) out.push([del.join(" "), ins.join(" ")]);
    del = []; ins = [];
  };
  while (i < n && j < m) {
    if (A[i] === B[j]) { flush(); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) del.push(limpa(a[i++]));
    else ins.push(limpa(b[j++]));
  }
  while (i < n) del.push(limpa(a[i++]));
  while (j < m) ins.push(limpa(b[j++]));
  flush();
  return out;
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select id, category_code cat, coalesce(consolidated_transcript, raw_input, '') ditado,
      coalesce(generated_output, '') gerado, final_output final
    from reports where final_output is not null and created_at > now() - make_interval(days => ${DAYS})`;
  await sql.end();
  const out = join(REPO, "tmp-review/haiku-migration/lexico");
  mkdirSync(out, { recursive: true });

  // 1. Vigilância por camada
  console.log(`laudos com final (${DAYS} dias): ${rows.length}\n`);
  console.log("| família | canônico | ditado | gerado (IA) | final | origem ASR | origem IA | corrigido pelo médico | ficou no final | categorias |");
  console.log("|---|---|---|---|---|---|---|---|---|---|");
  const exemplos: Record<string, string[]> = {};
  for (const f of FAMILIAS) {
    let dit = 0, ger = 0, fin = 0, asr = 0, ia = 0, corr = 0, ficou = 0;
    const cats = new Map<string, number>();
    for (const r of rows) {
      const has = (t: string) => { f.errado.lastIndex = 0; return f.errado.test(t); };
      const d = has(r.ditado), g = has(r.gerado), fi = has(r.final);
      if (!(d || g || fi)) continue;
      dit += +d; ger += +g; fin += +fi;
      if (d && (g || fi)) asr++;
      if (g && !d) ia++;
      f.certo.lastIndex = 0;
      if (g && !fi && f.certo.test(r.final)) corr++;
      if (fi) ficou++;
      cats.set(r.cat, (cats.get(r.cat) ?? 0) + 1);
      f.errado.lastIndex = 0;
      for (const m of `${r.ditado}\n${r.gerado}\n${r.final}`.matchAll(f.errado)) (exemplos[f.id] ??= []).push(m[0]);
    }
    const catTxt = [...cats].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${c} ${n}`).join(", ");
    console.log(`| ${f.id} | ${f.canonico} | ${dit} | ${ger} | ${fin} | ${asr} | ${ia} | ${corr} | ${ficou} | ${catTxt} |`);
  }
  const variantes = Object.fromEntries(Object.entries(exemplos).map(([k, v]) => {
    const c = new Map<string, number>();
    for (const x of v) c.set(x.toLowerCase(), (c.get(x.toLowerCase()) ?? 0) + 1);
    return [k, [...c].sort((a, b) => b[1] - a[1]).slice(0, 15)];
  }));
  console.log("\nvariantes vistas (ditado+gerado+final):");
  for (const [k, v] of Object.entries(variantes)) console.log(`  ${k}: ${v.map(([t, n]) => `${t} (${n})`).join(" · ")}`);

  // 2. Descoberta: trocas IA → médico
  const pares = new Map<string, { n: number; cats: Map<string, number> }>();
  for (const r of rows) {
    if (r.final === r.gerado || !r.gerado) continue;
    for (const [de, para] of trocas(tokens(r.gerado), tokens(r.final))) {
      if (/^[\d\s.,x%/-]*$/.test(de) && /^[\d\s.,x%/-]*$/.test(para)) continue; // só número/pontuação
      if (norm(de) === norm(para)) continue;
      const k = `${de.toLowerCase()} → ${para.toLowerCase()}`;
      const p = pares.get(k) ?? { n: 0, cats: new Map() };
      p.n++; p.cats.set(r.cat, (p.cats.get(r.cat) ?? 0) + 1);
      pares.set(k, p);
    }
  }
  const top = [...pares].filter(([, p]) => p.n >= 3).sort((a, b) => b[1].n - a[1].n);
  writeFileSync(join(out, `trocas-ia-medico-${DAYS}d.json`), JSON.stringify(top.map(([k, p]) => ({ troca: k, n: p.n, cats: Object.fromEntries(p.cats) })), null, 1));
  writeFileSync(join(out, `variantes-${DAYS}d.json`), JSON.stringify(variantes, null, 1));
  console.log(`\ntrocas IA → médico com n ≥ 3: ${top.length} (detalhe em ${out})`);
  for (const [k, p] of top.slice(0, 70)) console.log(`  ${String(p.n).padStart(3)}  ${k}   [${[...p.cats].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} ${n}`).join(", ")}]`);
}
main().catch((e) => { console.error(e); process.exit(1); });
