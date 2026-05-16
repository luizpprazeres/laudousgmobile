/**
 * Golden validation — harness que compara o pipeline LaudoUSG contra laudos
 * reais validados do antigo (`_extraction/from-laudousg-original/07-...`).
 *
 * Estratégia (versão MVP — structurer + writer, sem RAG nem sanity):
 *
 *   1. Parse dos .md → array de laudos por categoria.
 *   2. Sample N por categoria.
 *   3. Pra cada amostra:
 *      a. SYNTH (LLM): laudo final → frase curta como médico ditaria.
 *      b. STRUCT (LLM): frase ditada → JSON estruturado (mesmo schema do prod).
 *      c. WRITER (LLM): JSON + categoria → laudo gerado.
 *      d. DIFF: extrai medidas/termos/conclusões do gabarito e do gerado, compara.
 *   4. Relatório markdown em scripts/.golden-reports/YYYY-MM-DDTHH.md
 *
 * Não roda retriever/RAG nem sanity check da IA — propósito é detectar gaps de
 * formato e fidelidade do writer principal, não calibrar RAG ainda.
 *
 * Uso:
 *   pnpm exec tsx scripts/golden-validation.ts [--samples=5] [--category=ABDOMEN_TOTAL|MAMARIA|TIREOIDE]
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

// Rodamos como bundle CJS (esbuild) — usa cwd() como raiz do monorepo
// (pnpm é executado da raiz por convenção do package.json).
const ROOT = process.cwd();

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
const SAMPLES = Number(args.samples ?? 5);
const CATEGORY_FILTER = (args.category as string | undefined)?.toUpperCase();

// ─── Categorias suportadas ────────────────────────────────────────
type Category = "ABDOMEN_TOTAL" | "MAMARIA" | "TIREOIDE";
const CATEGORIES: { id: Category; file: string; label: string }[] = [
  {
    id: "ABDOMEN_TOTAL",
    file: "_extraction/from-laudousg-original/07-laudos-reais-anonimizados/abdome_total_30d.md",
    label: "Abdome Total",
  },
  {
    id: "MAMARIA",
    file: "_extraction/from-laudousg-original/07-laudos-reais-anonimizados/mamas_30d.md",
    label: "Mamária",
  },
  {
    id: "TIREOIDE",
    file: "_extraction/from-laudousg-original/07-laudos-reais-anonimizados/tireoide_30d.md",
    label: "Tireoide",
  },
];

// ─── Parser dos .md ───────────────────────────────────────────────
function parseLaudos(filePath: string): string[] {
  const text = fs.readFileSync(filePath, "utf8");
  // Cada laudo está entre crases triplas — formato visto no abdome_total_30d.md
  const matches = [...text.matchAll(/```[\r\n]+([\s\S]*?)```/g)];
  return matches.map((m) => m[1].trim()).filter((s) => s.length > 50);
}

// ─── Extração de features pra diff ────────────────────────────────
const MEASURE_RE =
  /(?<![\w])(\d+(?:[,.]\d+)?)\s*(cm³|cm3|mm³|mm3|ml|mL|mm|cm)\b/giu;
const RADS_RE =
  /\b(BI[- ]?RADS|TI[- ]?RADS|O[- ]?RADS|Domingos|FIGO)\s*[:\-]?\s*([0-6][ABC]?|IV[ABC]?|III[ABC]?|II[ABC]?|I[ABC]?|V)\b/giu;

function extractMeasures(t: string): string[] {
  const out = new Set<string>();
  for (const m of t.matchAll(MEASURE_RE)) {
    const value = m[1].replace(",", ".");
    const unit = m[2].toLowerCase().replace("³", "3");
    out.add(`${value}${unit}`);
  }
  return [...out];
}

function extractRads(t: string): string[] {
  const out = new Set<string>();
  for (const m of t.matchAll(RADS_RE)) {
    const sys = m[1].replace(/[- ]/g, "").toUpperCase();
    out.add(`${sys}:${m[2].toUpperCase()}`);
  }
  return [...out];
}

function extractConclusion(t: string): string {
  const lower = t.toLowerCase();
  const idx = lower.indexOf("opinião");
  const idx2 = lower.indexOf("conclusão");
  const pos = Math.max(idx, idx2);
  if (pos < 0) return "";
  return t.slice(pos).slice(0, 800).trim();
}

// ─── OpenAI calls ─────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL_WRITER ?? "gpt-4.1-mini";

async function synthesizeAchados(
  laudo: string,
  categoria: string,
): Promise<string> {
  const sys = `Você simula o que o médico ditou no microfone que originou o laudo final abaixo. Responda APENAS com a frase ditada — curta, telegráfica, com medidas e classificações se houver (BI-RADS, TI-RADS, etc.). Não inclua frases de protocolo padrão (ex: "vesícula normodistendida com paredes finas"). Inclua só os ACHADOS RELEVANTES (lesões, medidas, lateralidade, comparações). Categoria: ${categoria}.`;
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: `LAUDO FINAL:\n\n${laudo}` },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

async function runStructurer(
  achados: string,
  categoria: string,
): Promise<Record<string, unknown> | null> {
  const sys = `Você é a etapa estruturadora do LaudoUSG Mobile. Organize o que o médico ditou em JSON puro. NÃO escreva laudo. Campos: { categoria_detectada, tipo_exame, achados (objeto), comandos_do_medico (array), medidas_extraidas (array de strings com unidade), classificacoes_rads (array de strings tipo "BI-RADS 2") }. NUNCA invente. NUNCA calcule classificações. Categoria sugerida: ${categoria}.`;
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: `Input: ${achados}` },
    ],
  });
  const raw = res.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function runWriter(
  structured: Record<string, unknown>,
  categoria: string,
  categoriaLabel: string,
): Promise<string> {
  const sys = `Você é o gerador de laudos do LaudoUSG. Categoria: ${categoriaLabel} (${categoria}). Reproduza fielmente os achados, medidas e classificações do JSON. Use português técnico ABR. Estrutura padrão: título em caixa alta, ANÁLISE (corpo do laudo com seções por órgão), OPINIÃO/CONCLUSÃO. NÃO calcule BI-RADS/TI-RADS — só reproduza. NÃO invente achados.`;
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      {
        role: "user",
        content: `Achados estruturados:\n\`\`\`json\n${JSON.stringify(structured, null, 2)}\n\`\`\`\n\nRetorne SOMENTE o laudo final.`,
      },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

// ─── Diff ─────────────────────────────────────────────────────────
type SampleResult = {
  categoria: Category;
  index: number;
  laudoGabarito: string;
  achadosSinteticos: string;
  laudoGerado: string;
  measuresGabarito: string[];
  measuresGerado: string[];
  measuresPerdidas: string[];
  measuresInventadas: string[];
  radsGabarito: string[];
  radsGerado: string[];
  radsDivergente: boolean;
  conclusionMatch: boolean;
  durationMs: number;
};

function diff(
  categoria: Category,
  index: number,
  laudoGabarito: string,
  achadosSinteticos: string,
  laudoGerado: string,
  durationMs: number,
): SampleResult {
  const measuresGabarito = extractMeasures(laudoGabarito);
  const measuresGerado = extractMeasures(laudoGerado);
  const measuresPerdidas = measuresGabarito.filter(
    (m) => !measuresGerado.includes(m),
  );
  const measuresInventadas = measuresGerado.filter(
    (m) => !measuresGabarito.includes(m),
  );

  const radsGabarito = extractRads(laudoGabarito);
  const radsGerado = extractRads(laudoGerado);
  const radsDivergente =
    radsGabarito.length !== radsGerado.length ||
    radsGabarito.some((r) => !radsGerado.includes(r)) ||
    radsGerado.some((r) => !radsGabarito.includes(r));

  // Conclusion match: simplista — texto da conclusão tem keyword principal
  const conclGab = extractConclusion(laudoGabarito).toLowerCase();
  const conclGen = extractConclusion(laudoGerado).toLowerCase();
  const conclusionMatch =
    conclGab.length > 0 &&
    conclGen.length > 0 &&
    sharedKeywordRatio(conclGab, conclGen) >= 0.4;

  return {
    categoria,
    index,
    laudoGabarito,
    achadosSinteticos,
    laudoGerado,
    measuresGabarito,
    measuresGerado,
    measuresPerdidas,
    measuresInventadas,
    radsGabarito,
    radsGerado,
    radsDivergente,
    conclusionMatch,
    durationMs,
  };
}

function sharedKeywordRatio(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4),
    );
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / A.size;
}

// ─── Report ───────────────────────────────────────────────────────
function buildReport(results: SampleResult[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString();
  lines.push(`# Golden Validation Report — ${now}`);
  lines.push("");
  lines.push(`**Modelo writer:** \`${MODEL}\`  `);
  lines.push(`**Amostras totais:** ${results.length}`);
  lines.push("");

  // Stats por categoria
  const byCat = new Map<Category, SampleResult[]>();
  for (const r of results) {
    if (!byCat.has(r.categoria)) byCat.set(r.categoria, []);
    byCat.get(r.categoria)!.push(r);
  }

  lines.push("## 📊 Stats por categoria");
  lines.push("");
  lines.push("| Categoria | N | Medidas OK | RADS OK | Conclusão OK |");
  lines.push("|---|---|---|---|---|");
  for (const [cat, group] of byCat) {
    const measuresOk = group.filter((r) => r.measuresPerdidas.length === 0).length;
    const radsOk = group.filter((r) => !r.radsDivergente).length;
    const conclOk = group.filter((r) => r.conclusionMatch).length;
    lines.push(
      `| ${cat} | ${group.length} | ${measuresOk}/${group.length} | ${radsOk}/${group.length} | ${conclOk}/${group.length} |`,
    );
  }
  lines.push("");

  // Gaps detalhados
  lines.push("## 🔎 Gaps detectados");
  lines.push("");
  let gapCount = 0;
  for (const r of results) {
    const issues: string[] = [];
    if (r.measuresPerdidas.length > 0)
      issues.push(`**Medidas perdidas:** ${r.measuresPerdidas.join(", ")}`);
    if (r.measuresInventadas.length > 0)
      issues.push(`**Medidas inventadas:** ${r.measuresInventadas.join(", ")}`);
    if (r.radsDivergente)
      issues.push(
        `**RADS divergente:** gabarito=${JSON.stringify(r.radsGabarito)} gerado=${JSON.stringify(r.radsGerado)}`,
      );
    if (!r.conclusionMatch && extractConclusion(r.laudoGabarito).length > 0)
      issues.push(`**Conclusão fora:** keyword overlap < 40%`);
    if (issues.length === 0) continue;
    gapCount++;
    lines.push(`### ${r.categoria} #${r.index}`);
    lines.push(`**Ditado sintético:** ${r.achadosSinteticos.slice(0, 200)}`);
    lines.push("");
    for (const i of issues) lines.push(`- ${i}`);
    lines.push("");
  }
  if (gapCount === 0) {
    lines.push("Nenhum gap relevante detectado nesta rodada.");
    lines.push("");
  }

  // Sample completo — anexo
  lines.push("## 📎 Amostras completas (primeiras 3)");
  lines.push("");
  for (const r of results.slice(0, 3)) {
    lines.push(`### ${r.categoria} #${r.index} (${r.durationMs}ms)`);
    lines.push("**Ditado sintético:**");
    lines.push("```");
    lines.push(r.achadosSinteticos);
    lines.push("```");
    lines.push("**Laudo gerado:**");
    lines.push("```");
    lines.push(r.laudoGerado);
    lines.push("```");
    lines.push("**Laudo gabarito:**");
    lines.push("```");
    lines.push(r.laudoGabarito);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY ausente no .env");
    process.exit(1);
  }

  const results: SampleResult[] = [];
  const cats = CATEGORY_FILTER
    ? CATEGORIES.filter((c) => c.id === CATEGORY_FILTER)
    : CATEGORIES;
  if (cats.length === 0) {
    console.error(`❌ Categoria inválida: ${CATEGORY_FILTER}`);
    process.exit(1);
  }

  for (const c of cats) {
    const filePath = path.resolve(ROOT, c.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Arquivo não existe: ${filePath} — pulando`);
      continue;
    }
    const all = parseLaudos(filePath);
    console.log(`[${c.id}] ${all.length} laudos totais; amostrando ${SAMPLES}`);
    const sample = shuffleAndTake(all, SAMPLES);

    for (let i = 0; i < sample.length; i++) {
      const laudo = sample[i];
      const t0 = Date.now();
      console.log(`  [${c.id}] amostra ${i + 1}/${sample.length}…`);
      try {
        const achados = await synthesizeAchados(laudo, c.label);
        const structured = await runStructurer(achados, c.id);
        if (!structured) {
          console.warn(`    structurer falhou`);
          continue;
        }
        const generated = await runWriter(structured, c.id, c.label);
        const r = diff(
          c.id,
          i,
          laudo,
          achados,
          generated,
          Date.now() - t0,
        );
        results.push(r);
        console.log(
          `    ✓ medidas:${r.measuresPerdidas.length === 0 ? "OK" : `perde ${r.measuresPerdidas.length}`} rads:${!r.radsDivergente ? "OK" : "DIVERGE"} concl:${r.conclusionMatch ? "OK" : "FORA"}`,
        );
      } catch (e) {
        console.error(`    erro: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const report = buildReport(results);
  const outDir = path.resolve(ROOT, "scripts/.golden-reports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.md`,
  );
  fs.writeFileSync(outFile, report);
  console.log(`\n✅ Relatório: ${path.relative(ROOT, outFile)}`);
}

function shuffleAndTake<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
