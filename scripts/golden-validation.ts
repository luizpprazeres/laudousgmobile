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

// Prompts REAIS do pipeline (importa do api package). esbuild --bundle
// resolve esses imports — assim o harness testa exatamente o que o
// production usa, não um prompt simplificado.
import {
  GLOBAL_RULES_BLOCK,
  GLOBAL_PROHIBITIONS,
  buildCoTInstruction,
} from "../apps/api/src/server/prompts/global";
import { ABDOMEN_TOTAL_CONTRACT, ABDOMEN_TOTAL_MODELO_BASE } from "../apps/api/src/server/prompts/contracts/ABDOMEN_TOTAL";
import { MAMARIA_CONTRACT } from "../apps/api/src/server/prompts/contracts/MAMARIA";
import { TIREOIDE_CONTRACT } from "../apps/api/src/server/prompts/contracts/TIREOIDE";
import { DOPPLER_OBSTETRICO_CONTRACT } from "../apps/api/src/server/prompts/contracts/DOPPLER_OBSTETRICO";

const ROOT = process.cwd();

const CONTRACT_BY_CAT: Record<string, string> = {
  ABDOMEN_TOTAL: ABDOMEN_TOTAL_CONTRACT,
  MAMARIA: MAMARIA_CONTRACT,
  TIREOIDE: TIREOIDE_CONTRACT,
  DOPPLER_OBSTETRICO: DOPPLER_OBSTETRICO_CONTRACT,
};
const MODELO_BASE_BY_CAT: Record<string, string | undefined> = {
  ABDOMEN_TOTAL: ABDOMEN_TOTAL_MODELO_BASE,
};

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
const UPDATE_BASELINE = args["update-baseline"] === "true";

// ─── Categorias suportadas ────────────────────────────────────────
type Category = "ABDOMEN_TOTAL" | "MAMARIA" | "TIREOIDE" | "DOPPLER_OBSTETRICO";
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
  {
    id: "DOPPLER_OBSTETRICO",
    file: "_extraction/from-laudousg-original/07-laudos-reais-anonimizados/doppler_obstetrico_30d.md",
    label: "Doppler Obstétrico",
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
    let unit = m[2].toLowerCase().replace("³", "3");
    if (unit === "cm3") unit = "ml";
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

// Filtra legendas/tabelas explicativas. Se um sistema RADS aparece com 4+
// valores consecutivos (ex: TIRADS:1,2,3,4,5), provavelmente é legenda no
// rodapé do laudo gabarito, não classificação real do caso.
function filterRadsLegend(rads: string[]): string[] {
  const bySystem = new Map<string, Set<string>>();
  for (const r of rads) {
    const [sys, val] = r.split(":");
    if (!bySystem.has(sys)) bySystem.set(sys, new Set());
    bySystem.get(sys)!.add(val);
  }
  const out: string[] = [];
  for (const [sys, vals] of bySystem) {
    if (vals.size >= 4) continue;
    for (const v of vals) out.push(`${sys}:${v}`);
  }
  return out;
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
  const contract = CONTRACT_BY_CAT[categoria];
  const modeloBase = MODELO_BASE_BY_CAT[categoria];

  // System message com a MESMA ordem do production (buildSystemMessage):
  //   1. categoryRules (contract da categoria)
  //   2. GLOBAL_RULES_BLOCK
  //   3. [futuro: subspecialty, style overlay]
  //   4. RAG (aqui: só modelo-base como fallback se existir)
  //   5. GLOBAL_PROHIBITIONS
  //   6. buildCoTInstruction
  const sections: string[] = [];
  if (contract) sections.push(contract);
  sections.push(GLOBAL_RULES_BLOCK);
  if (modeloBase) {
    sections.push(
      "BIBLIOTECA RAG VALIDADA (referência ativa para este caso):\n\n## MODELO\n### Modelo-base padrão\n" +
        modeloBase,
    );
  }
  sections.push(GLOBAL_PROHIBITIONS);
  sections.push(buildCoTInstruction(categoriaLabel));

  const system = sections.join("\n\n");

  const userMessage = [
    "=== ACHADOS CLÍNICOS (estruturados) ===",
    "```json",
    JSON.stringify(structured, null, 2),
    "```",
    "",
    "Retorne apenas o laudo técnico completo.",
  ].join("\n");

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
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
  radsGabaritoFiltered: string[];
  radsGerado: string[];
  radsDivergente: boolean;
  conclusionMatch: boolean;
  violations: string[];
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
  const radsGabaritoFiltered = filterRadsLegend(radsGabarito);
  const radsGerado = extractRads(laudoGerado);
  const radsDivergente =
    radsGabaritoFiltered.length !== radsGerado.length ||
    radsGabaritoFiltered.some((r) => !radsGerado.includes(r)) ||
    radsGerado.some((r) => !radsGabaritoFiltered.includes(r));

  // Conclusion match: simplista — texto da conclusão tem keyword principal
  const conclGab = extractConclusion(laudoGabarito).toLowerCase();
  const conclGen = extractConclusion(laudoGerado).toLowerCase();
  const conclusionMatch =
    conclGab.length > 0 &&
    conclGen.length > 0 &&
    sharedKeywordRatio(conclGab, conclGen) >= 0.4;

  const violations = runDeterministicChecks(laudoGerado, categoria);

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
    radsGabaritoFiltered,
    radsGerado,
    radsDivergente,
    conclusionMatch,
    violations,
    durationMs,
  };
}

