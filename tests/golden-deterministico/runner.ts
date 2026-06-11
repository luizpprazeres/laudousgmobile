import "dotenv/config";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * DET-1 — Casos golden ESTRUTURAIS do bundle determinístico.
 *
 * Valida o pipeline NOVO (flag DETERMINISTIC_BUNDLE_CATEGORIES) — nunca
 * comparação com o RAG (decisão fechada, ADR-0004). Checks por caso:
 *   1. Cabeçalhos presentes e NA ORDEM EXATA do modelo da categoria.
 *   2. Numeração canônica da conclusão (1..N sequencial quando multi-item).
 *   3. Nenhum item de conclusão vazio ou só-placeholder (sempre ativo).
 *   4. Fidelidade: achados críticos ditados presentes (nada omitido).
 *   5. Anti-invenção: padrões proibidos ausentes (nada inventado).
 *   6. Placeholders "____" presentes quando medida não foi ditada.
 *
 * Uso:
 *   GOLDEN_AUTH_TOKEN=... [GOLDEN_API_URL=...] pnpm validate:golden:deterministico
 *   GOLDEN_CASE_FILTER=abdomen-det-03 pra rodar um caso só.
 *
 * Pré-requisito: o alvo (local ou prod) precisa estar com a categoria na
 * flag DETERMINISTIC_BUNDLE_CATEGORIES. O runner EXIGE por default que o
 * evento SSE `rag` venha com source="deterministic_bundle" — rodar contra o
 * caminho RAG falha (anti falso-verde, review dex1). Pra rodar conscientemente
 * sem a flag (ex: comparar output): GOLDEN_ALLOW_RAG=1.
 */

const CLASSICO_STYLE_ID = "11111111-1111-4111-8111-111111111111";
const API_URL =
  process.env.GOLDEN_API_URL ?? "https://laudousgmobile.vercel.app";
const AUTH_TOKEN = process.env.GOLDEN_AUTH_TOKEN;
const CASES_DIR = join(process.cwd(), "tests/golden-deterministico/cases");
const REPORT_PATH = join(
  process.cwd(),
  "tests/golden-deterministico/report.html",
);

type GoldenCase = {
  id: string;
  category: string;
  /** Default: CLASSICO_COMPLETO. */
  writingStyleId?: string;
  rawInput: string;
  /** Cabeçalhos que devem aparecer, NESTA ordem relativa. */
  expectedHeadersInOrder: string[];
  /** Fidelidade — trechos que DEVEM aparecer no laudo. */
  criticalFindings: string[];
  /** Anti-invenção — trechos que NUNCA podem aparecer no laudo. */
  forbiddenPatterns: string[];
  /** Regex (string, flags iu) que NUNCA podem casar — ex: medida inventada. */
  forbiddenRegex?: string[];
  /** Regex (string, flags iu) que DEVEM casar — ex: "____" p/ placeholder. */
  requiredPatterns?: string[];
  /** Exige numeração 1..N sequencial na conclusão. */
  canonicalConclusionNumbering?: boolean;
  minConclusionItems?: number;
  maxConclusionItems?: number;
};

type Result = {
  id: string;
  passed: boolean;
  output: string;
  failures: string[];
  error?: string;
};

