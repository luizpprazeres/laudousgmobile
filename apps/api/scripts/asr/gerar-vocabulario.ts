/**
 * Gera src/server/asr/vocabulario.json: palavras da casa por categoria, para o árbitro de grafia
 * (jevArbiter.ts) achar palavras fora do vocabulário e montar candidatas.
 * Fonte: knowledge_blocks validados (SÓ LEITURA) + keyterms da categoria. Só entra palavra que
 * aparece ≥ 2 vezes nos blocos da categoria (corta nome solto de exemplo) ou nos keyterms.
 * Rodar (de apps/api): pnpm exec tsx scripts/asr/gerar-vocabulario.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { ALL_MEDICAL_ASR_KEYTERMS, medicalAsrKeytermsForCategory } from "../../src/server/asr/medicalGlossary";
config({ path: join(__dirname, "../../../../.env") });
config({ path: "/Users/luizprazeres/laudousgmobile-def/.env" });
const RE = /[\p{L}][\p{L}-]*/gu;
const chave = (w: string) => w.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
async function main() {
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = await sql`select category_code, content from knowledge_blocks where status::text = 'validated'`;
  await sql.end();
  const porCat = new Map<string, Map<string, { grafia: string; n: number }>>();
  const add = (cat: string, w: string, n = 1) => {
    if (w.length < 3) return;
    const m = porCat.get(cat) ?? new Map(); porCat.set(cat, m);
    const k = chave(w); const cur = m.get(k);
    // guarda a grafia acentuada mais frequente
    if (!cur) m.set(k, { grafia: w.toLowerCase(), n }); else { cur.n += n; if (/[^\x00-\x7f]/.test(w) && !/[^\x00-\x7f]/.test(cur.grafia)) cur.grafia = w.toLowerCase(); }
  };
  for (const r of rows as any[]) for (const w of String(r.content).match(RE) ?? []) add(r.category_code, w);
  const out: Record<string, string[]> = {};
  for (const [cat, m] of porCat) {
    for (const k of medicalAsrKeytermsForCategory(cat)) for (const w of k.match(RE) ?? []) add(cat, w, 99);
    out[cat] = [...m.values()].filter((x) => x.n >= 2).map((x) => x.grafia).sort();
  }
  out["*"] = [...new Set(ALL_MEDICAL_ASR_KEYTERMS.flatMap((k) => (k.match(RE) ?? []).map((w) => w.toLowerCase())).filter((w) => w.length >= 3))].sort();
  writeFileSync(join(__dirname, "../../src/server/asr/vocabulario.json"), JSON.stringify(out));
  console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
}
main().catch((e) => { console.error(e); process.exit(1); });