// ─── Checks determinísticos zero-IA (regras do vault) ─────────────
// Regras documentadas em laugousg-vault/LaudoUSG/docs-projeto/
// few-shots-por-categoria.md §Regras Globais.
function runDeterministicChecks(laudo: string, categoria: Category): string[] {
  const violations: string[] = [];
  const lower = laudo.toLowerCase();

  // Banned phrases (todas as categorias)
  if (/em\s+\d+\s+fotos/i.test(laudo))
    violations.push(`banned_phrase: "em XX fotos"`);
  if (/biometr[ií]a\s+é\s+de/i.test(laudo) || /medida\s+é\s+de/i.test(laudo))
    violations.push(`banned_phrase: "é de" (use "de")`);

  // Mandatory sections — Obstétrico/Morfológico/Doppler-obs
  const obstetricos: Category[] = []; // categorias atuais não cobrem obstétrico
  if (obstetricos.includes(categoria)) {
    const hasPrimeiraUsg = /primeira usg/i.test(laudo) || /\bdum\b/i.test(laudo);
    if (!hasPrimeiraUsg)
      violations.push(`mandatory_missing: "Primeira USG" ou "DUM"`);
    if (!/coment[áa]rios/i.test(laudo))
      violations.push(`mandatory_missing: "COMENTÁRIOS"`);
    if (!/os seguintes aspectos/i.test(laudo))
      violations.push(`mandatory_missing: "OS SEGUINTES ASPECTOS"`);
  }

  // Format rule — ABDOMEN_TOTAL conclusão usa "1." (com ponto), outras "1)"
  const conclMatch = laudo.match(/CONCLUS[ÃA]O:?[\s\S]*$/i);
  if (conclMatch) {
    const concl = conclMatch[0];
    const itemsParens = (concl.match(/^\s*\d+\)/gm) || []).length;
    const itemsPonto = (concl.match(/^\s*\d+\./gm) || []).length;
    if (categoria === "ABDOMEN_TOTAL" && itemsParens > 0 && itemsPonto === 0)
      violations.push(`format: ABDOMEN_TOTAL conclusão deveria usar "1." (com ponto)`);
    if (categoria !== "ABDOMEN_TOTAL" && itemsPonto > 0 && itemsParens === 0)
      violations.push(`format: ${categoria} conclusão deveria usar "1)" (com parêntese)`);
  }

  // Mamária — BI-RADS só na conclusão (não no corpo)
  if (categoria === "MAMARIA") {
    const bodyEnd = laudo.search(/CONCLUS[ÃA]O/i);
    if (bodyEnd > 0) {
      const body = laudo.slice(0, bodyEnd);
      if (/bi[\s-]?rads/i.test(body))
        violations.push(`format: BI-RADS aparece no corpo (deveria só na conclusão)`);
    }
  }

  return violations;
}