async function main() {
  if (!AUTH_TOKEN) throw new Error("GOLDEN_AUTH_TOKEN ausente");

  const fileNames = (await readdir(CASES_DIR))
    .filter((name) => name.endsWith(".json"))
    .filter(
      (name) =>
        !process.env.GOLDEN_CASE_FILTER ||
        name.includes(process.env.GOLDEN_CASE_FILTER),
    )
    .sort();
  const cases = await Promise.all(
    fileNames.map(
      async (name) =>
        JSON.parse(await readFile(join(CASES_DIR, name), "utf8")) as GoldenCase,
    ),
  );

  const results: Result[] = [];
  for (const testCase of cases) {
    process.stdout.write(`${testCase.id}... `);
    try {
      const { output, ragSource } = await generate(testCase);
      const result = evaluate(testCase, output, ragSource);
      results.push(result);
      console.log(
        result.passed ? "PASS" : `FAIL\n    - ${result.failures.join("\n    - ")}`,
      );
    } catch (error) {
      results.push({
        id: testCase.id,
        passed: false,
        output: "",
        failures: [],
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("ERROR");
    }
  }

  await writeFile(REPORT_PATH, renderReport(results), "utf8");
  const passed = results.filter((r) => r.passed).length;
  const minPassed = Number(process.env.GOLDEN_MIN_PASS ?? results.length);
  console.log(`\n${passed}/${results.length} casos passaram`);
  console.log(`Relatório: ${REPORT_PATH}`);
  if (passed < minPassed) process.exitCode = 1;
}

async function generate(
  testCase: GoldenCase,
): Promise<{ output: string; ragSource: string | null }> {
  const response = await fetch(`${API_URL}/api/generate`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
      "X-LaudoUSG-Surface": "web",
    },
    body: JSON.stringify({
      raw_input: testCase.rawInput,
      category_hint: testCase.category,
      writing_style_id: testCase.writingStyleId ?? CLASSICO_STYLE_ID,
      source: "web",
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let ragSource: string | null = null;
  const handle = (frame: string): string | null => {
    const parsed = parseFrame(frame);
    if (!parsed) return null;
    if (parsed.kind === "rag") {
      ragSource = parsed.source;
      return null;
    }
    return parsed.text;
  };
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const output = handle(frame);
      if (output) return { output, ragSource };
    }
  }
  const output = handle(buffer);
  if (output) return { output, ragSource };
  throw new Error("Stream terminou sem evento done");
}

function parseFrame(
  frame: string,
): { kind: "done"; text: string } | { kind: "rag"; source: string } | null {
  const raw = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!raw) return null;
  const event = JSON.parse(raw) as {
    type?: string;
    final_text?: string;
    message?: string;
    source?: string;
  };
  if (event.type === "rag") {
    return { kind: "rag", source: event.source ?? "rag" };
  }
  if (event.type === "done" && event.final_text) {
    return { kind: "done", text: event.final_text };
  }
  if (event.type === "error") {
    throw new Error(event.message ?? event.type);
  }
  return null;
}

function evaluate(
  testCase: GoldenCase,
  output: string,
  ragSource: string | null,
): Result {
  const failures: string[] = [];
  const normalizedOutput = normalize(output);

  // 0. Prova do caminho determinístico (anti falso-verde, review dex1):
  // sem source="deterministic_bundle" o caso FALHA, a menos que o operador
  // peça explicitamente GOLDEN_ALLOW_RAG=1.
  if (
    process.env.GOLDEN_ALLOW_RAG !== "1" &&
    ragSource !== "deterministic_bundle"
  ) {
    failures.push(
      `pipeline não usou o bundle determinístico (rag source=${ragSource ?? "ausente"}) — ligue DETERMINISTIC_BUNDLE_CATEGORIES no alvo ou rode com GOLDEN_ALLOW_RAG=1`,
    );
  }

  // 1. Cabeçalhos presentes e na ordem exata
  let cursor = -1;
  for (const header of testCase.expectedHeadersInOrder) {
    const idx = normalizedOutput.indexOf(normalize(header), cursor + 1);
    if (idx === -1) {
      failures.push(
        cursor === -1 || normalizedOutput.includes(normalize(header))
          ? `header fora de ordem ou ausente: "${header}"`
          : `header ausente: "${header}"`,
      );
    } else {
      cursor = idx;
    }
  }

  // Conclusão: extrai itens numerados
  const conclusion = extractConclusion(output);
  const items = conclusion
    ? [...conclusion.matchAll(/^\s*(\d+)\s*[.)-]\s*(.*)$/gm)].map((m) => ({
        n: Number(m[1]),
        text: (m[2] ?? "").trim(),
      }))
    : [];

  // 2. Numeração canônica (1..N sequencial)
  if (testCase.canonicalConclusionNumbering) {
    const seq = items.map((i) => i.n);
    const canonical = seq.every((n, i) => n === i + 1);
    if (seq.length === 0 || !canonical) {
      failures.push(
        `numeração da conclusão não-canônica: [${seq.join(", ")}]`,
      );
    }
  }
  if (
    testCase.minConclusionItems !== undefined &&
    Math.max(items.length, conclusion && items.length === 0 ? 1 : 0) <
      testCase.minConclusionItems
  ) {
    failures.push(
      `conclusão com ${items.length} itens (mínimo ${testCase.minConclusionItems})`,
    );
  }
  if (
    testCase.maxConclusionItems !== undefined &&
    items.length > testCase.maxConclusionItems
  ) {
    failures.push(
      `conclusão com ${items.length} itens (máximo ${testCase.maxConclusionItems})`,
    );
  }

  // 3. Sempre ativo: nenhum item de conclusão vazio ou só-placeholder
  for (const item of items) {
    if (/^_{2,}\.?$/.test(item.text) || item.text.length === 0) {
      failures.push(`item ${item.n} da conclusão vazio/só-placeholder`);
    }
  }

  // 4. Fidelidade
  for (const finding of testCase.criticalFindings) {
    if (!normalizedOutput.includes(normalize(finding))) {
      failures.push(`achado crítico ausente: "${finding}"`);
    }
  }

  // 5. Anti-invenção
  for (const pattern of testCase.forbiddenPatterns) {
    if (normalizedOutput.includes(normalize(pattern))) {
      failures.push(`padrão proibido presente: "${pattern}"`);
    }
  }

  // 5b. Anti-invenção (regex)
  for (const pattern of testCase.forbiddenRegex ?? []) {
    if (new RegExp(pattern, "iu").test(output)) {
      failures.push(`regex proibida casou: /${pattern}/iu`);
    }
  }

  // 6. Padrões obrigatórios (regex)
  for (const pattern of testCase.requiredPatterns ?? []) {
    if (!new RegExp(pattern, "iu").test(output)) {
      failures.push(`padrão obrigatório não casou: /${pattern}/iu`);
    }
  }

  return {
    id: testCase.id,
    passed: failures.length === 0,
    output,
    failures,
  };
}

function extractConclusion(output: string): string | null {
  const match = output.match(/CONCLUS[ÃA]O:?\s*\n?([\s\S]*)$/i);
  return match?.[1] ?? null;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function renderReport(results: Result[]) {
  const rows = results
    .map(
      (result) => `<tr class="${result.passed ? "pass" : "fail"}">
<td>${escapeHtml(result.id)}</td>
<td>${result.passed ? "PASS" : "FAIL"}</td>
<td>${escapeHtml(result.failures.join("; ") || "—")}</td>
<td>${escapeHtml(result.error ?? "—")}</td>
<td><pre>${escapeHtml(result.output)}</pre></td>
</tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Golden estrutural — bundle determinístico (DET-1)</title>
<style>
body{font:14px system-ui;margin:32px;color:#17202a}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #d5d8dc;padding:8px;text-align:left;vertical-align:top}
pre{white-space:pre-wrap;max-width:560px;font-size:12px}
.pass{background:#eafaf1}.fail{background:#fdedec}
</style>
</head>
<body>
<h1>Golden estrutural — bundle determinístico (DET-1)</h1>
<p>Gerado em ${new Date().toISOString()}.</p>
<table>
<thead><tr><th>Caso</th><th>Status</th><th>Falhas</th><th>Erro</th><th>Laudo</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
