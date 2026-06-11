/**
 * DET-2 — Diff/sync do bundle determinístico vs FONTE VIVA.
 *
 * Compara os knowledge_blocks `validated` de cada categoria com a fonte de
 * verdade viva (`~/laudousg/lib/categoryDefaults.ts` + `globalRules.ts`,
 * LEITURA APENAS) e acusa:
 *
 *   DRIFT — trecho de bloco que NÃO existe na fonte viva (bloco editado,
 *           inventado, ou a fonte mudou depois da curadoria);
 *   GAP   — parágrafo da fonte viva que NÃO está coberto por nenhum bloco
 *           nem pelo contrato hardcoded da categoria.
 *
 * Divergências DELIBERADAS (curadoria própria do mobile, ex: regra
 * preservar-terminologia) entram em scripts/diff-allowlist.json e não
 * contam como drift.
 *
 * Uso:
 *   pnpm exec tsx scripts/diff-bundle-vs-original.ts                      # todas
 *   pnpm exec tsx scripts/diff-bundle-vs-original.ts OBSTETRICA TIREOIDE  # algumas
 *   DIFF_VERBOSE=1 ...                                                    # mostra trechos
 *
 * Exit code 1 se houver DRIFT/GAP fora da allowlist (uso em CI / pré-onda).
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getDbClient } from "../packages/db/src/client";
import { sql } from "drizzle-orm";
import { CATEGORY_CONTRACTS } from "../apps/api/src/server/prompts/contracts";
import {
  GLOBAL_RULES_BLOCK,
  GLOBAL_PROHIBITIONS,
} from "../apps/api/src/server/prompts/global";

const ORIGINAL_ROOT = process.env.LAUDOUSG_ORIGINAL_ROOT ?? "/Users/luizprazeres/laudousg";
const CATEGORY_DEFAULTS_PATH = path.join(ORIGINAL_ROOT, "lib/categoryDefaults.ts");
const GLOBAL_RULES_PATH = path.join(ORIGINAL_ROOT, "lib/globalRules.ts");
const ALLOWLIST_PATH = path.join(process.cwd(), "scripts/diff-allowlist.json");
const VERBOSE = process.env.DIFF_VERBOSE === "1";

type AllowEntry = {
  category: string;
  /** Título exato do bloco com curadoria própria (todo o bloco é aceito). */
  blockTitle?: string;
  /** Prefixo (normalizado) de um fragmento específico aceito. */
  fragmentPrefix?: string;
  reason: string;
};

function normalize(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove o cabeçalho "GATILHOS DE APLICAÇÃO:" (metadado do bloco, não é fonte). */
function stripGatilhos(content: string): string {
  return content.replace(/^GATILHOS DE APLICAÇÃO:[\s\S]*?(\n\s*\n|$)/u, "");
}

/** Quebra texto em fragmentos comparáveis (parágrafos separados por linha em branco). */
function fragments(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => normalize(p))
    .filter((p) => p.length >= 40); // ignora linhas curtas (títulos, "CONCLUSÃO:")
}