// Stopwords médicas verbosas que aparecem em estilos antigos mas não nos
// modelos novos (ou vice-versa). Filtrar antes de calcular overlap reduz
// falso positivo de divergência de estilo.
// Lista conservadora — só conectivos puros + termos verbosos do estilo antigo.
// NÃO inclui terminologia clinicamente relevante (preservada, habitual, achados,
// evidência, presença, ausência, sinais, característica, compatível, limite, etc),
// que pode ser sinal verdadeiro de equivalência clínica entre dois laudos.
const CLINICAL_STOPWORDS = new Set([
  // Conectivos puros
  "como", "tambem", "ainda", "alem", "este", "esta", "estes", "estas",
  "pelo", "pela", "pelos", "pelas", "para", "que", "ente",
  // Cópulas verbosas
  "sendo", "feito", "feita", "tem", "ter",
  // Verbosidade do estilo antigo
  "comumente", "classificacao", "ecografica", "ecograficas", "ecografico", "ecograficos",
  "caracterizada", "caracterizado", "caracterizadas", "caracterizados",
  "considerando", "considerar", "considerada", "considerado",
  "relacionado", "relacionada", "relacionados", "relacionadas",
]);

function sharedKeywordRatio(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !CLINICAL_STOPWORDS.has(w)),
    );
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / A.size;
}

// ─── Baseline (regressão entre runs) ──────────────────────────────
const BASELINE_PATH = path.resolve(ROOT, "scripts/golden-baseline.json");

type CategorySummary = {
  samples: number;
  medidas_ok_pct: number;
  rads_ok_pct: number;
  conclusao_ok_pct: number;
  violations_total: number;
};

type Baseline = {
  version: number;
  generated_at: string;
  model: string;
  by_category: Record<string, CategorySummary>;
};

function summarizeResults(results: SampleResult[]): Baseline["by_category"] {
  const byCat = new Map<Category, SampleResult[]>();
  for (const r of results) {
    if (!byCat.has(r.categoria)) byCat.set(r.categoria, []);
    byCat.get(r.categoria)!.push(r);
  }
  const out: Baseline["by_category"] = {};
  for (const [cat, group] of byCat) {
    const n = group.length;
    out[cat] = {
      samples: n,
      medidas_ok_pct: group.filter((r) => r.measuresPerdidas.length === 0).length / n,
      rads_ok_pct: group.filter((r) => !r.radsDivergente).length / n,
      conclusao_ok_pct: group.filter((r) => r.conclusionMatch).length / n,
      violations_total: group.reduce((s, r) => s + r.violations.length, 0),
    };
  }
  return out;
}

function loadBaseline(): Baseline | null {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as Baseline;
  } catch {
    return null;
  }
}

