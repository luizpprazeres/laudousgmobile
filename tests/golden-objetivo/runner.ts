import "dotenv/config";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OBJECTIVE_STYLE_ID = "44444444-4444-4444-8444-444444444444";
const BASELINE_STYLE_ID =
  process.env.GOLDEN_BASELINE_WRITING_STYLE_ID ??
  "33333333-3333-4333-8333-333333333333";
const API_URL =
  process.env.GOLDEN_API_URL ?? "https://laudousgmobile.vercel.app";
const AUTH_TOKEN = process.env.GOLDEN_AUTH_TOKEN;
const CASES_DIR = join(process.cwd(), "tests/golden-objetivo/cases");
const REPORT_PATH = join(process.cwd(), "tests/golden-objetivo/report.html");

type GoldenCase = {
  id: string;
  category: string;
  rawInput: string;
  expectedHeaders: string[];
  criticalFindings: string[];
  forbiddenPatterns: string[];
  maxLengthRatio: number;
  // Critérios novos do Modo Objetivo enumerativo (todos opcionais — opt-in por caso)
  requiresEnumeration?: boolean;
  minEnumeratedItems?: number;
  forbiddenProseConjunctions?: string[];
};

type Result = {
  id: string;
  category: string;
  passed: boolean;
  objectiveOutput: string;
  baselineOutput: string;
  missingHeaders: string[];
  missingFindings: string[];
  forbiddenMatches: string[];
  lengthRatio: number | null;
  enumerationOk: boolean;
  enumerationFound: number;
  prosaicConjunctionsFound: string[];
  error?: string;
};

async function main() {
  if (!AUTH_TOKEN) {
    throw new Error("GOLDEN_AUTH_TOKEN ausente");
  }

  const fileNames = (await readdir(CASES_DIR))
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !process.env.GOLDEN_CASE_FILTER || name.includes(process.env.GOLDEN_CASE_FILTER))
    .sort();
  const cases = await Promise.all(
    fileNames.map(async (name) =>
      JSON.parse(await readFile(join(CASES_DIR, name), "utf8")) as GoldenCase,
    ),
  );

  const results: Result[] = [];
  for (const testCase of cases) {
    process.stdout.write(`${testCase.id}... `);
    try {
      const [objectiveOutput, baselineOutput] = await Promise.all([
        generate(testCase, OBJECTIVE_STYLE_ID),
        generate(testCase, BASELINE_STYLE_ID),
      ]);
      const result = evaluate(testCase, objectiveOutput, baselineOutput);
      results.push(result);
      console.log(result.passed ? "PASS" : "FAIL");
    } catch (error) {
      results.push({
        id: testCase.id,
        category: testCase.category,
        passed: false,
        objectiveOutput: "",
        baselineOutput: "",
        missingHeaders: [],
        missingFindings: [],
        forbiddenMatches: [],
        lengthRatio: null,
        enumerationOk: false,
        enumerationFound: 0,
        prosaicConjunctionsFound: [],
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("ERROR");
    }
  }

  await writeFile(REPORT_PATH, renderReport(results), "utf8");
  const passed = results.filter((result) => result.passed).length;
  const minPassed = Number(process.env.GOLDEN_MIN_PASS ?? 19);
  console.log(`\n${passed}/${results.length} casos passaram`);
  console.log(`Relatório: ${REPORT_PATH}`);
  if (passed < minPassed) process.exitCode = 1;
}

async function generate(testCase: GoldenCase, writingStyleId: string) {
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
      writing_style_id: writingStyleId,
      source: "web",
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const output = parseFrame(frame);
      if (output) return output;
    }
  }
  const output = parseFrame(buffer);
  if (output) return output;
  throw new Error("Stream terminou sem evento done");
}

function parseFrame(frame: string): string | null {
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
    reason?: string;
  };
  if (event.type === "done" && event.final_text) return event.final_text;
  if (event.type === "error" || event.type === "blocked") {
    throw new Error(event.message ?? event.reason ?? event.type);
  }
  return null;
}

// Regex de enumeração: linhas começando com "1-", "2.", "3)" etc.
const ENUMERATION_PATTERN = /^\s*\d+[-.)]\s/gm;

