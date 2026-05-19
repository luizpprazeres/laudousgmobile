/**
 * Extração de laudos reais anonimizados do banco Supabase do LaudoUSG legacy
 * (laudousg.com produção, instância gimxiyjfuaqptahssqgb).
 *
 * Modos:
 *   tsx scripts/extract-from-legacy.ts --discover
 *     → Lista tabelas e schema. Não escreve nada.
 *
 *   tsx scripts/extract-from-legacy.ts --category=DOPPLER_OBSTETRICO --days=30
 *     → Extrai laudos da categoria nos últimos N dias, anonimiza, escreve em
 *       _extraction/from-laudousg-original/07-laudos-reais-anonimizados/{slug}_30d.md
 *
 * Lê credenciais de /Users/luizprazeres/laudousg/.env.local (read-only).
 */

import fs from "node:fs";
import path from "node:path";

const LEGACY_ENV = "/Users/luizprazeres/laudousg/.env.local";
const ROOT = process.cwd();
const OUT_DIR = path.resolve(
  ROOT,
  "_extraction/from-laudousg-original/07-laudos-reais-anonimizados",
);

// ─── Parse env ────────────────────────────────────────────────────
function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim();
  }
  return out;
}

const env = parseEnv(fs.readFileSync(LEGACY_ENV, "utf8"));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Credenciais legacy ausentes em", LEGACY_ENV);
  process.exit(1);
}

// ─── CLI args ─────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.slice(2).split("=");
      return [k, v ?? "true"];
    }),
);
const DISCOVER = args.discover === "true";
const CATEGORY = (args.category as string | undefined)?.toUpperCase();
const DAYS = Number(args.days ?? 30);

// ─── REST helper ──────────────────────────────────────────────────
async function rest(
  pathStr: string,
  opts: { method?: string; query?: Record<string, string> } = {},
): Promise<Response> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${pathStr}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    url.searchParams.set(k, v);
  }
  return fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

// ─── Discovery: encontrar tabela de reports + colunas ─────────────
async function discover(): Promise<void> {
  const candidates = ["reports", "laudos", "report", "laudo", "generated_reports"];
  for (const table of candidates) {
    const res = await rest(table, { query: { limit: "1", select: "*" } });
    if (res.ok) {
      const rows = (await res.json()) as Record<string, unknown>[];
      console.log(`✅ Tabela encontrada: ${table}`);
      if (rows.length > 0) {
        console.log(`\nColunas:`);
        for (const [k, v] of Object.entries(rows[0])) {
          const type = v === null ? "null" : typeof v;
          const preview =
            typeof v === "string" ? `"${v.slice(0, 80).replace(/\n/g, " ")}..."` :
            v === null ? "null" : String(v).slice(0, 80);
          console.log(`  ${k}: ${type} = ${preview}`);
        }
      } else {
        console.log(`  (tabela vazia)`);
      }
      return;
    } else {
      console.log(`  ${table}: HTTP ${res.status}`);
    }
  }
  console.error(`❌ Nenhuma tabela conhecida encontrada. Status=404 em todas.`);
  process.exit(1);
}

// ─── Anonimização ─────────────────────────────────────────────────
function anonymizeName(name: string | null | undefined): string {
  if (!name) return "[Médico solicitante anonimizado]";
  return "[Médico solicitante anonimizado]";
}

function anonymizePatient(name: string | null | undefined): string {
  return "[Paciente anonimizado]";
}

// ─── Extração ─────────────────────────────────────────────────────
async function extract(category: string, days: number): Promise<void> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/reports?select=*&category=eq.${category}&created_at=gte.${since}&order=created_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    console.error(`❌ Falha HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  console.log(`✅ ${rows.length} laudos encontrados pra ${category} (${days}d)`);
  if (rows.length === 0) {
    console.log(`Nada a escrever.`);
    return;
  }

  // Schema descoberto: output_text + findings_text + category + created_at
  const slug = category.toLowerCase();
  const studyLabel = `Usg ${category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())}`;
  const lines: string[] = [];
  lines.push(`# Laudos Extraidos - USG ${category.replace(/_/g, " ")}`);
  lines.push(`Periodo: ${days}d | Total: ${rows.length} laudos`);
  lines.push(`Extraido em: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const text = (r.output_text as string) ?? "";
    const dateVal = (r.created_at as string) ?? "";
    lines.push(`## Laudo ${i + 1} — ${anonymizeName(null)}`);
    lines.push(`**Estudo:** ${studyLabel}`);
    lines.push(`**Data:** ${dateVal.slice(0, 10)}`);
    lines.push(`**Paciente:** ${anonymizePatient(null)}`);
    lines.push("");
    lines.push("```");
    lines.push(text.trim());
    lines.push("```");
    lines.push("");
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${slug}_${days}d.md`);
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`✅ Escrito: ${path.relative(ROOT, outPath)}`);
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  if (DISCOVER) {
    await discover();
    return;
  }
  if (!CATEGORY) {
    console.error("Uso: --discover  OU  --category=DOPPLER_OBSTETRICO [--days=30]");
    process.exit(1);
  }
  await extract(CATEGORY, DAYS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