function saveBaseline(by_category: Baseline["by_category"]): void {
  const baseline: Baseline = {
    version: 1,
    generated_at: new Date().toISOString(),
    model: MODEL,
    by_category,
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
}

function pct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(0)}%`;
}

function compareToBaseline(
  current: Baseline["by_category"],
  baseline: Baseline,
): string[] {
  const regressions: string[] = [];
  for (const [cat, currStats] of Object.entries(current)) {
    const baseStats = baseline.by_category[cat];
    if (!baseStats) {
      regressions.push(`${cat}: nova categoria (sem baseline pra comparar)`);
      continue;
    }
    const dM = currStats.medidas_ok_pct - baseStats.medidas_ok_pct;
    const dR = currStats.rads_ok_pct - baseStats.rads_ok_pct;
    const dC = currStats.conclusao_ok_pct - baseStats.conclusao_ok_pct;
    const dV = currStats.violations_total - baseStats.violations_total;
    if (dM < -0.1)
      regressions.push(`${cat} medidas: ${pct(baseStats.medidas_ok_pct)} → ${pct(currStats.medidas_ok_pct)} (Δ ${pct(dM)})`);
    if (dR < -0.1)
      regressions.push(`${cat} RADS: ${pct(baseStats.rads_ok_pct)} → ${pct(currStats.rads_ok_pct)} (Δ ${pct(dR)})`);
    if (dC < -0.1)
      regressions.push(`${cat} conclusão: ${pct(baseStats.conclusao_ok_pct)} → ${pct(currStats.conclusao_ok_pct)} (Δ ${pct(dC)})`);
    if (dV > 2)
      regressions.push(`${cat} violations: ${baseStats.violations_total} → ${currStats.violations_total} (+${dV})`);
  }
  return regressions;
}

// ─── Report ───────────────────────────────────────────────────────
function buildReport(
  results: SampleResult[],
  baseline: Baseline | null,
): string {
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
  lines.push("| Categoria | N | Medidas OK | RADS OK | Conclusão OK | Violations |");
  lines.push("|---|---|---|---|---|---|");
  for (const [cat, group] of byCat) {
    const measuresOk = group.filter((r) => r.measuresPerdidas.length === 0).length;
    const radsOk = group.filter((r) => !r.radsDivergente).length;
    const conclOk = group.filter((r) => r.conclusionMatch).length;
    const violations = group.reduce((s, r) => s + r.violations.length, 0);
    lines.push(
      `| ${cat} | ${group.length} | ${measuresOk}/${group.length} | ${radsOk}/${group.length} | ${conclOk}/${group.length} | ${violations} |`,
    );
  }
  lines.push("");

  // Regressões vs baseline
  if (baseline) {
    const currentSummary = summarizeResults(results);
    const regressions = compareToBaseline(currentSummary, baseline);
    lines.push("## 📈 Regressões vs baseline");
    lines.push("");
    lines.push(`**Baseline:** ${baseline.generated_at} (modelo \`${baseline.model}\`)`);
    lines.push("");
    if (regressions.length === 0) {
      lines.push("Nenhuma regressão detectada (threshold: -10pp em métricas, +2 violations).");
    } else {
      for (const reg of regressions) lines.push(`- ${reg}`);
    }
    lines.push("");
  } else {
    lines.push("## 📈 Regressões vs baseline");
    lines.push("");
    lines.push("Nenhum baseline em `scripts/golden-baseline.json`. Rode com `--update-baseline` pra salvar esta run como baseline futuro.");
    lines.push("");
  }

  // Regras violadas
  const allViolations = results.flatMap((r) =>
    r.violations.map((v) => ({ cat: r.categoria, idx: r.index, v })),
  );
  lines.push("## 🚨 Regras violadas (zero-IA)");
  lines.push("");
  if (allViolations.length === 0) {
    lines.push("Nenhuma regra do vault violada nesta run.");
  } else {
    const byRule = new Map<string, Array<{ cat: Category; idx: number }>>();
    for (const { cat, idx, v } of allViolations) {
      const key = v.split(":")[0];
      if (!byRule.has(key)) byRule.set(key, []);
      byRule.get(key)!.push({ cat, idx });
    }
    lines.push("| Regra | Ocorrências | Casos |");
    lines.push("|---|---|---|");
    for (const [rule, cases] of byRule) {
      const caseList = cases.map((c) => `${c.cat}#${c.idx}`).join(", ");
      lines.push(`| \`${rule}\` | ${cases.length} | ${caseList} |`);
    }
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
    if (r.violations.length > 0)
      issues.push(`**Regras violadas:** ${r.violations.join(", ")}`);
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

  const baseline = loadBaseline();
  const report = buildReport(results, baseline);
  const outDir = path.resolve(ROOT, "scripts/.golden-reports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.md`,
  );
  fs.writeFileSync(outFile, report);
  console.log(`\n✅ Relatório: ${path.relative(ROOT, outFile)}`);

  if (UPDATE_BASELINE) {
    const summary = summarizeResults(results);
    saveBaseline(summary);
    console.log(`✅ Baseline atualizado: ${path.relative(ROOT, BASELINE_PATH)}`);
  } else if (!baseline) {
    console.log(`ℹ️  Sem baseline. Pra salvar esta run como baseline: pnpm validate:golden --update-baseline=true`);
  }
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