function evaluate(
  testCase: GoldenCase,
  objectiveOutput: string,
  baselineOutput: string,
): Result {
  const normalizedOutput = normalize(objectiveOutput);
  const missingHeaders = testCase.expectedHeaders.filter(
    (header) => !normalizedOutput.includes(normalize(header)),
  );
  const missingFindings = testCase.criticalFindings.filter(
    (finding) => !matchesFinding(finding, objectiveOutput),
  );
  const forbiddenMatches = testCase.forbiddenPatterns.filter((pattern) =>
    normalizedOutput.includes(normalize(pattern)),
  );
  const lengthRatio =
    baselineOutput.length === 0 ? null : objectiveOutput.length / baselineOutput.length;

  // Enumeração: conta linhas no formato "1-", "1.", "1)", etc.
  const enumerationMatches = objectiveOutput.match(ENUMERATION_PATTERN) ?? [];
  const enumerationFound = enumerationMatches.length;
  const minRequired = testCase.minEnumeratedItems ?? 2;
  const enumerationOk = testCase.requiresEnumeration
    ? enumerationFound >= minRequired
    : true;

  // Conjunções prosaicas proibidas (regex case-insensitive, com diacríticos)
  const prosaicConjunctionsFound = (testCase.forbiddenProseConjunctions ?? []).filter(
    (pattern) => new RegExp(pattern, "iu").test(objectiveOutput),
  );

  const passed =
    missingHeaders.length === 0 &&
    missingFindings.length === 0 &&
    forbiddenMatches.length === 0 &&
    lengthRatio !== null &&
    lengthRatio <= testCase.maxLengthRatio &&
    enumerationOk &&
    prosaicConjunctionsFound.length === 0;

  return {
    id: testCase.id,
    category: testCase.category,
    passed,
    objectiveOutput,
    baselineOutput,
    missingHeaders,
    missingFindings,
    forbiddenMatches,
    lengthRatio,
    enumerationOk,
    enumerationFound,
    prosaicConjunctionsFound,
  };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function matchesFinding(finding: string, output: string) {
  const normalizedFinding = normalizeWords(normalize(finding));
  const normalizedOutput = normalizeWords(normalize(output));
  if (normalizedOutput.includes(normalizedFinding)) return true;

  const measure = normalizedFinding.match(/^(\d+(?:[.,]\d+)?) MM$/);
  if (measure) {
    const millimeters = Number(measure[1]!.replace(",", "."));
    return outputMeasuresInMillimeters(normalizedOutput).includes(millimeters);
  }

  const aliases: Record<string, string[]> = {
    BCF: ["BATIMENTO CARDIACO FETAL", "FREQUENCIA CARDIACA FETAL"],
    GEMELAR: ["GESTACAO MULTIPLA", "DOIS FETOS", "DICORIONICA DIAMNIOTICA"],
    "ONDA A POSITIVA": ["SISTOLE ATRIAL POSITIVA", "SISTOLE ATRIAL POSITIVAS"],
  };
  return (aliases[normalizedFinding] ?? []).some((alias) =>
    normalizedOutput.includes(alias),
  );
}

function normalizeWords(value: string) {
  return value
    .replace(/\bNIVEL DOIS\b/g, "NIVEL 2")
    .replace(/\bNIVEL UM\b/g, "NIVEL 1");
}

function outputMeasuresInMillimeters(output: string) {
  const values: number[] = [];
  const measures = output.matchAll(
    /(\d+(?:[.,]\d+)?(?:\s*X\s*\d+(?:[.,]\d+)?){0,2})\s*(MM|CM)\b/g,
  );
  for (const measure of measures) {
    const factor = measure[2] === "CM" ? 10 : 1;
    for (const value of measure[1]!.split(/\s*X\s*/)) {
      values.push(Number(value.replace(",", ".")) * factor);
    }
  }
  return values;
}

function renderReport(results: Result[]) {
  const rows = results
    .map(
      (result) => `<tr class="${result.passed ? "pass" : "fail"}">
<td>${escapeHtml(result.id)}</td>
<td>${escapeHtml(result.category)}</td>
<td>${result.passed ? "PASS" : "FAIL"}</td>
<td>${result.lengthRatio === null ? "—" : result.lengthRatio.toFixed(2)}</td>
<td>${escapeHtml(result.missingHeaders.join(", ") || "—")}</td>
<td>${escapeHtml(result.missingFindings.join(", ") || "—")}</td>
<td>${escapeHtml(result.forbiddenMatches.join(", ") || "—")}</td>
<td>${result.enumerationOk ? `OK (${result.enumerationFound})` : `FALTA (${result.enumerationFound})`}</td>
<td>${escapeHtml(result.prosaicConjunctionsFound.join(", ") || "—")}</td>
<td>${escapeHtml(result.error ?? "—")}</td>
</tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Golden cases — Modo Objetivo</title>
<style>
body{font:14px system-ui;margin:32px;color:#17202a}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #d5d8dc;padding:8px;text-align:left;vertical-align:top}
.pass{background:#eafaf1}.fail{background:#fdedec}
</style>
</head>
<body>
<h1>Golden cases — Modo Objetivo</h1>
<p>Gerado em ${new Date().toISOString()}.</p>
<table>
<thead><tr><th>Caso</th><th>Categoria</th><th>Status</th><th>Razão</th><th>Headers ausentes</th><th>Achados ausentes</th><th>Proibidos</th><th>Enumeração</th><th>Conjunções prosaicas</th><th>Erro</th></tr></thead>
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