function parseCategoryDefaults(filePath: string): Map<string, string> {
  const src = fs.readFileSync(filePath, "utf8");
  const map = new Map<string, string>();
  const re = /^\s{2}([A-Z][A-Z0-9_]*):\s*`/gm;
  let m: RegExpExecArray | null;
  const keys: { key: string; start: number }[] = [];
  while ((m = re.exec(src))) {
    keys.push({ key: m[1]!, start: m.index + m[0]!.length });
  }
  for (const { key, start } of keys) {
    const end = src.indexOf("`", start);
    if (end === -1) continue;
    map.set(key, src.slice(start, end));
  }
  return map;
}

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const fonte = parseCategoryDefaults(CATEGORY_DEFAULTS_PATH);
  const globalFonte = fs.readFileSync(GLOBAL_RULES_PATH, "utf8");
  const allowlist: AllowEntry[] = fs.existsSync(ALLOWLIST_PATH)
    ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"))
    : [];

  const db = getDbClient();
  // array[...]::text[] explícito — mesmo fix do retriever (drizzle expande
  // array JS como row constructor, não como text[]).
  const filter = requested.length
    ? sql`and category_code = any(array[${sql.join(
        requested.map((c) => sql`${c}`),
        sql`, `,
      )}]::text[])`
    : sql``;
  const rows = (await db.execute(sql`
    select category_code, writing_style_id, kind, title, content
    from knowledge_blocks
    where status = 'validated' ${filter}
    order by category_code, kind, priority desc, title
  `)) as unknown as Array<{
    category_code: string;
    writing_style_id: string;
    kind: string;
    title: string;
    content: string;
  }>;

  const byCategory = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byCategory.get(r.category_code) ?? [];
    list.push(r);
    byCategory.set(r.category_code, list);
  }

  let totalDrift = 0;
  let totalGap = 0;
  const proposals: AllowEntry[] = [];

  // ---- Check 0: regras globais hardcoded vs lib/globalRules.ts ----
  const globalNorm = normalize(globalFonte);
  const globalMissing = [GLOBAL_RULES_BLOCK, GLOBAL_PROHIBITIONS]
    .flatMap((b) => fragments(b))
    .filter(
      (f) =>
        !globalNorm.includes(f) &&
        !isAllowed(allowlist, "GLOBAL", undefined, f),
    );
  if (globalMissing.length > 0) {
    console.log(
      `\nGLOBAL: ${globalMissing.length} fragmento(s) do GLOBAL_RULES/PROHIBITIONS sem correspondência em lib/globalRules.ts (curadoria própria do mobile — adicionar à allowlist se deliberado)`,
    );
    if (VERBOSE) globalMissing.forEach((f) => console.log(`  DRIFT-GLOBAL: ${f.slice(0, 110)}…`));
  }

  for (const [category, blocks] of [...byCategory.entries()].sort()) {
    const fonteSection = fonte.get(category);
    if (!fonteSection) {
      console.log(`\n${category}: ⚠️ SEM seção na fonte viva (categoria não existe no original) — ${blocks.length} blocos não verificáveis`);
      continue;
    }
    const fonteNorm = normalize(fonteSection);

    // dedupe blocos idênticos entre estilos
    const unique = new Map<string, { title: string; kind: string; content: string }>();
    for (const b of blocks) {
      unique.set(`${b.title}::${normalize(b.content)}`, b);
    }

    // ---- Check A: DRIFT (bloco → fonte) ----
    const drifts: { title: string; fragment: string }[] = [];
    for (const b of unique.values()) {
      if (isAllowed(allowlist, category, b.title, undefined)) continue;
      for (const frag of fragments(stripGatilhos(b.content))) {
        if (fonteNorm.includes(frag)) continue;
        if (isAllowed(allowlist, category, undefined, frag)) continue;
        drifts.push({ title: b.title, fragment: frag });
      }
    }

    // ---- Check B: GAP (fonte → blocos + contrato) ----
    const contract = CATEGORY_CONTRACTS[category] ?? "";
    const covered = normalize(
      [...unique.values()].map((b) => b.content).join("\n\n") + "\n\n" + contract,
    );
    const gaps = fragments(fonteSection).filter(
      (f) => !covered.includes(f) && !isAllowed(allowlist, category, undefined, f),
    );

    totalDrift += drifts.length;
    totalGap += gaps.length;
    for (const title of new Set(drifts.map((d) => d.title))) {
      proposals.push({ category, blockTitle: title, reason: "PREENCHER — curadoria mobile (decisão mesclar DET-2)" });
    }
    for (const g of gaps) {
      proposals.push({ category, fragmentPrefix: g.slice(0, 60), reason: "PREENCHER — não semeado (conflita com curadoria mobile / coberto)" });
    }

    const status = drifts.length === 0 && gaps.length === 0 ? "✅" : "❌";
    console.log(
      `\n${category}: ${status} ${unique.size} blocos únicos | drift=${drifts.length} gap=${gaps.length}`,
    );
    if (drifts.length && (VERBOSE || drifts.length <= 30)) {
      for (const d of drifts) console.log(`  DRIFT [${d.title}]: ${d.fragment.slice(0, 110)}…`);
    }
    if (gaps.length && (VERBOSE || gaps.length <= 30)) {
      for (const g of gaps) console.log(`  GAP: ${g.slice(0, 110)}…`);
    }
  }

  console.log(`\n— total: drift=${totalDrift} gap=${totalGap} (allowlist: ${allowlist.length} entradas)`);
  if (process.argv.includes("--emit-allowlist") && proposals.length > 0) {
    console.log("\n--emit-allowlist (revisar reasons antes de mesclar em scripts/diff-allowlist.json):");
    console.log(JSON.stringify(proposals, null, 2));
  }
  if (totalDrift + totalGap > 0) process.exitCode = 1;
  process.exit();
}

function isAllowed(
  allowlist: AllowEntry[],
  category: string,
  blockTitle: string | undefined,
  fragment: string | undefined,
): boolean {
  return allowlist.some((e) => {
    if (e.category !== category) return false;
    if (e.blockTitle !== undefined && blockTitle !== undefined) {
      return e.blockTitle === blockTitle;
    }
    if (e.fragmentPrefix !== undefined && fragment !== undefined) {
      return fragment.startsWith(normalize(e.fragmentPrefix));
    }
    return false;
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
